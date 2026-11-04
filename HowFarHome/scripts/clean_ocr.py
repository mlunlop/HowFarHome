"""Corrige errores de OCR en los carteles leídos usando los pueblos que hay cerca.

"MERALES" a 20 km de Morales pasa a "MORALES": la web solo admite errores en los nombres
largos (textMentions en src/services/signs.js), así que en los cortos una letra mal leída
hace que el cartel no cuente. Una palabra solo se corrige si está a una letra de distancia
de un único pueblo al alcance del cartel; si hay varios, decide lo que leyeron otras fotos
del mismo cartel. El texto original se guarda aparte.

Necesita el índice de OSM (public/sign-index/*.json, de build_sign_index.py): de ahí salen
los nombres de los pueblos con su posición y población. Lo usa scan_mapillary_signs.py.
"""

import json
import math
import re
import unicodedata
from collections import Counter, defaultdict

#Deben coincidir con RANGE_BY_POPULATION y RANGE_BY_PLACE_TYPE de src/services/signs.js
RANGE_BY_POPULATION = [(1_000, 40), (5_000, 80), (20_000, 150), (100_000, 300)]
RANGE_BY_PLACE_TYPE = {"hamlet": 40, "village": 80, "town": 150, "city": math.inf}
DEFAULT_RANGE_KM = 150

#Con menos letras, cambiar una convierte demasiadas palabras en pueblos: "lora" en "loro"
MIN_CORRECTED_LENGTH = 5
#Una palabra que se lee igual en muchos carteles es una palabra real, no un error de OCR
FREQUENT_WORD = 10
#Detecciones más cerca que esto son el mismo cartel visto desde varias fotos
SAME_SIGN_KM = 0.05

#Palabras corrientes en los carteles que están a una letra de algún pueblo
SIGN_WORDS = {
    "centro", "ciudad", "norte", "oeste", "todas", "otras", "direcciones", "salida",
    "puerto", "playa", "playas", "estacion", "aeropuerto", "hospital", "poligono",
    "industrial", "urbanizacion", "autovia", "autopista", "carretera", "camino", "calle",
    "avenida", "plaza", "parque", "natural", "ermita", "iglesia", "castillo", "museo",
    "barrio", "puente", "sierra", "sierras", "embalse", "pantano", "mirador", "area",
    "servicio", "servicios", "cambio", "sentido", "via", "ronda", "circunvalacion",
    "peligro", "puerta", "olivar", "olivares", "vinas", "villas", "cortijo", "finca",
    "venta", "ventas", "cruce", "curva", "curvas", "obras", "desvio", "limite", "termino",
    "municipal", "provincia", "bienvenidos", "polideportivo", "cementerio", "piscina",
}


def normalize(text):
    decomposed = unicodedata.normalize("NFD", text)
    stripped = "".join(c for c in decomposed if not unicodedata.category(c).startswith("M"))
    return " ".join(re.sub(r"[^a-z0-9 ]", " ", stripped.lower()).split())


def distance_km(lat1, lng1, lat2, lng2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 12742 * math.asin(math.sqrt(a))


def levenshtein(a, b):
    previous = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        current = [i]
        for j, cb in enumerate(b, 1):
            current.append(min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (ca != cb)))
        previous = current
    return previous[-1]


def deletions(word):
    return {word} | {word[:i] + word[i + 1:] for i in range(len(word))}


def place_range_km(tags):
    population = re.sub(r"\D", "", tags.get("population", ""))
    if population:
        return next((km for limit, km in RANGE_BY_POPULATION if int(population) < limit), math.inf)
    return RANGE_BY_PLACE_TYPE.get(tags.get("place"), DEFAULT_RANGE_KM)


def display_word(word, name):
    """La palabra con sus tildes, tal como se escribe en el nombre del pueblo."""
    return next((part for part in name.split() if normalize(part) == word), word.capitalize())


class Places:
    """Pueblos de una sola palabra (también las formas cortas, "Morales" de "Morales de Toro")."""

    def __init__(self, index_dir):
        self.where = defaultdict(list)
        self.spelling = {}
        for path in index_dir.glob("*.json"):
            if path.name == "meta.json":
                continue
            for key, elements in json.loads(path.read_text(encoding="utf-8")).items():
                if " " in key or not key.isalpha():
                    continue
                for element in elements:
                    tags = element["tg"]
                    if "place" not in tags:
                        continue
                    lat, lng = element["g"][0]
                    self.where[key].append((lat, lng, place_range_km(tags)))
                    self.spelling.setdefault(key, display_word(key, tags["name"]))
        self.similar = defaultdict(set)
        for name in self.where:
            if len(name) >= MIN_CORRECTED_LENGTH - 1:
                for variant in deletions(name):
                    self.similar[variant].add(name)

    def __len__(self):
        return len(self.where)

    def reachable(self, name, lat, lng):
        return any(distance_km(lat, lng, plat, plng) <= km for plat, plng, km in self.where.get(name, ()))

    def candidates(self, word, lat, lng):
        """Pueblos al alcance del cartel que están a una letra de la palabra leída."""
        names = set().union(*(self.similar.get(variant, ()) for variant in deletions(word)))
        return {
            name for name in names
            if name != word and abs(len(name) - len(word)) <= 1
            and levenshtein(name, word) == 1 and self.reachable(name, lat, lng)
        }


def tokens(text):
    return [token for line in text.split("|") for token in line.split()]


class Cleaner:
    def __init__(self, places, signs):
        self.places = places
        self.frequency = Counter(normalize(token) for sign in signs for token in tokens(sign["text"]))
        #Lecturas de cada zona de 50 m, para desempatar con otras fotos del mismo cartel
        self.nearby = defaultdict(list)
        for sign in signs:
            self.nearby[self.cell(sign["lat"], sign["lng"])].append(sign)
        self.fixes = Counter()

    @staticmethod
    def cell(lat, lng):
        return round(lat / 0.0005), round(lng / 0.0005)

    def neighbour_words(self, sign):
        row, col = self.cell(sign["lat"], sign["lng"])
        words = set()
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                for other in self.nearby.get((row + dr, col + dc), ()):
                    if other is not sign and distance_km(sign["lat"], sign["lng"], other["lat"], other["lng"]) <= SAME_SIGN_KM:
                        words.update(normalize(token) for token in tokens(other["text"]))
        return words

    def correct(self, word, sign):
        if (
            len(word) < MIN_CORRECTED_LENGTH or not word.isalpha() or word in SIGN_WORDS
            or self.frequency[word] >= FREQUENT_WORD
            or self.places.reachable(word, sign["lat"], sign["lng"])
        ):
            return None
        #Un plural no es un error de OCR: "Villas" no es "Villa", ni "Peligro" "Peligros"
        found = {
            name for name in self.places.candidates(word, sign["lat"], sign["lng"])
            if name != word + "s" and word != name + "s"
        }
        if len(found) > 1:
            found &= self.neighbour_words(sign)
        return found.pop() if len(found) == 1 else None

    def clean(self, sign):
        """El texto del cartel con los nombres corregidos, o None si no cambia nada."""
        changed = False
        lines = []
        for line in sign["text"].split("|"):
            words = []
            for token in line.split():
                name = self.correct(normalize(token), sign)
                if name:
                    fixed = self.places.spelling[name]
                    words.append(fixed.upper() if token.isupper() else fixed)
                    self.fixes[f"{token} → {words[-1]}"] += 1
                    changed = True
                else:
                    words.append(token)
            lines.append(" ".join(words))
        return " | ".join(lines) if changed else None

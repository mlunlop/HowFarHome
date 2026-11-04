"""Genera public/sign-index/ a partir de un extracto .osm.pbf de Geofabrik.

Uso:
    data/.venv/Scripts/python scripts/build_sign_index.py data/osm/spain-latest.osm.pbf

Guarda solo lo que necesita la búsqueda (carteles con destino, carreteras con nombre
"Carretera de X a Y" y núcleos de población), repartido en ficheros por las dos primeras
letras del nombre para que cada búsqueda descargue solo un trozo pequeño.
Las claves se normalizan igual que normalizeName() en src/services/signs.js.
"""

import json
import re
import sys
import time
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import osmium

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "sign-index"

#Deben coincidir con DESTINATION_KEYS y NAMED_ROAD_HIGHWAYS de src/services/signs.js
DESTINATION_KEYS = ("destination", "destination:forward", "destination:backward")
NAMED_ROAD_HIGHWAYS = {"trunk", "primary", "secondary", "tertiary", "unclassified"}
PLACE_TYPES = {"city", "town", "village", "hamlet"}
KEPT_TAGS = DESTINATION_KEYS + ("destination:ref", "ref", "highway", "name", "tourism", "information", "place")

ROAD_NAME = re.compile(r"^(carretera|ctra)\b")
JOINTS = (" de ", " a ", " hacia ")
MAX_NAME_WORDS = 6
#Palabras por las que se corta un nombre largo para obtener su forma abreviada
SHORT_NAME_CUTS = {"de", "del", "la", "el", "los", "las"}
#Deben coincidir con DOTLESS_ABBREVIATIONS y MIN_FULL_WORD_LENGTH de src/services/signs.js
DOTLESS_ABBREVIATIONS = {"st", "sta", "sto"}
MIN_FULL_WORD_LENGTH = 4


def normalize(text):
    decomposed = unicodedata.normalize("NFD", text)
    stripped = "".join(c for c in decomposed if not unicodedata.category(c).startswith("M"))
    return " ".join(stripped.lower().split())


def shard_of(key):
    prefix = "".join(c if "a" <= c <= "z" or "0" <= c <= "9" else "_" for c in key[:2])
    return prefix.ljust(2, "_")


def destination_keys(tags):
    keys = set()
    for k in DESTINATION_KEYS:
        for part in re.split(r"[;,|]", tags.get(k, "")):
            if normalized := normalize(part):
                keys.add(normalized)
    return keys


def road_name_keys(name):
    """Posibles nombres de municipio tras 'de', 'a' o 'hacia' en el nombre de la carretera."""
    road = f" {normalize(name)} "
    keys = set()
    for joint in JOINTS:
        start = road.find(joint)
        while start != -1:
            words = road[start + len(joint):].split()
            for size in range(1, min(len(words), MAX_NAME_WORDS) + 1):
                keys.add(" ".join(words[:size]))
            start = road.find(joint, start + 1)
    return keys


def sign_tokens(text):
    """("st", True), ("vicenc", False)...: True si la palabra está abreviada."""
    tokens = re.findall(r"[a-z0-9]+\.?", re.sub(r"[^a-z0-9.]+", " ", text))
    return [(t[:-1], True) if t.endswith(".") else (t, t in DOTLESS_ABBREVIATIONS) for t in tokens]


def abbreviates(short, word):
    if len(short) >= len(word) or short[0] != word[0]:
        return False
    found = 0
    for letter in word:
        if found < len(short) and letter == short[found]:
            found += 1
    return found == len(short)


def abbreviation_matches(tokens, words):
    """¿Es "st. vicenc dels h." una forma abreviada de "sant vicenc dels horts"?"""
    if len(tokens) != len(words) or not any(short for _, short in tokens):
        return False
    full = False
    for (word, short), target in zip(tokens, words):
        if word == target:
            full = full or len(word) >= MIN_FULL_WORD_LENGTH
        elif not (short and abbreviates(word, target)):
            return False
    return full


def short_names(name):
    """Formas abreviadas: 'la roda de andalucia' -> 'la roda'; 'sevilla la nueva' -> 'sevilla'."""
    words = name.split()
    return {" ".join(words[:i]) for i, word in enumerate(words) if i > 0 and word in SHORT_NAME_CUTS}


def rounded(location):
    return [round(location.lat, 6), round(location.lon, 6)]


class SignCollector(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.index = defaultdict(lambda: defaultdict(dict))
        self.elements = {}
        self.counts = defaultdict(int)
        #Las carreteras se indexan al final, solo bajo nombres que existen como núcleo
        self.road_keys = defaultdict(dict)
        self.place_names = set()
        #Destinos abreviados ("jerez de la fra."), se indexan al final bajo el nombre completo
        self.abbreviated = defaultdict(dict)
        #Destinos escritos enteros: muchos municipios no tienen nodo de pueblo con su nombre
        #completo, pero sí carteles que lo escriben ("castellar de la frontera")
        self.full_destinations = set()

    def add(self, key, element_id, element):
        self.elements[element_id] = element
        self.index[shard_of(key)][key][element_id] = True

    def add_destination(self, key, element_id, element):
        self.add(key, element_id, element)
        for piece in key.split("/"):
            if any(short for _, short in sign_tokens(piece)):
                self.abbreviated[piece.strip()][element_id] = True
            else:
                self.full_destinations.add(piece.strip())

    def kept_tags(self, tags):
        return {k: tags[k] for k in KEPT_TAGS if k in tags}

    def node(self, n):
        tags = n.tags
        if "destination" in tags:
            element_id = f"n{n.id}"
            element = {"t": "n", "id": n.id, "tg": self.kept_tags(tags), "g": [rounded(n.location)]}
            for key in destination_keys(tags):
                self.add_destination(key, element_id, element)
            self.counts["nodos con destino"] += 1

        if tags.get("place") in PLACE_TYPES and "name" in tags:
            place_tags = {"place": tags["place"], "name": tags["name"]}
            if "population" in tags:
                place_tags["population"] = tags["population"]
            element = {"t": "n", "id": n.id, "tg": place_tags, "g": [rounded(n.location)]}
            for variant in tags["name"].split("/"):
                if key := normalize(variant):
                    self.add(key, f"p{n.id}", element)
                    self.place_names.add(key)
                    #"La Roda de Andalucía" aparece en los carteles como "La Roda"
                    alias = {**element, "tg": {**place_tags, "alias": "1"}}
                    for short in short_names(key):
                        self.add(short, f"a{n.id}", alias)
            self.counts["núcleos de población"] += 1

    def way(self, w):
        tags = w.tags
        has_destination = any(k in tags for k in DESTINATION_KEYS)
        name = tags.get("name", "")
        is_named_road = tags.get("highway") in NAMED_ROAD_HIGHWAYS and ROAD_NAME.match(normalize(name))
        if not (has_destination or is_named_road):
            return

        try:
            nodes = [rounded(node.location) for node in w.nodes if node.location.valid()]
        except osmium.InvalidLocationError:
            return
        if not nodes:
            return

        #Primeros y últimos dos nodos: bastan para situar el cartel y su sentido
        geometry = nodes if len(nodes) <= 4 else nodes[:2] + nodes[-2:]
        element_id = f"w{w.id}"
        element = {"t": "w", "id": w.id, "tg": self.kept_tags(tags), "g": geometry}

        if has_destination:
            for key in destination_keys(tags):
                self.add_destination(key, element_id, element)
            self.counts["vías con destino"] += 1
        if is_named_road:
            self.elements[element_id] = element
            for key in road_name_keys(name):
                self.road_keys[key][element_id] = True

    def index_named_roads(self):
        roads = set()
        for key, ids in self.road_keys.items():
            if key not in self.place_names:
                continue
            for element_id in ids:
                self.index[shard_of(key)][key][element_id] = True
                roads.add(element_id)
        self.counts["carreteras hacia un núcleo"] = len(roads)


    def index_abbreviations(self):
        names_by_word = defaultdict(set)
        for name in self.place_names | self.full_destinations:
            for word in re.findall(r"[a-z0-9]+", name):
                if len(word) >= MIN_FULL_WORD_LENGTH:
                    names_by_word[word].add(name)
        found = 0
        for piece, ids in self.abbreviated.items():
            tokens = sign_tokens(piece)
            candidates = set().union(*(names_by_word.get(word, ()) for word, short in tokens if not short))
            for name in candidates:
                if abbreviation_matches(tokens, re.findall(r"[a-z0-9]+", name)):
                    found += 1
                    for element_id in ids:
                        self.index[shard_of(name)][name][element_id] = True
        self.counts["destinos abreviados con su pueblo"] = found


def write_index(collector, source):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("*.json"):
        old.unlink()

    total_bytes = 0
    for shard, keys in collector.index.items():
        payload = {key: [collector.elements[i] for i in ids] for key, ids in keys.items()}
        path = OUT_DIR / f"{shard}.json"
        path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        total_bytes += path.stat().st_size

    meta = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": Path(source).name,
        "counts": collector.counts,
        "shards": len(collector.index),
    }
    (OUT_DIR / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return total_bytes


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    source = sys.argv[1]
    started = time.time()

    collector = SignCollector()
    collector.apply_file(source, locations=True, idx="flex_mem")
    collector.index_named_roads()
    collector.index_abbreviations()
    total_bytes = write_index(collector, source)

    for label, count in collector.counts.items():
        print(f"{label}: {count}")
    print(f"{len(collector.index)} ficheros, {total_bytes / 1e6:.1f} MB en {OUT_DIR}")
    print(f"Tiempo: {time.time() - started:.0f} s")


if __name__ == "__main__":
    main()

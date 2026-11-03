"""Lee con OCR los carteles de dirección que Mapillary tiene detectados en una zona.

Uso:
    data/.venv/Scripts/python scripts/scan_mapillary_signs.py scan jaen
    data/.venv/Scripts/python scripts/scan_mapillary_signs.py scan spain 3/100
    data/.venv/Scripts/python scripts/scan_mapillary_signs.py export

'scan spain 3/100' escanea el trozo 3 de 100 de España: así lo reparte GitHub Actions
(.github/workflows/scan-spain.yml) entre muchas máquinas a la vez.

'scan' recorre la zona, descarga la mejor foto de cada cartel, recorta el cartel y lo lee
con RapidOCR. Cada resultado se guarda al momento en data/mapillary/, así que se puede
parar y volver a lanzar: sigue donde lo dejó.

'export' escribe public/sign-index/photo/: cada cartel leído, indexado por las palabras de
su texto. La web carga los carteles que contienen las palabras del municipio buscado y
comprueba allí si el nombre completo aparece (textMentions en src/services/signs.js).
Necesita el token de Mapillary en la variable MAPILLARY_TOKEN o VITE_MAPILLARY_TOKEN en .env.local.
Con SCAN_BUDGET_MIN se para a tiempo y guarda lo hecho; al relanzarlo sigue donde iba.
"""

import base64
import io
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "data" / "mapillary"
INDEX_DIR = ROOT / "public" / "sign-index"
OUT_DIR = INDEX_DIR / "photo"

# Zonas preparadas: (sur, oeste, norte, este).
AREAS = {
    "jaen": (37.36, -4.27, 38.53, -2.48),
    # Zona pequeña entre Jódar, Úbeda, Peal y Cazorla para probar el escáner.
    "prueba-jodar": (37.85, -3.40, 38.02, -2.98),
}

# España por comunidades autónomas (sur, oeste, norte, este): se recorren los recuadros que
# tocan alguna, lo que evita casi todo el mar sin dejar fuera ningún trozo de costa.
SPAIN = [
    (41.75, -9.35, 43.82, -6.70),   # Galicia
    (42.85, -7.20, 43.70, -4.50),   # Asturias
    (42.70, -4.90, 43.55, -3.10),   # Cantabria
    (42.45, -3.50, 43.47, -1.70),   # País Vasco
    (41.90, -2.50, 43.32, -0.70),   # Navarra
    (41.90, -3.15, 42.65, -1.65),   # La Rioja
    (39.80, -2.20, 42.95, 0.80),    # Aragón
    (40.50, 0.15, 42.90, 3.35),     # Cataluña
    (40.05, -7.10, 43.25, -1.75),   # Castilla y León
    (39.85, -4.60, 41.17, -3.05),   # Madrid
    (38.00, -5.45, 41.35, -0.90),   # Castilla-La Mancha
    (37.90, -7.60, 40.50, -4.60),   # Extremadura
    (37.80, -1.55, 40.80, 0.70),    # Comunitat Valenciana
    (37.35, -2.35, 38.77, -0.65),   # Región de Murcia
    (35.90, -7.55, 38.75, -1.60),   # Andalucía
    (38.60, 1.15, 40.10, 4.35),     # Illes Balears
    (27.60, -18.20, 29.45, -13.40), # Canarias
    (35.86, -5.40, 35.93, -5.26),   # Ceuta
    (35.26, -2.98, 35.33, -2.91),   # Melilla
]

# Lado de cada recuadro de búsqueda. Con 0,09° la API responde error 500; con 0,05°, bien.
BOX_DEGREES = 0.04
# Máximo de señales por petición: si un recuadro lo alcanza, se divide en cuatro.
BOX_LIMIT = 2000
# Recuadros pedidos a la vez. Casi todo el tiempo se va esperando a la API, no en la CPU.
BOX_WORKERS = int(os.environ.get("BOX_WORKERS", 4))
# Fotos descargadas a la vez mientras el OCR lee la anterior.
PHOTO_WORKERS = int(os.environ.get("PHOTO_WORKERS", 4))
# Minutos de trabajo antes de pararse ordenadamente (GitHub corta las tareas a las 6 h).
BUDGET_MIN = float(os.environ.get("SCAN_BUDGET_MIN", 0)) or None
STARTED = time.time()
# Comprobado: un recuadro con bordes en valores redondos (-3.36, 37.89) devuelve 0 resultados
# aunque tenga señales; desplazado una milésima, sí. Por eso la cuadrícula se desplaza un
# poco y los recuadros se solapan (los repetidos se quitan por id).
BOX_OFFSET = 0.00037
BOX_OVERLAP = 0.002
GRAPH ="https://graph.mapillary.com"
# Tipos de señal de Mapillary que suelen llevar nombres de destino.
DIRECTION_SIGNS = re.compile(
    r"^information--(general-directions|directions|highway-exit|highway-interchange|motorway-exit-ahead|exit-ahead)"
    r"|^complementary--texts"
)
MAX_DETECTIONS = 6
CROP_PADDING = 0.15
MIN_CROP_WIDTH = 400
# Con la foto de 2048 px un cartel lejano queda diminuto: entonces se usa la original.
MIN_THUMB_CROP_WIDTH = 120
RETRIES = 4

# Palabras más cortas no se indexan: "de", "la", "a"... no distinguen ningún pueblo.
# Debe coincidir con MIN_PHOTO_WORD_LENGTH de src/services/signIndex.js
MIN_WORD_LENGTH = 4


def out_of_time():
    return BUDGET_MIN is not None and time.time() - STARTED > BUDGET_MIN * 60


def token():
    if os.environ.get("MAPILLARY_TOKEN", "").startswith("MLY|"):
        return os.environ["MAPILLARY_TOKEN"].strip()
    env = (ROOT / ".env.local").read_text(encoding="utf-8")
    match = re.search(r"^VITE_MAPILLARY_TOKEN=(.+)$", env, re.M)
    if not match or not match.group(1).strip().startswith("MLY|"):
        sys.exit("Falta VITE_MAPILLARY_TOKEN (Client Token, empieza por MLY|) en .env.local")
    return match.group(1).strip()


def fetch(url, binary=False):
    for attempt in range(RETRIES):
        try:
            with urllib.request.urlopen(url, timeout=60) as response:
                data = response.read()
                return data if binary else json.loads(data)
        except urllib.error.HTTPError as error:
            if error.code == 404:
                return None
            if error.code not in (429, 500, 502, 503, 504) or attempt == RETRIES - 1:
                raise
        except (urllib.error.URLError, TimeoutError):
            if attempt == RETRIES - 1:
                raise
        time.sleep(2 ** attempt * 5)


def graph(path, key, **params):
    return fetch(f"{GRAPH}/{path}?{urllib.parse.urlencode({'access_token': key, **params})}")


def box_signs(box, key):
    """Carteles de dirección de un recuadro (oeste, sur, este, norte)."""
    west, south, east, north = box
    data = graph(
        "map_features", key,
        bbox=f"{west:.5f},{south:.5f},{east:.5f},{north:.5f}",
        fields="id,object_value,geometry",
        limit=BOX_LIMIT,
    ) or {}
    features = data.get("data", [])
    if len(features) >= BOX_LIMIT:
        mid_x, mid_y = (west + east) / 2, (south + north) / 2
        signs = {}
        for part in ((west, south, mid_x, mid_y), (mid_x, south, east, mid_y), (west, mid_y, mid_x, north), (mid_x, mid_y, east, north)):
            signs.update(box_signs(part, key))
        return signs

    signs = {}
    for feature in features:
        value = feature.get("object_value", "")
        if DIRECTION_SIGNS.search(value):
            lng, lat = feature["geometry"]["coordinates"]
            signs[str(feature["id"])] = {"lat": round(lat, 6), "lng": round(lng, 6), "value": value}
    return signs


def grid(south, west, north, east, origin_lat=None, origin_lng=None):
    """Recuadros (oeste, sur, este, norte) que cubren la zona. Con un origen común, dos
    zonas que se tocan generan los mismos recuadros en la frontera y se quitan los repetidos."""
    first_lat = south if origin_lat is None else origin_lat + (south - origin_lat) // BOX_DEGREES * BOX_DEGREES
    first_lng = west if origin_lng is None else origin_lng + (west - origin_lng) // BOX_DEGREES * BOX_DEGREES
    boxes = []
    lat = first_lat - BOX_OFFSET
    while lat < north:
        lng = first_lng - BOX_OFFSET
        while lng < east:
            boxes.append((
                round(lng, 5),
                round(lat, 5),
                round(lng + BOX_DEGREES + BOX_OVERLAP, 5),
                round(lat + BOX_DEGREES + BOX_OVERLAP, 5),
            ))
            lng += BOX_DEGREES
        lat += BOX_DEGREES
    return boxes


def area_boxes(area, shard=None):
    if area != "spain":
        return grid(*AREAS[area])
    boxes = sorted({box for region in SPAIN for box in grid(*region, origin_lat=27.0, origin_lng=-18.5)})
    if not shard:
        return boxes
    # Recuadros salteados: cada trozo recibe un poco de ciudad y un poco de campo.
    index, count = shard
    return boxes[index - 1::count]


def list_signs(area, boxes, key):
    """Carteles de dirección de los recuadros, o None si se acabó el tiempo antes de terminar."""
    path = CACHE_DIR / f"signs-{area}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))

    # Progreso parcial: recuadros ya leídos y carteles encontrados, para poder reanudar.
    progress_path = CACHE_DIR / f"signs-{area}.partial.json"
    progress = json.loads(progress_path.read_text(encoding="utf-8")) if progress_path.exists() else {"done": [], "signs": {}}
    done = {tuple(b) for b in progress["done"]}
    signs = progress["signs"]

    pending = [box for box in boxes if box not in done]
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    def save_progress():
        progress_path.write_text(json.dumps({"done": sorted(done), "signs": signs}), encoding="utf-8")

    failed = 0
    stopped = False
    with ThreadPoolExecutor(max_workers=BOX_WORKERS) as pool:
        futures = {pool.submit(box_signs, box, key): box for box in pending}
        for future in as_completed(futures):
            if future.cancelled():
                continue
            try:
                signs.update(future.result())
                done.add(futures[future])
            except Exception as error:  # se reintentará al volver a lanzar el escaneo
                failed += 1
                print(f"  recuadro {futures[future]} falló: {str(error)[:80]}", flush=True)
            if len(done) % 50 == 0:
                save_progress()
                print(f"  recuadros {len(done)}/{len(boxes)} · {len(signs)} carteles de dirección", flush=True)
            if not stopped and out_of_time():
                stopped = True
                for other in futures:
                    other.cancel()

    save_progress()
    if stopped:
        print(f"Se acabó el tiempo: {len(done)}/{len(boxes)} recuadros. Relanza para seguir.", flush=True)
        return None
    if failed:
        sys.exit(f"{failed} recuadros fallaron. Vuelve a lanzar el escaneo para completarlos.")
    path.write_text(json.dumps(signs), encoding="utf-8")
    progress_path.unlink(missing_ok=True)
    print(f"  {len(signs)} carteles de dirección en {len(boxes)} recuadros", flush=True)
    return signs


def detection_box(geometry):
    import mapbox_vector_tile

    layer = next(iter(mapbox_vector_tile.decode(base64.b64decode(geometry)).values()))
    extent = layer["extent"]
    coords = layer["features"][0]["geometry"]["coordinates"]
    points = []

    def walk(item):
        if isinstance(item[0], (int, float)):
            points.append(item)
        else:
            for child in item:
                walk(child)

    walk(coords)
    xs = [p[0] / extent for p in points]
    ys = [1 - p[1] / extent for p in points]
    return min(xs), min(ys), max(xs), max(ys)


def crop_sign(photo, box):
    from PIL import Image

    left, top, right, bottom = box
    w, h = right - left, bottom - top
    crop = photo.crop((
        max(0, int((left - w * CROP_PADDING) * photo.width)),
        max(0, int((top - h * CROP_PADDING) * photo.height)),
        min(photo.width, int((right + w * CROP_PADDING) * photo.width)),
        min(photo.height, int((bottom + h * CROP_PADDING) * photo.height)),
    ))
    if crop.width < MIN_CROP_WIDTH:
        scale = MIN_CROP_WIDTH / crop.width
        crop = crop.resize((int(crop.width * scale), int(crop.height * scale)), Image.LANCZOS)
    return crop


def download_sign(sign_id, key):
    """Recorte del cartel en su mejor foto, o None si no hay foto: (id de la imagen, recorte)."""
    from PIL import Image

    detections = (graph(f"{sign_id}/detections", key, fields="image,geometry") or {}).get("data", [])
    best = None
    for detection in detections[:MAX_DETECTIONS]:
        box = detection_box(detection["geometry"])
        area = (box[2] - box[0]) * (box[3] - box[1])
        if not best or area > best[0]:
            best = (area, detection["image"]["id"], box)
    if not best:
        return None, None

    _, image_id, box = best
    image = graph(image_id, key, fields="thumb_2048_url,thumb_original_url,width") or {}
    url = image.get("thumb_2048_url")
    # Si en la foto reducida el cartel mide pocos píxeles, se descarga la original.
    if url and image.get("width") and (box[2] - box[0]) * min(2048, image["width"]) < MIN_THUMB_CROP_WIDTH:
        url = image.get("thumb_original_url") or url
    if not url:
        return image_id, None

    photo = Image.open(io.BytesIO(fetch(url, binary=True))).convert("RGB")
    return image_id, crop_sign(photo, box)


def read_sign(download, engine):
    try:
        image_id, crop = download.result()
    except Exception as error:  # una foto rota no debe parar el escaneo
        return {"text": "", "image": None, "error": str(error)[:120]}
    if crop is None:
        return {"text": "", "image": image_id}
    result = engine(crop)
    return {"text": " | ".join(result.txts or ()), "image": image_id}


def scan(area, shard=None):
    from rapidocr import RapidOCR

    key = token()
    label = f"{area}-{shard[0]}of{shard[1]}" if shard else area
    boxes = area_boxes(area, shard)
    print(f"Listando carteles de dirección en {label} ({len(boxes)} recuadros)…", flush=True)
    status_path = CACHE_DIR / f"status-{label}.txt"
    # Si se corta antes de acabar, queda marcado como incompleto para el resumen de GitHub.
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    status_path.write_text("incompleto", encoding="utf-8")
    signs = list_signs(label, boxes, key)
    if signs is None:
        return

    results_path = CACHE_DIR / f"ocr-{label}.jsonl"
    done = set()
    if results_path.exists():
        done = {json.loads(line)["id"] for line in results_path.read_text(encoding="utf-8").splitlines() if line}
    pending = [sign_id for sign_id in signs if sign_id not in done]
    print(f"{len(signs)} carteles · {len(done)} ya leídos · {len(pending)} pendientes", flush=True)

    engine = RapidOCR()
    started = time.time()
    # Las descargas van por delante del OCR: mientras lee un cartel, bajan los siguientes.
    with results_path.open("a", encoding="utf-8") as out, ThreadPoolExecutor(max_workers=PHOTO_WORKERS) as pool:
        downloads = [pool.submit(download_sign, sign_id, key) for sign_id in pending]
        for i, (sign_id, download) in enumerate(zip(pending, downloads), 1):
            if out_of_time():
                for later in downloads[i - 1:]:
                    later.cancel()
                print(f"Se acabó el tiempo: {i - 1}/{len(pending)} carteles leídos. Relanza para seguir.", flush=True)
                return
            reading = read_sign(download, engine)
            out.write(json.dumps({"id": sign_id, **signs[sign_id], **reading}, ensure_ascii=False) + "\n")
            out.flush()
            if i % 25 == 0 or i == len(pending):
                rate = (time.time() - started) / i
                print(f"  {i}/{len(pending)} · {rate:.1f} s/cartel · quedan {rate * (len(pending) - i) / 60:.0f} min", flush=True)
    status_path.write_text("completo", encoding="utf-8")


def normalize(text):
    decomposed = unicodedata.normalize("NFD", text)
    stripped = "".join(c for c in decomposed if not unicodedata.category(c).startswith("M"))
    return " ".join(re.sub(r"[^a-z0-9ñ ]", " ", stripped.lower()).split())


def shard_of(key):
    prefix = "".join(c if "a" <= c <= "z" or "0" <= c <= "9" else "_" for c in key[:2])
    return prefix.ljust(2, "_")


def words_of(text):
    return {word for word in normalize(text).split() if len(word) >= MIN_WORD_LENGTH and not word.isdigit()}


def export():
    index = defaultdict(lambda: defaultdict(list))
    read = 0
    seen = set()
    for path in sorted(CACHE_DIR.glob("ocr-*.jsonl")):
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line:
                continue
            sign = json.loads(line)
            # Los recuadros se solapan y las zonas pueden coincidir: un cartel, una vez.
            if sign["id"] in seen:
                continue
            seen.add(sign["id"])
            words = words_of(sign["text"])
            if not words:
                continue
            read += 1
            entry = {
                "t": "m",
                "id": sign["id"],
                "tg": {"ocr": sign["text"], "image": sign["image"], "value": sign["value"]},
                "g": [[sign["lat"], sign["lng"]]],
            }
            for word in words:
                index[shard_of(word)][word].append(entry)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("*.json"):
        old.unlink()
    for shard, keys in index.items():
        (OUT_DIR / f"{shard}.json").write_text(json.dumps(keys, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    meta = {"generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "signsRead": read}
    (OUT_DIR / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"{read} carteles con texto · {len(index)} ficheros en {OUT_DIR}")


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "export":
        export()
    elif len(sys.argv) == 3 and sys.argv[1] == "scan" and sys.argv[2] in AREAS:
        scan(sys.argv[2])
    elif len(sys.argv) == 4 and sys.argv[1] == "scan" and sys.argv[2] == "spain" and re.fullmatch(r"\d+/\d+", sys.argv[3]):
        index, count = map(int, sys.argv[3].split("/"))
        if not 1 <= index <= count:
            sys.exit("El trozo va de 1 al total: por ejemplo, 3/100.")
        scan("spain", (index, count))
    elif len(sys.argv) == 2 and sys.argv[1] == "count":
        print(len(area_boxes("spain")), "recuadros en España")
    else:
        sys.exit(__doc__)

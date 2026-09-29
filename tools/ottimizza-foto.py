#!/usr/bin/env python3
"""Ottimizza le foto del locale per il web.

Per ogni jpg/jpeg/png in assets/images/locale/{esterni,interni,dettagli}/ crea in
assets/images/locale/web/ due derivati JPEG (lato lungo 1600 e 800):
  <slug>-1600.jpg, <slug>-800.jpg
Gli originali non vengono mai toccati. Lo script e' idempotente: puo' essere rilanciato
in qualsiasi momento e riscrive sempre gli stessi file.

Cosa fa a ogni foto:
  - applica l'orientamento EXIF (exif_transpose) e poi scarta tutti i metadati EXIF
    (privacy: niente coordinate GPS);
  - converte in sRGB, salva JPEG qualita' 78, progressive, optimize.

Slug = cartella + nome file: minuscolo, spazi -> trattino, senza accenti.
Esempio: interni/cucina a vista 2.jpeg -> interni-cucina-a-vista-2

Uso:  python tools/ottimizza-foto.py
"""
import io
import re
import sys
import unicodedata
from pathlib import Path

from PIL import Image, ImageCms, ImageOps

RADICE = Path(__file__).resolve().parent.parent
LOCALE = RADICE / "assets" / "images" / "locale"
USCITA = LOCALE / "web"
CARTELLE = ("esterni", "interni", "dettagli")
ESTENSIONI = {".jpg", ".jpeg", ".png"}
LATI = (1600, 800)
QUALITA = 78

# Miniatura per la pillola "Il locale" nell'header (96x96 = 2x del display a 48px)
SORGENTE_MINIATURA = LOCALE / "esterni" / "terrazzino.jpeg"
USCITA_MINIATURA = USCITA / "pill-thumb.jpg"
LATO_MINIATURA = 96
QUALITA_MINIATURA = 80
# Centro e lato del ritaglio quadrato, come frazioni della foto raddrizzata (lato = frazione della larghezza)
CENTRO_MINIATURA = (0.42, 0.60)  # tavolo apparecchiato + pianta a sinistra
FRAZIONE_MINIATURA = 0.75

_SRGB = ImageCms.createProfile("sRGB")


def slug(cartella: str, nome: str) -> str:
    """Nome file normalizzato con prefisso cartella."""
    testo = unicodedata.normalize("NFKD", f"{cartella}-{nome}")
    testo = "".join(c for c in testo if not unicodedata.combining(c)).lower()
    testo = re.sub(r"[^a-z0-9]+", "-", testo)
    return testo.strip("-")


def in_srgb(img: Image.Image) -> Image.Image:
    """Converte in sRGB usando il profilo incorporato (se c'e') e restituisce RGB."""
    icc = img.info.get("icc_profile")
    if icc:
        try:
            origine = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            img = ImageCms.profileToProfile(img.convert("RGB"), origine, _SRGB, outputMode="RGB")
        except Exception:
            pass
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        fondo = Image.new("RGB", img.size, (255, 255, 255))
        fondo.paste(img, mask=img.split()[-1])
        return fondo
    return img.convert("RGB")


def crea_miniatura() -> None:
    """Crea pill-thumb.jpg: ritaglio quadrato dalla foto SORGENTE_MINIATURA, ridotto a LATO_MINIATURA.

    Il ritaglio e' definito da CENTRO_MINIATURA / FRAZIONE_MINIATURA (frazioni della foto
    gia' raddrizzata con exif_transpose). Nessun EXIF scritto.
    """
    if not SORGENTE_MINIATURA.is_file():
        print(f"Miniatura saltata: manca {SORGENTE_MINIATURA}")
        return
    with Image.open(SORGENTE_MINIATURA) as sorgente:
        img = in_srgb(ImageOps.exif_transpose(sorgente))
    lato = int(min(img.width, img.height) * FRAZIONE_MINIATURA)
    cx, cy = CENTRO_MINIATURA[0] * img.width, CENTRO_MINIATURA[1] * img.height
    sx = min(max(int(cx - lato / 2), 0), img.width - lato)
    sy = min(max(int(cy - lato / 2), 0), img.height - lato)
    ritaglio = img.crop((sx, sy, sx + lato, sy + lato)).resize((LATO_MINIATURA, LATO_MINIATURA), Image.LANCZOS)
    ritaglio.save(USCITA_MINIATURA, "JPEG", quality=QUALITA_MINIATURA, optimize=True)
    kb = USCITA_MINIATURA.stat().st_size / 1024
    print(f"{USCITA_MINIATURA.name:45s} {LATO_MINIATURA}x{LATO_MINIATURA}  {kb:7.1f} KB")


def main() -> int:
    USCITA.mkdir(parents=True, exist_ok=True)
    trovate = 0
    for cartella in CARTELLE:
        base = LOCALE / cartella
        if not base.is_dir():
            continue
        for f in sorted(base.iterdir()):
            if f.suffix.lower() not in ESTENSIONI or not f.is_file():
                continue
            trovate += 1
            with Image.open(f) as sorgente:
                img = ImageOps.exif_transpose(sorgente)  # raddrizza secondo EXIF
                img = in_srgb(img)
            nome = slug(cartella, f.stem)
            for lato in LATI:
                copia = img.copy()
                copia.thumbnail((lato, lato), Image.LANCZOS)  # lato lungo = lato
                dest = USCITA / f"{nome}-{lato}.jpg"
                # Nessun parametro exif/icc: i metadati non vengono scritti
                copia.save(dest, "JPEG", quality=QUALITA, progressive=True, optimize=True)
                kb = dest.stat().st_size / 1024
                print(f"{dest.name:45s} {copia.width}x{copia.height}  {kb:7.1f} KB")
    if not trovate:
        print("Nessuna foto trovata.")
    crea_miniatura()
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""
Genera los íconos de Nuvex en public/ a partir del mismo diseño que public/favicon.svg
(N blanca sobre el azul de acento). Si cambias el logo, cambia ambos.

Uso:  python3 scripts/generate-icons.py      (requiere Pillow: pip install pillow)

Archivos que produce:
  icon-192.png, icon-512.png   → manifest.json (instalar como app). Cuadrado completo:
                                 Android aplica su propia máscara redonda ("maskable").
  apple-touch-icon.png (180)   → ícono al agregar a la pantalla de inicio en iPhone.
  favicon.ico (16/32/48)       → pestaña del navegador en navegadores sin soporte SVG.
  og-image.png (1200×630)      → vista previa al compartir un enlace (WhatsApp, redes).
                                 Usa la fuente Noto Sans del sistema (fonts-noto).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

PUBLIC = Path(__file__).resolve().parent.parent / "public"

ACCENT = "#007aff"      # igual que --accent en styles/globals.css
CORNER_RADIUS = 112     # esquinas del favicon, en la cuadrícula de 512 (igual que el SVG)

# Contorno de la "N" en la cuadrícula de 512×512 (mismo path que favicon.svg).
N_POLYGON = [(152, 372), (152, 140), (192, 140), (320, 306), (320, 140),
             (360, 140), (360, 372), (320, 372), (192, 206), (192, 372)]

SCALE = 4  # se dibuja a 4x y luego se reduce, para bordes suaves (antialiasing)


def draw_logo(rounded):
    size = 512 * SCALE
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = CORNER_RADIUS * SCALE if rounded else 0
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=ACCENT)
    d.polygon([(x * SCALE, y * SCALE) for x, y in N_POLYGON], fill="white")
    return img


FONT_DIR = Path("/usr/share/fonts/truetype/noto")


def font(weight, size):
    return ImageFont.truetype(str(FONT_DIR / f"NotoSans-{weight}.ttf"), size)


def draw_og_image():
    """Tarjeta para redes: logo, nombre, lema y herramientas, en los colores del sitio."""
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), "#f5f5f7")       # --bg (modo claro)
    d = ImageDraw.Draw(img)

    logo = draw_logo(rounded=True).resize((150, 150), Image.LANCZOS)
    img.paste(logo, (90, 110), logo)

    d.text((90, 290), "Nuvex", font=font("Bold", 104), fill="#1c1c1e")
    d.text((94, 428), "Herramientas gratis para PDF, imágenes y QR.", font=font("Regular", 33), fill="#6c6c70")
    d.text((94, 474), "Sin registro y sin subir tus archivos.", font=font("Regular", 33), fill="#6c6c70")

    # Chips con algunas herramientas, a la derecha.
    chips = ["PDF", "Comprimir", "Metadatos", "Quitar fondo", "Código QR", "DXF"]
    chip_font = font("Regular", 28)
    y = 110
    for label in chips:
        w = d.textlength(label, font=chip_font) + 48
        x = W - 90 - w
        d.rounded_rectangle((x, y, x + w, y + 58), radius=29, fill="#ffffff", outline="#e5e5ea", width=2)
        d.text((x + 24, y + 11), label, font=chip_font, fill="#007aff")
        y += 74

    img.save(PUBLIC / "og-image.png", optimize=True)


def main():
    square = draw_logo(rounded=False)
    for name, px in [("icon-512.png", 512), ("icon-192.png", 192), ("apple-touch-icon.png", 180)]:
        square.resize((px, px), Image.LANCZOS).save(PUBLIC / name, optimize=True)

    rounded = draw_logo(rounded=True).resize((256, 256), Image.LANCZOS)
    rounded.save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    draw_og_image()
    print("Íconos generados en", PUBLIC)


if __name__ == "__main__":
    main()

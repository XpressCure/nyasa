from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "flyers"
OUT.mkdir(parents=True, exist_ok=True)

WIDTH, HEIGHT = 1240, 1754
GREEN = "#0d3d2a"
DARK = "#17221c"
GOLD = "#c58a20"
PALE_GOLD = "#f5ead2"
CREAM = "#fbf8f1"
MUTED = "#536159"
WHITE = "#ffffff"
FONT_PATH = "C:/Windows/Fonts/Nirmala.ttc"


def font(size, bold=False):
    return ImageFont.truetype(FONT_PATH, size=size, index=1 if bold else 0)


def rounded(draw, box, radius=22, fill=WHITE, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def wrapped_lines(draw, text, chosen_font, max_width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=chosen_font)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def text_block(draw, xy, text, chosen_font, fill, max_width, line_gap=8):
    x, y = xy
    for line in wrapped_lines(draw, text, chosen_font, max_width):
        draw.text((x, y), line, font=chosen_font, fill=fill)
        y += chosen_font.size + line_gap
    return y


canvas = Image.new("RGB", (WIDTH, HEIGHT), CREAM)
draw = ImageDraw.Draw(canvas)

# Header
draw.rectangle((0, 0, WIDTH, 288), fill=GREEN)
logo = Image.open(ROOT / "apps" / "web" / "src" / "assets" / "nyasa-logo.png").convert("RGB")
logo.thumbnail((190, 190), Image.Resampling.LANCZOS)
canvas.paste(logo, (72, 48))
draw.text((300, 48), "न्यास कुल कोष", font=font(70, True), fill=WHITE)
draw.text((302, 132), "योगदान का सरल और पारदर्शी तरीका", font=font(35), fill="#f4d99e")
draw.text((302, 192), "परिवार का विश्वास • संकल्पों की शक्ति", font=font(27), fill=WHITE)

# Intro
draw.text((72, 332), "अब योगदान केवल 3 आसान चरणों में", font=font(45, True), fill=DARK)
text_block(
    draw,
    (72, 398),
    "कोई Payment Gateway नहीं। राशि सीधे परिवार के आधिकारिक बैंक खाते में जाती है और उसका रिकॉर्ड न्यास में पारदर्शी रूप से रहता है।",
    font(27),
    MUTED,
    1096,
    10,
)

steps = [
    ("1", "राशि भेजें", "न्यास में Kosh खोलें और वहीं दिख रहे आधिकारिक QR, UPI या बैंक विवरण से भुगतान करें।"),
    ("2", "योगदान दर्ज करें", "भुगतान के बाद वही राशि और सही समय Nyas में भरें। UTR देना उपयोगी है, पर अनिवार्य नहीं।"),
    ("3", "संकल्प चुनें", "राशि आपके Kosh Wallet में दिखेगी। अब अपनी पसंद के संकल्प को पूरा या आंशिक योगदान दें।"),
]

y = 520
for number, heading, body in steps:
    rounded(draw, (72, y, 1168, y + 218), fill=WHITE, outline="#dfd6c4", width=2)
    draw.ellipse((102, y + 54, 202, y + 154), fill=GOLD)
    number_box = draw.textbbox((0, 0), number, font=font(50, True))
    draw.text((152 - (number_box[2] - number_box[0]) / 2, y + 68), number, font=font(50, True), fill=GREEN)
    draw.text((236, y + 36), heading, font=font(36, True), fill=GREEN)
    text_block(draw, (236, y + 94), body, font(25), MUTED, 860, 8)
    y += 244

# Trust and reconciliation panel
rounded(draw, (72, 1260, 1168, 1514), fill=PALE_GOLD, outline=GOLD, width=2)
draw.text((106, 1290), "विश्वास के साथ, जाँच की पारदर्शिता भी", font=font(34, True), fill=GREEN)
checks = [
    "हर सदस्य केवल वास्तविक बैंक हस्तांतरण ही दर्ज करेगा।",
    "Kosh Pramukh बैंक विवरण से प्रविष्टियों का मिलान करेंगे।",
    "अंतर होने पर राशि सुधारी जाएगी और Wallet स्वतः समायोजित होगा।",
    "सभी सदस्यों को कुल संग्रह, आवंटन और खर्च का स्पष्ट Darshan मिलेगा।",
]
cy = 1350
for line in checks:
    draw.ellipse((108, cy + 7, 124, cy + 23), fill=GREEN)
    draw.text((144, cy), line, font=font(23), fill=DARK)
    cy += 40

# Footer CTA
draw.rectangle((0, 1570, WIDTH, HEIGHT), fill=GREEN)
draw.text((72, 1600), "आज ही अपना योगदान दर्ज करें", font=font(39, True), fill=WHITE)
draw.text((72, 1662), "nyasa.xpresscure.com/contribute", font=font(31, True), fill="#f4d99e")
draw.text((710, 1604), "आज हम न्यासी हैं,", font=font(27), fill=WHITE)
draw.text((710, 1648), "कल हमारी संतानें होंगी।", font=font(27, True), fill=WHITE)
draw.text((710, 1694), "विरासत हमारी जिम्मेदारी है।", font=font(22), fill="#f4d99e")

png_path = OUT / "nyas-kosh-yogdaan-one-pager.png"
pdf_path = OUT / "nyas-kosh-yogdaan-one-pager.pdf"
canvas.save(png_path, optimize=True)
canvas.save(pdf_path, "PDF", resolution=150.0)
print(png_path)
print(pdf_path)

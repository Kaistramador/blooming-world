#!/usr/bin/env python3
"""Контрольный коллаж 10 фонов + конвертация в WebP для игры."""
from pathlib import Path
from PIL import Image

SRC = Path('/home/z/my-project/scripts/bw_assets/eras')
PUB = Path('/home/z/my-project/public/eras')
PUB.mkdir(parents=True, exist_ok=True)

# --- контактный лист 5x2 (проверка глазами) ---
thumb_w, thumb_h = 200, 350
sheet = Image.new('RGB', (thumb_w * 5, thumb_h * 2), '#222')
for i in range(10):
    im = Image.open(SRC / f'era-{i}.png').convert('RGB')
    im.thumbnail((thumb_w, thumb_h))
    x = (i % 5) * thumb_w + (thumb_w - im.width) // 2
    y = (i // 5) * thumb_h + (thumb_h - im.height) // 2
    sheet.paste(im, (x, y))
sheet.save('/home/z/my-project/scripts/bw_assets/eras_sheet.jpg', quality=80)
print('sheet ok')

# --- игровые WebP: 576x1008 (пропорция 4:7 ~ близко к 768x1344), q70 ---
total = 0
for i in range(10):
    im = Image.open(SRC / f'era-{i}.png').convert('RGB')
    im = im.resize((576, 1008), Image.LANCZOS)
    out = PUB / f'era-{i}.webp'
    im.save(out, 'WEBP', quality=70, method=6)
    kb = out.stat().st_size / 1024
    total += kb
    print(f'era-{i}.webp {kb:.0f} KB')
print(f'TOTAL {total:.0f} KB')

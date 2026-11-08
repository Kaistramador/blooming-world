#!/usr/bin/env bash
# ============================================================
# Волна 1 «Графика нового поколения»: генерация 10 фонов эр
# «Цветущий мир». Оригинальные сцены (§5.3 — никаких чужих
# ассетов/имён), портрет 768x1344 под мобильный экран.
# ============================================================
set -uo pipefail

OUT="/home/z/my-project/scripts/bw_assets/eras"
mkdir -p "$OUT"

STYLE="casual mobile match-3 game background art, portrait orientation, soft painterly digital illustration, clean uncluttered composition, no characters, no creatures, no text, no logos, no UI, high quality"

declare -a PROMPTS=(
  # 0 Пустошь — серый рассвет, тишина перед расцветом
  "muted barren rocky wasteland at dawn, grey and brown tones, dry cracked earth, sparse withered grass, distant foggy rock formations, soft haze, quiet melancholic mood, desaturated palette, $STYLE"
  # 1 Первые ростки — пиксельная эра
  "retro 16-bit pixel art style landscape, tiny green sprouts breaking through grey soil, blocky pixel clouds and pixel sun, morning light, hopeful mood, limited pixel palette, crisp pixel grid, $STYLE"
  # 2 Зелёный берег — 16 цветов, плоские формы
  "stylized flat vector landscape with simple rounded geometric shapes, green meadow shore with a small calm pond, bright cyan sky with simple clouds, cheerful clean mood, limited flat color palette, $STYLE"
  # 3 Роща — глянец
  "glossy cartoon vector grove, juicy saturated green trees with shiny gloss highlights, warm sunlight rays through leaves, rounded friendly shapes, vibrant vivid colors, $STYLE"
  # 4 Луг цветов — флэт и свет
  "modern casual game flower meadow, flat clean illustration, colorful field of daisies tulips and roses, light blue sky, soft airy sunlight, fresh cheerful mood, $STYLE"
  # 5 Светлый лес — пастель
  "soft pastel forest landscape, gentle gradient sky, tender sunbeams through soft-focus trees, delicate pink blue and mint pastel palette, dreamy peaceful mood, $STYLE"
  # 6 Волшебный сад — неон
  "magical night garden, glowing neon flowers, deep indigo starry sky, bioluminescent cyan and purple plants, soft glow bokeh, enchanting mysterious dark mood, $STYLE"
  # 7 Сумеречные поляны — стекло
  "twilight glade with translucent crystal glass flowers, purple and orange sunset sky, sparkling bokeh light, iridescent crystalline plants, dreamy elegant mood, $STYLE"
  # 8 Радужная долина
  "vivid rainbow valley, colorful blooming hills covered with flowers, bright sky with soft sun rays, festive joyful saturated colors, lively summer mood, $STYLE"
  # 9 Золотой сад — финал
  "magnificent golden hour garden in full bloom, lush roses peonies and golden flower arches, warm amber sunlight glow, luxurious grand finale mood, rich warm palette, $STYLE"
)

names=(barrens sprouts shore grove meadow forest enchanted twilight rainbow golden)

for i in "${!PROMPTS[@]}"; do
  f="$OUT/era-${i}.png"
  if [ -s "$f" ]; then echo "• era-${i} уже есть — пропуск"; continue; fi
  echo "→ era-${i} (${names[$i]}) …"
  for try in 1 2 3; do
    if z-ai image -p "${PROMPTS[$i]}" -o "$f" -s 768x1344 >/dev/null 2>&1 && [ -s "$f" ]; then
      echo "  ✓ era-${i} готово ($(du -h "$f" | cut -f1))"
      break
    fi
    echo "  ✗ попытка $try не удалась"; sleep $((try * 2))
  done
done
echo "=== Готово: $(ls "$OUT" | wc -l) из 10 фонов"

# -*- coding: utf-8 -*-
"""Charts for Blooming World market research PDF (Russian, DejaVu Sans).
Style per typesetting/charts.md: no top/right spines, dashed grid 20%,
donut hole 0.65, horizontal bars for long labels, blue family only."""
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.font_manager as fm
import matplotlib.pyplot as plt

fm.fontManager.addfont('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
fm.fontManager.addfont('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')
plt.rcParams['font.sans-serif'] = ['DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# Template 07 Crystal Blue body palette (fixed, per cover.md)
ACCENT   = '#2d7ab3'
DEEP     = '#1a4a7a'
LIGHT    = '#4da8da'
MUTED    = '#5a7a96'
TEXT     = '#142840'
GRIDC    = '#c0d0e2'
STRIPE   = '#eef3fa'

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bw_assets')
os.makedirs(OUT, exist_ok=True)


def style_ax(ax):
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color(GRIDC)
    ax.spines['bottom'].set_color(GRIDC)
    ax.tick_params(colors=MUTED, labelsize=10)
    for lbl in ax.get_xticklabels() + ax.get_yticklabels():
        lbl.set_color(TEXT)


# ---------- Chart 1: donut — match-3 share of puzzle revenue ----------
fig, ax = plt.subplots(figsize=(6.8, 3.4), dpi=200, constrained_layout=True)
vals = [53, 47]
labels = ['Match-3 (своп-головоломки)', 'Остальные поджанры']
colors = [ACCENT, STRIPE]
wedges, _ = ax.pie(vals, colors=colors, startangle=90, counterclock=False,
                   wedgeprops=dict(width=0.35, edgecolor='white', linewidth=2))
ax.text(0, 0.06, '53%', ha='center', va='center', fontsize=26,
        fontweight='bold', color=DEEP)
ax.text(0, -0.24, 'выручки жанра\nголоволомок', ha='center', va='center',
        fontsize=9, color=MUTED)
leg = ax.legend(wedges, labels, loc='center left', bbox_to_anchor=(1.02, 0.5),
                frameon=False, fontsize=10, handlelength=1.0, handleheight=1.0)
for t in leg.get_texts():
    t.set_color(TEXT)
fig.savefig(os.path.join(OUT, 'chart_donut.png'))
plt.close(fig)

# ---------- Chart 2: horizontal bar — annual IAP revenue 2024 ----------
fig, ax = plt.subplots(figsize=(7.6, 4.0), dpi=200, constrained_layout=True)
games = ['Royal Match*', 'Candy Crush Saga*', 'Gardenscapes', 'Toon Blast*',
         'Township', 'Homescapes', 'Fishdom']
revs = [1500, 1000, 442, 430, 413, 306, 295]
bar_colors = [ACCENT, ACCENT, DEEP, ACCENT, DEEP, DEEP, DEEP]
y = range(len(games))[::-1]
bars = ax.barh(list(y), revs, height=0.62, color=bar_colors, edgecolor='none')
ax.set_yticks(list(y))
ax.set_yticklabels(games, fontsize=10.5)
ax.set_xlabel('Оценка годовой IAP-выручки, $ млн', fontsize=10, color=MUTED)
for yi, v in zip(y, revs):
    ax.text(v + 18, yi, f'{v:,}'.replace(',', ' '), va='center',
            fontsize=9.5, color=TEXT)
ax.set_xlim(0, 1720)
ax.grid(axis='x', linestyle='--', linewidth=0.5, alpha=0.2, color=MUTED)
style_ax(ax)
ax.annotate('* оценка по открытым источникам (AppMagic, Business of Apps, GameLight)',
            xy=(0, -0.16), xycoords='axes fraction', fontsize=8.5, color=MUTED)
fig.savefig(os.path.join(OUT, 'chart_revenue.png'))
plt.close(fig)

# ---------- Chart 3: grouped bars — retention benchmarks ----------
fig, ax = plt.subplots(figsize=(7.4, 3.9), dpi=200, constrained_layout=True)
import numpy as np
groups = ['День 1 (D1)', 'День 7 (D7)', 'День 30 (D30)']
avg_v = [27.5, 12.5, 4.5]
good_v = [37.5, 20.0, 9.0]
top_v = [45.0, 25.0, 12.0]
x = np.arange(3)
w = 0.24
b1 = ax.bar(x - w, avg_v, w, label='Средний уровень', color=LIGHT)
b2 = ax.bar(x, good_v, w, label='Хороший уровень', color=ACCENT)
b3 = ax.bar(x + w, top_v, w, label='Топ-кварталь', color=DEEP)
for bars in (b1, b2, b3):
    for r in bars:
        ax.text(r.get_x() + r.get_width() / 2, r.get_height() + 0.7,
                f'{r.get_height():.0f}%', ha='center', fontsize=9, color=TEXT)
ax.set_xticks(x)
ax.set_xticklabels(groups, fontsize=11)
ax.set_ylabel('Удержание, %', fontsize=10, color=MUTED)
ax.set_ylim(0, 52)
ax.grid(axis='y', linestyle='--', linewidth=0.5, alpha=0.2, color=MUTED)
leg = ax.legend(loc='upper right', frameon=False, fontsize=10, ncol=1)
for t in leg.get_texts():
    t.set_color(TEXT)
style_ax(ax)
fig.savefig(os.path.join(OUT, 'chart_retention.png'))
plt.close(fig)

# ---------- Chart 4: horizontal bars — web platforms MAU ----------
fig, ax = plt.subplots(figsize=(7.4, 3.0), dpi=200, constrained_layout=True)
plats = ['Poki', 'Yandex Games', 'CrazyGames']
mau = [90, 45, 20]
y = range(len(plats))[::-1]
ax.barh(list(y), mau, height=0.55, color=[ACCENT, DEEP, LIGHT], edgecolor='none')
ax.set_yticks(list(y))
ax.set_yticklabels(plats, fontsize=11)
ax.set_xlabel('Месячная аудитория, млн игроков', fontsize=10, color=MUTED)
for yi, v in zip(y, mau):
    ax.text(v + 1.4, yi, f'{v} млн', va='center', fontsize=10, color=TEXT)
ax.set_xlim(0, 104)
ax.grid(axis='x', linestyle='--', linewidth=0.5, alpha=0.2, color=MUTED)
style_ax(ax)
fig.savefig(os.path.join(OUT, 'chart_platforms.png'))
plt.close(fig)

print('charts saved to', OUT)
for f in sorted(os.listdir(OUT)):
    print(' -', f, os.path.getsize(os.path.join(OUT, f)))

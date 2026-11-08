# -*- coding: utf-8 -*-
"""Merge cover + body into final Blooming World research PDF (A4-normalized)."""
from pypdf import PdfReader, PdfWriter

A4_W, A4_H = 595.28, 841.89
COVER = '/tmp/bw_cover.pdf'
BODY = '/tmp/bw_body.pdf'
OUT = '/home/z/my-project/download/Цветущий_мир_исследование_и_роадмап.pdf'

def normalize(page):
    w, h = float(page.mediabox.width), float(page.mediabox.height)
    if abs(w - A4_W) > 0.1 or abs(h - A4_H) > 0.1:
        page.scale_to(A4_W, A4_H)
        page.mediabox.lower_left = (0, 0)
        page.mediabox.upper_right = (A4_W, A4_H)
    return page

writer = PdfWriter()
writer.add_page(normalize(PdfReader(COVER).pages[0]))
for p in PdfReader(BODY).pages:
    writer.add_page(normalize(p))
writer.add_metadata({
    '/Title': 'Цветущий мир - исследование конкурентов и план развития',
    '/Author': 'Z.ai',
    '/Creator': 'Z.ai',
    '/Subject': 'Конкурентный анализ жанра match-3 и роадмап развития Blooming World',
})
with open(OUT, 'wb') as f:
    writer.write(f)
print('final ->', OUT, len(writer.pages), 'pages')

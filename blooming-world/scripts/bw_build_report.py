# -*- coding: utf-8 -*-
"""Blooming World research PDF - body builder (ReportLab, Report brief).
Template 07 Crystal Blue body palette (fixed per typesetting/cover.md)."""
import os, sys, hashlib

SKILL_SCRIPTS = '/home/z/my-project/skills/pdf/scripts'
sys.path.insert(0, SKILL_SCRIPTS)
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, PageBreak, Image, KeepTogether,
                                CondPageBreak, HRFlowable)
from reportlab.platypus.tableofcontents import TableOfContents
from PIL import Image as PILImage

# ---------------- fonts ----------------
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold',
                   italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

from pdf import install_font_fallback
install_font_fallback()

# ---------------- palette: Template 07 Crystal Blue body (fixed) ----------------
PAGE_BG      = colors.HexColor('#f5f8fc')
SECTION_BG   = colors.HexColor('#edf2f9')
CARD_BG      = colors.HexColor('#e4ecf5')
TABLE_STRIPE = colors.HexColor('#eef3fa')
HEADER_FILL  = colors.HexColor('#1a4a7a')
BORDER       = colors.HexColor('#c0d0e2')
ACCENT       = colors.HexColor('#2d7ab3')
TEXT_PRIMARY = colors.HexColor('#142840')
TEXT_MUTED   = colors.HexColor('#5a7a96')

# ---------------- layout ----------------
MARGIN = 2.0 * cm
PAGE_W, PAGE_H = A4
AVAIL_W = PAGE_W - 2 * MARGIN
AVAIL_H = PAGE_H - 2 * MARGIN
H1_THRESHOLD = AVAIL_H * 0.25
MAX_KEEP = PAGE_H * 0.4

DOC_TITLE = 'Цветущий мир - исследование конкурентов и план развития'
FOOTER_LEFT = 'Blooming World · Kaistramador'  # fixed below
OUT_BODY = '/tmp/bw_body.pdf'
ASSETS = os.path.join(HERE, 'bw_assets')

# ---------------- styles ----------------
S = {}
S['h1'] = ParagraphStyle('H1', fontName='FreeSerif', fontSize=22, leading=27,
                         textColor=HEADER_FILL, spaceBefore=18, spaceAfter=4)
S['h2'] = ParagraphStyle('H2', fontName='FreeSerif', fontSize=15, leading=20,
                         textColor=TEXT_PRIMARY, spaceBefore=16, spaceAfter=8)
S['h3'] = ParagraphStyle('H3', fontName='FreeSerif', fontSize=11.5, leading=16,
                         textColor=TEXT_PRIMARY, spaceBefore=12, spaceAfter=6)
S['body'] = ParagraphStyle('Body', fontName='FreeSerif', fontSize=10.5, leading=17,
                           textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=10)
S['bullet'] = ParagraphStyle('Bullet', parent=S['body'], leftIndent=16,
                             firstLineIndent=-10, spaceAfter=6, alignment=TA_LEFT)
S['numitem'] = ParagraphStyle('NumItem', parent=S['body'], fontSize=9.5, leading=14,
                              leftIndent=18, firstLineIndent=-18, spaceAfter=6,
                              alignment=TA_LEFT, wordWrap='CJK')
S['caption'] = ParagraphStyle('Caption', fontName='FreeSerif', fontSize=8.5, leading=12,
                              textColor=TEXT_MUTED, alignment=TA_CENTER,
                              spaceBefore=3, spaceAfter=6)
S['th'] = ParagraphStyle('TH', fontName='FreeSerif', fontSize=9.5, leading=12.5,
                         textColor=colors.white, alignment=TA_CENTER)
S['td'] = ParagraphStyle('TD', fontName='FreeSerif', fontSize=9, leading=12.5,
                         textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK')
S['stat'] = ParagraphStyle('Stat', fontName='FreeSerif', fontSize=15, leading=19,
                           textColor=ACCENT, alignment=TA_CENTER, wordWrap='CJK')
S['toc_title'] = ParagraphStyle('TocTitle', fontName='FreeSerif', fontSize=20,
                                leading=26, textColor=HEADER_FILL, spaceAfter=14)
S['note'] = ParagraphStyle('Note', fontName='FreeSerif-Italic', fontSize=9, leading=13,
                           textColor=TEXT_MUTED, alignment=TA_LEFT, spaceAfter=8)

# ---------------- doc template ----------------
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text, key, level=level, closed=False)


def paint_page(canvas, doc):
    canvas.saveState()
    # full-page background (Template 07 light-blue body)
    canvas.setFillColor(PAGE_BG)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # header: title left + accent rule
    canvas.setFont('FreeSerif', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, PAGE_H - MARGIN + 16, DOC_TITLE)
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(1.2)
    canvas.line(MARGIN, PAGE_H - MARGIN + 10, PAGE_W - MARGIN, PAGE_H - MARGIN + 10)
    # footer: author left + page right + light rule
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, MARGIN - 12, PAGE_W - MARGIN, MARGIN - 12)
    canvas.setFont('FreeSerif', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, MARGIN - 24, 'Blooming World · Kaistramador')
    canvas.drawRightString(PAGE_W - MARGIN, MARGIN - 24, str(doc.page))
    canvas.restoreState()


# ---------------- helpers ----------------
def heading(text, level):
    key = 'h_' + hashlib.md5(text.encode()).hexdigest()[:8]
    style = S['h1'] if level == 0 else (S['h2'] if level == 1 else S['h3'])
    p = Paragraph('<a name="%s"/><b>%s</b>' % (key, text), style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p


def safe_keep(elements):
    total = 0
    for el in elements:
        w, h = el.wrap(AVAIL_W, PAGE_H)
        total += h
    if total <= MAX_KEEP:
        return [KeepTogether(elements)]
    if len(elements) >= 2:
        return [KeepTogether(elements[:2])] + list(elements[2:])
    return list(elements)


def embed_chart(fname, max_h):
    path = os.path.join(ASSETS, fname)
    pw, ph = PILImage.open(path).size
    max_w = AVAIL_W * 0.94
    ratio = min(max_w / pw, max_h / ph, 1.0)
    return Image(path, width=pw * ratio, height=ph * ratio)


def make_table(caption, headers, rows, ratios):
    width = AVAIL_W * 0.98
    col_w = [r * width for r in ratios]
    data = [[Paragraph('<b>%s</b>' % h, S['th']) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), S['td']) for c in row])
    t = Table(data, colWidths=col_w, hAlign='CENTER', repeatRows=1)
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        style.append(('BACKGROUND', (0, i), (-1, i),
                      colors.white if i % 2 == 1 else TABLE_STRIPE))
    t.setStyle(TableStyle(style))
    cap = Paragraph(caption, S['caption'])
    return [Spacer(1, 12), t, Spacer(1, 4), cap, Spacer(1, 12)]


def make_stats(items):
    n = len(items)
    cells = []
    for value, label in items:
        cells.append(Paragraph(
            '<b><font size="15" color="#2d7ab3">%s</font></b><br/>'
            '<font size="8" color="#5a7a96">%s</font>' % (value, label), S['stat']))
    t = Table([cells], colWidths=[AVAIL_W * 0.98 / n] * n, hAlign='CENTER')
    style = [('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
             ('TOPPADDING', (0, 0), (-1, -1), 10),
             ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
             ('LEFTPADDING', (0, 0), (-1, -1), 8),
             ('RIGHTPADDING', (0, 0), (-1, -1), 8)]
    for i in range(n):
        style.append(('BACKGROUND', (i, 0), (i, 0), CARD_BG))
        style.append(('BOX', (i, 0), (i, 0), 1, ACCENT))
    t.setStyle(TableStyle(style))
    return [Spacer(1, 8), t, Spacer(1, 12)]


# ---------------- build story ----------------
from bw_content_a import BLOCKS_A
from bw_content_b import BLOCKS_B

story = []
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle('TOC1', fontName='FreeSerif-Bold', fontSize=11.5, leading=18,
                   leftIndent=6, textColor=TEXT_PRIMARY, spaceBefore=4),
    ParagraphStyle('TOC2', fontName='FreeSerif', fontSize=10, leading=15,
                   leftIndent=22, textColor=TEXT_PRIMARY),
]
story.append(Paragraph('<b>Оглавление</b>', S['toc_title']))
story.append(HRFlowable(width='100%', color=ACCENT, thickness=1.2,
                        spaceBefore=0, spaceAfter=10))
story.append(toc)
story.append(PageBreak())

h1_count = 0
blocks = BLOCKS_A + BLOCKS_B
i = 0
while i < len(blocks):
    b = blocks[i]
    kind = b[0]
    if kind == 'h1':
        h1_count += 1
        text = '%d. %s' % (h1_count, b[1])
        h = heading(text, 0)
        rule = HRFlowable(width='100%', color=ACCENT, thickness=1.6,
                          spaceBefore=2, spaceAfter=10)
        nxt = []
        if i + 1 < len(blocks) and blocks[i + 1][0] == 'body':
            nxt = [Paragraph(blocks[i + 1][1], S['body'])]
            i += 1
        story.append(CondPageBreak(H1_THRESHOLD))
        story.extend(safe_keep([h, rule] + nxt))
    elif kind == 'h2':
        h = heading(b[1], 1)
        nxt = []
        if i + 1 < len(blocks) and blocks[i + 1][0] == 'body':
            nxt = [Paragraph(blocks[i + 1][1], S['body'])]
            i += 1
        story.extend(safe_keep([h] + nxt))
    elif kind == 'h3':
        story.extend(safe_keep([heading(b[1], 2)]))
    elif kind == 'body':
        story.append(Paragraph(b[1], S['body']))
    elif kind == 'note':
        story.append(Paragraph(b[1], S['note']))
    elif kind == 'bullets':
        for item in b[1]:
            story.append(Paragraph('•  ' + item, S['bullet']))
        story.append(Spacer(1, 6))
    elif kind == 'numlist':
        for n_i, item in enumerate(b[1], 1):
            story.append(Paragraph('%d.  %s' % (n_i, item), S['numitem']))
        story.append(Spacer(1, 6))
    elif kind == 'stats':
        story.extend(make_stats(b[1]))
    elif kind == 'table':
        story.extend(make_table(b[1], b[2], b[3], b[4]))
    elif kind == 'chart':
        img = embed_chart(b[1], b[3])
        cap = Paragraph(b[2], S['caption'])
        story.append(Spacer(1, 14))
        story.extend(safe_keep([img, Spacer(1, 6), cap]))
        story.append(Spacer(1, 14))
    i += 1

doc = TocDocTemplate(OUT_BODY, pagesize=A4,
                     leftMargin=MARGIN, rightMargin=MARGIN,
                     topMargin=MARGIN + 10, bottomMargin=MARGIN + 8,
                     title=DOC_TITLE, author='Z.ai', creator='Z.ai',
                     subject='Конкурентный анализ жанра match-3 и роадмап развития')
doc.multiBuild(story, onFirstPage=paint_page, onLaterPages=paint_page)
print('body pages OK ->', OUT_BODY)

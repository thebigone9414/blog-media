#!/usr/bin/env python3
# MindLumi 블로그 인포그래픽 생성기
#   감리 쪽 템플릿 구조(헤더 / 번호 섹션 / 강조 박스 / 출처 푸터)를 가져오되 팔레트는 MindLumi.
#   ⛔ 외부 이미지 없음 - 전부 도형과 글자로 그린다(저작권 안전·재생성 가능).
from PIL import Image, ImageDraw, ImageFont

W, H = 2000, 2560
NAVY   = (15, 23, 42)       # 본문 제목
BLUE   = (37, 99, 235)      # 브랜드 블루
BLUE_L = (219, 234, 254)    # 연한 블루 배경
BLUE_M = (147, 197, 253)
GRAY   = (100, 116, 139)
GRAY_L = (241, 245, 249)
LINE   = (226, 232, 240)
WHITE  = (255, 255, 255)
RED    = (190, 24, 93)      # 화기 강조

FB = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
FR = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
FM = '/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc'
def f(path, size): return ImageFont.truetype(path, size, index=1)   # index 1 = KR

img = Image.new('RGB', (W, H), WHITE)
d = ImageDraw.Draw(img)
M = 110   # 좌우 여백

def text(xy, s, font, fill=NAVY, anchor='la'):
    d.text(xy, s, font=font, fill=fill, anchor=anchor)

def wrap(s, font, maxw):
    out, line = [], ''
    for ch in s:
        if d.textlength(line + ch, font=font) > maxw and line:
            out.append(line); line = ch
        else:
            line += ch
    if line: out.append(line)
    return out

# ── 헤더 ────────────────────────────────────────────────
text((M, 95), 'MindLumi · 자미두수 해석', f(FM, 36), BLUE)
y = 160
for ln in ['횡발을 만든', '그 자리가 움직였다']:
    text((M, y), ln, f(FB, 112), NAVY); y += 132
text((M, y + 14), '원반에는 없던 격이 제2명반에서 완성된다 - 그리고 그 자리가 해마다 다시 흔들린다', f(FR, 40), GRAY)
d.rounded_rectangle([M, y + 100, M + 170, y + 112], 6, fill=BLUE)

# ── ① 원래 자리 ──────────────────────────────────────────
y = 640
d.ellipse([M, y + 14, M + 22, y + 36], fill=BLUE)
text((M + 48, y), '① 원반 - 부처궁은 결별의 자리로만 읽힌다', f(FB, 56), NAVY)

y += 110
CW = (W - 2 * M - 60) // 2
# 왼쪽 카드 - 천이궁
d.rounded_rectangle([M, y, M + CW, y + 330], 24, fill=GRAY_L)
text((M + 46, y + 44), '부처궁 (酉) · 원반', f(FB, 46), NAVY)
text((M + 46, y + 108), '배우자 · 짝의 자리', f(FR, 34), GRAY)
d.rounded_rectangle([M + 46, y + 170, M + 46 + 190, y + 238], 14, fill=BLUE)
text((M + 141, y + 204), '화성', f(FB, 40), WHITE, anchor='mm')
text((M + 266, y + 186), '무곡 · 칠살', f(FR, 32), GRAY)
text((M + 46, y + 264), '금 기운이 금 자리에 - 다툼과 결별로 읽힌다', f(FM, 32), NAVY)

# 오른쪽 카드 - 부처궁
X2 = M + CW + 60
d.rounded_rectangle([X2, y, X2 + CW, y + 330], 24, fill=GRAY_L)
text((X2 + 46, y + 44), '천이궁 (巳) · 원반', f(FB, 46), NAVY)
text((X2 + 46, y + 108), '바깥 · 이동 · 사회 활동', f(FR, 34), GRAY)
d.rounded_rectangle([X2 + 46, y + 170, X2 + 46 + 300, y + 238], 14, fill=RED)
text((X2 + 196, y + 204), '탐랑 + 화기', f(FB, 40), WHITE, anchor='mm')
text((X2 + 376, y + 186), '염정', f(FR, 32), GRAY)
text((X2 + 46, y + 264), '탐랑은 바깥에 있다 - 화탐격은 없다', f(FM, 32), NAVY)

text((W // 2, y + 380), '원반만 보면 가장 크게 열린 자리를 통째로 놓친다', f(FM, 38), GRAY, anchor='ma')

# ── ② 2026년 이동 ────────────────────────────────────────
y = 1200
d.ellipse([M, y + 14, M + 22, y + 36], fill=BLUE)
text((M + 48, y), '② 제2명반을 겹치면 - 화탐격이 완성된다', f(FB, 56), NAVY)

y += 120
d.rounded_rectangle([M, y, W - M, y + 300], 24, fill=BLUE_L)
# 이동 화살표
ax0, ax1, ay = M + 120, W - M - 120, y + 110
d.line([ax0, ay, ax1 - 40, ay], fill=BLUE, width=8)
d.polygon([(ax1 - 40, ay - 26), (ax1, ay), (ax1 - 40, ay + 26)], fill=BLUE)
d.ellipse([ax0 - 26, ay - 26, ax0 + 26, ay + 26], fill=BLUE)
text((ax0, ay - 64), '제2명반 천이궁', f(FB, 38), NAVY, anchor='mb')
text((ax1, ay - 64), '제2명반 부처궁', f(FB, 38), NAVY, anchor='mb')
text((W // 2, ay - 70), '탐랑(화기) 이 부처궁으로 옮겨가 있다', f(FB, 42), BLUE, anchor='mb')
text((W // 2, ay + 56), '원반의 화성 + 제2명반의 탐랑 = 한 자리에서 만난다', f(FM, 36), NAVY, anchor='ma')
text((W // 2, ay + 118), '화탐격 (火貪格) - 평생 구조로 이미 서 있다', f(FB, 44), NAVY, anchor='ma')

# ── ③ 횡발횡파 ───────────────────────────────────────────
y = 1680
d.ellipse([M, y + 14, M + 22, y + 36], fill=BLUE)
text((M + 48, y), '③ 2026년 하반기 - 그 자리가 한 번 더 겹친다', f(FB, 56), NAVY)

y += 116
bw = (W - 2 * M - 60) // 2
d.rounded_rectangle([M, y, M + bw, y + 210], 20, outline=LINE, width=3)
text((M + 44, y + 44), '소한 하반 부처궁', f(FB, 46), BLUE)
text((M + 44, y + 112), '탐랑(화기) 이 또 들어온다 · 천요 동반', f(FR, 36), GRAY)
text((M + 44, y + 158), '같은 자리가 세 겹', f(FB, 38), NAVY)

d.rounded_rectangle([M + bw + 60, y, W - M, y + 210], 20, outline=LINE, width=3)
text((M + bw + 104, y + 44), '상반기는 달랐다', f(FB, 46), GRAY)
text((M + bw + 104, y + 112), '파군이 화록을 달고 들어와', f(FR, 36), GRAY)
text((M + bw + 104, y + 158), '오히려 열리는 쪽', f(FB, 38), NAVY)

# 강조 박스
y += 270
d.rounded_rectangle([M, y, W - M, y + 180], 24, fill=NAVY)
d.rounded_rectangle([M + 44, y + 58, M + 44 + 210, y + 122], 14, fill=BLUE_M)
text((M + 149, y + 90), '횡발횡파', f(FB, 40), NAVY, anchor='mm')
for i, ln in enumerate(['터지는 힘과 무너지는 힘이 다른 별에서 오는 것이 아니다.',
                        '같은 별에서 나온다 - 크게 열렸던 자리가 그대로 흔들린다.']):
    text((M + 300, y + 54 + i * 50), ln, f(FM, 38), WHITE)

# ── 푸터 ────────────────────────────────────────────────
y = H - 230
d.line([M, y, W - M, y], fill=LINE, width=3)
text((M, y + 40), '명반 기준  1963.2.17 양력 묘시 · 수2국 · 명궁 해궁 / 2026 병오소한 64세 하반기', f(FR, 32), GRAY)
text((M, y + 92), '해석은 자미두수 명반에 따른 것이며 특정 개인의 사생활을 단정하지 않습니다. 투자 판단에 대한 조언이 아닙니다.', f(FR, 30), GRAY)
text((M, y + 150), '원반만으로는 보이지 않는 구조가 있다 - 제2명반을 겹쳐야 보인다', f(FB, 38), BLUE)

img.save('/home/claude/blog-media/mindlumi/jensen-move.png', optimize=True)
print('saved', img.size)

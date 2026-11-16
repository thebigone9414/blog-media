import json,sys
from PIL import Image, ImageDraw, ImageFont
W=1600; M=90
NAVY=(15,23,42);BLUE=(37,99,235);BLUE_L=(219,234,254);GRAY=(100,116,139);GRAY_L=(241,245,249);WHITE=(255,255,255);RED=(190,24,93);LINE=(226,232,240)
FB='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc';FR='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc';FM='/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc'
def f(p,s): return ImageFont.truetype(p,s,index=1)
tmp=ImageDraw.Draw(Image.new('RGB',(10,10)))
def wrap(s,font,maxw):
    out=[];line=''
    for w in s.split(' '):
        t=(line+' '+w).strip()
        if tmp.textlength(t,font=font)>maxw and line: out.append(line); line=w
        else: line=t
    if line: out.append(line)
    return out
def render(spec,out):
    cards=spec['cards']; n=len(cards); gap=70 if spec.get('arrow') else 40
    CW=(W-2*M-gap*(n-1))//n; pad=38
    hs=[]
    for c in cards:
        h=pad+52+14
        for ln in wrap(c.get('sub',''),f(FR,28),CW-2*pad): h+=38
        h+=22
        x=0;rows=1
        for t,_ in c.get('chips',[]):
            w=tmp.textlength(t,font=f(FB,32))+48
            if x+w>CW-2*pad and x>0: rows+=1;x=0
            x+=w+14
        if c.get('chips'): h+=rows*72+10
        for ln in wrap(c.get('note',''),f(FM,28),CW-2*pad): h+=40
        hs.append(h+pad)
    CH=max(hs)
    tl=wrap(spec['title'],f(FB,64),W-2*M); sl=wrap(spec.get('sub',''),f(FR,30),W-2*M)
    top=70+50+len(tl)*82+len(sl)*44+50
    H=top+CH+50+(70 if spec.get('foot') else 0)+60
    img=Image.new('RGB',(W,H),WHITE); d=ImageDraw.Draw(img)
    d.text((M,70),'MindLumi · 자미두수 해석',font=f(FM,30),fill=BLUE)
    y=126
    for ln in tl: d.text((M,y),ln,font=f(FB,64),fill=NAVY); y+=82
    for ln in sl: d.text((M,y+6),ln,font=f(FR,30),fill=GRAY); y+=44
    d.rounded_rectangle([M,y+18,M+130,y+28],5,fill=BLUE)
    y=top
    for i,c in enumerate(cards):
        x0=M+i*(CW+gap); hl=c.get('hl')
        d.rounded_rectangle([x0,y,x0+CW,y+CH],22,fill=BLUE_L if hl else GRAY_L)
        cy=y+pad
        d.text((x0+pad,cy),c['head'],font=f(FB,40),fill=NAVY); cy+=52+14
        for ln in wrap(c.get('sub',''),f(FR,28),CW-2*pad): d.text((x0+pad,cy),ln,font=f(FR,28),fill=GRAY); cy+=38
        cy+=22
        if c.get('chips'):
            x=0
            for t,col in c['chips']:
                w=tmp.textlength(t,font=f(FB,32))+48
                if x+w>CW-2*pad and x>0: cy+=72;x=0
                fill={'blue':BLUE,'red':RED,'navy':NAVY,'gray':GRAY}[col]
                d.rounded_rectangle([x0+pad+x,cy,x0+pad+x+w,cy+58],12,fill=fill)
                d.text((x0+pad+x+w/2,cy+28),t,font=f(FB,32),fill=WHITE,anchor='mm'); x+=w+14
            cy+=72+10
        for ln in wrap(c.get('note',''),f(FM,28),CW-2*pad): d.text((x0+pad,cy),ln,font=f(FM,28),fill=NAVY); cy+=40
        if spec.get('arrow') and i<n-1:
            ax=x0+CW+gap/2; ay=y+CH/2
            d.polygon([(ax-16,ay-22),(ax+18,ay),(ax-16,ay+22)],fill=BLUE)
    if spec.get('foot'):
        fy=y+CH+50; d.line([M,fy,W-M,fy],fill=LINE,width=2)
        d.text((M,fy+20),spec['foot'],font=f(FR,24),fill=GRAY)
    img.save(out)
specs=json.load(open(sys.argv[1]))
for k,s in specs.items(): render(s,f"{sys.argv[2]}/{k}.png")

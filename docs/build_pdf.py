#!/usr/bin/env python3
# Build docs/Putopia-AIGC-Asset-Brief.pdf from the production-DB architect data
# and the device/world-view setting. Reportlab + bundled STSong-Light (CJK embed).
# Avatars: docs/assets/sq-*.png (square crops). Run: python3 docs/build_pdf.py
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
    Spacer, Table, TableStyle, Image, KeepTogether, PageBreak)
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
CJK = 'STSong-Light'; MONO = 'Courier'

# Canonical brand palette (docs/design-system.md): orange + deep-space blue +
# off-white. No grey, no cyan. ACCENT = primary nucleus orange; H2 = burnt orange.
BG=colors.HexColor('#0A0E27'); PANEL=colors.HexColor('#13182E')   # deep / void
PRE=colors.HexColor('#0F1430'); BORDER=colors.HexColor('#242A45') # bg-panel / faint
ACCENT=colors.HexColor('#FF6B35'); ORANGE=colors.HexColor('#E85D04')  # nucleus / burnt
TEXT=colors.HexColor('#F5F5F5'); MUT=colors.Color(245/255,245/255,245/255,alpha=0.55)
PRETXT=colors.HexColor('#FF8A5C'); BIO=colors.Color(245/255,245/255,245/255,alpha=0.82)

def S(name, **kw):
    base=dict(fontName=CJK,fontSize=9.3,leading=14,textColor=TEXT,spaceBefore=2,spaceAfter=2)
    base.update(kw); return ParagraphStyle(name,**base)

st_title=S('t',fontSize=22,leading=26,textColor=ACCENT,spaceAfter=2)
st_sub=S('sub',fontSize=8.6,leading=12,textColor=MUT,spaceAfter=2)
st_h2=S('h2',fontSize=15,leading=19,textColor=ORANGE,spaceBefore=12,spaceAfter=4)
st_h3=S('h3',fontSize=12,leading=15,textColor=ACCENT,spaceBefore=8,spaceAfter=3)
st_h4=S('h4',fontSize=10,leading=13,textColor=ACCENT,spaceBefore=6,spaceAfter=2)
st_body=S('b',fontSize=9.3,leading=13.5,textColor=TEXT)
st_note=S('n',fontSize=8.8,leading=12.5,textColor=MUT)
st_pre=S('pre',fontName=MONO,fontSize=7.8,leading=10.5,textColor=PRETXT)
st_name=S('nm',fontSize=12,leading=14,textColor=ACCENT)
st_stat=S('stt',fontSize=8,leading=11,textColor=MUT)
st_bio=S('bio',fontSize=8.4,leading=11.5,textColor=BIO)
st_kw=S('kw',fontSize=8.2,leading=11,textColor=colors.Color(245/255,245/255,245/255,alpha=0.62))
st_label=S('lb',fontSize=8.4,leading=11,textColor=ACCENT)
st_th=S('th',fontSize=8.4,leading=11,textColor=ACCENT)
st_td=S('td',fontSize=8,leading=10.5,textColor=TEXT)

SX='[+ append the global style suffix from section 0]'
def mono(s):  # Courier has no CJK / fancy glyphs
    return s.replace('—','-').replace('½','.5')

def pre_block(txt):
    t=Table([[Paragraph(mono(txt).replace('\n','<br/>'),st_pre)]],colWidths=[178*mm-12])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PRE),('BOX',(0,0),(-1,-1),0.5,BORDER),
        ('LINEBEFORE',(0,0),(0,-1),2,ACCENT),('LEFTPADDING',(0,0),(-1,-1),9),
        ('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
    return t

def quote(txt):
    t=Table([[Paragraph(txt,st_body)]],colWidths=[178*mm-12])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#1C1708')),
        ('LINEBEFORE',(0,0),(0,-1),2.5,ORANGE),('LEFTPADDING',(0,0),(-1,-1),9),
        ('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
        ('TEXTCOLOR',(0,0),(-1,-1),BIO)]))
    return t

story=[]
def H2(t): story.append(Paragraph(t,st_h2))
def H3(t): story.append(Paragraph(t,st_h3))
def H4(t): story.append(Paragraph(t,st_h4))
def P(t,s=st_body): story.append(Paragraph(t,s))
def SP(h=4): story.append(Spacer(1,h))

story.append(Paragraph('Putopia / Multiverse Collective',st_title))
story.append(Paragraph('AIGC 图像生成素材手册 · 四大设备功能 + 全部 Architect 档案 · '
    '数据源：生产数据库 voyager_profiles · content/devices.ts · studio 世界观设定',st_sub))
story.append(Table([['']],colWidths=[178*mm],style=[('LINEBELOW',(0,0),(-1,-1),0.6,BORDER)]))
SP(6)

H2('0 · 全局视觉基调（所有图像必须遵循）')
P('整个品牌的视觉锚点。生成任何图片前都应附加这段风格描述，确保画面统一。以下为代码库逐字定义。')
def sw(hexv,label,brd=None):
    box=Table([['']],colWidths=[52*mm],rowHeights=[16],
        style=[('BACKGROUND',(0,0),(-1,-1),colors.HexColor(hexv)),
               ('BOX',(0,0),(-1,-1),0.5,BORDER if not brd else colors.HexColor(brd))])
    return [box,Spacer(1,2),Paragraph(label,st_note)]
swt=Table([[sw('#0A0E27','deep-space blue&nbsp;&nbsp;#0A0E27','#2A2F45'),
            sw('#FF6B35','retro orange&nbsp;&nbsp;#FF6B35'),
            sw('#E85D04','burnt orange&nbsp;&nbsp;#E85D04')]],
    colWidths=[58*mm,58*mm,58*mm])
swt.setStyle(TableStyle([('LEFTPADDING',(0,0),(-1,-1),0),('TOPPADDING',(0,0),(-1,-1),4),
    ('BOTTOMPADDING',(0,0),(-1,-1),4),('VALIGN',(0,0),(-1,-1),'TOP')]))
story.append(swt)
for b in ['硬件：复古未来主义模拟硬件 · 屏幕：CRT 质感 + 扫描线颗粒',
          '尺度/景深：宇宙级尺度感 + 电影级浅景深',
          '风格参考：《银翼杀手 2049》调色 · 复古 NASA 控制室美学 · Lo-fi 科幻硬件摄影',
          '<font color="#E85D04">避免</font>：泛泛「太空背景」、纯白背景、卡通感、廉价图库摆拍感']:
    P('· '+b)
H4('通用风格后缀（English, append to every prompt）')
story.append(pre_block(
"deep-space-blue background #0A0E27, retro-futuristic analog hardware,\n"
"retro-orange #FF6B35 and burnt-orange #E85D04 accent lighting, off-white #F5F5F5 highlights,\n"
"CRT display with scan-line grain, cinematic depth of field, cosmic scale,\n"
"Blade Runner 2049 color grading, retro NASA control-room aesthetic,\n"
"lo-fi sci-fi hardware photography, photorealistic, no text, no logo"))

H2('1 · 核心设备 Multiverse Console（多元宇宙终端）')
P('神秘的平行世界通讯装置。全球已知约 <b>20 台</b>，来源不明（很可能经由量子能量从另一个世界传输而来）。'
  '模块化，可接入能量弹夹与扩展配件；<b>每一台都残留着历代持有者的痕迹与记忆</b>。')
story.append(quote('「你可以说它有点像收音机，但它有一块非常奇特的屏幕；你可以说它是电视，但它不像传统电视那样调台，'
  '也没有任何『智能』功能；你也可以叫它显示器，然而它显示的内容是非现实的，甚至充满了不确定性。」'))
SP(3)
P('<b>关键外观元素：</b> 奇特非现实的屏幕 · 两侧旋钮（转动搜索信号）· 红色警示灯（连接建立时闪烁、设备轻微震颤）'
  '· Quantum Energy Button 量子能量按钮（长按录音，伴「beep」提示音）。')
story.append(pre_block(
"A mysterious parallel-world communication console, hybrid of a vintage radio,\n"
"an old television, and a CRT monitor, but unmistakably otherworldly. Heavy\n"
"analog hardware with two large tuning knobs on either side, a single red\n"
'warning light, and a prominent "quantum energy" press button. The screen shows\n'
"unreal, uncertain imagery. Worn, well-used, carries traces of past owners. "+SX))

H3('设备的四大功能 · FOUR DEVICE FUNCTIONS')
story.append(quote('官方设定（逐字）：spatial signal detection across frequency bands · quantum energy discharge '
  '· transtemporal audio transmission · inner voice reception from intelligent life in other worlds.'))
SP(2)
funcs=[('① 空间信号侦测 · Spatial Signal Detection',
  '跨频段扫描捕捉其他世界信号——转旋钮、在频段间搜索，直到屏上浮现「本不该看见的世界」。强调搜索 / 调谐 / 噪点中浮现图像。',
  "Close-up of hands turning the dual tuning knobs of the Multiverse Console,\n"
  "CRT screen resolving from static snow into the faint outline of another world,\n"
  "amber/orange signal waveform sweeping across a frequency spectrum, scan-line grain,\n"
  "tense moment of first detection. "+SX),
 ('② 量子能量释放 · Quantum Energy Discharge',
  '释放量子能量以强化、稳定跨世界连接；建立连接会在操作者周围形成一圈稳定能量场。强调能量迸发 / 场域 / 橙色核心辉光。',
  "The Multiverse Console discharging a burst of quantum energy, nucleus-orange\n"
  "#FF6B35 glow erupting from its core and the quantum-energy button, expanding\n"
  "into a stabilizing energy field / halo around the operator, particles and light\n"
  "folds, dramatic volumetric lighting against deep void black. "+SX),
 ('③ 跨时空语音传输 · Transtemporal Audio Transmission',
  '长按量子能量按钮录音并发送，可跨越时间传给另一个世界的人（故事中向 121 年后的「自己」发出第一条语音）。强调录音瞬间 / 声波跨越时间 / 红灯亮起确认连接。',
  "A finger pressing and holding the glowing quantum-energy button of the Multiverse\n"
  "Console, red warning light lit, a voice/sound wave traveling from the device into\n"
  "the CRT screen toward a person from a different era, a future timestamp glowing in\n"
  "the screen corner, intimate and quiet, scan-line grain. "+SX),
 ('④ 异世界内心之声接收 · Inner-Voice Reception',
  '接收其他世界智慧生命的内心之声——对方嘴唇不动，操作者却直接「听见」其脑海想法。强调无声心灵感应 / 屏中人凝视 / 思绪以青色光丝流入。',
  "A person inside the Console's CRT screen looking directly at the viewer, lips\n"
  "closed and still, glowing orange threads of thought streaming from their head through\n"
  "the glass into the real world, telepathic inner voice made visible, the device's\n"
  "red connection light steadily on, eerie and intimate. "+SX)]
for title,desc,pr in funcs:
    story.append(KeepTogether([Paragraph(title,st_h4),Paragraph(desc,st_note),pre_block(pr)]))

H3('已知的四台具体设备（场景 / 编号差异化）')
rows=[[Paragraph('编号 / 别名',st_th),Paragraph('地点',st_th),Paragraph('状态',st_th),Paragraph('设定描述',st_th)]]
for a,b,c,d in [
 ('Unit 001 · The Originator 始源者','Berlin','IN USE','记录中最古老的 Console，曾被一位德国 Voyager 持有 20 年，现重新流转。沧桑、有历史感。'),
 ('Unit 012 · The Observer 观察者','Shanghai','IN USE','朋友间相赠；建立史上首条确认的跨时空量子连接。带情感温度。'),
 ('Unit 019 · The Wanderer 漫游者','Tokyo','AVAILABLE','从废弃邮政储物柜寻回，功能正常，等待分配。来历神秘。'),
 ('Unit 023 · The Broken Eye 破碎之眼','London','NEEDS REPAIR','长期深频段暴露后屏幕校准失效，修复中。「看了太多」的受损之眼。')]:
    rows.append([Paragraph(a,st_td),Paragraph(b,st_td),Paragraph(c,st_td),Paragraph(d,st_td)])
tb=Table(rows,colWidths=[44*mm,20*mm,24*mm,90*mm])
tb.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),PRE),('BOX',(0,0),(-1,-1),0.5,BORDER),
    ('INNERGRID',(0,0),(-1,-1),0.4,BORDER),('VALIGN',(0,0),(-1,-1),'TOP'),
    ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),
    ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6)]))
story.append(tb)

story.append(PageBreak())
H2('2 · Architects（架构师）档案 — 全 6 位')
P('以下为生产数据库 voyager_profiles 中 role = architect 的<b>全部当前成员</b>，bio 逐字引用。'
  'Gloria X / Weile Yang / Arthur 配图为<b>真人已上传头像</b>；Maren / Ryo / Valentina 为设定角色，附代码库官方头像 prompt（图为占位生成头像）。',st_note)
SP(3)

def card(key,name,sub,tags,stats,bio,kw,prompt,label='Image prompt'):
    img=Image('docs/assets/sq-%s.png'%key,width=58,height=58)
    tline=' &nbsp; '.join('<font color="%s"><b>%s</b></font>'%('#DC2F02' if c=='orange' else '#FF6B35',t) for t,c in tags)
    right=[Paragraph('%s &nbsp;<font color="#9A9CA8" size="9">— %s</font>'%(name,sub),st_name),
           Paragraph(tline,st_stat),Paragraph(stats,st_stat),
           Paragraph('“%s”'%bio,st_bio),Paragraph('气质关键词：'+kw,st_kw)]
    head=Table([[img,right]],colWidths=[64,178*mm-12-64])
    head.setStyle(TableStyle([('VALIGN',(0,0),(0,0),'TOP'),('VALIGN',(1,0),(1,0),'TOP'),
        ('LEFTPADDING',(0,0),(0,0),0),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0),
        ('LEFTPADDING',(1,0),(1,0),8)]))
    inner=[head,Spacer(1,5),Paragraph(label,st_label),pre_block(prompt)]
    wrap=Table([[inner]],colWidths=[178*mm])
    wrap.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PANEL),('BOX',(0,0),(-1,-1),0.5,BORDER),
        ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
        ('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9)]))
    return KeepTogether([wrap,Spacer(1,8)])

story.append(card('gloria','Gloria X','伪装成普通市民的闯入者',[('Shanghai 上海','')],
  '加入 2026-05-15 ｜ 观测天数 132 ｜ 发现世界 1',
  "Driven by reckless curiosity and zero fear of the unknown, she stumbled into the Organization purely for fun. Today, she masquerades as an unassuming citizen amidst the city's daily rush.",
  '莽撞好奇心、对未知毫无畏惧、为好玩误入组织、隐于都市人潮的「普通市民」伪装',
  "illustrated portrait of a young East Asian woman in a bustling modern Shanghai\n"
  "crowd, blending in as an ordinary citizen yet a spark of reckless curiosity in\n"
  "her eyes, candid street feel, warm orange rim light, editorial illustration style. "+SX))
story.append(card('weile','Weile Yang','世家血脉的归来者',[('Bay Area / Shanghai','')],
  '加入 2026-05-14 ｜ 观测天数 870 ｜ 发现世界 3 ｜ X @YangWeile52622 · LinkedIn weile-will-yang',
  "His ancestors were among the first in China to establish contact with this organization. It wasn't until after he turned 30 that he began to realize the existence of this mysterious group. He currently resides in the Bay Area, but he also travels to Shanghai from time to time.",
  '世家血脉（祖辈是中国最早接触组织者之一）、年过三十方觉醒、往返湾区与上海、连接东西方的桥梁感',
  "portrait of an East Asian man in his early 30s, quiet inherited gravitas, a\n"
  "bridge between East and West, subtle Bay-Area-meets-Shanghai duality, burnt-orange\n"
  "accent light, modern editorial illustration, dark background. "+SX))
story.append(card('arthur','Arthur','设备技师 / 复古玩家',[('Bay Area 湾区',''),('世界发现 23 · 最高','orange')],
  '加入 2026-06-02 ｜ 观测天数 312 ｜ 发现世界 23（全员最高）',
  "A technician by trade. If you find a console that needs fixing, tap me. I love VINTAGE things. Bikes, cars, stereos, guitars, and devices that monitor worlds beyond our own. I spend 2.5 hours a day figuring out what more can MC console do. Ping me if you want to join my research.",
  '技师、修 Console 的人、复古控（自行车/老爷车/音响/吉他）、每天 2.5 小时钻研 MC 设备潜能、爱召集同好',
  "portrait of a hands-on technician in a workshop full of vintage gear (bikes,\n"
  "classic stereos, guitars), bent over a half-open Multiverse Console with a\n"
  "soldering iron, warm orange work-lamp glow against deep-space-blue ambient light,\n"
  "tinkerer energy, lo-fi sci-fi hardware photography. "+SX))
story.append(card('maren','Maren Solberg','信号分类协议的架构师',[('Oslo, Norway','')],
  '加入 2023-07-01 ｜ 观测天数 1024 ｜ 发现世界 5',
  "Theoretical physicist and architect of the Collective's signal-classification protocol. Rarely appears in public communications, her influence is felt in the structure of everything. Every sentence she writes does work. Every silence is intentional.",
  '理论物理学家、极简、精确、克制、隐于幕后、字字有用、刻意的沉默',
  "minimalist geometric illustration portrait of a Scandinavian woman in her 40s,\n"
  "blonde hair pulled back, cool blue tones, clean vector art style, precise lines,\n"
  "professional, dark background, modern. "+SX,label='官方头像 prompt（代码库 seed 707）'))
story.append(card('ryo','Ryo Tanaka','四角色结构的提出者',[('Kyoto, Japan','')],
  '加入 2023-06-15 ｜ 观测天数 1156 ｜ 发现世界 8 ｜ X @ryotanakaputo',
  "Philosopher-engineer who was present before the Collective had a name. Proposed the four-role structure still in use today. Thinks in decades. Patient to the point of stillness. Opens meetings with a question, closes them with a single sentence.",
  '哲学家-工程师、创始元老、以十年为单位思考、沉静近乎静止、以提问开场、以一句话收束',
  "ink brush painting portrait of a distinguished Japanese man in his 50s, calm\n"
  "composed expression, traditional brushwork style with modern touch, monochrome\n"
  "with subtle amber tones, zen aesthetic, dark background. "+SX,label='官方头像 prompt（代码库 seed 808）'))
story.append(card('valentina','Valentina Cruz','对外沟通与增长负责人',[('Mexico City','')],
  '加入 2024-01-08 ｜ 观测天数 623 ｜ 发现世界 3 ｜ X @ValentinaCruzi',
  "Communications strategist responsible for the Collective's growth, the intake of new Voyagers, and the organization's public-facing narrative. The most outward-facing of the Architects. Decisive, high-energy, and unusually comfortable with uncertainty.",
  '传播策略师、负责增长与新成员引入、最外向的 Architect、果断、高能量、对不确定性异常自如',
  "vibrant illustrated portrait of a Latina woman in her late 30s, dark hair,\n"
  "confident warm smile, bold saturated colors, editorial illustration style,\n"
  "dynamic composition, dark background. "+SX,label='官方头像 prompt（代码库 seed 909）'))

P('备注：scripts/create-architect.mjs 中另有三个用于内容生成的虚拟人格（Nova / Shen Echo / Lingbo），非真人成员，通常不需人物肖像，故不列入。',st_note)
SP(8)
story.append(Table([['']],colWidths=[178*mm],style=[('LINEABOVE',(0,0),(-1,-1),0.5,BORDER)]))
P('所有引号内英文均逐字引自代码库 / 生产数据库设定 · 头像图源 Supabase Storage（avatars bucket）· 可安全用于 AIGC 图像生成 prompt。 — Putopia / Multiverse Collective, internal asset brief.',
  S('f',fontSize=7.6,leading=10,textColor=colors.Color(245/255,245/255,245/255,alpha=0.40)))

def bg(canvas,doc):
    canvas.saveState(); canvas.setFillColor(BG)
    canvas.rect(0,0,A4[0],A4[1],fill=1,stroke=0); canvas.restoreState()

doc=BaseDocTemplate('docs/Putopia-AIGC-Asset-Brief.pdf',pagesize=A4,
    leftMargin=13*mm,rightMargin=13*mm,topMargin=14*mm,bottomMargin=14*mm,
    title='Putopia AIGC Asset Brief')
frame=Frame(doc.leftMargin,doc.bottomMargin,doc.width,doc.height,id='f',
    leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)
doc.addPageTemplates([PageTemplate(id='main',frames=[frame],onPage=bg)])
doc.build(story)
print('PDF built: docs/Putopia-AIGC-Asset-Brief.pdf')

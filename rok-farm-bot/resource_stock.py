"""Read the five top-bar balances; report only the four farm resources."""
import re
from decimal import Decimal, InvalidOperation
import cv2
import numpy as np

KEYS=('food','wood','stone','gold')

def parse_amount(text):
    text=re.sub(r'\s','',text).upper()
    match=re.fullmatch(r'(\d+(?:[.,]\d+)*)([KMB]?)',text)
    if not match:return None
    number,suffix=match.groups()
    if suffix:
        # The game abbreviates millions as 20.2M; OCR may use a comma.
        if number.count('.')+number.count(',')>1:return None
        number=number.replace(',','.')
    else:
        if '.' in number or ',' in number:
            if not re.fullmatch(r'\d{1,3}(?:[.,]\d{3})+',number):return None
            number=re.sub(r'[.,]','',number)
    try:value=int(Decimal(number)*{'':1,'K':1000,'M':1000000,'B':1000000000}[suffix])
    except InvalidOperation:return None
    return value if 0<=value<=10**15 else None

def extract_stock(rows):
    items=[]
    for box,text,confidence in rows or []:
        value=parse_amount(text)
        if value is not None and confidence>=.75:
            items.append((float(np.mean(box,axis=0)[0]),float(np.mean(box,axis=0)[1]),value))
    if items:
        top=min(i[1] for i in items)
        items=[i for i in items if i[1]-top<=20]
    # Include gems as the fifth balance to prevent shifting values when OCR misses one.
    if len(items)!=5:return None
    items.sort()
    if max(i[1] for i in items)-min(i[1] for i in items)>20:return None
    return dict(zip(KEYS,(i[2] for i in items[:4])))

def read_stock(screen,vision):
    h,w=screen.shape[:2]
    # Seasonal crystal balance appears immediately left of the standard five balances.
    left=.50 if getattr(vision,'mobile',False) else .64
    patch=screen[:max(40,int(h*.085)),int(w*left):]
    rows,_=vision.engine(cv2.resize(patch,None,fx=3,fy=3))
    return extract_stock(rows)

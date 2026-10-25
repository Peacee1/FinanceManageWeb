"""Offline neural OCR plus icon matching, with no fixed click coordinates."""
from dataclasses import dataclass, field
from pathlib import Path
import base64
import copy
import json
import re
import sys
import unicodedata
from difflib import SequenceMatcher

import cv2
import numpy as np


def normalize(text):
    text = unicodedata.normalize('NFKD', text.lower().replace('đ', 'd'))
    return ''.join(c for c in text if c.isascii() and c.isalnum())


@dataclass
class Observation:
    state: str | None = None
    buttons: dict = field(default_factory=dict)
    queue: int | None = None
    capacity: int | None = None
    level: int | None = None
    free: bool = False
    texts: list = field(default_factory=list)
    regions: dict = field(default_factory=dict)


def other_device_dialog(screen,rows):
    h,w=screen.shape[:2]
    texts=[(normalize(t),tuple(np.mean(b,axis=0)),b) for b,t,c in rows if c>=.50
           and w*.20<np.mean(b,axis=0)[0]<w*.80 and h*.20<np.mean(b,axis=0)[1]<h*.78]
    if not any('dangnhaptrenthietbikhac' in n for n,_,_ in texts):return None
    result=Observation(state='other_device_login')
    buttons=[p for n,p,b in texts if n in {'xacnhan','kacnhan'} and h*.40<p[1]<h*.78 and Vision.colored_button(screen,b)]
    if len(buttons)==1:result.buttons['reconnect']=tuple(map(int,buttons[0]))
    return result

def network_dialog(screen,rows):
    h,w=screen.shape[:2]
    texts=[(normalize(t),tuple(np.mean(b,axis=0)),b) for b,t,c in rows if c>=.50
           and w*.20<np.mean(b,axis=0)[0]<w*.80 and h*.20<np.mean(b,axis=0)[1]<h*.78]
    joined=' '.join(n for n,_,_ in texts)
    if not (any('ngatketnoi' in n for n,_,_ in texts) or
            ('mangkhongondinh' in joined and 'ketnoilai' in joined)):return None
    result=Observation(state='network_disconnected')
    buttons=[p for n,p,b in texts if n=='xacnhan' and h*.40<p[1]<h*.78 and Vision.colored_button(screen,b)]
    if len(buttons)==1:result.buttons['reconnect']=tuple(map(int,buttons[0]))
    return result

def exit_dialog(screen,rows):
    h,w=screen.shape[:2]
    texts=[(normalize(t),tuple(np.mean(b,axis=0)),b) for b,t,c in rows if c>=.50]
    if not any('thoat' in n and ('trochoi' in n or 'game' in n) and w*.25<p[0]<w*.75 and h*.25<p[1]<h*.70 for n,p,_ in texts):return None
    result=Observation(state='exit_dialog')
    cancel=[p for n,p,b in texts if n in {'huy','khong','cancel'} and w*.25<p[0]<w*.75 and h*.45<p[1]<h*.80 and Vision.colored_button(screen,b)]
    if len(cancel)==1:result.buttons['cancel_exit']=tuple(map(int,cancel[0]))
    return result


def march_panel(screen, rows):
    """Modal evidence must override map artwork still visible behind it."""
    h,w=screen.shape[:2]
    items=[(normalize(t),np.mean(b,axis=0)) for b,t,c in rows if c>=.65]
    headers=[p for n,p in items if SequenceMatcher(None,n,'quanmoi').ratio()>=.70
             and w*.25<p[0]<w*.75 and h*.08<p[1]<h*.40]
    units={n for n,p in items if w*.35<p[0]<w*.85 and h*.20<p[1]<h*.70
           and any(SequenceMatcher(None,n,label).ratio()>=.70
                   for label in ('xeducthanh','maybancung','kysi','linhbanda','trongtai','tong suc manh'.replace(' ','')))}
    return len(headers)==1 and len(units)>=2


def chat_panel(screen,rows):
    h,w=screen.shape[:2]
    region=screen[int(h*.15):int(h*.85),int(w*.08):int(w*.35)]
    if not region.size:return False
    hsv=cv2.cvtColor(region,cv2.COLOR_BGR2HSV)
    pale=(hsv[:,:,0]>=80)&(hsv[:,:,0]<=110)&(hsv[:,:,1]>=20)&(hsv[:,:,1]<=150)&(hsv[:,:,2]>160)
    if float(pale.mean())<.55:return False
    texts=[(normalize(t),np.mean(b,axis=0)) for b,t,c in rows if c>=.6 and np.mean(b,axis=0)[0]<w*.43]
    header=any(p[1]<h*.09 and any(n.startswith(s) for s in ('lienminh','vuongquoc','chat','trochuyen')) for n,p in texts)
    messages=[n for n,p in texts if 'tinnh' in n or 'nhomchat' in n]
    return bool((header and messages) or len(messages)>=2)


class Vision:
    def __init__(self, assets, cache_dir=None):
        from rapidocr_onnxruntime import RapidOCR
        # Game labels are horizontal; avoid running orientation inference per label.
        self.engine = RapidOCR(intra_op_num_threads=4, inter_op_num_threads=1, use_cls=False)
        self.assets = Path(assets)
        self.icons = {p.stem: cv2.imdecode(np.fromfile(p, dtype=np.uint8), cv2.IMREAD_COLOR)
                      for p in self.assets.glob('*.png')}
        self.mobile = '--ldplayer' in sys.argv
        if self.mobile:
            self.icons.update({p.stem: cv2.imdecode(np.fromfile(p, dtype=np.uint8), 1)
                               for p in (self.assets/'ldplayer').glob('*.png')})
        self.cache = {}
        self.cache_file = Path(cache_dir) / 'buttons.json' if cache_dir else None
        if self.cache_file:
            self.cache_file.parent.mkdir(parents=True, exist_ok=True)
            try:
                self.cache = json.loads(self.cache_file.read_text('utf-8'))
            except (OSError, ValueError):
                pass
        self.last_cached = False

    @staticmethod
    def box_region(box, shape):
        h, w = shape[:2]
        low = np.floor(np.min(box, axis=0)).astype(int) - 6
        high = np.ceil(np.max(box, axis=0)).astype(int) + 6
        x, y = max(0, int(low[0])), max(0, int(low[1]))
        return [x, y, min(w, int(high[0]))-x, min(h, int(high[1]))-y]

    def remember(self, screen, observation):
        anchors = {'search': 'find', 'new': 'new_army', 'march': 'march'}
        key = anchors.get(observation.state)
        if not key or key not in observation.regions:
            return
        if observation.state == 'search' and 'level' not in observation.regions:
            return
        if observation.state == 'new' and 'queue' not in observation.regions:
            return
        x, y, w, h = observation.regions[key]
        patch = screen[y:y+h, x:x+w]
        if not patch.size:
            return
        entry = {'shape': list(screen.shape[:2]), 'anchor': [x, y, w, h],
                 'image': base64.b64encode(cv2.imencode('.png', patch)[1]).decode('ascii'),
                 'buttons': {k: list(map(int, v)) if v else None for k, v in observation.buttons.items()},
                 'regions': observation.regions}
        self.cache[observation.state] = entry
        if self.cache_file:
            temporary = self.cache_file.with_suffix('.tmp')
            temporary.write_text(json.dumps(self.cache), 'utf-8')
            temporary.replace(self.cache_file)

    def cached_observation(self, screen):
        for state in ['march', 'new', 'search']:
            entry = self.cache.get(state)
            if not entry or entry.get('shape') != list(screen.shape[:2]):
                continue
            try:
                x, y, w, h = entry['anchor']
                saved = cv2.imdecode(np.frombuffer(base64.b64decode(entry['image']), dtype=np.uint8), 1)
                patch = screen[y:y+h, x:x+w]
                if saved is None or patch.shape != saved.shape or float(cv2.matchTemplate(patch, saved, cv2.TM_SQDIFF_NORMED)[0, 0]) > .015:
                    continue
                observation = Observation(state=state, buttons=copy.deepcopy(entry['buttons']), regions=copy.deepcopy(entry['regions']))
                if state == 'march':
                    return observation
                field_name = 'level' if state == 'search' else 'queue'
                rx, ry, rw, rh = entry['regions'][field_name]
                # The field's location is known, so run only the neural text
                # recognizer; skip full-frame text detection and orientation.
                field_image = screen[ry:ry+rh, rx:rx+rw]
                if min(field_image.shape[:2]) > 12:
                    field_image = field_image[4:-4, 4:-4]
                rows, _ = self.engine.text_rec(field_image)
                for text, confidence in rows or []:
                    if confidence < .85:
                        continue
                    if state == 'search':
                        match = re.fullmatch(r'([a-z0-9]{2,4})([1-8])', normalize(text))
                        if match and SequenceMatcher(None, match.group(1), 'cap').ratio() >= .5:
                            observation.level = int(match.group(2))
                    else:
                        match = re.search(r'(?<!\d)([0-7])\s*/\s*([1-7])(?!\d)', text)
                        if match and int(match.group(1)) <= int(match.group(2)):
                            observation.queue, observation.capacity = int(match.group(1)), int(match.group(2))
                if observation.level is not None or observation.queue is not None:
                    return observation
            except (ValueError, KeyError, TypeError, cv2.error):
                continue
        return None

    def icon(self, name, screen, region=None):
        variants = [key for key in self.icons if key == name or key.startswith(name+'_')]
        matches = [self.match_icon(self.icons[key], screen, region) for key in variants]
        matches = [match for match in matches if match]
        return max(matches, key=lambda item: item[0]) if matches else None

    def match_icon(self, template, screen, region=None):
        if template is None:
            return None
        h, w = screen.shape[:2]
        x, y, rw, rh = region or (0, 0, w, h)
        x, y = max(0, int(x)), max(0, int(y))
        crop = screen[y:min(h, y+int(rh)), x:min(w, x+int(rw))]
        base = min(w/1770, h/994)
        best = None
        for factor in (.65, .75, .85, .95, 1., 1.05, 1.15, 1.25, 1.4, 1.6):
            scale = base * factor
            tw, th = max(8, round(template.shape[1]*scale)), max(8, round(template.shape[0]*scale))
            if crop.shape[0] < th or crop.shape[1] < tw:
                continue
            resized = cv2.resize(template, (tw, th))
            _, value, _, loc = cv2.minMaxLoc(cv2.matchTemplate(crop, resized, cv2.TM_CCOEFF_NORMED))
            if best is None or value > best[0]:
                best = (value, (x+loc[0]+tw//2, y+loc[1]+th//2))
        return best if best and best[0] >= .50 else None

    @staticmethod
    def colored_button(screen, box):
        x1, y1 = np.floor(np.min(box, axis=0)).astype(int)
        x2, y2 = np.ceil(np.max(box, axis=0)).astype(int)
        patch = screen[max(0, y1-3):y2+3, max(0, x1-4):x2+4]
        if not patch.size:
            return False
        hsv = cv2.cvtColor(patch, cv2.COLOR_BGR2HSV)
        # Cyan or amber button background distinguishes buttons from headers/chat.
        mask = (((hsv[:, :, 0] >= 80) & (hsv[:, :, 0] <= 110)) |
                ((hsv[:, :, 0] >= 10) & (hsv[:, :, 0] <= 35))) & (hsv[:, :, 1] > 130) & (hsv[:, :, 2] > 140)
        return float(mask.mean()) > .30

    def analyze(self, screen):
        cached = self.cached_observation(screen)
        self.last_cached = cached is not None
        if cached:
            return cached
        rows, _ = self.engine(screen)
        result = self.from_rows(screen, rows or [])
        if result.state=='march' and not result.buttons.get('march'):
            # Enlarged modal OCR recovers small/low contrast action labels.
            h,w=screen.shape[:2]
            x,y=int(w*.25),int(h*.40)
            patch=screen[y:int(h*.90),x:int(w*.85)]
            extra,_=self.engine(cv2.resize(patch,None,fx=2,fy=2))
            adjusted=[[(np.array(b)/2+np.array([x,y])).tolist(),t,c] for b,t,c in extra or []]
            enlarged=self.from_rows(screen,adjusted)
            if enlarged.buttons.get('march'):
                result.buttons['march']=enlarged.buttons['march']
                result.regions['march']=enlarged.regions['march']
        if result.state == 'search' and result.level is None:
            h, w = screen.shape[:2]
            fx, fy = result.buttons['find']
            x, y = max(0, int(fx-w*.12)), max(0, int(fy-h*.10))
            patch = screen[y:int(fy-h*.035), x:min(w, int(fx+w*.12))]
            if patch.size:
                extra, _ = self.engine(cv2.resize(patch, None, fx=3, fy=3))
                adjusted = [[(np.array(box)/3+np.array([x,y])).tolist(), text, confidence]
                            for box, text, confidence in extra or []]
                result = self.from_rows(screen, list(rows or [])+adjusted)
        if result.queue is None and result.state in {'inside', 'outside', 'new'}:
            # Small white sidebar counters can be missed by full-frame text detection.
            h, w = screen.shape[:2]
            region = screen[int(h*.10):int(h*.24), int(w*.92):]
            cropped_rows, _ = self.engine(cv2.resize(region, None, fx=3, fy=3))
            counters = []
            for _, text, confidence in cropped_rows or []:
                match = re.fullmatch(r'\s*([0-7])\s*/\s*([1-7])\s*', text)
                if confidence >= .85 and match and int(match.group(1)) <= int(match.group(2)):
                    counters.append((int(match.group(1)), int(match.group(2))))
            if not counters and result.state in {'inside', 'outside'}:
                # Isolate the tiny map counter from the portraits and icons.
                tight = screen[int(h*.109):int(h*.132), int(w*.957):int(w*.994)]
                if tight.size:
                    small_rows, _ = self.engine(cv2.resize(tight, None, fx=4, fy=4))
                    for _, text, confidence in small_rows or []:
                        match = re.fullmatch(r'\s*([0-7])\s*[/.,]\s*([1-7])\s*', text)
                        if confidence >= .75 and match and int(match.group(1)) <= int(match.group(2)):
                            counters.append((int(match.group(1)), int(match.group(2))))
            if len(set(counters)) == 1:
                result.queue, result.capacity = counters[0]
        self.remember(screen, result)
        return result

    def from_rows(self, screen, rows):
        other_device=other_device_dialog(screen,rows)
        if other_device:return other_device
        disconnected=network_dialog(screen,rows)
        if disconnected:return disconnected
        quitting=exit_dialog(screen,rows)
        if quitting:return quitting
        if chat_panel(screen,rows):return Observation(state='chat')
        result = Observation()
        h, w = screen.shape[:2]
        if getattr(self,'mobile',False) and any(c>=.5 and normalize(t).startswith('dangtai')
                                               and np.mean(b,axis=0)[1]>h*.65 for b,t,c in rows):
            return Observation(state='loading')
        words = {}
        for box, text, confidence in rows:
            # Exact action text on a colored button is stronger evidence than
            # a fuzzy match elsewhere, even when tiny text lowers confidence.
            exact_find=normalize(text)=='timkiem' and confidence>=.55 and self.colored_button(screen,box)
            if confidence < .70 and not exact_find:
                continue
            norm = normalize(text)
            center = tuple(np.round(np.mean(box, axis=0)).astype(int))
            result.texts.append((text, float(confidence), center))
            words[norm] = center
            button_names = {'timkiem': 'find', 'thuthap': 'gather', 'quanmoi': 'new_army', 'hanhquan': 'march'}
            ranked = sorted(((SequenceMatcher(None, norm, label).ratio(), key)
                             for label, key in button_names.items()), reverse=True)
            mobile_position = (not getattr(self, 'mobile', False) or
                               (center[1] > h*.40 if ranked[0][1] in {'find','gather'} else
                                center[1] > h*.65 if ranked[0][1] == 'march' else center[1] < h*.35))
            if (mobile_position and ranked[0][0] >= .5 and ranked[0][0]-ranked[1][0] >= .1
                    and self.colored_button(screen, box)):
                key = ranked[0][1]
                result.regions[key] = self.box_region(box, screen.shape)
                # Repeated actionable labels are ambiguous; never pick an arbitrary one.
                if key in result.buttons:
                    result.buttons[key] = None
                else:
                    result.buttons[key] = center
            resources = {'dattrong': 'food', 'traixego': 'wood', 'tramtichda': 'stone', 'tramtichvang': 'gold'}
            if norm in resources and center[1] > h * .72:
                result.buttons[resources[norm]] = center
            if 'hangdoi' in norm or (center[0] > w*.90 and center[1] < h*.35):
                match = re.search(r'(?<!\d)([0-7])\s*/\s*([1-7])(?!\d)', text)
                if match and int(match.group(1)) <= int(match.group(2)):
                    result.queue, result.capacity = int(match.group(1)), int(match.group(2))
                    result.regions['queue'] = self.box_region(box, screen.shape)
            match = re.fullmatch(r'([a-z0-9]{2,4})([1-8])', norm)
            if (match and SequenceMatcher(None, match.group(1), 'cap').ratio() >= .5
                    and 'find' in result.buttons
                    and abs(center[0]-result.buttons['find'][0]) < w*.15
                    and result.buttons['find'][1]-h*.15 < center[1] < result.buttons['find'][1]):
                result.level = int(match.group(2))
                result.regions['level'] = self.box_region(box, screen.shape)
        start_prompts = [center for text, confidence, center in result.texts
                         if confidence >= .5 and center[1] > h*.65
                         and ('batdau' in normalize(text) or 'debat' in normalize(text))
                         and SequenceMatcher(None, normalize(text), 'nhandebatdau').ratio() >= .5]
        if start_prompts:
            result.state = 'start_screen'
            result.buttons['enter_game'] = max(start_prompts, key=lambda point: point[1])
            return result
        if 'timkiem' in words and result.buttons.get('find'):
            result.buttons.pop('gather',None)
            result.buttons.pop('new_army',None)
            result.buttons.pop('march',None)
        modal_march=march_panel(screen,rows)
        if result.buttons.get('march') or modal_march:
            result.state = 'march'
        elif result.buttons.get('new_army'):
            result.state = 'new'
        elif result.buttons.get('gather'):
            result.state = 'deposit'
            gather = result.buttons['gather']
            label = words.get('linhthugom')
            free = min((c for t, _, c in result.texts if normalize(t)=='khongco'),
                       key=lambda c:abs(c[1]-label[1]),default=None) if label else None
            # Both words must appear together above this deposit's button.
            result.free = bool(free and label and abs(free[1]-label[1]) < h*.04 and
                               label[0] < free[0] and gather[1]-h*.30 < free[1] < gather[1] and
                               abs(free[0]-gather[0]) < w*.25)
        elif result.buttons.get('find'):
            result.state = 'search'
            # Small labels can disappear entirely from OCR. Recognize the
            # resource artwork itself in the bottom search toolbar.
            for resource in ('food', 'wood', 'stone', 'gold'):
                if getattr(self,'mobile',False) and resource in result.buttons:
                    continue
                mobile_regions = {'food':(.29,.78,.12,.20),'wood':(.44,.78,.12,.20),
                                  'stone':(.59,.78,.12,.20),'gold':(.74,.78,.12,.20)}
                resource_region = tuple(v*s for v,s in zip(mobile_regions[resource],(w,h,w,h))) if getattr(self,'mobile',False) else (0,h*.85,w,h*.15)
                found = self.icon('resource_' + resource, screen,
                                  resource_region)
                if found:
                    result.buttons[resource] = found[1]
            fx, fy = result.buttons['find']
            candidates = []
            for box, text, confidence in rows:
                center = np.mean(box, axis=0)
                match = re.fullmatch(r'([a-z0-9]{2,4})([1-8])', normalize(text))
                if (confidence >= .5 and match and SequenceMatcher(None, match.group(1), 'cap').ratio() >= .5
                        and abs(center[0]-fx) < w*.15 and fy-h*.15 < center[1] < fy):
                    candidates.append((int(match.group(2)), box))
            if len({value for value, _ in candidates}) == 1:
                result.level = candidates[0][0]
                result.regions['level'] = self.box_region(candidates[0][1], screen.shape)
            scale = min(w/1770, h/994)
            region = ((fx-w*.14,fy-h*.145,w*.28,h*.085) if getattr(self,'mobile',False)
                      else (fx-190*scale, fy-115*scale, 380*scale, 95*scale))
            for name in ['minus', 'plus']:
                found = self.icon(name, screen, region)
                if found:
                    result.buttons[name] = found[1]
        else:
            mobile_map_anchor = not getattr(self,'mobile',False) or any(
                re.fullmatch(r'\d{1,3}(?:[.,]\d{3}){2,}',text.replace(' ',''))
                and center[0]<w*.25 and center[1]<h*.10 for text,_,center in result.texts)
            region = (int(w*.80), int(h*.78), int(w*.20), int(h*.22))
            if getattr(self,'mobile',False):region=(0,int(h*.83),int(w*.10),int(h*.17))
            states = [(name, self.icon(name, screen, region)) for name in ['inside', 'outside']]
            states = [(name, found) for name, found in states if found and mobile_map_anchor]
            if states:
                states.sort(key=lambda item: item[1][0], reverse=True)
                if len(states) == 1 or states[0][1][0]-states[1][1][0] > .035:
                    result.state = states[0][0]
            # Map coordinates only appear outside the city; ignore coordinates in
            # deposit panels or chat. This also works when a pet covers Space.
            if result.state is None and mobile_map_anchor and any(re.search(r'#?\d+.*X\s*:\s*\d+.*Y\s*:\s*\d+', text, re.I)
                                            and center[1] < h*.12 and center[0] < w*.40
                                            for text, _, center in result.texts):
                result.state = 'outside'
            search_region = (0,int(h*.67),int(w*.10),int(h*.17)) if getattr(self,'mobile',False) else (0,0,int(w*.40),int(h*.13))
            found = self.icon('open_search', screen, search_region)
            if found:
                result.buttons['open_search'] = found[1]
        return result

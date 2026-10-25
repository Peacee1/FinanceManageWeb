"""Character roster/navigation and the explicitly requested alliance income step."""
from dataclasses import dataclass
import re
import os
import sys
import time
from pathlib import Path
from difflib import SequenceMatcher

import cv2
import numpy as np
import pyautogui as pg

from vision import normalize,exit_dialog,network_dialog,other_device_dialog
from step_retry import retry_step
UI_TEXT_SIMILARITY = .50


def clean_name(text):
    return re.sub(r'^\s*\[[^\]]*\]\s*', '', text).strip()


def name_key(text):
    return re.sub(r'x(?=f\d+$)', '', normalize(clean_name(text)))


def same_name(left, right):
    a,b=name_key(left),name_key(right)
    if a==b:return True
    # Keep the governor number exact: F10 must never match F11 or F1.
    sa,sb=re.search(r'f(\d+)$',a),re.search(r'f(\d+)$',b)
    if sa or sb:
        if not sa or not sb or sa.group(1)!=sb.group(1):return False
        a,b=a[:sa.start()],b[:sb.start()]
    elif re.findall(r'\d+',a)!=re.findall(r'\d+',b):return False
    a,b=a.translate(str.maketrans({'l':'1','i':'1'})),b.translate(str.maketrans({'l':'1','i':'1'}))
    return bool(a and b and SequenceMatcher(None,a,b).ratio()>=UI_TEXT_SIMILARITY)


def same_identity(left,right):
    realm_a,sep_a,name_a=left.partition(':')
    realm_b,sep_b,name_b=right.partition(':')
    return bool(sep_a and sep_b and realm_a==realm_b and same_name(name_a,name_b))


def profile_name(rows, shape, mobile=False):
    """Read only the name immediately below the governor ID/label."""
    h,w=shape[:2]
    items=[(b,t,normalize(t),np.mean(b,axis=0)) for b,t,c in rows if c>=.65]
    anchors=[p for b,t,n,p in items if (n.startswith('thongdoc') or
             (n.startswith('thong') and re.search(r'id\d{5,}',n)))
             and ((w*.30<p[0]<w*.70 and h*.12<p[1]<h*.35) if mobile
                  else (p[0]<w*.30 and h*.15<p[1]<h*.50))]
    if not anchors and not mobile:
        # Small profile labels may disappear while the action-point counter
        # and name remain legible. Caller must first establish profile state.
        counters=[p for b,t,n,p in items if p[0]<w*.30 and h*.15<p[1]<h*.45
                  and re.fullmatch(r'\s*[\d.,]+\s*/\s*[\d.,]+\s*',t)]
        if len(counters)==1:
            names=[t for b,t,n,p in items if p[0]<w*.20
                   and h*.035<p[1]-counters[0][1]<h*.13
                   and not any(n.startswith(s) for s in ('diem','thongdoc','id','nenvanminh','lienminh'))]
            if len(names)==1:return clean_name(names[0])
    if len(anchors)!=1:return None
    anchor=anchors[0]
    candidates=[(float(p[1]),t) for b,t,n,p in items
                if 0<p[1]-anchor[1]<h*.055
                and abs(float(np.min(b,axis=0)[0])-float(anchor[0]))<w*.09
                and not any(n.startswith(s) for s in ('id','nenvanminh','lienminh','sucmanh','diem'))]
    if not candidates:return None
    candidates.sort()
    nearest=[t for y,t in candidates if abs(y-candidates[0][0])<h*.008]
    return clean_name(nearest[0]) if len(nearest)==1 else None


@dataclass
class Character:
    identity: str
    name: str
    kingdom: str
    point: tuple
    active: bool = False
    power: int | None = None


def extract_stars(rows, shape, in_stars=False):
    h, w = shape[:2]
    items = []
    for box, text, confidence in rows:
        if confidence >= .75:
            center = np.mean(box, axis=0)
            items.append((box, text, normalize(text), center))
    star_headers = [float(c[1]) for _, _, n, c in items if n == 'nhanvatngoisao']
    normal_headers = [float(c[1]) for _, _, n, c in items if n == 'nhanvatthuong']
    top = min(star_headers) if star_headers else h*.22 if in_stars else h
    bottom = min(normal_headers) if normal_headers else h*.85
    result = []
    for box, text, _, center in items:
        match = re.search(r'#\s*([A-Za-z]?\d{3,6})(?!\d)', text)
        if not match or not top < center[1] < bottom or center[0] < w*.28:
            continue
        column = center[0] > w*.56
        realm_left = float(np.min(box, axis=0)[0])
        names = [(t, c) for b, t, n, c in items if top < c[1] < center[1]
                 and center[1]-c[1] < h*.06 and (c[0] > w*.56) == column
                 and np.min(b, axis=0)[0] >= realm_left-20*w/1770
                 and c[0] > w*.28 and not re.search(r'#|\bID\b', t, re.I)
                 and not any(n.startswith(prefix) for prefix in ['sucmanh', 'nhanvat', 'vuongquoc'])]
        if not names:
            continue
        name, point = min(names, key=lambda entry: center[1]-entry[1][1])
        kingdom = match.group(1).upper()
        powers = []
        for _, power_text, power_norm, power_center in items:
            if (power_norm.startswith('sucmanh') and (power_center[0] > w*.56) == column
                    and 0 < power_center[1]-center[1] < h*.045):
                match_power = re.search(r'[:：]\s*([\d.,\s]+)', power_text)
                if match_power:
                    digits = re.sub(r'\D', '', match_power.group(1))
                    if digits:
                        powers.append(int(digits))
        power = powers[0] if len(powers) == 1 else None
        result.append(Character(kingdom + ':' + name_key(name), clean_name(name), kingdom,
                                tuple(map(int, point)), power=power))
    return result, bool(normal_headers), bool(star_headers) or in_stars


class CharacterNavigator:
    def __init__(self, app):
        self.app = app
        self.vision = app.vision

    def guard(self):
        if self.app.stop.is_set():
            raise RuntimeError('Đã dừng.')
        if not self.app.active():
            # A prior transition deadline may have expired during stage retries.
            # Still attempt to reacquire the game once on every retry.
            if self.recover_loading_window():return
            deadline = getattr(self, 'transition_deadline', 0)
            while time.monotonic() < deadline:
                if self.recover_loading_window():
                    return
                self.pause(2)
            raise RuntimeError('Game mất tiêu điểm.' if not deadline else 'Hết thời gian chờ cửa sổ game khi đổi nhân vật.')

    def recover_loading_window(self):
        if (getattr(self.app,'_launcher_recovery',None) or getattr(self.app,'_post_launcher_governor',None)) and not getattr(self.app,'_verifying_launcher_governor',False):
            from launcher_recovery import recover_launcher_game
            return recover_launcher_game(self.app)
        if self.app.active():
            return True
        try:
            from game_window import GameWindow
            self.app.game = GameWindow.find()
            self.app.game.focus()
            self.pause(2)
        except RuntimeError:
            return False
        return self.app.active()

    def pause(self, seconds=.6):
        if self.app.stop.wait(seconds):
            raise RuntimeError('Đã dừng.')

    def key(self, key):
        self.guard()
        pg.press(key)
        self.pause()

    def click(self, point, offset):
        self.guard()
        pg.click(int(point[0]+offset[0]), int(point[1]+offset[1]))
        self.pause()

    def inspect(self):
        self.guard()
        screen, offset = self.app.snapshot()
        diagnostic = Path(os.environ.get('LOCALAPPDATA', str(Path.home()))) / ('ROKFarmBotPCOffline' if '--offline' in sys.argv else 'ROKFarmBotLDPlayer' if '--ldplayer' in sys.argv else 'ROKFarmBot')
        diagnostic.mkdir(parents=True, exist_ok=True)
        cv2.imencode('.png', screen)[1].tofile(diagnostic / 'last-navigation.png')
        rows, _ = self.vision.engine(screen)
        rows = rows or []
        self.guard()
        texts = [(normalize(text), np.mean(box, axis=0), text) for box, text, confidence in rows if confidence >= .50]
        h, w = screen.shape[:2]
        norms = {n for n, _, _ in texts}
        other_device=other_device_dialog(screen,rows)
        if other_device:
            from launcher_recovery import begin_other_device_recovery
            begin_other_device_recovery(self.app,other_device,offset)
            return 'loading',screen,offset,rows,texts
        disconnected=network_dialog(screen,rows)
        if disconnected:
            from network_recovery import reconnect_game
            reconnect_game(self.app,disconnected,offset)
            return 'loading',screen,offset,rows,texts
        if exit_dialog(screen,rows):
            state='exit_dialog'
        elif any(n in {'trungtamnguoidung','chontaikhoan','dangnhapmatkhau','dangnhapbangmaxacminh'} for n in norms):
            state='account_dialog'
        elif 'dangnhapnhanvat' in norms:
            state = 'confirm_character'
        elif any(n == 'lanhtholienminh' for n, _, _ in texts):
            state = 'territory'
        elif any(n == 'lienminh' and c[0] > w*.35 and c[1] < h*.30 for n, c, _ in texts):
            state = 'no_alliance' if {'thamgia', 'taomoi'} <= norms else 'alliance'
        elif any(n == 'nhanvatngoisao' or (t.lstrip().startswith('#') and 'vuong' in n)
                 for n, _, t in texts):
            state = 'characters'
        elif any(n == 'caidat' and c[0] > w*.35 and c[1] < h*.35 for n, c, _ in texts):
            state = 'settings'
        elif 'hosothongdoc' in norms or ('thongdoc' in norms and (
                'diemhanhdong' in norms or
                any(re.search(r'\bID\s*:\s*\d{5,}', text, re.I) and center[0] < w*.36
                    for _, center, text in texts))):
            state = 'profile'
        else:
            state = self.vision.from_rows(screen, rows).state
            if not getattr(self.vision,'mobile',False) and state in {'inside','outside',None}:
                counter=any(c>=.65 and np.mean(b,axis=0)[0]<w*.30
                            and h*.15<np.mean(b,axis=0)[1]<h*.45
                            and re.fullmatch(r'\s*[\d.,]+\s*/\s*[\d.,]+\s*',t)
                            for b,t,c in rows)
                gear=self.vision.icon('settings_gear',screen,(0,h*.65,w*.36,h*.35))
                panel=screen[int(h*.40):int(h*.82),int(w*.035):int(w*.25)]
                hsv=cv2.cvtColor(panel,cv2.COLOR_BGR2HSV) if panel.size else None
                blue_panel=hsv is not None and float(((hsv[:,:,0]>=85)&(hsv[:,:,0]<=115)&
                            (hsv[:,:,1]>120)&(hsv[:,:,2]>60)).mean())>.65
                if gear and (counter or (gear[0]>=.75 and blue_panel)):
                    state='profile'
        if getattr(self.vision,'mobile',False) and getattr(self,'last_navigation_state',None)!=state:
            self.app.log('Điều hướng LDPlayer: '+str(state or 'chưa xác định — chờ tải'))
            self.last_navigation_state=state
        self.app.error_screen=(screen,state,[t for _,_,t in texts],time.monotonic())
        return state, screen, offset, rows, texts

    def text_point(self, texts, target, screen, predicate=lambda p: True):
        matches = sorted([(SequenceMatcher(None, n, target).ratio(), tuple(map(int, c)))
                          for n, c, _ in texts if predicate(c)], reverse=True)
        if not matches or matches[0][0] < UI_TEXT_SIMILARITY:
            raise RuntimeError('Không xác định duy nhất mục ' + target)
        if len(matches) > 1 and matches[0][0]-matches[1][0] < .03:
            raise RuntimeError('Có nhiều mục gần giống ' + target + '; không đoán vị trí bấm.')
        return matches[0][1]

    def enter_game(self, screen, offset, rows):
        point = self.vision.from_rows(screen, rows).buttons.get('enter_game')
        if not point:
            raise RuntimeError('Chưa xác nhận được Nhấn để bắt đầu.')
        self.app.log('Đã thấy Nhấn để bắt đầu — bấm để vào game.')
        self.click(point, offset)
        # Loading/video transitions are not dialogs: never send Escape here.
        retry_prompt=False
        for _ in range(60):
            self.pause(2)
            if not self.app.active():
                try:
                    from game_window import GameWindow
                    self.app.game = GameWindow.find()
                    self.app.game.focus()
                    self.pause(2)
                    self.app.log('Đang chờ vào game — đã chọn lại cửa sổ game.')
                except RuntimeError:
                    continue
                if not self.app.active():
                    continue
            try:
                state, current_screen, current_offset, current_rows, _ = self.inspect()
            except RuntimeError:
                if not self.app.active():
                    continue
                raise
            if state in {'inside', 'outside'}:
                self.app.log('Đã tải xong và vào bản đồ game.')
                return
            if state=='exit_dialog':
                self.cancel_exit(current_screen,current_offset,current_rows)
                retry_prompt=True
            elif state=='start_screen' and retry_prompt:
                prompt=self.vision.from_rows(current_screen,current_rows).buttons.get('enter_game')
                if prompt:self.click(prompt,current_offset);retry_prompt=False
        raise RuntimeError('Game chưa vào bản đồ sau khi bấm bắt đầu; đã chờ, không gửi Esc.')

    def cancel_exit(self,screen,offset,rows):
        observation=exit_dialog(screen,rows)
        point=observation.buttons.get('cancel_exit') if observation else None
        if not point:raise RuntimeError('Đã thấy hộp thoại thoát game nhưng chưa đọc được nút Hủy; không bấm xác nhận.')
        self.click(point,offset)
        self.app.log('Đã đóng hộp thoại thoát game bằng Hủy — chờ vào game, không gửi Esc.')

    def close_to_map(self):
        last_state=None
        unchanged=0
        while not self.app.stop.is_set():
            state, screen, offset, rows, texts = self.inspect()
            if state == 'start_screen':
                self.enter_game(screen, offset, rows)
                continue
            if state == 'outside':
                return
            if state=='inside':
                self.key('space')
                self.pause(.5)
                continue
            unchanged=unchanged+1 if state==last_state else 0
            last_state=state
            if state=='exit_dialog':self.cancel_exit(screen,offset,rows)
            elif state=='account_dialog' and any(n=='trungtamnguoidung' for n,_,_ in texts):
                self.close_user_center(screen,offset,texts)
            elif state in {'characters','settings','profile','chat','territory','alliance','no_alliance','search','deposit','new','march','confirm_character','account_dialog'}:
                if unchanged and unchanged%3==0:self.app.log('Đang đóng '+state+' bằng Esc — chờ trở lại ngoài thành.')
                self.key('esc')
                self.pause(.5)
            else:self.pause(2)
        raise RuntimeError('Đã dừng khi đang trở lại ngoài thành.')

    def close_user_center(self,screen,offset,texts):
        # SDK User Center does not reliably handle Escape on PC.
        # Anchor its close button to the actual light foreground panel.
        h,w=screen.shape[:2]
        titles=[c for n,c,_ in texts if n=='trungtamnguoidung']
        mask=((screen.min(2)>=210)&((screen.max(2).astype(int)-screen.min(2))<45)).astype('uint8')*255
        contours,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        panels=[]
        for contour in contours:
            x,y,bw,bh=cv2.boundingRect(contour)
            if not (w*.12<bw<w*.65 and h*.25<bh<h*.9):continue
            if any(x+bw*.15<c[0]<x+bw*.85 and y<c[1]<y+bh*.2 for c in titles):panels.append((x,y,bw,bh))
        if len(panels)!=1:raise RuntimeError('Chưa xác định duy nhất khung Trung Tâm Người Dùng để bấm X.')
        x,y,bw,bh=panels[0]
        self.click((round(x+bw*.94),round(y+bh*.07)),offset)
        self.app.log('Đã bấm X của Trung Tâm Người Dùng — chờ trở lại game.')

    def open_list(self, account=False):
        deadline=time.monotonic()+240
        actions=0
        while time.monotonic()<deadline and actions<10:
            state, screen, offset, rows, texts = self.inspect()
            h, w = screen.shape[:2]
            if state == 'start_screen':
                self.enter_game(screen, offset, rows)
                continue
            if state=='exit_dialog':
                self.cancel_exit(screen,offset,rows)
                continue
            if account and state=='account_dialog':return
            if state == 'characters':
                if account:
                    self.key('esc');actions+=1
                    continue
                self.guard()
                pg.moveTo(offset[0]+int(w*.72), offset[1]+int(h*.48))
                pg.scroll(30)
                self.pause()
                return
            if state == 'settings':
                actions+=1
                if getattr(self.vision,'mobile',False):
                    target='taikhoan' if account else 'nhanvat'
                    point=self.text_point(texts,target,screen,lambda c:w*.20<c[0]<w*.50 and h*.40<c[1]<h*.70)
                    point=(point[0],point[1]-round(h*.09))
                else:
                    point = self.text_point(texts, 'taikhoannhanvat', screen,
                                            lambda c: c[0] < w*.28 and c[1] > h*.45)
                self.click(point, offset)
            elif state == 'profile':
                actions+=1
                region=(w*.78,h*.75,w*.12,h*.18) if getattr(self.vision,'mobile',False) else (0,h*.65,w*.36,h*.35)
                found = self.vision.icon('settings_gear', screen, region)
                if not found:
                    raise RuntimeError('Không nhận diện được bánh răng trong hồ sơ Thống đốc.')
                self.click(found[1], offset)
            elif state in {'inside', 'outside'}:
                actions+=1
                # Avatar is the game control anchored to the top-left, independent of the portrait skin.
                scale = min(w/1770, h/994)
                self.click((round(42*scale), round(40*scale)), offset)
            else:
                if state in {'chat','territory','alliance','no_alliance','search','deposit','new','march','confirm_character','account_dialog'}:
                    self.key('esc');actions+=1
                else:self.pause(2)
        raise RuntimeError('Không mở được danh sách nhân vật.')

    def page(self, known_stars=False):
        state, screen, offset, rows, _ = self.inspect()
        if state != 'characters':
            raise RuntimeError('Chưa ở danh sách nhân vật.')
        characters, normal_seen, in_stars = extract_stars(rows, screen.shape, known_stars)
        if len({char.identity for char in characters}) != len(characters):
            raise RuntimeError('Có tên/vương quốc trùng hoặc OCR không phân biệt được hai nhân vật.')
        h, w = screen.shape[:2]
        scale = min(w/1770, h/994)
        for char in characters:
            left = w*.27 if char.point[0] < w*.56 else w*.565
            # The tick sits near the portrait's lower edge. Taller roster cards
            # put it below the old 70px crop, even though the name is readable.
            region=(left-45*scale,char.point[1]+12*scale,100*scale,110*scale)
            if getattr(self.vision,'mobile',False):
                left=w*.14 if char.point[0]<w*.56 else w*.51
                region=(left-w*.025,char.point[1]+h*.045,w*.055,h*.065)
            found = self.vision.icon('character_active', screen,
                                     region)
            char.active = bool(found)
        return characters, normal_seen, in_stars, screen, offset

    def scroll_page(self, screen, offset):
        h, w = screen.shape[:2]
        self.guard()
        if getattr(self.vision,'mobile',False) is True:
            # Android Unity lists respond to a held touch/drag, not reliably to
            # Windows mouse-wheel events. Keep overlap between adjacent pages.
            content=cv2.resize(screen[int(h*.29):int(h*.82),int(w*.15):int(w*.86)],(160,90))
            previous=getattr(self,'scroll_content',None)
            unchanged=previous is not None and np.mean(cv2.absdiff(content,previous))<1.5
            self.scroll_stalls=getattr(self,'scroll_stalls',0)+1 if unchanged else 0
            self.scroll_content=content
            retry=self.scroll_stalls
            if retry:self.app.log('Danh sách chưa dịch chuyển — đổi vị trí kéo và kéo dài hơn.')
            x=offset[0]+round(w*(.74 if retry%2 else .44))
            start=offset[1]+round(h*.77)
            end=offset[1]+round(h*(.34 if retry else .47))
            pg.moveTo(x,start)
            try:pg.dragTo(x,end,duration=.9 if retry else .65,button='left')
            finally:pg.mouseUp(button='left')
            self.pause(.8)
            return
        pg.moveTo(offset[0]+int(w*.72), offset[1]+int(h*.48))
        pg.scroll(-4)
        self.pause()

    def scan(self):
        self.open_list()
        found = {}
        in_stars = False
        unchanged = 0
        while not self.app.stop.is_set():
            chars, normal, in_stars, screen, offset = self.page(in_stars)
            before = len(found)
            found.update({c.identity: c for c in chars})
            unchanged = unchanged+1 if before == len(found) else 0
            if normal:
                if not found:
                    raise RuntimeError('Không đọc được nhân vật ngôi sao nào.')
                return list(found.values())
            if unchanged >= 3:
                raise RuntimeError('Chưa xác nhận được cuối nhóm Nhân vật ngôi sao; không đoán danh sách.')
            self.scroll_page(screen, offset)
        raise RuntimeError('Đã dừng quét nhân vật.')

    def find(self, identity):
        self.open_list()
        in_stars = False
        previous = None
        unchanged = 0
        seen={}
        while not self.app.stop.is_set():
            chars, normal, in_stars, screen, offset = self.page(in_stars)
            for char in chars:seen[char.identity]=char
            fingerprint = tuple(char.identity for char in chars)
            unchanged = unchanged+1 if fingerprint == previous else 0
            previous = fingerprint
            candidates = [char for char in chars if char.identity==identity]
            if not candidates:candidates=[char for char in chars if same_identity(char.identity,identity)]
            if not candidates:
                realm,_,name=identity.partition(':')
                # A visible governor can move between home and seasonal realms.
                # Resolve that visible row before attempting to scroll to the end.
                visible=[char for char in chars if same_name(char.name,name)]
                if len(visible)==1 and (realm.upper().startswith('C') or visible[0].kingdom.upper().startswith('C')):
                    candidates=visible
                    self.app.log('Đã thấy '+visible[0].name+' trên màn hình tại #'+visible[0].kingdom+' — nhận theo tên duy nhất, không cần cuộn.')
            if len(candidates)>1:
                raise RuntimeError('Có nhiều nhân vật trùng tên sau khi sửa OCR; cần kiểm tra danh sách.')
            target = candidates[0] if candidates else None
            if target:
                return target, screen, offset
            if normal:
                # Seasonal characters may return to their home kingdom after login.
                name=identity.partition(':')[2]
                matches=[char for char in seen.values() if same_name(char.name,name)]
                if len(matches)==1:
                    target=matches[0]
                    self.app.log('Nhân vật '+target.name+' đã đổi vương quốc thành #'+target.kingdom+' — xác nhận theo tên duy nhất trong danh sách.')
                    # A previous page's point must be refreshed before clicking.
                    if any(char.identity==target.identity for char in chars):return target,screen,offset
                    return self.find(target.identity)
                break
            if unchanged >= 3:
                raise RuntimeError('Không cuộn được danh sách để tìm nhân vật.')
            self.scroll_page(screen, offset)
        raise RuntimeError('Không tìm thấy nhân vật ngôi sao đã chọn: ' + identity)

    def select(self, character):
        self.transition_deadline = time.monotonic() + 240
        self.app.log('Đang chuyển nhân vật: ' + character.name + ' — chờ cửa sổ/loading tối đa 240 giây.')
        try:
            return self._select(character)
        finally:
            self.transition_deadline = 0

    def profile_matches(self, character):
        state,screen,offset,rows,_=self.inspect()
        if state in {'start_screen','loading','exit_dialog'}:
            self.app.log('Chưa vào bản đồ khi xác nhận tên — tiếp tục tải game trước khi mở hồ sơ.')
            self.wait_loaded_map()
            state,screen,offset,rows,_=self.inspect()
        if state in {'inside','outside'}:
            h,w=screen.shape[:2]
            scale=min(w/1770,h/994)
            self.click((round(42*scale),round(40*scale)),offset)
            state,screen,offset,rows,_=self.wait_for_panel({'profile'})
        if state!='profile':return False
        name=profile_name(rows,screen.shape,getattr(self.vision,'mobile',False))
        if name and same_name(name,character.name):
            self.app.log('Đã xác nhận tên trong hồ sơ thống đốc: '+name)
            return True
        return False

    def _select(self, character):
        if self.profile_matches(character):
            self.close_to_map()
            return
        target, _, offset = retry_step(self.app,'tìm nhân vật '+character.name,lambda:self.find(character.identity),self.recover_loading_window)
        if target.active:
            self.close_to_map()
            return
        def open_confirmation():
            observation=self.inspect()
            if observation[0]=='confirm_character':return observation
            fresh,_,fresh_offset=self.find(target.identity)
            if fresh.active:return ('already_active',None,None,None,[])
            self.click(fresh.point,fresh_offset)
            result=self.wait_for_panel({'confirm_character'})
            if result[0]!='confirm_character':raise RuntimeError('Chưa thấy xác nhận chuyển nhân vật.')
            return result
        state, screen, offset, _, texts = retry_step(self.app,'mở xác nhận '+target.name,open_confirmation,self.recover_loading_window)
        if state=='already_active':self.close_to_map();return
        def confirm_selected():
            state,screen,offset,rows,texts=self.inspect()
            if state in {'loading','start_screen','inside','outside'}:return
            if state!='confirm_character':
                state,screen,offset,rows,texts=open_confirmation()
                if state=='already_active':return
            h,w=screen.shape[:2]
            name_y=(.59,.66) if getattr(self.vision,'mobile',False) else (.52,.63)
            names=[text for _,c,text in texts if w*.35<c[0]<w*.65 and h*name_y[0]<c[1]<h*name_y[1]]
            if not any(same_name(name,target.name) for name in names):
                self.key('esc')
                raise RuntimeError('Tên trong xác nhận không khớp; mở lại đúng nhân vật.')
            region=(w*.52,h*.66,w*.23,h*.12) if getattr(self.vision,'mobile',False) else (w*.48,h*.57,w*.23,h*.15)
            yes=self.vision.icon('confirm_yes',screen,region)
            if not yes:raise RuntimeError('Không nhận diện được nút CÓ để chuyển nhân vật.')
            self.click(yes[1],offset)
        retry_step(self.app,'bấm xác nhận chuyển '+target.name,confirm_selected,self.recover_loading_window)
        retry_step(self.app,'chờ tải nhân vật '+target.name,self.wait_loaded_map,self.recover_loading_window)
        def verify_active():
            if not self.profile_matches(target):
                raise RuntimeError('Chưa xác nhận được tên trong hồ sơ thống đốc vừa đăng nhập.')
        retry_step(self.app,'xác nhận nhân vật đang dùng '+target.name,verify_active,self.recover_loading_window)
        retry_step(self.app,'trở lại ngoài thành sau đổi nhân vật',self.close_to_map,self.recover_loading_window)

    def wait_loaded_map(self):
        deadline=time.monotonic()+240
        while time.monotonic()<deadline:
            state,screen,offset,rows,texts=self.inspect()
            if state in {'inside','outside'}:return
            if state=='start_screen':self.enter_game(screen,offset,rows)
            elif state=='exit_dialog':self.cancel_exit(screen,offset,rows)
            else:self.pause(2)
        raise RuntimeError('Chưa tải xong bản đồ — tiếp tục chờ, không chọn lại nhân vật.')

    def alliance_menu_visible(self, screen, texts):
        h,w=screen.shape[:2]
        if any(n=='lienminh' and w*.65<c[0]<w*.82 and c[1]>h*.88 for n,c,_ in texts):return True
        found=self.vision.icon('alliance_menu',screen,(w*.68,h*.86,w*.10,h*.14))
        return bool(found and w*.715<found[1][0]<w*.755)

    def ensure_alliance_menu(self):
        state,screen,offset,rows,texts=self.inspect()
        if state not in {'inside','outside'}:raise RuntimeError('Chưa trở về bản đồ để mở menu Liên minh.')
        if self.alliance_menu_visible(screen,texts):return
        self.app.log('Menu Android đang thu gọn — bấm I để mở trước khi vào Liên minh.')
        self.key('i')
        for _ in range(3):
            state,screen,offset,rows,texts=self.inspect()
            if state in {'inside','outside'} and self.alliance_menu_visible(screen,texts):return
            self.pause(.5)
        raise RuntimeError('Chưa thấy nút Liên minh sau khi mở menu bằng I.')

    def wait_for_panel(self, expected):
        deadline=time.monotonic()+15
        while True:
            observation=self.inspect()
            if observation[0] in expected or time.monotonic()>=deadline:return observation
            self.pause(.5)

    def claim_alliance_optional(self):
        try:
            self.claim_alliance()
            return True
        except Exception as error:
            if self.app.stop.is_set() or not self.app.active():raise
            message=str(error) if isinstance(error,RuntimeError) else type(error).__name__
            self.app.log('Bỏ qua nhận tài nguyên liên minh: '+message+' — tiếp tục farm.')
            self.close_to_map()
            return False

    def claim_alliance(self):
        self.close_to_map()
        if getattr(self.vision,'mobile',False):self.ensure_alliance_menu()
        self.key('o')
        state, screen, offset, _, texts = self.wait_for_panel({'alliance','no_alliance'})
        if state == 'no_alliance':
            self.app.log('Không có liên minh — bỏ qua nhận tài nguyên lãnh thổ.')
            self.close_to_map()
            return
        if state != 'alliance':
            raise RuntimeError('Chưa xác định được trạng thái liên minh.')
        label = self.text_point(texts, 'lanhtho', screen, lambda p: p[0] > screen.shape[1]*.40)
        scale = min(screen.shape[1]/1770, screen.shape[0]/994)
        flag = self.vision.icon('alliance_flag', screen,
                                (label[0]-130*scale, label[1]-210*scale, 260*scale, 205*scale))
        if not flag:
            raise RuntimeError('Không nhận diện được biểu tượng lá cờ phía trên chữ Lãnh thổ.')
        self.click(flag[1], offset)
        state, screen, offset, _, texts = self.wait_for_panel({'territory'})
        if state != 'territory':
            raise RuntimeError('Chưa mở được Lãnh thổ liên minh.')
        point = self.text_point(texts, 'nhan', screen, lambda p: p[0] > screen.shape[1]*.55 and p[1] < screen.shape[0]*.38)
        self.click(point, offset)
        self.app.log('Đã thực hiện bước NHẬN tài nguyên lãnh thổ liên minh.')
        self.close_to_map()

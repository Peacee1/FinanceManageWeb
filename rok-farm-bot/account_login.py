"""Password-only Lilith login through the normal game UI."""
import time
import keyboard
import pyautogui as pg
import numpy as np
import cv2
from characters import CharacterNavigator
from vision import normalize
from step_retry import retry_step

def android_login_overlay(screen):
    """Locate the foreground white SDK dialog, excluding its dimmed backdrop."""
    h,w=screen.shape[:2]
    mask=(screen.min(2)>=250).astype('uint8')*255
    contours,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    panels=[]
    for contour in contours:
        x,y,bw,bh=cv2.boundingRect(contour)
        if (w*.20<bw<w*.60 and h*.25<bh<h*.90 and
            abs(x+bw/2-w/2)<w*.08 and abs(y+bh/2-h/2)<h*.20):
            panels.append((x,y,bw,bh))
    return max(panels,key=lambda r:r[2]*r[3]) if panels else None

def android_overlay_texts(texts,panel):
    x,y,w,h=panel
    return [t for t in texts if x<t[1][0]<x+w and y<t[1][1]<y+h]

def android_password_form(texts,screen):
    h,w=screen.shape[:2]
    def unique(labels):
        points=[tuple(map(int,c)) for n,c,_ in texts if n in labels and w*.35<c[0]<w*.65 and h*.30<c[1]<h*.65]
        return points[0] if len(points)==1 else None
    email=unique({'diachiemail','nhapdiachiemailcuaban'})
    password=unique({'nhapmatkhau','nhapmatkhaucuaban'})
    submit=unique({'dangnhap','dangnhapngay'})
    # Filled fields lose their placeholders. Identify the two grey input
    # rectangles above the login button instead of matching stale field text.
    if submit:
        grey=cv2.cvtColor(screen,cv2.COLOR_BGR2GRAY)
        mask=((grey>=235)&(grey<=252)&((screen.max(2).astype(int)-screen.min(2))<8)).astype('uint8')*255
        mask[:int(h*.30)]=0;mask[int(submit[1]-h*.02):]=0
        mask[:,:int(w*.20)]=0;mask[:,int(w*.80):]=0
        contours,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        fields=sorted([cv2.boundingRect(c) for c in contours if
                       w*.15<cv2.boundingRect(c)[2]<w*.55 and h*.04<cv2.boundingRect(c)[3]<h*.12],key=lambda r:r[1])
        if len(fields)==2:
            a,b=fields
            if abs(a[0]-b[0])<w*.01 and abs(a[2]-b[2])<w*.01 and a[1]+a[3]<b[1]:
                email=(a[0]+a[2]//2,a[1]+a[3]//2)
                password=(b[0]+b[2]//2,b[1]+b[3]//2)
    if not email or not password or not submit:return None
    if not (email[1]+h*.03<password[1]<submit[1]-h*.03):return None
    if max(email[0],password[0],submit[0])-min(email[0],password[0],submit[0])>w*.04:return None
    return {'email':email,'password':password,'submit':submit}

def pc_filled_email_form(texts,screen,email):
    """Resume from visible email/password/button anchors, without placeholder
    or grey-field color assumptions. Never infer a password field by offset."""
    h,w=screen.shape[:2]
    def points(predicate):
        result=[]
        for n,c,t in texts:
            if w*.20<c[0]<w*.80 and h*.15<c[1]<h*.85 and predicate(n,c,t):
                p=tuple(map(int,c))
                if not any(abs(p[0]-q[0])<10 and abs(p[1]-q[1])<10 for q in result):result.append(p)
        return result
    tabs=points(lambda n,c,t:n in {'dangnhapmatkhau','dangnhapbangmatkhau'})
    if len(tabs)!=1:return None
    tab=tabs[0]
    emails=points(lambda n,c,t:normalize(t)==normalize(email) and tab[1]+h*.015<c[1]<tab[1]+h*.25)
    if len(emails)!=1:return None
    address=emails[0]
    passwords=points(lambda n,c,t:n in {'nhapmatkhau','nhapmatkhaucuaban'} and address[1]+h*.015<c[1]<address[1]+h*.20)
    if len(passwords)!=1:return None
    password=passwords[0]
    submits=points(lambda n,c,t:n in {'dangnhapngay','dangnhap'} and password[1]+h*.025<c[1]<password[1]+h*.25)
    if len(submits)!=1:return None
    submit=submits[0]
    if max(abs(tab[0]-submit[0]),abs(password[0]-submit[0]),abs(address[0]-submit[0]))>w*.20:return None
    return {'email':address,'password':password,'submit':submit}

class AccountLogin:
    def __init__(self,app):
        self.app=app
        self.nav=CharacterNavigator(app)

    def password_form(self,texts,screen,email):
        if getattr(self.app.vision,'mobile',False) is not True:
            anchored=pc_filled_email_form(texts,screen,email)
            if anchored:return anchored
        return android_password_form(texts,screen)

    def point(self,texts,target,screen):
        target=normalize(target)
        h,w=screen.shape[:2]
        if target in {'chuyentaikhoan','dangnhapvaotaikhoankhac'}:
            panel=android_login_overlay(screen)
            foreground=android_overlay_texts(texts,panel) if panel else texts
            exact=[tuple(map(int,c)) for n,c,_ in foreground if n==target
                   and w*.20<c[0]<w*.80 and h*.20<c[1]<h*.90]
            points=[]
            for p in exact:
                if not any(abs(p[0]-q[0])<12 and abs(p[1]-q[1])<12 for q in points):points.append(p)
            if len(points)==1:return points[0]
            raise RuntimeError('Chưa thấy duy nhất nút '+target+' trong hộp tài khoản; không bấm chữ gần giống.')
        if target=='nhapdiachiemailcuaban':
            tab_y=min((c[1] for n,c,_ in texts if n=='dangnhapmatkhau'),default=None)
            if tab_y is None:raise RuntimeError('Chưa xác nhận tab đăng nhập mật khẩu; không nhập email.')
            return self.nav.text_point(texts,target,screen,lambda c:w*.20<c[0]<w*.80
                                       and tab_y+h*.015<c[1]<tab_y+h*.15)
        return self.nav.text_point(texts,target,screen)

    def fill(self,point,offset,value):
        mobile=getattr(self.app.vision,'mobile',False) is True
        if mobile and (not value.isascii() or any(ord(c)<32 or ord(c)>126 for c in value)):
            raise RuntimeError('Chưa hỗ trợ nhập ký tự ngoài ASCII trên LDPlayer; không dùng clipboard cũ.')
        self.nav.click(point,offset)
        if self.app.stop.is_set():
            raise RuntimeError('Đã dừng.')
        # Do not refocus the main Unity window after activating the SDK input.
        pg.hotkey('ctrl','a')
        if mobile:
            self.nav.pause(.2)
            pg.press('backspace')
            self.nav.pause(.2)
            shifted=dict(zip('~!@#$%^&*()_+{}|:"<>?', '`1234567890-=[]\\;\',./'))
            for char in value:
                if self.app.stop.is_set():raise RuntimeError('Đã dừng.')
                if char in shifted:pg.hotkey('shift',shifted[char])
                elif char.isupper():pg.hotkey('shift',char.lower())
                else:pg.press(char if char!=' ' else 'space')
                self.nav.pause(.04)
            self.nav.pause(.5)
            return
        from secure_paste import paste_text
        paste_text(value)
        self.nav.pause(.3)

    def dismiss_password_hint(self, screen, offset, texts):
        if getattr(self.app.vision,'mobile',False) and getattr(self,'android_form',None):
            email=self.android_form['email']
            self.nav.click((email[0],round(email[1]-screen.shape[0]*.07)),offset)
            return self.nav.inspect()
        # Blank header immediately above the password tab, inside the login modal.
        tab = self.point(texts, 'Đăng nhập mật khẩu', screen)
        point = (tab[0], max(0, tab[1]-round(screen.shape[0]*.04)))
        self.nav.click(point, offset)
        self.nav.pause(.5)
        observation = self.nav.inspect()
        fresh_texts = observation[4]
        if any('matkhauphaidai' in n for n, _, _ in fresh_texts):
            raise RuntimeError('Hộp yêu cầu mật khẩu còn che giao diện; chưa gửi đăng nhập.')
        return observation

    def login(self,email,password):
        self.nav.transition_deadline=time.monotonic()+240
        try:
            if getattr(self.app.vision,'mobile',False) is True:
                return self.login_android(email,password)
            return self.login_legacy(email,password)
        finally:
            self.nav.transition_deadline=0

    def open_pc_user_center(self):
        nav=self.nav
        # Read again after roster navigation. Never search Switch Account
        # until the foreground User Center has actually been observed.
        observation=nav.inspect()
        if any(n=='trungtamnguoidung' for n,_,_ in observation[4]):return observation
        state,screen,offset,_,texts=observation
        if state!='characters':raise RuntimeError('Chưa ở danh sách nhân vật để mở nút Tài khoản.')
        h,w=screen.shape[:2]
        found=self.app.vision.icon('account_button',screen,(w*.20,h*.16,w*.48,h*.29))
        if not found:raise RuntimeError('Không thấy nút Tài khoản có biểu tượng người phía trên danh sách ngôi sao.')
        point=(int(found[1][0]+offset[0]),int(found[1][1]+offset[1]))
        nav.guard()
        pg.moveTo(*point,duration=.15)
        nav.guard()
        # Separate press/release so the SDK can observe the held button.
        # PyAutoGUI's default Windows click sends both flags in one event.
        pg.mouseDown()
        try:nav.pause(.12)
        finally:pg.mouseUp()
        self.app.log('Đã nhấn/thả nút Tài khoản; đang chờ Trung Tâm Người Dùng mở.')
        deadline=time.monotonic()+20
        while time.monotonic()<deadline:
            nav.pause(.6)
            observation=nav.inspect()
            if any(n=='trungtamnguoidung' for n,_,_ in observation[4]):
                self.app.log('Đã xác nhận Trung Tâm Người Dùng đã mở.')
                return observation
        raise RuntimeError('Đã bấm Tài khoản nhưng chưa thấy Trung Tâm Người Dùng; chưa tìm hoặc bấm Chuyển tài khoản.')

    def login_android(self,email,password):
        if not password:raise RuntimeError('Server chưa cấp thông tin đăng nhập.')
        nav=self.nav
        step=lambda label,action:retry_step(self.app,label,action,nav.recover_loading_window)
        if getattr(self,'mobile_email',None)!=email:
            self.mobile_email=email;self.mobile_stage=0
        def inspect_form():
            observation=nav.inspect()
            form=android_password_form(observation[4],observation[1])
            if not form:raise RuntimeError('Chưa thấy biểu mẫu email/mật khẩu Android tại bước hiện tại.')
            self.android_form=form
            return observation,form
        def click_current(target):
            _,screen,offset,_,texts=nav.inspect()
            panel=android_login_overlay(screen)
            if panel:
                texts=android_overlay_texts(texts,panel)
            exact=[t for t in texts if t[0]==normalize(target)]
            # A modal blocks all background actions, including fuzzy matches.
            if panel and not exact:raise RuntimeError('Hộp đăng nhập đang mở; không bấm nút phía sau.')
            nav.click(self.point(exact or texts,target,screen),offset)
            nav.pause(.5)
        def prepare():
            for _ in range(20):
                state,screen,offset,rows,texts=nav.inspect()
                form=android_password_form(texts,screen)
                if form:self.android_form=form;return True
                panel=android_login_overlay(screen)
                foreground=android_overlay_texts(texts,panel) if panel else texts
                foreground_norms={n for n,_,_ in foreground}
                if 'dangnhapvaotaikhoankhac' in foreground_norms:
                    click_current('Đăng nhập vào tài khoản khác');continue
                password_tab=next((n for n,_,_ in foreground if n in {
                    'dangnhapbangmatkhau','dangnhapmatkhau'}),None)
                # Handle the front dialog before interpreting background state
                # or the still-visible User Center / Switch Account labels.
                if password_tab:
                    click_current(password_tab);continue
                if panel:
                    nav.pause(2);continue
                norms={n for n,_,_ in texts}
                if state=='start_screen':nav.enter_game(screen,offset,rows);continue
                if state in {'loading',None}:nav.pause(2);continue
                if 'dangnhapvaotaikhoankhac' in norms:
                    step('mở đăng nhập tài khoản khác',lambda:click_current('Đăng nhập vào tài khoản khác'));continue
                if 'trungtamnguoidung' in norms:
                    if any(normalize(email)==normalize(t) for _,_,t in texts):return False
                    if getattr(self.app,'fleet',None):self.app.fleet.login_in_progress=True
                    step('bấm Chuyển tài khoản',lambda:click_current('Chuyển tài khoản'));continue
                if 'dangnhapmatkhau' in norms:
                    step('mở tab mật khẩu',lambda:click_current('Đăng nhập mật khẩu'));continue
                step('mở mục tài khoản',lambda:nav.open_list(account=True))
            raise RuntimeError('Chưa đến biểu mẫu đăng nhập; giữ bước mở tài khoản.')
        if self.mobile_stage==0:
            needs_login=step('mở tài khoản hoặc biểu mẫu đăng nhập',prepare)
            if not needs_login:
                self.app.log('Đã xác nhận tài khoản ROK đang đăng nhập: '+email+' — không đăng nhập lại.')
                step('trở lại bản đồ sau xác nhận tài khoản',nav.close_to_map)
                self.mobile_stage=5;return
            self.mobile_stage=1
            if getattr(self.app,'fleet',None):self.app.fleet.login_in_progress=True
        def enter_email():
            observation,form=inspect_form();_,screen,offset,_,texts=observation
            h,w=screen.shape[:2];p=form['email']
            def matches(items):return any(normalize(t)==normalize(email) and abs(c[0]-p[0])<w*.14 and abs(c[1]-p[1])<h*.04 for _,c,t in items)
            if matches(texts):return
            self.fill(p,offset,email)
            if not matches(nav.inspect()[4]):raise RuntimeError('Chưa xác nhận email trong ô nhập; chỉ nhập lại email.')
        if self.mobile_stage==1:
            step('nhập và xác nhận email',enter_email);self.mobile_stage=2
        def enter_password():
            observation,form=inspect_form()
            self.fill(form['password'],observation[2],password)
            fresh=nav.inspect();self.dismiss_password_hint(fresh[1],fresh[2],fresh[4])
        if self.mobile_stage==2:
            step('nhập mật khẩu',enter_password);self.mobile_stage=3
        def submit():
            state,screen,offset,rows,texts=nav.inspect()
            if state in {'loading','start_screen','inside','outside'}:return
            form=android_password_form(texts,screen)
            if not form:raise RuntimeError('Chưa thấy nút đăng nhập của biểu mẫu hiện tại.')
            nav.click(form['submit'],offset)
        if self.mobile_stage==3:
            step('bấm Đăng nhập',submit);self.mobile_stage=4
        if self.mobile_stage==4:
            step('chờ tải sau đăng nhập tài khoản',nav.wait_loaded_map);self.mobile_stage=5

    def wait_pc_other_account(self):
        deadline=time.monotonic()+25
        clicked=False
        while time.monotonic()<deadline:
            observation=self.nav.inspect()
            state,screen,offset,_,texts=observation
            norms={n for n,_,_ in texts}
            # Front password dialog takes precedence over the User Center
            # labels that can remain visible in its darkened background.
            if android_password_form(texts,screen) or norms & {'dangnhapmatkhau','dangnhapbangmatkhau'}:
                return observation
            if 'dangnhapvaotaikhoankhac' in norms and not clicked:
                self.nav.click(self.point(texts,'Đăng nhập vào tài khoản khác',screen),offset)
                self.app.log('Đã bấm Đăng nhập vào tài khoản khác — chờ biểu mẫu email/mật khẩu.')
                clicked=True
            self.nav.pause(1)
        raise RuntimeError('Chưa mở được biểu mẫu từ hộp chọn tài khoản; giữ nguyên bước, không bấm nút phía sau.')

    def login_legacy(self,email,password):
        if not password:
            raise RuntimeError('Server chưa cấp thông tin đăng nhập.')
        nav=self.nav
        if getattr(self,'pending_return_email',None)==email:
            nav.close_to_map()
            self.pending_return_email=None
            return
        state,screen,offset,rows,texts=nav.inspect()
        if state=='start_screen':
            nav.enter_game(screen,offset,rows)
            state,screen,offset,rows,texts=nav.inspect()
        norms={n for n,_,_ in texts}
        if norms & {'chontaikhoan','dangnhapvaotaikhoankhac'}:
            state,screen,offset,rows,texts=self.wait_pc_other_account()
            norms={n for n,_,_ in texts}
        form=self.password_form(texts,screen,email)
        if not form and not any('dangnhap' in n and ('matkhau' in n or 'maxac' in n) for n in norms):
            if 'trungtamnguoidung' not in norms:
                if getattr(self.app.vision,'mobile',False):nav.open_list(account=True)
                else:nav.open_list()
            state,screen,offset,rows,texts=nav.inspect()
            if not any('trungtamnguoidung' in n for n,_,_ in texts):
                _,screen,offset,rows,texts=self.open_pc_user_center()
            if any(normalize(email)==normalize(t) for n,c,t in texts):
                self.app.log('Đã xác nhận tài khoản ROK đang đăng nhập: '+email+' — không đăng nhập lại.')
                self.pending_return_email=email
                nav.close_to_map()
                self.pending_return_email=None
                return
            nav.click(self.point(texts,'Chuyển tài khoản',screen),offset)
            _,screen,offset,rows,texts=self.wait_pc_other_account()
        # A partially attempted account switch invalidates the previous account
        # assumption before any form input or network reporting can fail.
        if getattr(self.app,'fleet',None):self.app.fleet.login_in_progress=True
        self.android_form=self.password_form(texts,screen,email)
        if self.android_form:
            self.app.log('Đã nhận diện biểu mẫu email/mật khẩu — kiểm tra nội dung đang có.')
            email_point=self.android_form['email']
        else:
            nav.click(self.point(texts,'Đăng nhập mật khẩu',screen),offset)
            _,screen,offset,rows,texts=nav.inspect()
            self.android_form=self.password_form(texts,screen,email)
            email_point=self.android_form['email'] if self.android_form else self.point(texts,'Nhập địa chỉ e-mail của bạn',screen)
        h,w=screen.shape[:2]
        existing_email=any(normalize(email)==normalize(t) and self.android_form and
                           abs(c[0]-email_point[0])<w*.14 and abs(c[1]-email_point[1])<h*.04 for n,c,t in texts)
        if existing_email:
            self.app.log('Email trong ô nhập đã đúng — tiếp tục nhập mật khẩu.')
        else:
            self.fill(email_point,offset,email)
            _,screen,offset,rows,texts=nav.inspect()
        h,w=screen.shape[:2]
        if not any(normalize(email)==normalize(t) and (not self.android_form or
                   abs(c[0]-email_point[0])<w*.14 and abs(c[1]-email_point[1])<h*.04) for n,c,t in texts):
            raise RuntimeError('Chưa xác nhận được email đã nhập trong game; không gửi đăng nhập.')
        # Do not include the password-tab heading when locating the input.
        h,w=screen.shape[:2]
        tab_y=min((c[1] for n,c,t in texts if 'dangnhapmatkhau' in n),default=0)
        field=self.android_form['password'] if self.android_form else nav.text_point(texts,'nhapmatkhauc uaban'.replace(' ',''),screen,lambda c:c[1]>tab_y+h*.04)
        self.fill(field,offset,password)
        _,screen,offset,rows,texts=nav.inspect()
        _,screen,offset,rows,texts=self.dismiss_password_hint(screen,offset,texts)
        # Password forms may have no terms checkbox. Only check it when present.
        terms=[c for n,c,t in texts if 'toidadoc' in n]
        if terms:
            center=terms[0]
            y=int(center[1]);left=max(0,int(center[0]-w*.18))
            patch=screen[max(0,y-20):y+20,left:int(center[0])]
            red=(patch[:,:,2]>150)&(patch[:,:,1]<110)&(patch[:,:,0]<110) if patch.size else np.array([])
            if not red.size or red.sum()<8:
                raise RuntimeError('Cần người dùng chấp thuận điều khoản game trước khi đăng nhập.')
        submit=nav.text_point(texts,'dangnhap',screen,lambda c:w*.35<c[0]<w*.65 and abs(c[1]-self.android_form['submit'][1])<h*.04) if self.android_form else self.point(texts,'Đăng nhập ngay',screen)
        nav.click(submit,offset)
        for _ in range(60):
            nav.pause(2)
            if not nav.recover_loading_window():continue
            state,screen,offset,rows,texts=nav.inspect()
            if state=='exit_dialog':
                nav.cancel_exit(screen,offset,rows)
                continue
            if state=='start_screen':
                nav.enter_game(screen,offset,rows)
                continue
            if state in {'inside','outside'}:
                return
        raise RuntimeError('Đăng nhập chưa vào bản đồ; kiểm tra mật khẩu hoặc thông báo trong game.')

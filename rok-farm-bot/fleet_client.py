"""HTTPS fleet connection. Never writes game passwords or tokens into logs."""
import json,time,threading,urllib.request,urllib.error,sys
import pyautogui as pg
from pathlib import Path
from urllib.parse import urlparse
from account_login import AccountLogin
from farm_cycle import FarmCycle
from game_window import GameWindow
from step_retry import retry_step

class FleetClient:
    def __init__(self,app,pairing,root):
        self.app=app;self.root=Path(root);self.server=pairing['server'].rstrip('/')
        parsed=urlparse(self.server)
        if parsed.scheme!='https' or parsed.hostname!='rokbot.peacee1.io.vn' or parsed.username or parsed.password:
            raise ValueError('Client chỉ kết nối https://rokbot.peacee1.io.vn')
        self.token=pairing['token'];self.bot_id=pairing['botId']
        self.tasks=[];self.lock=threading.Lock();self.last_ok=0;self.desired='stop';self.closed=threading.Event();self.current=None;self.completed_leases=set();self.farm_due={};self.current_governor=None

    def request(self,path,body):
        req=urllib.request.Request(self.server+'/api/rok-agent/'+path,data=json.dumps(body).encode(),headers={'Content-Type':'application/json','Authorization':'Bearer '+self.token},method='POST')
        try:
            with urllib.request.urlopen(req,timeout=15) as r:return json.load(r)
        except urllib.error.HTTPError as error:
            # Never log arbitrary response bodies, which can echo credentials.
            reasons={400:'Dữ liệu báo cáo không hợp lệ',401:'Mã kết nối client không còn hợp lệ',
                     403:'Không còn quyền chạy hoặc gói đã hết hạn',
                     409:'Phân công đã thay đổi hoặc thống đốc đã dừng'}
            if error.code in {400,401,403,409}:
                self.app.stop.set()
                with self.lock:
                    if error.code==401:self.tasks=[];self.last_ok=0
                    elif path=='report':
                        self.tasks=[t for t in self.tasks if not (str(t['id'])==str(body.get('accountId')) and t['lease_id']==body.get('leaseId'))]
                message='HTTP '+str(error.code)+': '+reasons[error.code]+'; bỏ nhiệm vụ cũ và chờ phân công mới.'
                self.app.log(message)
                raise RuntimeError(message) from None
            raise RuntimeError('HTTP '+str(error.code)+': server tạm thời chưa xử lý được; giữ bước hiện tại.') from None

    def assignment_current(self,task):
        with self.lock:
            return any(str(t['id'])==str(task['id']) and t['lease_id']==task['lease_id'] for t in self.tasks)

    def prepare_game(self):
        if getattr(self.app,'_launcher_recovery',None) or getattr(self.app,'_post_launcher_governor',None):
            from launcher_recovery import recover_launcher_game
            recover_launcher_game(self.app)
        self.app.game=GameWindow.find();self.app.game.focus()

    def heartbeat(self):
        last_error_log=float('-inf')
        while not self.closed.is_set():
            heartbeat_delay=15
            try:
                d=self.request('heartbeat',{'version':'ldplayer-v18' if '--ldplayer' in sys.argv else 'fleet-v51','status':'loading' if getattr(self.app,'vision',None) is None else 'running' if self.current else 'idle'})
                if not self.last_ok and hasattr(self.app,'log'):self.app.log('Đã kết nối server — sẵn sàng nhận lệnh từ web.')
                with self.lock:
                    self.tasks=[t for t in d.get('tasks',[]) if t['lease_id'] not in self.completed_leases];self.desired=d['desired'];self.last_ok=time.monotonic()
                if d.get('captureRequest') and getattr(self.app,'error_reporter',None):self.app.error_reporter.request_capture(d['captureRequest'])
                if d['desired']=='stop':self.app.stop.set()
                if self.current and (not any(str(t['id'])==str(self.current) for t in self.tasks) or
                    getattr(self,'current_lease',None) and not any(str(t['id'])==str(self.current) and t['lease_id']==self.current_lease for t in self.tasks)):
                    self.app.stop.set()
                if self.current_governor and not any(str(t['id'])==str(self.current) and
                    any(g['id']==self.current_governor and g.get('enabled') for g in t.get('governors',[])) for t in self.tasks):
                    self.app.stop.set()
            except Exception:
                heartbeat_delay=3
                if time.monotonic()-self.last_ok>45:self.app.stop.set()
            self.closed.wait(heartbeat_delay)

    def report(self,task,status,governors=None,governor_id=None,next_at=None,resources=None):
        body={'accountId':task['id'],'leaseId':task['lease_id'],'status':status,'message':''}
        if governors is not None:body['governors']=governors
        if governor_id is not None:body['governorId']=governor_id
        if next_at is not None:body['nextAt']=next_at
        if resources is not None:body['resources']=resources
        return self.request('report',body)

    def farm_governors(self, task):
        from characters import CharacterNavigator, Character
        nav=CharacterNavigator(self.app)
        for g in task.get('governors',[]):
            if not g.get('enabled') or max(g.get('next_at') or 0,self.farm_due.get((task['id'],task['lease_id'],g['id']),0))>time.time()*1000:
                continue
            if self.closed.is_set() or self.app.stop.is_set():return
            while not self.closed.is_set() and not self.app.stop.is_set():
                try:
                    self.prepare_game()
                    self.farm_one(task,g,nav)
                    break
                except Exception as error:
                    if self.app.stop.is_set() or self.closed.is_set():return
                    message=str(error) if isinstance(error,RuntimeError) else type(error).__name__
                    self.app.log('Lỗi nhân vật '+g['name']+': '+message+' — thử lại cùng nhân vật sau 3 giây.')
                    try:self.report(task,'farm_error',governor_id=g['id'])
                    except Exception:pass
                    if self.app.stop.wait(3):return

    def farm_one(self,task,g,nav):
        from characters import Character
        cfg=g['config'];counts=cfg['allocations']
        self.app.cycle=FarmCycle(counts)
        self.app.settings={'resource':self.app.cycle.current,'level':cfg['level'],'armies':sum(counts.values()),'interval':60,'title':'Rise of Kingdoms','auto':True,'probe':False,'allocations':counts,'repeat_hours':cfg['repeatHours']}
        self.current_governor=g['id']
        step=lambda label,action:retry_step(self.app,label,action,nav.recover_loading_window)
        step('gửi trạng thái bắt đầu',lambda:self.report(task,'farm_started',governor_id=g['id']))
        self.app.log('Khởi chạy thống đốc được yêu cầu: '+g['name'])
        # Do not persist through another account's journal/cursor.
        self.app.current_character=None
        step('chuyển nhân vật '+g['name'],lambda:nav.select(Character(g['id'],g['name'],g.get('kingdom',''),(0,0))))
        if cfg.get('claimAlliance',True):
            try:nav.claim_alliance_optional()
            except Exception:
                if self.app.stop.is_set():raise
                step('rời bảng liên minh để tiếp tục farm',nav.close_to_map)
        self.app.dispatch_state={}
        def farm():
            result=self.app.run_auto(one_pass=True)
            if result is None:raise RuntimeError('Chưa xác nhận kết quả farm.')
            return result
        result=step('farm '+g['name'],farm)
        if self.app.stop.is_set() or result is None:return
        next_at=int((time.time()+cfg['repeatHours']*3600)*1000)
        resources=self.read_resources()
        step('gửi kết quả farm '+g['name'],lambda:self.report(task,'farm_done',governor_id=g['id'],next_at=next_at,resources=resources))
        self.farm_due[(task['id'],task['lease_id'],g['id'])]=next_at
        self.current_governor=None
        self.app.log('Hoàn tất farm '+g['name']+' — chờ lượt tiếp theo.')

    def read_resources(self):
        from resource_stock import read_stock
        for _ in range(3):
            if self.app.stop.is_set():return None
            try:
                screen,_=self.app.game.capture()
                resources=read_stock(screen,self.app.vision)
                if resources is not None:
                    self.app.log('Đã đọc số dư 4 tài nguyên để gửi lên web.')
                    return resources
            except Exception:
                pass
            if self.app.stop.wait(1):return None
        self.app.log('Chưa đọc đủ số dư tài nguyên; giữ số liệu lần trước trên web.')
        return None

    def initialize_vision(self):
        while self.app.vision is None and not self.closed.is_set():
            try:
                from vision import Vision
                self.app.vision=Vision(Path(__file__).parent/'assets',self.root/'vision-cache')
                self.app.log('OCR đã sẵn sàng.')
            except Exception as error:
                self.app.stop.set()
                message=str(error).replace(self.token,'[token]')[:700]
                self.app.log('Không khởi tạo được OCR: '+type(error).__name__+': '+message+' — chưa thao tác game; thử lại sau 10 giây.')
                self.closed.wait(10)
        return self.app.vision is not None and not self.closed.is_set()

    def run(self):
        from error_reporter import ErrorReporter
        if hasattr(self.app,'root') and not getattr(self.app,'input_diagnostics',None):
            from input_diagnostics import InputDiagnostics
            self.app.input_diagnostics=InputDiagnostics(self.app);self.app.input_diagnostics.install()
        self.app.error_reporter=ErrorReporter(self.app,self.server,self.token,'ldplayer-v18' if '--ldplayer' in sys.argv else 'fleet-v51',self.closed)
        self.app.error_reporter.start()
        try:
            import ctypes,platform
            size=pg.size()
            remote=bool(ctypes.windll.user32.GetSystemMetrics(0x1000))
            admin=bool(ctypes.windll.shell32.IsUserAnAdmin())
            self.app.log('Môi trường Windows: '+platform.release()+'; màn hình '+str(size.width)+'x'+str(size.height)+'; phiên RDP='+str(remote)+'; quyền admin='+str(admin))
        except Exception:pass
        hb=threading.Thread(target=self.heartbeat,daemon=True);hb.start()
        current_email=None
        try:
            self.app.log('Đang khởi tạo OCR; heartbeat web đã chạy độc lập.')
            if not self.initialize_vision():return
            while not self.closed.is_set():
                with self.lock:tasks=list(self.tasks);desired=self.desired;last=self.last_ok
                if desired!='run' or time.monotonic()-last>45:
                    if self.closed.wait(2):break
                    continue
                retry_requested=False
                for task in tasks:
                    if self.closed.is_set() or self.desired!='run' or time.monotonic()-self.last_ok>45:break
                    if not self.assignment_current(task):continue
                    with self.lock:
                        if task['lease_id'] in self.completed_leases:
                            continue
                        self.current=task['id']
                        self.current_lease=task['lease_id']
                    self.app.stop.clear()
                    try:
                        if task.get('mode')=='farm' and not any(g.get('enabled') and (g.get('next_at') or 0)<=time.time()*1000 for g in task.get('governors',[])):
                            continue
                        cfg=task['config'];counts=cfg['allocations']
                        account_root=self.root/'accounts'/str(task['id']);account_root.mkdir(parents=True,exist_ok=True)
                        self.app.journal_path=account_root/'round-progress.json'
                        # Skip a finished account until its next due time, before switching login.
                        if self.app.journal_path.exists():
                            journal=json.loads(self.app.journal_path.read_text('utf-8'))
                            signature=json.dumps({'allocations':counts,'level':cfg['level']},sort_keys=True)
                            if journal.get('signature')==signature and journal.get('next_at',0) and journal['next_at']>time.time():continue
                        self.prepare_game();self.app.stop.wait(2)
                        if current_email!=task['email']:
                            current_email=None
                            self.login_in_progress=False
                            self.app.log('Đang đăng nhập tài khoản ROK: '+task['email'])
                            login=AccountLogin(self.app)
                            retry_step(self.app,'đổi tài khoản '+task['email'],lambda:login.login(task['email'],(task.get('credential') or {}).get('password')),login.nav.recover_loading_window)
                            current_email=task['email']
                            self.login_in_progress=False
                        if self.app.stop.is_set() or not self.assignment_current(task):continue
                        if task.get('mode')=='farm':
                            self.farm_governors(task)
                        else:
                            from characters import CharacterNavigator
                            self.app.log('Nhiệm vụ thêm tài khoản: chỉ quét thống đốc ngôi sao, không farm.')
                            discovery=CharacterNavigator(self.app)
                            chars=retry_step(self.app,'quét thống đốc ngôi sao',discovery.scan,discovery.recover_loading_window)
                            if len(chars)>20:
                                raise RuntimeError('Tài khoản có hơn 20 thống đốc; cần quản trị kiểm tra.')
                            retry_step(self.app,'gửi danh sách thống đốc',lambda:self.report(task,'ready',[{'id':c.identity,'name':c.name,'kingdom':c.kingdom,'power':c.power} for c in chars]))
                            with self.lock:
                                self.completed_leases.add(task['lease_id'])
                                self.tasks=[t for t in self.tasks if t['lease_id']!=task['lease_id']]
                                self.current=None
                            self.app.log(f'Đã gửi {len(chars)} thống đốc ngôi sao lên web. Kết thúc nhiệm vụ quét; không chuyển nhân vật hoặc xuất quân.')
                    except Exception as error:
                        if getattr(self,'login_in_progress',False):current_email=None
                        self.login_in_progress=False
                        # Exception text from HTTP/SDK may contain secrets; only local generic log.
                        self.app.log('Lỗi nhiệm vụ web: '+ (str(error) if isinstance(error,RuntimeError) else 'Đã dừng/mất kết nối.' if self.app.stop.is_set() else 'Lỗi '+type(error).__name__+' khi kết nối hoặc xử lý.')+' — kiểm tra lại lệnh sau 3 giây.')
                        try:
                            if task.get('mode')!='farm':self.report(task,'error')
                            elif self.current_governor:self.report(task,'farm_error',governor_id=self.current_governor)
                        except Exception:pass
                        # Keep confirmed login across report/farm failures.
                        retry_requested=True
                        self.closed.wait(3)
                    finally:
                        self.current=None
                        self.current_lease=None
                        self.current_governor=None
                    if retry_requested:break
                if not retry_requested:self.closed.wait(5)
        finally:
            self.closed.set();self.app.stop.set();hb.join(timeout=16)









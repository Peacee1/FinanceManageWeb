"""One bounded, redacted diagnostic per client; never blocks game automation."""
import base64,json,re,threading,time,urllib.request
import cv2
from collections import deque
from datetime import datetime,timezone
from PIL import ImageGrab
import numpy as np
from vision import normalize

SAFE_STATES={'chat','start_screen','inside','outside','profile','settings','characters','search','deposit','new','march','alliance','territory','no_alliance','confirm_character'}

def diagnostic_payload(app,message,token,version):
    fleet=getattr(app,'fleet',None)
    secrets=[token]
    if fleet:
        with fleet.lock:
            secrets += [str((t.get('credential') or {}).get('password') or '') for t in fleet.tasks]
    for secret in secrets:
        if secret:message=message.replace(secret,'[secret]')
    message=re.sub(r'[\w.+%-]+@[\w.-]+\.[A-Za-z]{2,}','[email]',message)
    message=re.sub(r'\b[a-fA-F0-9]{64}\b','[token]',message)
    record=getattr(app,'error_screen',None);image=None;stage='unknown'
    if record:
        screen,state,words,stamp=record;stage=str(state or 'unknown')
        sensitive=any(any(key in normalize(t) for key in ('matkhau','dangnhap','diachiemail','maxacminh','trungtamnguoidung')) for t in words)
        if state in SAFE_STATES and not sensitive and time.monotonic()-stamp<120:
            h,w=screen.shape[:2]
            for width in (1100,900,720):
                ratio=min(1,width/w);small=cv2.resize(screen,(round(w*ratio),round(h*ratio)))
                for quality in (45,30,20):
                    ok,encoded=cv2.imencode('.jpg',small,[cv2.IMWRITE_JPEG_QUALITY,quality])
                    if ok and len(encoded)<=37000:
                        image=base64.b64encode(encoded).decode();break
                if image:break
    return {'version':version,'stage':stage[:80],'message':message[:2000],'screenshot':image}

class ErrorReporter:
    def __init__(self,app,server,token,version,closed):
        self.app=app;self.server=server;self.token=token;self.version=version;self.closed=closed
        self.lock=threading.Lock();self.pending=None;self.last_sent=0;self.last_capture=0;self.wake=threading.Event()
        self.logs=deque(maxlen=200);self.last_logs=0
        self.capture_id=None;self.completed_capture=None
    def request_capture(self,request_id):
        with self.lock:
            if request_id!=self.completed_capture:self.capture_id=request_id
    def send_capture(self,request_id):
        image=None;message=''
        try:
            record=getattr(self.app,'error_screen',None)
            if record and record[1]=='account_dialog' and time.monotonic()-record[3]<120:
                message='Không chụp khi đang mở hộp đăng nhập để tránh lộ thông tin.'
            else:
                frame=cv2.cvtColor(np.array(ImageGrab.grab(all_screens=True)),cv2.COLOR_RGB2BGR)
                h,w=frame.shape[:2]
                for width in (1600,1280,960,720):
                    ratio=min(1,width/w);small=cv2.resize(frame,(round(w*ratio),round(h*ratio)))
                    for quality in (55,40,25,15):
                        ok,encoded=cv2.imencode('.jpg',small,[cv2.IMWRITE_JPEG_QUALITY,quality])
                        if ok and len(encoded)<=58000:image=base64.b64encode(encoded).decode();break
                    if image:break
                if not image:message='Không nén được ảnh trong giới hạn gửi.'
        except Exception as error:message='Không chụp được desktop của phiên Windows: '+type(error).__name__
        req=urllib.request.Request(self.server+'/api/rok-agent/capture',data=json.dumps({'requestId':request_id,'screenshot':image,'message':message}).encode(),headers={'Authorization':'Bearer '+self.token,'Content-Type':'application/json'},method='POST')
        with urllib.request.urlopen(req,timeout=10) as response:response.read()
    def queue_log(self,message):
        try:
            fleet=getattr(self.app,'fleet',None);secrets=[self.token]
            if fleet:
                with fleet.lock:secrets += [str((t.get('credential') or {}).get('password') or '') for t in fleet.tasks]
            for secret in secrets:
                if secret:message=message.replace(secret,'[secret]')
            message=re.sub(r'[\w.+%-]+@[\w.-]+\.[A-Za-z]{2,}','[email]',message)
            message=re.sub(r'\b[a-fA-F0-9]{64}\b','[token]',message)
            with self.lock:self.logs.append({'message':message[:1000],'at':datetime.now(timezone.utc).isoformat()})
        except Exception:pass
    def emit(self,message,force=False):
        try:
            with self.lock:
                if not force and time.monotonic()-self.last_capture<60:return
                self.last_capture=time.monotonic()
            payload=diagnostic_payload(self.app,message,self.token,self.version)
            if force:payload['retryThreshold']=True
            key=payload['message']
            if key==getattr(self,'sent_error',None):return
            with self.lock:self.pending=payload
        except Exception:pass
    def start(self):threading.Thread(target=self.run,daemon=True).start()
    def run(self):
        while not self.closed.is_set():
            self.wake.wait(2)
            if self.closed.is_set():break
            with self.lock:capture_id=self.capture_id
            if capture_id:
                try:
                    self.send_capture(capture_id)
                    with self.lock:
                        self.completed_capture=capture_id
                        if self.capture_id==capture_id:self.capture_id=None
                except Exception:pass
            if time.monotonic()-self.last_logs>=15:
                with self.lock:batch=list(self.logs)[:20]
                if batch:
                    self.last_logs=time.monotonic()
                    try:
                        req=urllib.request.Request(self.server+'/api/rok-agent/runtime-logs',data=json.dumps({'version':self.version,'logs':batch}).encode(),headers={'Authorization':'Bearer '+self.token,'Content-Type':'application/json'},method='POST')
                        with urllib.request.urlopen(req,timeout=10) as response:response.read()
                        with self.lock:
                            for item in batch:
                                if self.logs and self.logs[0] is item:self.logs.popleft()
                    except Exception:pass
            with self.lock:payload=self.pending
            if not payload:continue
            if time.monotonic()-self.last_sent<60 and not payload.get('retryThreshold'):continue
            try:
                if payload.get('retryThreshold'):
                    check=urllib.request.Request(self.server+'/api/rok-agent/diagnostic-status',headers={'Authorization':'Bearer '+self.token})
                    with urllib.request.urlopen(check,timeout=10) as response:existing=json.loads(response.read())
                    if existing.get('message')==payload['message']:
                        with self.lock:
                            if self.pending is payload:self.pending=None
                            self.sent_error=payload['message']
                        continue
                req=urllib.request.Request(self.server+'/api/rok-agent/diagnostic',data=json.dumps(payload).encode(),headers={'Authorization':'Bearer '+self.token,'Content-Type':'application/json'},method='POST')
                with urllib.request.urlopen(req,timeout=10) as response:response.read()
                with self.lock:
                    if self.pending is payload:self.pending=None
                    self.sent_error=payload['message']
                self.last_sent=time.monotonic()
            except Exception:self.last_sent=time.monotonic()

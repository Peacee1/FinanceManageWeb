from pathlib import Path
p=Path('/usr/share/nginx/peacee1-portal/auth.js')
s=p.read_text()
if 'rokbot.peacee1.io.vn' not in s:s=s.replace("'beatmaker.peacee1.io.vn'","'beatmaker.peacee1.io.vn','rokbot.peacee1.io.vn'")
p.write_text(s)

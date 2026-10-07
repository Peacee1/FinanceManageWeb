const fs=require('fs');
const p='.env';let s=fs.readFileSync(p,'utf8');
const match=/^CORS_ORIGINS=(.*)$/m.exec(s);
if(match){const origins=match[1].split(',');if(!origins.includes('https://finance.peacee1.io.vn'))origins.push('https://finance.peacee1.io.vn');s=s.replace(match[0],'CORS_ORIGINS='+origins.join(','));}
else{s+='\nCORS_ORIGINS=https://peacee1.io.vn,https://www.peacee1.io.vn,https://finance.peacee1.io.vn\n';}
const backup='/home/ec2-user/finance-releases/retirement-backup-20261003/backend.env';fs.copyFileSync(p,backup);fs.chmodSync(backup,0o600);fs.writeFileSync(p,s);console.log('Finance origin added');
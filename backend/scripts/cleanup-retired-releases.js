const fs=require('fs'),path=require('path');
const roots=[['/usr/share/nginx/releases',new Set(['peacee1-optimized-20261003','peacee1-ai-fee-20261003'])],['/home/ec2-user/finance-releases',new Set(['retirement-backup-20261003','retirement-backend.tgz','peacee1-optimized-web.tgz'])]];
// Always retain the currently served release, including a later deployment.
const active=fs.realpathSync('/usr/share/nginx/html');
if(path.dirname(active)!==fs.realpathSync(roots[0][0]))throw Error('Unexpected active release');
roots[0][1].add(path.basename(active));
function size(p){const st=fs.lstatSync(p);return st.isDirectory()?fs.readdirSync(p).reduce((sum,name)=>sum+size(path.join(p,name)),0):st.size;}
let bytes=0,removed=0;
for(const [root,keep] of roots){
 const absolute=fs.realpathSync(root);
 for(const name of fs.readdirSync(root)){
  if(keep.has(name))continue;
  if(!/^(?:[a-f0-9]{40}|peacee1-|family-member-spending-|ai-review-avatar-|aiController-before-fee\.js$)/.test(name))continue;
  const target=path.join(absolute,name);
  if(fs.lstatSync(target).isSymbolicLink())throw Error('Unexpected symlink');
  const resolved=fs.realpathSync(target);
  if(path.dirname(resolved)!==absolute)throw Error('Outside release directory');
  bytes+=size(resolved);fs.rmSync(resolved,{recursive:true});removed++;
 }
}
console.log(JSON.stringify({removed,freedBytes:bytes,freedMiB:Math.round(bytes/1048576)}));

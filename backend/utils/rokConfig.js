const DEFAULT_CONFIG={allocations:{food:1,wood:2,stone:2,gold:0},level:8,repeatHours:1,claimAlliance:true};
function validateConfig(c){
 if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(k=>!['allocations','level','repeatHours','claimAlliance'].includes(k)))return false;
 const a=c.allocations;if(!a||Object.keys(a).sort().join(',')!=='food,gold,stone,wood')return false;
 if(!Object.values(a).every(v=>Number.isInteger(v)&&v>=0&&v<=7))return false;
 const total=Object.values(a).reduce((x,y)=>x+y,0);
 return total>=1&&total<=7&&Number.isInteger(c.level)&&c.level>=1&&c.level<=8&&Number.isFinite(c.repeatHours)&&c.repeatHours>=.1&&c.repeatHours<=168&&typeof c.claimAlliance==='boolean';
}
module.exports={DEFAULT_CONFIG,validateConfig};

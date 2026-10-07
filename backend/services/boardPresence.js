const timeout=30000;
function prune(state,now=Date.now()){
 let changed=false;
 for(const player of state.players)if(player.lastSeen===undefined){player.lastSeen=now;changed=true;}
 const online=state.players.filter(p=>!p.kicked&&now-p.lastSeen<timeout);
 if(!online.some(p=>p.id===state.host)&&online.length){state.host=online[0].id;changed=true;}
 if(!['lobby','ended'].includes(state.phase))return changed;
 const present=state.players.filter(p=>now-p.lastSeen<timeout);
 if(present.length!==state.players.length){state.players=present;changed=true;if(!present.some(p=>p.id===state.host))state.host=present[0]?.id??null;}
 return changed;
}
module.exports={prune,timeout};

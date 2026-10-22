const keys=['food','wood','stone','gold'];
function validResources(value){return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===4&&keys.every(k=>Number.isSafeInteger(value[k])&&value[k]>=0&&value[k]<=1e15);}
function mergeResources(governor,resources,now=Date.now()){if(resources!==undefined){governor.resources=resources;governor.resources_updated_at=new Date(now).toISOString();}}
module.exports={validResources,mergeResources};

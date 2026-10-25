export const viewportScript = `
(function(){
  function configure(){
    var meta=document.querySelector('meta[name="viewport"]');
    if(!meta){meta=document.createElement('meta');meta.name='viewport';document.head.appendChild(meta);}
    meta.content='width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';
  }
  if(document.head)configure();
  document.addEventListener('DOMContentLoaded',configure,{once:true});
  ['gesturestart','gesturechange','gestureend'].forEach(function(name){
    document.addEventListener(name,function(event){event.preventDefault();},{passive:false});
  });
})();true;`;

export function parseThemeMessage(raw: string): {background: string; dark: boolean} | null {
  try {
    const data = JSON.parse(raw);
    if (data.type !== 'task-theme' || !/^#[0-9a-f]{6}$/i.test(data.background) || typeof data.dark !== 'boolean') return null;
    return {background: data.background, dark: data.dark};
  } catch {return null;}
}

export function parseFocusMessage(raw: string): boolean | null {
  try {
    const data = JSON.parse(raw);
    return data.type === 'task-focus' && typeof data.active === 'boolean' ? data.active : null;
  } catch {return null;}
}
export function parseTaskItemsMessage(raw: string): unknown[] | null {
  try {
    const data = JSON.parse(raw);
    if (data?.type !== 'task-note-items' || !Array.isArray(data.items) || data.items.length > 500) return null;
    if (!data.items.every((item: unknown) => item && typeof item === 'object' && typeof (item as {title?: unknown}).title === 'string')) return null;
    return data.items;
  } catch {return null;}
}

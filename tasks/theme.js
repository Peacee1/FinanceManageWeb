(function (global) {
  const colors = dark => dark
    ? {bg:'#171716',panel:'#242423',accent:'#F5F5F2',text:'#F5F5F2',muted:'#B0B0A8',line:'#41413D',onAccent:'#191918'}
    : {bg:'#F1F0EC',panel:'#FFFFFF',accent:'#191918',text:'#191918',muted:'#6B6B65',line:'#E2E1DC',onAccent:'#FFFFFF'};
  global.TaskTheme = {colors};
  // Migrate the original colorful default once; later user choices are retained.
  if (!localStorage.getItem('peacee1-tasks-monochrome-v1')) {
    localStorage.setItem('peacee1-tasks-theme','monochrome');
    localStorage.setItem('peacee1-tasks-appearance','light');
    localStorage.setItem('peacee1-tasks-monochrome-v1','1');
  }
  for (const name of ['gesturestart','gesturechange','gestureend']) {
    document.addEventListener(name,event=>event.preventDefault(),{passive:false});
  }
})(window);

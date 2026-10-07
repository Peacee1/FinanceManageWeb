export const accents = [
  {value:'purple',label:'Tím',color:'#7C3AED',dark:'#A78BFA'},
  {value:'pink',label:'Hồng',color:'#DB2777',dark:'#F472B6'},
  {value:'green',label:'Xanh lá',color:'#059669',dark:'#34D399'},
  {value:'blue',label:'Xanh dương',color:'#2563EB',dark:'#60A5FA'},
  {value:'yellow',label:'Vàng',color:'#B45309',dark:'#F59E0B'},
];
export type Appearance = 'light' | 'dark' | 'system' | 'monochrome';

export const monochromeColors = {
  primary: '#191918', bg: '#F1F0EC', card: '#FFFFFF', border: '#E2E1DC',
  text: '#191918', muted: '#6B6B65', income: '#454541', expense: '#191918',
};

function mix(base: string, accent: string, weight: number) {
  return '#' + [1, 3, 5].map(start => {
    const a = parseInt(base.slice(start, start + 2), 16);
    const b = parseInt(accent.slice(start, start + 2), 16);
    return Math.round(a * (1 - weight) + b * weight).toString(16).padStart(2, '0');
  }).join('');
}
export function appearanceColors(mode: 'light' | 'dark', accent: string) {
  const color = accents.find(item => item.value === accent) || accents[0];
  const dark = mode === 'dark';
  return {
    primary: dark ? color.dark : color.color,
    bg: mix(dark ? '#101116' : '#FFFFFF', color.color, dark ? 0.04 : 0.06),
    card: mix(dark ? '#1D1E25' : '#FFFFFF', color.color, dark ? 0.12 : 0),
    border: mix(dark ? '#383943' : '#E6E7EB', color.color, 0.25),
    text: dark ? '#F5F5F7' : '#24242C',
    muted: dark ? '#AAAAB6' : '#72727E',
  };
}

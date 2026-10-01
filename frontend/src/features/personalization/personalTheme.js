export const personalPalettes = [
  { id: 'purple', name: 'Tím', color: '#7C3AED' },
  { id: 'pink', name: 'Hồng', color: '#F472B6' },
  { id: 'green', name: 'Xanh lá', color: '#34D399' },
  { id: 'blue', name: 'Xanh dương', color: '#3B82F6' },
  { id: 'yellow', name: 'Vàng', color: '#F59E0B' },
];
export function themedAsset(name, accent) {
  const color = personalPalettes.some(palette => palette.id === accent) ? accent : 'purple';
  return `/themes/${color}/${name}.webp`;
}

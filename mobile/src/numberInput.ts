// State/API values use an ungrouped dot decimal; the editable display uses Vietnamese separators.
export function formatNumberInput(value:string){
 if(!value)return '';
 const [whole,fraction]=value.split('.');
 return whole.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+(fraction!==undefined?','+fraction:'');
}
export function parseNumberInput(value:string,decimal=false){
 const clean=value.replace(/\./g,'').replace(/[^0-9,]/g,'');
 const [whole,...fractions]=clean.split(',');
 const integer=whole.replace(/^0+(?=\d)/,'');
 return integer+(decimal&&fractions.length?'.'+fractions.join(''):'');
}
export const groupedNumber=(value:number|string)=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(Number(value)||0);

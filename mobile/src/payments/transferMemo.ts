export function transferMemo(name:string){
 const clean=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').replace(/[^a-zA-Z0-9 ._-]/g,' ').replace(/\s+/g,' ').trim();
 return `Peacee1 - ${(clean||'User').slice(0,117)} chuyen khoan`;
}

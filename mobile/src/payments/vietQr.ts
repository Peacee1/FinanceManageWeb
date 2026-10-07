export type Recipient = {bankBin:string;account:string;amount:string;memo:string;name:string;bankCode?:string};
function readFields(payload:string) {
  const fields:Record<string,string> = {};
  let offset = 0;
  while (offset < payload.length) {
    const header = payload.slice(offset, offset + 4);
    if (!/^\d{4}$/.test(header)) throw new Error('Mã QR không đúng định dạng VietQR.');
    const length = Number(header.slice(2));
    const end = offset + 4 + length;
    if (end > payload.length || fields[header.slice(0, 2)] !== undefined) throw new Error('Dữ liệu QR không hợp lệ.');
    fields[header.slice(0, 2)] = payload.slice(offset + 4, end);
    offset = end;
  }
  return fields;
}

export function crc16(payload:string) {
  let crc = 0xffff;
  // Hermes need not provide TextEncoder. Percent encoding gives UTF-8 bytes.
  const encoded=encodeURIComponent(payload);
  for(let index=0;index<encoded.length;index++) {
    const byte=encoded[index]==='%'?parseInt(encoded.slice(index+1,index+3),16):encoded.charCodeAt(index);
    if(encoded[index]==='%')index+=2;
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ ((crc & 0x8000) ? 0x1021 : 0)) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function parseVietQr(payload:string):Recipient {
  if (typeof payload !== 'string' || payload.length > 4096) throw new Error('Mã QR không hợp lệ.');
  const fields = readFields(payload);
  if (!/6304[0-9A-Fa-f]{4}$/.test(payload) || crc16(payload.slice(0, -4)) !== fields['63'].toUpperCase()) throw new Error('Mã QR bị lỗi hoặc đã bị thay đổi.');
  if (fields['00'] !== '01' || fields['53'] !== '704' || fields['58'] !== 'VN') throw new Error('Chỉ hỗ trợ mã chuyển khoản VietQR bằng VND.');
  const merchant = readFields(fields['38'] || '');
  if (merchant['00'] !== 'A000000727' || merchant['02'] !== 'QRIBFTTA') throw new Error('Chỉ hỗ trợ VietQR chuyển khoản vào tài khoản ngân hàng.');
  const recipient = readFields(merchant['01'] || '');
  if (!/^\d{6}$/.test(recipient['00'] || '') || !/^[a-zA-Z0-9]{1,32}$/.test(recipient['01'] || '')) throw new Error('Thông tin tài khoản nhận không hợp lệ.');
  const amount = fields['54'] || '';
  if (amount && (!/^\d+$/.test(amount) || !Number.isSafeInteger(Number(amount)) || Number(amount) <= 0)) throw new Error('Số tiền trong QR không hợp lệ.');
  const additional = fields['62'] ? readFields(fields['62']) : {};
  return { bankBin: recipient['00'], account: recipient['01'], amount, memo: additional['08'] || '', name: fields['59'] || '' };
}

export function paymentLink(appId:string, recipient:Recipient, amount:string, memo:string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(appId)) throw new Error('Ứng dụng ngân hàng không hợp lệ.');
  if (!/^\d+$/.test(String(amount)) || !Number.isSafeInteger(Number(amount)) || Number(amount) <= 0) throw new Error('Nhập số tiền VND hợp lệ.');
  const params={ app: appId, ba: `${recipient.account}@${recipient.bankCode || recipient.bankBin}`, am: String(amount), tn: memo };
  const query=Object.entries(params).map(([key,value])=>`${key}=${encodeURIComponent(value)}`).join('&');
  return `https://dl.vietqr.io/pay?${query}`;
}

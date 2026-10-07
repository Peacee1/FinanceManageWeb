/** Android's WebMessageListener reports only the origin; iOS/legacy Android report a full URL. */
export function readCaptchaMessage(sourceUrl:string,raw:string):{type:'token';token:string}|{type:'error'}|null {
 try {
  const source=new URL(sourceUrl);
  if(source.origin!=='https://peacee1.io.vn'||!['/','/native-captcha.html'].includes(source.pathname))return null;
  const message=JSON.parse(raw);
  if(message?.type==='token'&&typeof message.token==='string'&&message.token.length>0&&message.token.length<=2048)return {type:'token',token:message.token};
  if(message?.type==='error')return {type:'error'};
 }catch{}
 return null;
}

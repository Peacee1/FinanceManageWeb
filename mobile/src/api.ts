export class ApiError extends Error {
 status:number;
 constructor(message:string,status:number){super(message);this.status=status;}
}
export function createApi(baseUrl:string,token:string|null,onExpired:()=>void,fetcher:typeof fetch=fetch){
 const base=baseUrl.replace(/\/$/,'');
 return async function request<T>(path:string,method='GET',body?:unknown):Promise<{data:T;nextCursor:string|null}>{
  if(!path.startsWith('/'))throw new Error('Invalid API path');
  const multipart=typeof FormData!=='undefined'&&body instanceof FormData;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),path==='/ai/analyze'?35000:15000);
  try {
   const response=await fetcher(base+path,{method,headers:{Accept:'application/json',...(body!==undefined&&!multipart?{'Content-Type':'application/json'}:{}),...(token&&!token.startsWith('shared-web-session:')?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:multipart?body as FormData:JSON.stringify(body),signal:controller.signal});
   if(response.status===401&&token)onExpired();
   const text=await response.text();let data:unknown;
   try{data=text?JSON.parse(text):null;}catch{throw new ApiError('Máy chủ trả về dữ liệu không hợp lệ.',response.status);}
   if(!response.ok){throw new ApiError((data as {message?:string})?.message||'Không thể thực hiện yêu cầu.',response.status);}
   return {data:data as T,nextCursor:response.headers.get('X-Next-Cursor')};
  }catch(error){if(error instanceof ApiError)throw error;throw new ApiError(method==='GET'?'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.':'Chưa xác nhận được kết quả. Tải lại dữ liệu trước khi thử gửi lại.',0);}
  finally{clearTimeout(timer);}
 };
}
export type Api = ReturnType<typeof createApi>;

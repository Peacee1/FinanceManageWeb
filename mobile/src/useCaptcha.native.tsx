import React,{useRef,useState,useEffect} from 'react';
import {Modal,View,Pressable,Text} from 'react-native';
import {WebView} from 'react-native-webview';
import {readCaptchaMessage} from './captchaMessage';
export function useCaptcha(){
 const [action,setAction]=useState<'login'|'register'|null>(null);
 const pending=useRef<{resolve:(token:string|undefined)=>void;reject:(error:Error)=>void}|null>(null);
 const finish=(token?:string,error?:string)=>{const request=pending.current;pending.current=null;setAction(null);if(error)request?.reject(new Error(error));else request?.resolve(token);};
 useEffect(()=>()=>{pending.current?.reject(new Error('Đã đóng xác minh.'));pending.current=null;},[]);
 const verify=async(next:'login'|'register')=>{const response=await fetch('https://peacee1.io.vn/api/auth/captcha-config');if(!response.ok)throw Error('Không tải được xác minh bảo mật.');const config=await response.json();if(!config.enabled)return undefined;return new Promise<string|undefined>((resolve,reject)=>{pending.current={resolve,reject};setAction(next);});};
 const captchaView=<Modal visible={!!action} transparent animationType="fade" onRequestClose={()=>finish(undefined,'Đã huỷ xác minh.')}><View style={{flex:1,backgroundColor:'#0008',justifyContent:'center',padding:20}}><View style={{height:340,backgroundColor:'white',borderRadius:20,overflow:'hidden'}}><Pressable accessibilityRole="button" onPress={()=>finish(undefined,'Đã huỷ xác minh.')} style={{padding:18,alignItems:'flex-end'}}><Text style={{color:'#6D28D9'}}>Đóng</Text></Pressable>{action&&<WebView source={{uri:'https://peacee1.io.vn/native-captcha.html?action='+action}} style={{flex:1}} originWhitelist={['https://peacee1.io.vn','https://challenges.cloudflare.com']} onMessage={event=>{const data=readCaptchaMessage(event.nativeEvent.url,event.nativeEvent.data);if(data?.type==='token')finish(data.token);else if(data?.type==='error')finish(undefined,'Không xác minh được. Vui lòng thử lại.');}} onError={()=>finish(undefined,'Không tải được CAPTCHA. Kiểm tra kết nối mạng.')} onShouldStartLoadWithRequest={request=>request.url.startsWith('https://peacee1.io.vn/native-captcha.html')||request.url.startsWith('https://challenges.cloudflare.com/')}/>}</View></View></Modal>;
 return {verify,captchaView};
}

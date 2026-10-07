import React,{useEffect} from 'react';
import {Platform} from 'react-native';
import LoadingScreen from './LoadingScreen';
import type {Session} from './types';
import {readWebSession,clearWebSession} from './webSession';
export const SHARED_SESSION='shared-web-session:';
export const sharedWeb=Platform.OS==='web'&&typeof window!=='undefined'&&window.location.hostname==='finance.peacee1.io.vn';
export async function restoreSharedSession():Promise<Session|null>{
 let response=await fetch('/api/auth/session',{credentials:'same-origin'});
 if(response.status===401){
  const previous=readWebSession(localStorage);
  if(previous){const upgraded=await fetch('/api/auth/web-session',{method:'POST',credentials:'same-origin',headers:{Authorization:`Bearer ${previous.token}`}});if(upgraded.ok)response=await fetch('/api/auth/session',{credentials:'same-origin'});else if(upgraded.status!==401)throw Error('Không khôi phục được phiên đăng nhập.');}
 }
 if(response.status===401){clearWebSession(localStorage);return null;}
 if(!response.ok)throw Error('Không khôi phục được phiên đăng nhập.');
 const {user}=await response.json();clearWebSession(localStorage);
 if(user.role!=='owner')throw Error('Tài khoản này chưa có quyền truy cập Finance.');
 return {token:SHARED_SESSION+user.id,user};
}
export function CentralLogin({register=false}:{register?:boolean}){
 useEffect(()=>{const current=new URL(window.location.href);const target=['/home','/analytics','/calendar','/profile','/bank-record'].includes(current.pathname)?current.href:'https://finance.peacee1.io.vn/home';window.location.replace(`https://peacee1.io.vn/${register?'register':'login'}?returnTo=${encodeURIComponent(target)}`);},[register]);
 return <LoadingScreen/>;
}

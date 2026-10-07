import React from 'react';
import {Redirect,useLocalSearchParams,useRouter} from 'expo-router';
import {Main,useMobile} from '../../App';
import {CentralLogin,sharedWeb} from '../sharedWebAuth';
import AuthScreen from '../AuthScreen';
import {LanguageContext} from '../i18n';
export default function Screen(){
 const {page}=useLocalSearchParams<{page:string}>(),router=useRouter(),{session,api,login}=useMobile();
 if(!session){if(sharedWeb)return <CentralLogin register={page==='register'}/>;if(page!=='login'&&page!=='register')return <Redirect href="/login"/>;return <LanguageContext.Provider value="vi"><AuthScreen api={api} onLogin={login} register={page==='register'} onSwitch={()=>router.replace(page==='register'?'/login':'/register')}/></LanguageContext.Provider>;}
 if(!['home','analytics','calendar','profile'].includes(page))return <Redirect href="/home"/>;
 return <Main/>;
}



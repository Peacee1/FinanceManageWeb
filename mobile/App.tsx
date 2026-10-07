import QrPayment from './src/payments/QrPayment';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {createNativeSessionClient} from './src/nativeSession';
import CategoriesScreen from './src/CategoriesScreen';
import {Text,LanguageContext,languages,useTranslate,type Language} from './src/i18n';
import {accents,appearanceColors,type Appearance} from './src/appearance';
import PreferencesScreen from './src/PreferencesScreen';
import React,{createContext,useContext,useLayoutEffect,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,Alert,Platform,PanResponder,Pressable,RefreshControl,ScrollView,View,useColorScheme} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as SecureStore from 'expo-secure-store';
import {StatusBar} from 'expo-status-bar';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Dashboard,Analytics} from './src/FinanceViews';
import CalendarScreen from './src/CalendarScreen';
import TransactionForm from './src/TransactionForm';
import ProfileScreen from './src/ProfileScreen';
import FamilyScreen from './src/FamilyScreen';
import DailyTasksScreen from './src/DailyTasksScreen';
import {useReminders,useReminderResponse} from './src/reminders';
import NotificationsScreen from './src/NotificationsScreen';
import GoalsScreen from './src/GoalsScreen';
import {createApi,type Api} from './src/api';
import {createCachedApi} from './src/cachedApi';
import {isTransactionGesture,clearTransactionGesture,beginTransactionInteraction,dismissExpandedTransaction} from './src/transactionGesture';
import {sharedWeb,restoreSharedSession} from './src/sharedWebAuth';
import {useFinanceData} from './src/useFinanceData';
import LoadingScreen from './src/LoadingScreen';
import {WalletPreloader} from './src/brand';
import {useDesktop} from './src/responsive';
import {DesktopSidebar,DesktopDashboard} from './src/DesktopViews';

import {Button,Card,Label,Sheet,ThemeContext,palettes,styles,useTheme} from './src/ui';
import {today} from './src/format';
import type {Session} from './src/types';
import {clearWebSession,readWebSession,saveWebSession} from './src/webSession';

const API_URL=Platform.OS==='web'?'/api':process.env.EXPO_PUBLIC_API_URL||'https://finance.peacee1.io.vn/api';
const SESSION_KEY='peacee1.session.v1';
const selectedNavColor=(primary:string)=>primary;
type Tab='home'|'analytics'|'calendar'|'profile';
type SheetKind='notifications'|'goals'|'account'|'family'|'language'|'appearance'|'daily'|'categories'|'qr'|null;
type Services={api:Api;session:Session|null;login:(next:Session)=>Promise<void>;logout:()=>Promise<void>;toggleTheme:()=>Promise<void>;month:string;setMonth:(month:string)=>void;appearance:Appearance;accent:string;language:Language;changeAppearance:(value:Appearance)=>Promise<void>;changeAccent:(value:string)=>Promise<void>;changeLanguage:(value:Language)=>Promise<void>;reminderStatus:string;enableReminders:()=>Promise<void>;finance:ReturnType<typeof useFinanceData>};
const MobileContext=createContext<Services|null>(null);
export const useMobile=()=>{const value=useContext(MobileContext);if(!value)throw new Error('MobileProvider missing');return value;};
export function Main(){
 const desktop=useDesktop();
 const {api,session,logout,month,setMonth,language,finance}=useMobile();const router=useRouter();const {page,direction}=useLocalSearchParams<{page:string;direction?:string}>();const tab:Tab=['home','analytics','calendar','profile'].includes(page)?page as Tab:'home';const [slide]=useState(()=>new Animated.Value(0));
 const contentWidth=useRef(844),transitionBusy=useRef(false),reducedMotion=useRef(false);
 useEffect(()=>{let active=true;AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(active)reducedMotion.current=value;});const listener=AccessibilityInfo.addEventListener('reduceMotionChanged',value=>{reducedMotion.current=value;});return()=>{active=false;listener.remove();};},[]);
 useLayoutEffect(()=>{transitionBusy.current=false;if(!direction||reducedMotion.current){slide.setValue(0);return;}slide.setValue(Number(direction)*contentWidth.current);const animation=Animated.timing(slide,{toValue:0,duration:240,easing:Easing.out(Easing.cubic),useNativeDriver:Platform.OS!=='web'});animation.start();return()=>animation.stop();},[tab,direction,slide,desktop]);
 const setTab=useCallback((value:Tab)=>{if(value===tab||transitionBusy.current)return;const order:Tab[]=['home','analytics','calendar','profile'];const nextDirection=order.indexOf(value)>order.indexOf(tab)?1:-1;const navigate=()=>router.replace({pathname:'/[page]',params:{page:value,direction:String(nextDirection)}});if(reducedMotion.current){navigate();return;}transitionBusy.current=true;Animated.timing(slide,{toValue:-nextDirection*contentWidth.current,duration:160,easing:Easing.in(Easing.cubic),useNativeDriver:Platform.OS!=='web'}).start(({finished})=>{if(finished)navigate();else transitionBusy.current=false;});},[tab,router,slide]);const onLogout=()=>void logout();const onTheme=()=>setSheet('appearance');
 const t=useTranslate();const c=useTheme();const {data,error,refresh,setUnread}=finance;
 const profile=data?.profile||null,summary=data?.summary||null,transactions=data?.transactions||[],unread=data?.unread||0;
 const [pulling,setPulling]=useState(false);const [sheet,setSheet]=useState<SheetKind>(null),[entry,setEntry]=useState<'INCOME'|'EXPENSE'|null>(null);const [year,monthNumber]=month.split('-').map(Number);
 useEffect(()=>{if(Platform.OS!=='web'||!desktop)return;const handle=(event:KeyboardEvent)=>{if(sheet||entry||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.repeat)return;const target=event.target as HTMLElement|null;if(target?.closest('input,textarea,select,[contenteditable="true"],[role="textbox"],[role="dialog"]'))return;const delta=event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0;if(!delta)return;event.preventDefault();const order:Tab[]=['home','analytics','calendar','profile'];const next=order[order.indexOf(tab)+delta];if(next)setTab(next);};window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle);},[sheet,entry,tab,setTab,desktop]);
 useEffect(()=>{if(Platform.OS!=='web')return;const close=()=>dismissExpandedTransaction();window.addEventListener('wheel',close,{passive:true,capture:true});window.addEventListener('keydown',close,true);return()=>{window.removeEventListener('wheel',close,true);window.removeEventListener('keydown',close,true);};},[]);
 const changeMonth=(delta:number)=>{const next=new Date(Date.UTC(year,monthNumber-1+delta,1));setMonth(`${next.getUTCFullYear()}-${String(next.getUTCMonth()+1).padStart(2,'0')}`);};
 const navigateNotice=(target:string)=>{setSheet(null);if(target==='checkin')setSheet('daily');else if(target==='goals')setSheet('goals');else if(target==='transactions')setTab('calendar');else setTab('profile');refresh();};
 useReminderResponse(session?.user.id,target=>{if(target==='checkin')setSheet('daily');else{setSheet(null);setEntry('EXPENSE');}});
 const checkin=()=>setSheet('daily');
 // PanResponder registers these callbacks; refs are read only when a gesture fires.
 // eslint-disable-next-line react-hooks/refs
 const swipe=PanResponder.create({
  onStartShouldSetPanResponderCapture:()=>{clearTransactionGesture();beginTransactionInteraction();return false;},
  onMoveShouldSetPanResponderCapture:(_,g)=>!isTransactionGesture()&&!desktop&&!transitionBusy.current&&!sheet&&!entry&&g.numberActiveTouches===1&&Math.abs(g.dx)>18&&Math.abs(g.dx)>Math.abs(g.dy)*1.6,
  onPanResponderRelease:(_,g)=>{if(Math.abs(g.dx)<55||Math.abs(g.dx)<Math.abs(g.dy)*1.6)return;const order:Tab[]=['home','analytics','calendar','profile'];const next=order[order.indexOf(tab)+(g.dx<0?1:-1)];if(next)setTab(next);},
 });

 return <SafeAreaView style={{flex:1,backgroundColor:c.bg}} edges={['top','left','right']}>
  <View style={{flex:1,width:'100%',maxWidth:desktop?undefined:600,alignSelf:'center',flexDirection:desktop?'row':'column'}}>
   {desktop&&<DesktopSidebar tab={tab} onTab={setTab} onAction={setSheet} onLogout={onLogout}/>}
   <View style={{flex:1,minWidth:0}}>
   {!desktop&&<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:desktop?32:20,paddingVertical:desktop?16:10,backgroundColor:desktop?c.card:undefined,borderBottomWidth:desktop?1:0,borderColor:c.border}}>{desktop?<View style={{flexDirection:'row',alignItems:'center',gap:12,minWidth:0,flex:1}}><View style={{width:44,height:44,borderRadius:14,backgroundColor:c.bg,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:c.border}}><Text translateContent={false} style={{color:c.primary,fontSize:20,fontWeight:'800'}}>{profile?.name?.slice(0,1).toUpperCase()||'P'}</Text></View><View style={{gap:2,flex:1,minWidth:0}}><Text style={{color:c.muted,fontSize:12}}>Xin chào</Text><Text translateContent={false} numberOfLines={1} style={{color:c.text,fontSize:19,fontWeight:'800'}}>{profile?.name||'Peacee1'}</Text></View></View>:<Text style={{color:c.muted,fontSize:12}}>{({home:'Trang chủ',analytics:'Phân tích',calendar:'Lịch',profile:'Hồ sơ'})[tab]}</Text>}<View style={{flexDirection:'row',gap:10,alignItems:'center'}}>{desktop&&<Pressable accessibilityRole="button" accessibilityLabel="Thông báo" onPress={()=>setSheet('notifications')} style={{width:40,height:40,alignItems:'center',justifyContent:'center'}}><Feather name="bell" size={20} color={c.primary}/>{unread>0&&<View style={{position:'absolute',top:6,right:6,width:7,height:7,borderRadius:4,backgroundColor:c.expense}}/>}</Pressable>}{desktop&&([-1,1] as const).map(delta=>{const order:Tab[]=['home','analytics','calendar','profile'];const next=order[order.indexOf(tab)+delta];return <Pressable key={delta} accessibilityRole="button" accessibilityLabel={delta<0?'Tab trước':'Tab tiếp theo'} accessibilityState={{disabled:!next}} disabled={!next} onPress={()=>next&&setTab(next)} style={{width:36,height:36,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:c.card,borderWidth:1,borderColor:c.border,opacity:next?1:.35}}><Feather name={delta<0?'chevron-up':'chevron-down'} size={18} color={c.primary}/></Pressable>;})}</View></View>}

   <View {...swipe.panHandlers} style={{flex:1,overflow:'hidden'}} onLayout={event=>{contentWidth.current=desktop?event.nativeEvent.layout.height:event.nativeEvent.layout.width;}}><Animated.View style={{flex:1,transform:[desktop?{translateY:slide}:{translateX:slide}]}}><ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.page,desktop&&{padding:32,gap:24,width:'100%',maxWidth:1680,alignSelf:'center'}]} refreshControl={<RefreshControl refreshing={pulling} onRefresh={async()=>{setPulling(true);try{await refresh();}finally{setPulling(false);}}} tintColor={c.primary}/>}>

    {(desktop||tab!=='profile')&&<View style={styles.row}><Text style={{color:c.muted,fontSize:12}}>{profile?.finance_mode==='family'?'Sổ Gia đình':'Sổ Cá nhân'}</Text><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Pressable accessibilityRole="button" accessibilityLabel="Tháng trước" onPress={()=>changeMonth(-1)} style={{padding:8}}><Feather name="chevron-left" size={16} color={c.muted}/></Pressable><Text style={{fontSize:12,fontWeight:'700',color:c.text}}>{`Tháng ${monthNumber}, ${year}`}</Text><Pressable accessibilityRole="button" accessibilityLabel="Tháng sau" onPress={()=>changeMonth(1)} style={{padding:8}}><Feather name="chevron-right" size={16} color={c.muted}/></Pressable></View></View>}
    {desktop&&<View style={styles.row}><Text translateContent={false} style={{color:c.text,fontSize:26,fontWeight:'800'}}>{profile?.name||'Peacee1'}</Text><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Pressable accessibilityRole="button" accessibilityLabel="Thông báo" onPress={()=>setSheet('notifications')} style={{padding:10}}><Feather name="bell" size={20} color={c.primary}/></Pressable>{([-1,1] as const).map(delta=>{const order:Tab[]=['home','analytics','calendar','profile'],next=order[order.indexOf(tab)+delta];return <Pressable key={delta} accessibilityRole="button" accessibilityLabel={delta<0?'Tab trước':'Tab tiếp theo'} disabled={!next} onPress={()=>next&&setTab(next)} style={{padding:10,opacity:next?1:.35}}><Feather name={delta<0?'chevron-up':'chevron-down'} size={18} color={c.muted}/></Pressable>;})}</View></View>}
    {!!error&&<Card><Text accessibilityRole="alert" style={{color:c.expense}}>{error}</Text><Button title="Thử lại" onPress={refresh} secondary/></Card>}

    {tab==='home'&&desktop?<DesktopDashboard month={month} profile={profile} summary={summary} transactions={transactions} onAdd={setEntry} onHistory={()=>setTab('calendar')} onDaily={()=>setSheet('daily')} onGoals={()=>setSheet('goals')} onFamily={()=>setSheet('family')} onCategories={()=>setSheet('categories')}/>:tab==='home'?<Dashboard profile={profile} summary={summary} transactions={transactions} onAdd={setEntry} onHistory={()=>setTab('calendar')} onNotices={()=>setSheet('notifications')} onDaily={()=>setSheet('daily')} unread={unread}/>:tab==='analytics'?<Analytics transactions={transactions} summary={summary} onGoals={()=>setSheet('goals')}/>:tab==='calendar'?<CalendarScreen transactions={transactions} year={year} month={monthNumber}/>:<ProfileScreen profile={profile} onLogout={onLogout} onInfo={()=>setSheet('account')} onNotices={()=>setSheet('notifications')} onCheckin={checkin} onTheme={onTheme} onGoals={()=>setSheet('goals')} onFamily={()=>setSheet('family')} onLanguage={()=>setSheet('language')} onCategories={()=>setSheet('categories')}/>}
   </ScrollView></Animated.View></View>
   {!desktop&&<SafeAreaView edges={['bottom']} style={{backgroundColor:c.bg}}><View style={{marginHorizontal:20,marginBottom:10,backgroundColor:selectedNavColor(c.primary),borderRadius:30,paddingHorizontal:12,paddingVertical:10,flexDirection:'row',alignItems:'center',justifyContent:'space-around'}}>
    {([{key:'home',label:'Trang chủ',icon:'home'},{key:'analytics',label:'Phân tích',icon:'pie-chart'},{key:'add',label:Platform.OS==='web'?'Thêm thu chi':'Quét QR thanh toán',icon:'plus'},{key:'calendar',label:'Lịch',icon:'calendar'},{key:'profile',label:'Hồ sơ',icon:'user'}] as const).map(item=><Pressable key={item.key} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{selected:item.key===tab,disabled:item.key==='add'&&!profile}} onPress={()=>item.key==='add'?(Platform.OS==='web'?setEntry('EXPENSE'):setSheet('qr')):setTab(item.key)} disabled={item.key==='add'&&!profile} style={{width:item.key==='add'?50:54,minHeight:44,alignItems:'center',justifyContent:'center',gap:4,backgroundColor:item.key==='add'?c.primary:'transparent',borderRadius:item.key==='add'?16:22,borderWidth:item.key==='add'?2:0,borderColor:'#FFFFFF',height:item.key==='add'?50:undefined}}>{item.key==='add'&&Platform.OS!=='web'?<MaterialCommunityIcons name="qrcode-scan" size={26} color="white"/>:<Feather name={item.icon} size={item.key==='add'?25:19} color={item.key===tab||item.key==='add'?'white':'#FFFFFFB0'}/>} {item.key!=='add'&&<Text style={{fontSize:8,color:item.key===tab?'#FFFFFF':'#FFFFFFB0'}}>{item.label}</Text>}</Pressable>)}
   </View></SafeAreaView>}
   </View>
  </View>
  {entry&&profile&&<TransactionForm key={`${entry}-${profile.id}`} type={entry} profile={profile} api={api} onClose={()=>setEntry(null)} onSaved={refresh}/>}
  {sheet==='qr'&&Platform.OS!=='web'&&<QrPayment onClose={()=>setSheet(null)} onSaved={refresh}/>}
  {sheet==='notifications'&&<NotificationsScreen api={api} onClose={()=>setSheet(null)} onNavigate={navigateNotice} onUnread={setUnread}/>}
  {sheet==='goals'&&<GoalsScreen api={api} onClose={()=>setSheet(null)}/>}
  {sheet==='daily'&&<DailyTasksScreen api={api} onClose={()=>setSheet(null)} onChanged={refresh} onAdd={()=>{setSheet(null);setEntry('EXPENSE');}} onHistory={()=>{setSheet(null);setMonth(today().slice(0,7));setTab('calendar');}}/>} 
  {sheet==='family'&&<FamilyScreen api={api} onClose={()=>setSheet(null)} onChanged={refresh}/>} 
  {sheet==='categories'&&<CategoriesScreen onClose={()=>setSheet(null)}/>}
  {(sheet==='appearance'||sheet==='language')&&<PreferencesScreen kind={sheet} onClose={()=>setSheet(null)}/>} 
  {sheet==='account'&&<Sheet title="Thông tin tài khoản" onClose={()=>setSheet(null)}><Card><Label large>{profile?.name}</Label><Label>{profile?.email}</Label><Label muted>{profile?.finance_mode==='family'?'Đang sử dụng sổ Gia đình':'Đang sử dụng sổ Cá nhân'}</Label></Card><Label muted translateContent={false}>{t('Ngôn ngữ')}: {languages.find(item=>item.value===language)?.label}</Label></Sheet>}
 </SafeAreaView>;
}
export default function MobileProvider({children}:{children:React.ReactNode}){
 const [month,setMonth]=useState(()=>today().slice(0,7));
 const [accent,setAccent]=useState('purple'),[language,setLanguage]=useState<Language>('vi');
 const system=useColorScheme(),[session,setSession]=useState<Session|null>(null),[boot,setBoot]=useState(true),[bootError,setBootError]=useState(''),[needsClear,setNeedsClear]=useState(false),[theme,setTheme]=useState<Appearance>('system');
 const reminders=useReminders(session?.user.id,language);
 const nativeSessions=useMemo(()=>createNativeSessionClient(API_URL,SecureStore),[]);
 const loggingOut=useRef(false),sessionGeneration=useRef(0);
 const logout=useCallback(async()=>{if(loggingOut.current)return;loggingOut.current=true;sessionGeneration.current++;try{if(Platform.OS==='web'){if(sharedWeb){const result=await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'});if(!result.ok)throw Error('Không đăng xuất được.');}clearWebSession(localStorage);}else { await nativeSessions.logout(); }setSession(null);setBootError('');setNeedsClear(false);}catch{setNeedsClear(true);setBootError('Không xóa được phiên trên thiết bị. Hãy thử lại trước khi đóng app.');}finally{loggingOut.current=false;}},[nativeSessions]);
 const restore=useCallback(async()=>{setBoot(true);setBootError('');try{if(Platform.OS==='web'){setSession(sharedWeb?await restoreSharedSession():readWebSession(localStorage));const savedTheme=localStorage.getItem('peacee1.theme')||localStorage.getItem('theme');if(['light','dark','system','monochrome'].includes(savedTheme||''))setTheme(savedTheme as Appearance);const savedLanguage=localStorage.getItem('peacee1.language');if(['vi','en','zh','ja','ko','ru'].includes(savedLanguage||''))setLanguage(savedLanguage as Language);}if(Platform.OS!=='web'){const [stored,appearance]=await Promise.all([nativeSessions.load(),SecureStore.getItemAsync('peacee1.theme')]);if(stored){const parsed=stored;if(typeof parsed.token==='string'&&parsed.user?.role==='owner')setSession(await nativeSessions.upgrade(parsed));else { await nativeSessions.logout(); }}if(appearance==='light'||appearance==='dark'||appearance==='system'||appearance==='monochrome')setTheme(appearance);const savedLanguage=await SecureStore.getItemAsync('peacee1.language');if(['vi','en','zh','ja','ko','ru'].includes(savedLanguage||''))setLanguage(savedLanguage as Language);}}catch{setBootError('Không đọc được phiên đăng nhập trên thiết bị. Hãy thử lại.');}finally{setBoot(false);}},[nativeSessions]);
 useEffect(()=>{let active=true;void Promise.resolve().then(()=>{if(active)return restore();});return()=>{active=false;};},[restore]);
 useEffect(()=>{if(!sharedWeb)return;let active=true;const sync=()=>{if(loggingOut.current)return;const generation=sessionGeneration.current;void restoreSharedSession().then(next=>{if(active&&!loggingOut.current&&generation===sessionGeneration.current)setSession(current=>current?.user.id===next?.user.id?current:next);}).catch(()=>{});};window.addEventListener('focus',sync);const visible=()=>{if(document.visibilityState==='visible')sync();};document.addEventListener('visibilitychange',visible);return()=>{active=false;window.removeEventListener('focus',sync);document.removeEventListener('visibilitychange',visible);};},[]);
 // The expiry callback runs only after an HTTP response, never during render.
 // eslint-disable-next-line react-hooks/refs
 const renewSession=useCallback(async()=>{const next=await nativeSessions.refresh();if(next)setSession(next);return next?.token||null;},[nativeSessions]);
 const cached=useMemo(()=>createCachedApi(createApi(API_URL,session?.token||null,()=>{void logout();},fetch,Platform.OS==='web'?undefined:renewSession)),[session?.token,logout,renewSession]);const api=cached.api;
 const finance=useFinanceData(api,cached.clear,session?.token||'',month);
 useEffect(()=>{let active=true;const selectedAccent=finance.data?.profile.personal_accent;void Promise.resolve().then(()=>{if(active&&accents.some(item=>item.value===selectedAccent))setAccent(selectedAccent!);});return()=>{active=false;};},[finance.data?.profile.personal_accent]);
 const login=async(next:Session)=>{if(Platform.OS==='web')saveWebSession(localStorage,next);else await nativeSessions.save(next);setSession(next);};
 const toggleTheme=async()=>{const next=(theme==='system'?system:theme)==='dark'?'light':'dark';setTheme(next);if(Platform.OS!=='web')try{await SecureStore.setItemAsync('peacee1.theme',next);}catch{Alert.alert('Giao diện','Đã đổi giao diện nhưng chưa lưu được tùy chọn.');}};
 const changeAppearance=async(value:Appearance)=>{if(theme==='monochrome'){await api('/users/settings','POST',{personalAccent:'monochrome'});setAccent('monochrome');}if(Platform.OS==='web')localStorage.setItem('peacee1.theme',value);else await SecureStore.setItemAsync('peacee1.theme',value);setTheme(value);};
 const changeLanguage=async(value:Language)=>{if(Platform.OS==='web')localStorage.setItem('peacee1.language',value);else await SecureStore.setItemAsync('peacee1.language',value);setLanguage(value);};
 const changeAccent=async(value:string)=>{if(!accents.some(item=>item.value===value))return;await api('/users/settings','POST',{personalAccent:value});setAccent(value);if(theme==='monochrome'){if(Platform.OS==='web')localStorage.setItem('peacee1.theme','light');else await SecureStore.setItemAsync('peacee1.theme','light');setTheme('light');}};
 const selected=(theme==='system'?system:theme)==='dark'?'dark':'light';
 const effectiveAccent=theme==='monochrome'?'monochrome':accent;
 const themed={...palettes[selected],...appearanceColors(selected,effectiveAccent)};
 return <SafeAreaProvider><LanguageContext.Provider value={language}><ThemeContext.Provider value={themed}><WalletPreloader/><StatusBar style={selected==='dark'?'light':'dark'}/>{boot?<SafeAreaView style={{flex:1,backgroundColor:themed.bg,justifyContent:'center'}}><LoadingScreen/></SafeAreaView>:bootError?<SafeAreaView style={{flex:1,padding:24,gap:20,backgroundColor:themed.bg}}><Label>{bootError}</Label><Button title="Thử lại" onPress={needsClear?logout:restore}/></SafeAreaView>:<MobileContext.Provider value={{api,session,login,logout,toggleTheme,month,setMonth,appearance:theme==='monochrome'?'light':theme,accent:effectiveAccent,language,changeAppearance,changeAccent,changeLanguage,...reminders,finance}}>{session&&!finance.data?<LoadingScreen error={finance.error} onRetry={()=>{void finance.refresh();}} onLogout={()=>{void logout();}}/>:children}</MobileContext.Provider>}</ThemeContext.Provider></LanguageContext.Provider></SafeAreaProvider>;
}




















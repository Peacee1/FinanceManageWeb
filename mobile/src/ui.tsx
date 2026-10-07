import {Text,useTranslate} from './i18n';
import React,{createContext,useContext,useCallback,useEffect,useRef,useState} from 'react';
import {Animated,Easing,useWindowDimensions,ActivityIndicator,Modal,Pressable,ScrollView,StyleSheet,type StyleProp,type ViewStyle,TextInput,View,KeyboardAvoidingView,Platform} from 'react-native';
import {useDesktop} from './responsive';
import {SafeAreaView} from 'react-native-safe-area-context';
export const palettes={light:{bg:'#EDFCF6',card:'#FFFFFF',text:'#083F38',muted:'#81939D',border:'#DCF3E9',primary:'#0DB981',income:'#0DB981',expense:'#E56961'},dark:{bg:'#0A211D',card:'#12362E',text:'#EAFDF4',muted:'#9ABAB0',border:'#245044',primary:'#16C795',income:'#44DBAB',expense:'#FF9388'}};
export const ThemeContext=createContext(palettes.light);
export const useTheme=()=>useContext(ThemeContext);
export function Label({children,muted=false,large=false,translateContent=true}:{children:React.ReactNode;muted?:boolean;large?:boolean;translateContent?:boolean}){const c=useTheme();return <Text translateContent={translateContent} style={{color:muted?c.muted:c.text,fontSize:large?24:14,fontWeight:large?'700':'400',lineHeight:large?32:21}}>{children}</Text>;}
export function Card({children,style}:{children:React.ReactNode;style?:StyleProp<ViewStyle>}){const c=useTheme();return <View style={[styles.card,{backgroundColor:c.card,borderColor:c.border},style]}>{children}</View>;}
export function Button({title,onPress,secondary=false,disabled=false}:{title:string;onPress:()=>void;secondary?:boolean;disabled?:boolean}){const c=useTheme();return <Pressable accessibilityRole="button" accessibilityState={{disabled}} onPress={onPress} disabled={disabled} style={({pressed})=>({padding:15,borderRadius:14,backgroundColor:secondary?c.card:c.primary,borderWidth:secondary?1:0,borderColor:c.border,alignItems:'center',opacity:disabled?0.45:pressed?0.75:1,minHeight:50})}><Text style={{color:secondary?c.text:'#FFF',fontWeight:'700',fontSize:14}}>{title}</Text></Pressable>;}
export function Field({label,value,onChange,secure=false,numeric=false,placeholder,autoCapitalize='sentences'}:{label:string;value:string;onChange:(value:string)=>void;secure?:boolean;numeric?:boolean;placeholder?:string;autoCapitalize?:'none'|'sentences'}){const c=useTheme(),t=useTranslate();return <View style={{gap:7}}><Label muted>{label}</Label><TextInput accessibilityLabel={t(label)} value={value} onChangeText={onChange} secureTextEntry={secure} keyboardType={numeric?'number-pad':'default'} autoCapitalize={autoCapitalize} autoCorrect={!secure&&autoCapitalize!=='none'} placeholder={placeholder?t(placeholder):undefined} placeholderTextColor={c.muted} style={{backgroundColor:c.card,borderColor:c.border,borderWidth:1,borderRadius:12,padding:14,color:c.text,fontSize:16,minHeight:50}}/></View>;}
export function Choices({items,value,onChange}:{items:{value:string;label:string}[];value:string;onChange:(value:string)=>void}){const c=useTheme();return <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{items.map(item=><Pressable key={item.value} accessibilityRole="button" accessibilityState={{selected:value===item.value}} onPress={()=>onChange(item.value)} style={{paddingHorizontal:12,paddingVertical:11,borderRadius:12,borderWidth:1,borderColor:value===item.value?c.primary:c.border,backgroundColor:value===item.value?c.primary:c.card}}><Text style={{color:value===item.value?'white':c.text,fontSize:13,fontWeight:'600'}}>{item.label}</Text></Pressable>)}</View>;}
export function Sheet({title,children,onClose,canClose=true}:{title:string;children:React.ReactNode;onClose:()=>void;canClose?:boolean}){return <TransactionSheet title={title} closing={false} canClose={canClose} onClose={onClose}>{children}</TransactionSheet>;}
export function Spinner(){const c=useTheme();return <ActivityIndicator color={c.primary} style={{padding:24}}/>;}
export const styles=StyleSheet.create({card:{padding:18,borderRadius:20,borderWidth:1,gap:12},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},page:{padding:20,gap:16,paddingBottom:32}});





export function TransactionSheet({closing,canClose,onClose,onBeforeClose,title,children}:{title:string;children:React.ReactNode;closing:boolean;canClose:boolean;onClose:()=>void;onBeforeClose?:()=>boolean}){
 const desktop=useDesktop();const c=useTheme(),{height}=useWindowDimensions(),[progress]=useState(()=>new Animated.Value(0)),exiting=useRef(false);
 useEffect(()=>{const animation=Animated.timing(progress,{toValue:1,duration:280,easing:Easing.out(Easing.cubic),useNativeDriver:Platform.OS!=='web'});animation.start();return()=>animation.stop();},[progress]);
 const dismiss=useCallback(()=>{if(!canClose||exiting.current||onBeforeClose?.()===false)return;exiting.current=true;Animated.timing(progress,{toValue:0,duration:220,easing:Easing.in(Easing.cubic),useNativeDriver:Platform.OS!=='web'}).start(({finished})=>{if(finished)onClose();else exiting.current=false;});},[canClose,onClose,onBeforeClose,progress]);
 useEffect(()=>{if(closing)dismiss();},[closing,dismiss]);
 return <Modal transparent animationType="none" onRequestClose={dismiss}>
  <View style={{flex:1}}>
   {desktop&&<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#00000066',opacity:progress}]}/>}
   <SafeAreaView style={{flex:1,alignItems:'center',justifyContent:'center'}}>
    <Animated.View style={{flex:desktop?undefined:1,width:'100%',maxWidth:desktop?720:undefined,height:desktop?'90%':undefined,backgroundColor:c.bg,borderRadius:desktop?24:0,overflow:'hidden',transform:[{translateY:progress.interpolate({inputRange:[0,1],outputRange:[height,0]})}]}}>
     <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
      <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20,gap:18}}>
       <View style={styles.row}><Label large>{title}</Label><Pressable accessibilityRole="button" accessibilityLabel="Đóng" disabled={!canClose||closing} onPress={dismiss}><Text style={{color:c.primary,fontWeight:'700',padding:10}}>Đóng</Text></Pressable></View>{children}
      </ScrollView>
     </KeyboardAvoidingView>
    </Animated.View>
   </SafeAreaView>
  </View>
 </Modal>;
}

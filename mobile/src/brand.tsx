import {Text} from './i18n';
import React from 'react';
import {Image,View,StyleSheet} from 'react-native';
import {useTheme} from './ui';
import {accents} from './appearance';
const wallets:Record<string,number>={purple:require('../assets/wallet-purple.webp'),pink:require('../assets/wallet-pink.webp'),green:require('../assets/wallet-green.webp'),blue:require('../assets/wallet-blue.webp'),yellow:require('../assets/wallet-yellow.webp')};
export function WalletPreloader(){return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position:'absolute',width:100,height:100,opacity:0,overflow:'hidden'}}>{Object.entries(wallets).map(([color,source])=><Image key={color} source={source} fadeDuration={0} resizeMode="contain" style={{position:'absolute',width:100,height:88}}/>)}</View>;}
export function Brand({large=false}:{large?:boolean}){const c=useTheme();const accent=accents.find(item=>item.color===c.primary||item.dark===c.primary)?.value||'purple';return <View style={{alignItems:'center',flexDirection:large?'column':'row',gap:large?14:8}}><View accessibilityRole="image" accessibilityLabel="Peacee1" style={{width:large?100:38,height:large?88:34}}>{Object.entries(wallets).map(([color,source])=><Image key={color} source={source} defaultSource={source} fadeDuration={0} accessible={false} resizeMode="contain" style={{position:'absolute',width:'100%',height:'100%',opacity:color===accent?1:0}}/>)}</View><Text style={{color:large?c.text:c.primary,fontSize:large?22:16,fontWeight:'800'}}>Peacee1</Text></View>;}
export const mintStyles=StyleSheet.create({authCard:{padding:28,borderRadius:32,gap:18,boxShadow:'0px 12px 36px rgba(4, 85, 63, .04)'},sectionTitle:{fontSize:17,fontWeight:'700'},smallHeading:{fontSize:10,fontWeight:'600',letterSpacing:1.5},link:{fontSize:13,fontWeight:'700',color:'#0DB981'},listCard:{padding:16,borderRadius:20,gap:4},iconCircle:{width:42,height:42,borderRadius:15,alignItems:'center',justifyContent:'center'},group:{borderRadius:24,padding:8},settingRow:{flexDirection:'row',alignItems:'center',gap:12,padding:14,minHeight:58}});



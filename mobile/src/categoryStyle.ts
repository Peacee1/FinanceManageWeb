import type React from 'react';
import type Feather from '@expo/vector-icons/Feather';
import type {Profile} from './types';
type Icon=React.ComponentProps<typeof Feather>['name'];
const defaults:Record<string,{icon:Icon;color:string}>={'Ăn uống':{icon:'coffee',color:'#FB7185'},'Mua sắm':{icon:'shopping-bag',color:'#F472B6'},'Di chuyển':{icon:'truck',color:'#FBBF24'},'Hoá đơn':{icon:'file-text',color:'#60A5FA'},'Hóa đơn':{icon:'file-text',color:'#34D399'},'Giải trí':{icon:'film',color:'#67E8F9'},'Lương':{icon:'briefcase',color:'#34D399'},'Đầu tư':{icon:'trending-up',color:'#7C3AED'}};
export function categoryStyle(name:string,type:string,categories:Profile['custom_categories']){const fallback=defaults[name]||{icon:(type==='INCOME'?'arrow-down-left':'tag') as Icon,color:'#9CA3AF'};return {...fallback,color:categories.find(row=>row.name===name&&row.type===type)?.color||fallback.color};}

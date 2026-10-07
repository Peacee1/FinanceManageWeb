import {Link,Text,VStack,HStack,Image} from '@expo/ui/swift-ui';
import {font,foregroundStyle,widgetURL,background,cornerRadius,padding,frame} from '@expo/ui/swift-ui/modifiers';
import {createWidget,type WidgetEnvironment} from 'expo-widgets';
type Props={palette?:{primary:string;bg:string;card:string;text:string;muted:string};expense:string;scan:string;calendar:string;accent:string};
const QuickWidget=(props:Props,environment:WidgetEnvironment)=>{
 'widget';
 const ink=props.palette?.primary||'#191918',bg=props.palette?.card||'#FFFFFF',muted=props.palette?.muted||'#77776F',button=props.palette?.bg||'#F1F0EC';
 const expense=props.expense||'Add expense',scan=props.scan||'Scan QR',calendar=props.calendar||'Calendar';
 const heading=<HStack spacing={6}><Image systemName="creditcard" color={ink} size={17}/><Text modifiers={[font({size:17,weight:'bold'}),foregroundStyle(ink)]}>Peacee1</Text></HStack>;
 if(environment.widgetFamily==='systemSmall')return <VStack spacing={14} modifiers={[background(bg),padding({all:16}),widgetURL('peacee1:///home?action=expense')]}>{heading}<Image systemName="plus" color={ink} size={26} modifiers={[padding({all:10}),background(button),cornerRadius(14)]}/><Text modifiers={[font({size:13,weight:'semibold'}),foregroundStyle(ink)]}>{expense}</Text></VStack>;
 return <VStack spacing={18} modifiers={[background(bg),padding({all:16})]}>{heading}<HStack spacing={14}>
 <Link destination="peacee1:///home?action=expense"><VStack spacing={8} modifiers={[frame({maxWidth:100})]}><Image systemName="plus" color={ink} size={22} modifiers={[padding({all:10}),background(button),cornerRadius(14)]}/><Text modifiers={[font({size:10,weight:'semibold'}),foregroundStyle(muted)]}>{expense}</Text></VStack></Link>
 <Link destination="peacee1:///home?action=qr"><VStack spacing={8} modifiers={[frame({maxWidth:100})]}><Image systemName="qrcode.viewfinder" color={ink} size={22} modifiers={[padding({all:10}),background(button),cornerRadius(14)]}/><Text modifiers={[font({size:10,weight:'semibold'}),foregroundStyle(muted)]}>{scan}</Text></VStack></Link>
 <Link destination="peacee1:///calendar"><VStack spacing={8} modifiers={[frame({maxWidth:100})]}><Image systemName="calendar" color={ink} size={22} modifiers={[padding({all:10}),background(button),cornerRadius(14)]}/><Text modifiers={[font({size:10,weight:'semibold'}),foregroundStyle(muted)]}>{calendar}</Text></VStack></Link>
 </HStack></VStack>;
};
const widget=createWidget<Props>('Peacee1QuickWidget',QuickWidget);
export function updateQuickWidget(props:Props){widget.updateSnapshot(props);}

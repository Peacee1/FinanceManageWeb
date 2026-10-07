import {Link,Text,VStack,HStack} from '@expo/ui/swift-ui';
import {font,foregroundStyle,widgetURL} from '@expo/ui/swift-ui/modifiers';
import {createWidget,type WidgetEnvironment} from 'expo-widgets';
type Props={expense:string;scan:string;calendar:string;accent:string};
const QuickWidget=(props:Props,environment:WidgetEnvironment)=>{
 'widget';
 const expense=props.expense||'Add expense',scan=props.scan||'Scan QR',calendar=props.calendar||'Calendar',color=props.accent||'#191918';
 if(environment.widgetFamily==='systemSmall')return <VStack spacing={12} modifiers={[widgetURL('peacee1:///home?action=expense')]}><Text modifiers={[font({size:18,weight:'bold'}),foregroundStyle(color)]}>Peacee1</Text><Text modifiers={[font({size:24,weight:'bold'}),foregroundStyle(color)]}>＋</Text><Text>{expense}</Text></VStack>;
 return <VStack spacing={16}><Text modifiers={[font({size:20,weight:'bold'}),foregroundStyle(color)]}>Peacee1</Text><HStack spacing={16}><Link label={expense} destination="peacee1:///home?action=expense"/><Link label={scan} destination="peacee1:///home?action=qr"/><Link label={calendar} destination="peacee1:///calendar"/></HStack></VStack>;
};
const widget=createWidget('Peacee1QuickWidget',QuickWidget);
export function updateQuickWidget(props:Props){widget.updateSnapshot(props);}

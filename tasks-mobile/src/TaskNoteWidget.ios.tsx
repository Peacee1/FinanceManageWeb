import {Text, VStack} from '@expo/ui/swift-ui';
import {containerBackground, font, foregroundStyle, padding, widgetURL} from '@expo/ui/swift-ui/modifiers';
import {createWidget} from 'expo-widgets';
import type {TaskNoteSnapshot} from './noteSnapshot';

const Note = (props: TaskNoteSnapshot) => {
  'widget';
  return <VStack spacing={12} modifiers={[containerBackground('#F1F0EC', 'widget'), padding({all: 16}), widgetURL('peacee1task:///')]}>
    <Text modifiers={[font({size: 16, weight: 'bold'}), foregroundStyle('#191918')]}>Việc cần làm</Text>
    {(props.items || []).slice(0, 3).map((item, index) => <Text key={index} modifiers={[font({size: 13}), foregroundStyle(item.done ? '#6B6B65' : '#191918')]}>{(item.done ? '✓ ' : '○ ') + item.title}</Text>)}
    {!props.items?.length && <Text modifiers={[font({size: 12}), foregroundStyle('#6B6B65')]}>{props.signedIn ? 'Một ngày nhẹ nhàng. Thêm việc mới trong app.' : 'Mở Peacee1 Task để đồng bộ.'}</Text>}
  </VStack>;
};
const widget = createWidget<TaskNoteSnapshot>('TaskNoteWidget', Note);
export function updateTaskNote(props: TaskNoteSnapshot) {widget.updateSnapshot(props);}

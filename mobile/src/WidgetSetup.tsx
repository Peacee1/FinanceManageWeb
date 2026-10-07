import WidgetPicker from './WidgetPicker';
import React from 'react';
import {Platform} from 'react-native';
import {Card,Label,Sheet} from './ui';
export default function WidgetSetup({onClose}:{onClose:()=>void}){
 return <Sheet title="Widget" onClose={onClose}>{Platform.OS==='web'&&<Card><Label large>Xem trước widget iPhone</Label><Label muted>Đây là bản xem trước giao diện và hướng dẫn. Để thêm widget vào màn hình chính, cần cài app Peacee1 trên iPhone.</Label></Card>}<>
 {Platform.OS!=='android'&&<WidgetPicker/>}<Card><Label large>Peacee1 trên màn hình chính</Label><Label>Widget nhỏ mở ghi khoản chi. Widget vừa có Ghi khoản chi, Quét QR và Lịch. Widget dùng ngôn ngữ và màu chủ đạo đã chọn trong app.</Label></Card>
 {Platform.OS==='android'?<Card><Label large>Thêm widget trên Android</Label><Label>1. Cài bản Peacee1 có widget và mở app một lần.</Label><Label>2. Nhấn giữ vùng trống trên màn hình chính → Widget → tìm Peacee1.</Label><Label>3. Nhấn giữ widget Peacee1 và kéo ra màn hình chính.</Label><Label muted>Widget Android đang được phát triển. Nếu chưa thấy Peacee1 trong danh sách, bản app hiện tại chưa có widget Android.</Label></Card>:<Card><Label large>Thêm widget trên iPhone</Label><Label>1. Cài bản Peacee1 có widget và mở app một lần.</Label><Label>2. Nhấn giữ màn hình chính → Sửa → Thêm widget → tìm Peacee1.</Label><Label>3. Chọn kích thước nhỏ hoặc vừa rồi bấm Thêm widget.</Label></Card>}
 </></Sheet>;
}

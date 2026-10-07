import React from 'react';
import {Platform,Linking} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {Button,Card,Label,Sheet} from './ui';
export default function IphoneSetup({onClose}:{onClose:()=>void}){
 return <Sheet title="Ghi nhanh bằng 2 chạm" onClose={onClose}>< >
 <Card><Label large>Từ thông báo ngân hàng</Label><Label>Mở rộng thông báo ngân hàng để thấy toàn bộ nội dung trước khi chạm hai lần. Phím tắt lấy chữ từ ảnh màn hình ngay trên iPhone rồi mở bản nháp để bạn kiểm tra và chọn danh mục.</Label></Card>
 <Card><Label large>Tạo phím tắt Peacee1 ghi nhanh</Label><Label>1. Mở Phím tắt, tạo phím tắt mới và đặt tên Peacee1 ghi nhanh.</Label><Label>2. Thêm các tác vụ theo thứ tự: Chụp ảnh màn hình → Trích xuất văn bản từ hình ảnh → Mã hóa URL.</Label><Label>3. Thêm tác vụ Văn bản: dán địa chỉ bên dưới và nối biến Văn bản đã mã hóa vào cuối.</Label><Label translateContent={false}>peacee1:///bank-record?text=</Label><Button secondary title="Sao chép địa chỉ" onPress={()=>{void Clipboard.setStringAsync('peacee1:///bank-record?text=');}}/><Label>4. Thêm tác vụ Mở URL với văn bản ở bước 3.</Label></Card>
 <Card><Label large>Bật Chạm vào mặt sau</Label><Label>Cài đặt → Trợ năng → Cảm ứng → Chạm vào mặt sau → Chạm hai lần → Peacee1 ghi nhanh.</Label><Label>Lần đầu chạy, cho phép Phím tắt truy cập ảnh màn hình và mở Peacee1. Kiểm tra số tiền trước khi lưu.</Label></Card>{Platform.OS==='ios'&&<Button title="Mở Phím tắt" onPress={()=>{void Linking.openURL('shortcuts://');}}/>}<Button secondary title="Thử ghi nhanh" onPress={()=>{void Linking.openURL(Platform.OS==='web'?'https://finance.peacee1.io.vn/bank-record':'peacee1:///bank-record');}}/>
 </></Sheet>;
}

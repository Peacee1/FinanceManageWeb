const tips=[
 'Ghi lại khoản chi nhỏ hôm nay để hiểu rõ thói quen của bạn.',
 'Trước khi mua, hãy hỏi: mình cần nó hay chỉ đang muốn nó?',
 'Tiết kiệm một chút đều đặn cũng tạo nên thay đổi lớn.',
 'Một kế hoạch chi tiêu tốt dành chỗ cho cả hiện tại và tương lai.',
 'Cho mình một ngày suy nghĩ trước một món đồ ngoài kế hoạch.',
];
export function widgetTip(date:string){
 const day=date.replace(/[^0-9]/g,'');
 return tips[Number(day||0)%tips.length];
}

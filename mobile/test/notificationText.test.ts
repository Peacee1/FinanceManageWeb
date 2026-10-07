import {test} from 'node:test';
import assert from 'node:assert/strict';
import {notificationText} from '../src/notificationText.ts';
test('localizes historical expense notifications and standard categories without changing amounts',()=>{
 const notice={title:'Đã thêm khoản chi',message:'Bạn đã ghi 3.000.000 ₫ · Hoá đơn.'};
 assert.deepEqual(notificationText(notice,'en'),{title:'Expense added',message:'You recorded 3.000.000 ₫ · Bills.'});
 assert.deepEqual(notificationText(notice,'vi'),notice);
});
test('preserves names, custom categories and pending status, including literal template characters',()=>{
 assert.equal(notificationText({title:'Đã thêm khoản thu',message:'An {amount} đã ghi 12.34 USD · Quỹ riêng (chờ duyệt).'},'en').message,'An {amount} recorded 12.34 USD · Quỹ riêng (pending approval).');
});
test('translates check-in reminders in every supported non-Vietnamese language',()=>{
 const notice={title:'Đến giờ điểm danh!',message:'Điểm danh hôm nay để nhận xu và duy trì chuỗi ngày của bạn.'};
 for(const language of ['en','zh','ja','ko','ru'] as const){const result=notificationText(notice,language);assert.notEqual(result.title,notice.title);assert.notEqual(result.message,notice.message);}
});
test('goal and family notices preserve user content; unknown notices remain readable',()=>{
 assert.equal(notificationText({title:'Đến lịch góp cho mục tiêu',message:'Hôm nay là lịch góp cho “Du lịch của An”. Mở mục tiêu để cập nhật số tiền đã dành.'},'en').message,'Today is your contribution day for “Du lịch của An”. Open the goal to update your savings.');
 assert.equal(notificationText({title:'Gia đình có thành viên mới',message:'An vừa tham gia Gia đình “Nhà tôi”.'},'en').message,'An joined the family “Nhà tôi”.');
 const unknown={title:'Custom title',message:'Custom message'};assert.deepEqual(notificationText(unknown,'en'),unknown);
});

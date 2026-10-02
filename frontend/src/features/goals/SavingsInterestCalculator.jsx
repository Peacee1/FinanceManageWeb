import React,{useState} from 'react';
const money=value=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(value);
export default function SavingsInterestCalculator(){
 const [amount,setAmount]=useState(''),[rate,setRate]=useState(''),[months,setMonths]=useState('');
 const valid=Number(amount)>0&&Number(amount)<=1000000000000&&Number(rate)>=0&&rate!==''&&Number(rate)<=100&&Number.isInteger(Number(months))&&Number(months)>0&&Number(months)<=600;
 const interest=valid?Number(amount)*Number(rate)/100*Number(months)/12:0;
 return <details className="goal-interest"><summary>Công cụ tính lãi gửi tiết kiệm</summary><p className="goal-help">Ước tính lãi đơn theo số tháng. Kết quả chỉ để tính thử và không cộng vào tiến độ mục tiêu.</p><div className="goal-form-grid">
  <label>Số tiền gửi (VNĐ)<input type="text" inputMode="numeric" value={amount?Number(amount).toLocaleString('vi-VN'):''} onChange={event=>setAmount(event.target.value.replace(/\D/g,''))}/></label>
  <label>Lãi suất (%/năm)<input type="number" min={0} max={100} step="any" value={rate} onChange={event=>setRate(event.target.value)}/></label>
  <label>Số tháng gửi<input type="number" min={1} max={600} value={months} onChange={event=>setMonths(event.target.value)}/></label>
 </div>{valid&&<div className="goals-message"><p>Lãi ước tính: <strong>{money(interest)}</strong></p><p>Gốc và lãi: <strong>{money(Number(amount)+interest)}</strong></p><small>Chưa tính phí, tái tục hoặc thay đổi lãi suất.</small></div>}</details>;
}

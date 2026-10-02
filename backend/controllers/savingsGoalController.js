const db=require('../config/db');
const {createHash}=require('crypto');
const {isDate}=require('../utils/validation');
const cap=1000000000000;
const money=(value,zero=false)=>Number.isSafeInteger(value)&&value>=(zero?0:1)&&value<=cap;
const validId=value=>/^[1-9][0-9]{0,9}$/.test(String(value))&&Number(value)<=2147483647;
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const definitionError=body=>{
 if(typeof body.name!=='string'||!body.name.trim()||body.name.trim().length>100) return 'Nhập tên mục tiêu, tối đa 100 ký tự.';
 if(!money(body.targetAmount)) return 'Số tiền mục tiêu phải là số nguyên dương, tối đa 1.000 tỷ đồng.';
 if(body.deadline!==null&&!isDate(body.deadline)) return 'Thời hạn không hợp lệ.';
 if(!money(body.monthlyAmount,true)) return 'Mức góp mỗi tháng không hợp lệ.';
 if(!['high','normal','low'].includes(body.priority)) return 'Mức ưu tiên không hợp lệ.';
 if(!['none','weekly','monthly'].includes(body.reminder)||!Number.isInteger(body.reminderDay)||body.reminderDay<1||body.reminderDay>(body.reminder==='weekly'?7:31)) return 'Lịch nhắc góp không hợp lệ.';
 return null;
};
const run=work=>async(req,res,next)=>{
 if(req.user.role!=='owner') return res.status(403).json({message:'Mục tiêu dành cho sổ Cá nhân và Gia đình.'});
 try {
  const result=await db.transaction(async client=>{
   const user=(await client.query('SELECT id,name,family_id FROM users WHERE id=$1 FOR SHARE',[req.user.userId])).rows[0];
   if(!user) fail(401,'Vui lòng đăng nhập lại.');
   return work(client,user,req);
  });res.json(result);
 } catch(error){if(error.status) res.status(error.status).json({message:error.message});else next(error);}
};
const scope=user=>user.family_id?{clause:'family_id=$1',value:user.family_id}:{clause:'owner_id=$1 AND family_id IS NULL',value:user.id};
async function find(client,user,id,lock=false){
 if(!validId(id)) fail(400,'Mục tiêu không hợp lệ.');
 const s=scope(user);
 const goal=(await client.query(`SELECT * FROM savings_goals WHERE ${s.clause} AND id=$2${lock?' FOR UPDATE':''}`,[s.value,id])).rows[0];
 if(!goal) fail(404,'Không tìm thấy mục tiêu trong sổ đang dùng.');return goal;
}
const list=run(async(client,user)=>{
 const s=scope(user);return {mode:user.family_id?'family':'personal',items:(await client.query(`SELECT * FROM savings_goals WHERE ${s.clause} ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,id DESC`,[s.value])).rows};
});
const create=run(async(client,user,req)=>{
 const b=req.body||{},error=definitionError(b);if(error) fail(400,error);
 if(!money(b.initialAmount,true)) fail(400,'Số tiền đã dành không hợp lệ.');
 if(!uuid(b.requestId)) fail(400,'Yêu cầu tạo mục tiêu không hợp lệ.');
 const hash=createHash('sha256').update(JSON.stringify([user.family_id,b.name.trim(),b.targetAmount,b.initialAmount,b.deadline,b.monthlyAmount,b.priority,b.reminder,b.reminderDay])).digest('hex');
 if(b.deadline&&b.deadline<new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())) fail(400,'Chọn thời hạn từ hôm nay trở đi.');
 const goal=(await client.query(`INSERT INTO savings_goals(owner_id,family_id,name,target_amount,current_amount,deadline,monthly_amount,priority,status,reminder,reminder_day,create_request_id,create_request_hash)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(owner_id,create_request_id) DO NOTHING RETURNING *`,[user.id,user.family_id,b.name.trim(),b.targetAmount,b.initialAmount,b.deadline,b.monthlyAmount,b.priority,b.initialAmount>=b.targetAmount?'completed':'active',b.reminder,b.reminderDay,b.requestId,hash])).rows[0];
 if(!goal){const previous=(await client.query('SELECT * FROM savings_goals WHERE owner_id=$1 AND create_request_id=$2',[user.id,b.requestId])).rows[0];if(previous.create_request_hash!==hash) fail(409,'Yêu cầu đã được dùng cho mục tiêu khác.');return previous;}
 if(b.initialAmount>0) await client.query("INSERT INTO savings_goal_entries(goal_id,user_id,actor_name,kind,amount,note,request_id) VALUES($1,$2,$3,'OPENING',$4,'Số tiền đã dành khi tạo mục tiêu',gen_random_uuid())",[goal.id,user.id,user.name,b.initialAmount]);
 return goal;
});
const update=run(async(client,user,req)=>{
 const goal=await find(client,user,req.params.id,true),b=req.body||{},error=definitionError(b);if(error) fail(400,error);
 if(!['active','paused','completed'].includes(b.status)) fail(400,'Trạng thái không hợp lệ.');
 if(b.status==='completed'&&Number(goal.current_amount)<b.targetAmount) fail(400,'Mục tiêu chưa đủ tiền để hoàn thành.');
 const status=b.status==='paused'?'paused':Number(goal.current_amount)>=b.targetAmount?'completed':'active';
 return (await client.query(`UPDATE savings_goals SET name=$2,target_amount=$3,deadline=$4,monthly_amount=$5,priority=$6,status=$7,reminder=$8,reminder_day=$9,updated_at=now() WHERE id=$1 RETURNING *`,[goal.id,b.name.trim(),b.targetAmount,b.deadline,b.monthlyAmount,b.priority,status,b.reminder,b.reminderDay])).rows[0];
});
const contribute=run(async(client,user,req)=>{
 const goal=await find(client,user,req.params.id,true),b=req.body||{};
 if(!['DEPOSIT','WITHDRAW'].includes(b.kind)||!money(b.amount)||!uuid(b.requestId)||typeof b.note!=='string'||b.note.length>500) fail(400,'Số tiền, ghi chú hoặc yêu cầu góp/rút không hợp lệ.');
 const previous=(await client.query('SELECT * FROM savings_goal_entries WHERE goal_id=$1 AND request_id=$2',[goal.id,b.requestId])).rows[0];
 if(previous){if(previous.user_id!==user.id||previous.kind!==b.kind||Number(previous.amount)!==b.amount||previous.note!==b.note.trim()) fail(409,'Yêu cầu đã được dùng cho một lần góp/rút khác.');return {goal,entry:previous,replayed:true};}
 if(goal.status==='paused'&&b.kind==='DEPOSIT') fail(409,'Tiếp tục mục tiêu trước khi góp tiền.');
 const current=Number(goal.current_amount)+(b.kind==='DEPOSIT'?b.amount:-b.amount);
 if(!money(current,true)) fail(400,b.kind==='WITHDRAW'?'Không thể rút quá số tiền đã dành.':'Số tiền đã dành vượt giới hạn.');
 const entry=(await client.query('INSERT INTO savings_goal_entries(goal_id,user_id,actor_name,kind,amount,note,request_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[goal.id,user.id,user.name,b.kind,b.amount,b.note.trim(),b.requestId])).rows[0];
 const updated=(await client.query('UPDATE savings_goals SET current_amount=$2,status=$3,updated_at=now() WHERE id=$1 RETURNING *',[goal.id,current,goal.status==='paused'?'paused':current>=Number(goal.target_amount)?'completed':'active'])).rows[0];
 return {goal:updated,entry,replayed:false};
});
const history=run(async(client,user,req)=>{
 const goal=await find(client,user,req.params.id),before=req.query.before;
 if(before!==undefined&&!validId(before)) fail(400,'Trang lịch sử không hợp lệ.');
 const items=(await client.query('SELECT * FROM savings_goal_entries WHERE goal_id=$1 AND ($2::int IS NULL OR id<$2) ORDER BY id DESC LIMIT 30',[goal.id,before||null])).rows;
 return {items,nextCursor:items.length===30?items.at(-1).id:null};
});
module.exports={list,create,update,contribute,history,definitionError};

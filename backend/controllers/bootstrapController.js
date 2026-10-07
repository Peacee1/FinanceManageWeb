const {getProfile}=require('./userController');
const {getTransactions,getSummary}=require('./transactionController');
const {listNotifications}=require('./notificationController');
const {getFamily}=require('./familyController');
const {list}=require('./savingsGoalController');
const {getReviews}=require('./aiReviewController');
// Reuse the same authorized handlers and their projections. Never accept a
// user/family identifier from the client or expose raw database rows.
async function capture(handler,req){
 let status=200,nextCursor=null,data;
 const res={status(code){status=code;return this;},setHeader(name,value){if(name==='X-Next-Cursor')nextCursor=value;},json(value){data=value;return this;}};
 await handler(req,res,error=>{throw error;});
 if(status>=400)throw Object.assign(new Error(data?.message||'Bootstrap failed'),{status});
 return {data,nextCursor};
}
async function bootstrap(req,res,next){
 const month=req.query.month;
 if(typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||Number(month.slice(0,4))<1900||Number(month.slice(0,4))>9998)return res.status(400).json({message:'Tháng/năm không hợp lệ.'});
 try{
  const profile=await capture(getProfile,{...req,query:{}});
  const [year,number]=month.split('-');
  const scope=`scope=${profile.data.finance_mode}&year=${year}&month=${number}`;
  const query={scope:profile.data.finance_mode,year,month:number};
  const entries=[['/users/me',profile],...await Promise.all([
   [`/transactions?${scope}&limit=500`,getTransactions,{...query,limit:'500'}],
   [`/transactions/summary?${scope}`,getSummary,query],
   ['/users/notifications',listNotifications,{}],['/users/family',getFamily,{}],
   ['/users/goals',list,{}],['/ai/reviews',getReviews,{}]
  ].map(async([path,handler,query])=>[path,await capture(handler,{...req,query})]))];
  res.json({entries});
 }catch(error){if(error.status)return res.status(error.status).json({message:error.message});next(error);}
}
module.exports={bootstrap,capture};

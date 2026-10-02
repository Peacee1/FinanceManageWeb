export function goalPlan(goal,today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'})) {
 const target=Number(goal.target_amount||0),current=Number(goal.current_amount||0),monthly=Number(goal.monthly_amount||0);
 const remaining=Math.max(target-current,0),progress=target>0?Math.min(current/target*100,100):0;
 const deadline=goal.deadline?.slice(0,10),days=deadline?Math.round((Date.parse(deadline)-Date.parse(today))/86400000):null;
 const months=days===null?null:Math.max(1,Math.ceil(days/30.4375));
 const required=months?Math.ceil(remaining/months):null;
 const estimatedMonths=monthly>0?Math.ceil(remaining/monthly):null;
 return {remaining,progress,days,months,required,estimatedMonths,late:remaining>0&&days!==null&&days<0};
}

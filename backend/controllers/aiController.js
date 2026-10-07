const db=require('../config/db');
const {transactionScope}=require('../utils/transactionScope');
const {analysisPeriod,summarize,generateAnalysis,languages}=require('../utils/financialAnalysis');
const {createHash}=require('crypto');
const empty={vi:'Chưa có giao dịch trong tháng này. Hãy thêm thu chi để nhận xét dựa trên dữ liệu thật.',en:'No transactions this month. Add income or expenses to get a review based on your records.',zh:'本月暂无交易。添加收支后可获得基于真实记录的分析。',ja:'今月の取引はありません。収支を追加すると、記録に基づく分析を表示できます。',ru:'В этом месяце нет операций. Добавьте доходы или расходы для анализа по вашим записям.',ko:'이번 달 거래가 없습니다. 수입이나 지출을 추가하면 기록을 바탕으로 분석할 수 있습니다.'};
function createAnalyzer({database=db,scopeFor=transactionScope,generate=generateAnalysis,sign=require('./aiReviewController').reviewToken,checkFunds=require('../services/analysisBilling').checkFunds,charge=require('../services/analysisBilling').chargeAnalysis}={}){
 const cache=new Map(),pending=new Map();
 return async(req,res)=>{try{
  const requestId=req.body?.requestId;if(typeof requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))return res.status(400).json({message:'Mã yêu cầu không hợp lệ.'});
  const period=analysisPeriod(req.body?.month),language=req.body?.language||'vi';if(!Object.hasOwn(languages,language))return res.status(400).json({message:'Ngôn ngữ không hợp lệ.',code:'INVALID_LANGUAGE'});
  const scope=await scopeFor(req);if(scope.error)return res.status(scope.error).json({message:scope.message});
  const params=[...scope.params,period.start,period.end,period.today],p=scope.params.length;
  const rows=(await database.query(`SELECT t.currency,t.type,t.category,SUM(t.amount::numeric / CASE WHEN t.currency IN ('USD','CNY','RUB') THEN 100 ELSE 1 END) AS total,COUNT(*) AS count FROM transactions t WHERE ${scope.clause} AND t.date >= $${p+1}::date AND t.date < $${p+2}::date AND t.date <= $${p+3}::date AND t.approval_status='APPROVED' AND t.bank_payment_status IN ('MANUAL','VERIFIED') GROUP BY t.currency,t.type,t.category ORDER BY t.currency,t.type,t.category`,params)).rows;
  const summary=summarize(rows),mode=scope.familyId?'family':scope.businessId?'business':'personal';const base={month:period.month,language,scope:mode,summary};
  if(!summary.count)return res.json({...base,analysis:empty[language],empty:true});
  const inputHash=createHash('sha256').update(JSON.stringify([req.user.userId,scope.familyId,scope.businessId,period,language,summary])).digest('hex');await checkFunds(req.user.userId,inputHash,requestId);const key=createHash('sha256').update(inputHash+requestId).digest('hex');const saved=cache.get(key);const respond=async(analysis,cached=false)=>{const payment=await charge(req.user.userId,inputHash,requestId);return res.json({...base,analysis,cached,payment,reviewToken:sign(req.user.userId,key,{month:period.month,language,ledger:mode,analysis})});};if(saved&&saved.expires>Date.now())return await respond(saved.analysis,true);
  if(!pending.has(key))pending.set(key,generate(summary,period,language,mode).then(analysis=>{if(cache.size>=200)cache.delete(cache.keys().next().value);cache.set(key,{analysis,expires:Date.now()+5*60000});return analysis;}).finally(()=>pending.delete(key)));
  return await respond(await pending.get(key));
 }catch(error){console.error('AI analysis failure:',error.code||'INTERNAL');return res.status(error.status||500).json({message:error.status?error.message:'Không thể nhận xét lúc này. Vui lòng thử lại.',code:error.code||'AI_ERROR'});}};
}
module.exports={analyzeFinances:createAnalyzer(),createAnalyzer};

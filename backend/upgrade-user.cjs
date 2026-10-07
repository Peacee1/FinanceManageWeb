require('dotenv').config({path:'/home/ec2-user/FinanceManageWeb/backend/.env'});
const db=require('/home/ec2-user/FinanceManageWeb/backend/config/db');
db.query('UPDATE users SET plan=$1 WHERE lower(email)=lower($2) RETURNING id,email,plan',['ultra','donangan6903@gmail.com']).then(r=>{console.log(JSON.stringify(r.rows));process.exit(r.rowCount===1?0:1);}).catch(e=>{console.error(e.code);process.exit(1);});

export type User = { id:number; name:string; email:string; role:'owner'|'employee'; mustChangePassword?:boolean };
export type Session = {token:string;refreshToken?:string;user:User};
export type Profile = {expense_only?:boolean;currency?:string;avatar_url?:string|null;id:number;name:string;email:string;coin:number;personal_accent?:string;last_checkin_date?:string|null;checkin_streak?:number;finance_mode:'personal'|'family';separate_personal_wallets:boolean;custom_categories:{name:string;type:'INCOME'|'EXPENSE';color:string}[]};
export type Transaction = {id:number;currency?:string;user_id?:number;actor_name?:string;type:'INCOME'|'EXPENSE';amount:string|number;category:string;date:string;description:string;payment_method?:'CASH'|'TRANSFER'|null};
export type CurrencySummary = {currency:string;today_income:string;today_expense:string;month_income:string;month_expense:string};
export type Summary = {by_currency?:CurrencySummary[];today_income:string;today_expense:string;month_income:string;month_expense:string};
export type Goal = {id:number;name:string;target_amount:string;current_amount:string;deadline:string|null;monthly_amount:string;priority:'high'|'normal'|'low';status:'active'|'paused'|'completed';reminder:'none'|'weekly'|'monthly';reminder_day:number};
export type GoalEntry = {id:number;actor_name:string;kind:'OPENING'|'DEPOSIT'|'WITHDRAW';amount:string;note:string;created_at:string};
export type Notice = {id:string;title:string;message:string;target:string;created_at:string;read_at:string|null};



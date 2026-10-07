// The page must not capture gestures that started on a transaction row.
let current:number|null=null;
export const beginTransactionGesture=(id:number)=>{current=id;};
export const clearTransactionGesture=(id?:number)=>{if(id===undefined||current===id)current=null;};
export const isTransactionGesture=()=>current!==null;
let expanded:{id:number;close:()=>void}|null=null;
let protectedInteraction=false;
export const keepTransactionInteraction=()=>{protectedInteraction=true;};
export const beginTransactionInteraction=()=>{
 protectedInteraction=false;
 const previous=expanded;
 setTimeout(()=>{if(previous&&expanded===previous&&!protectedInteraction){expanded=null;previous.close();}},0);
};
export const setExpandedTransaction=(id:number,close:()=>void)=>{
 if(expanded&&expanded.id!==id)expanded.close();
 expanded={id,close};
};
export const clearExpandedTransaction=(id:number)=>{if(expanded?.id===id)expanded=null;};
export const transactionSwipeTarget=(initial:number,dx:number)=>initial&&Math.sign(initial)!==Math.sign(dx)&&Math.abs(dx)>24?0:Math.abs(initial+dx)>48?Math.sign(initial+dx)*160:0;

export const dismissExpandedTransaction=()=>{const previous=expanded;expanded=null;previous?.close();};

export function useReminders(_userId:number|undefined,_language:string){return {reminderStatus:'web' as const,enableReminders:async()=>{}};}
export function useReminderResponse(_userId:number|undefined,_onTarget:(target:'checkin'|'expense')=>void){}

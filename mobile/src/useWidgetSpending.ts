import {useEffect,useState} from 'react';
import type {Api} from './api';
import type {Profile,Summary} from './types';
import {currencyTotals,today,dateLabel} from './format';
export function useWidgetSpending(api:Api,data:{profile:Profile;summary:Summary;month:string}|null){
 const [snapshot,setSnapshot]=useState<{source:typeof data;amount:string}|null>(null);
 useEffect(()=>{let active=true;if(!data)return;const date=today();if(data.month===date.slice(0,7))return;const [year,month]=date.split('-');void api<Summary>(`/transactions/summary?scope=${data.profile.finance_mode}&year=${year}&month=${month}`).then(({data:summary})=>{if(active)setSnapshot({source:data,amount:currencyTotals(summary,'expense','today',data.profile.currency)});}).catch(()=>{if(active)setSnapshot({source:data,amount:'—'});});return()=>{active=false;};},[api,data]);
 return {amount:data?.month===today().slice(0,7)?currencyTotals(data.summary,'expense','today',data.profile.currency):data&&snapshot?.source===data?snapshot.amount:'—',date:dateLabel(today())};
}

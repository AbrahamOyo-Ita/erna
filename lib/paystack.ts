const base='https://api.paystack.co'
export class PaystackError extends Error{constructor(message:string,public status:number,public retryable:boolean){super(message)}}
export async function paystack<T>(path:string,init:RequestInit={}){
 const key=process.env.PAYSTACK_SECRET_KEY;if(!key)throw new PaystackError('Paystack is not configured.',503,false)
 let response:Response
 try{response=await fetch(`${base}${path}`,{...init,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json',...(init.headers??{})},cache:'no-store',signal:AbortSignal.timeout(15000)})}
 catch{throw new PaystackError('Paystack did not respond. The request remains pending for safe reconciliation.',503,true)}
 const data=await response.json().catch(()=>({status:false,message:'Invalid Paystack response'})) as T&{status:boolean;message:string}
 if(!response.ok||!data.status)throw new PaystackError(data.message||'Paystack request failed',response.status,response.status>=500||response.status===429)
 return data
}

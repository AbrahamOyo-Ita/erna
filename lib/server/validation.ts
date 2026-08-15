export const pricing:Record<string,{worker:number;advertiser:number}>={
 'facebook:follow':{worker:10,advertiser:16},'facebook:like':{worker:10,advertiser:16},'facebook:share':{worker:15,advertiser:23},'facebook:comment':{worker:20,advertiser:31},
 'tiktok:follow':{worker:10,advertiser:16},'tiktok:like':{worker:10,advertiser:16},'tiktok:share':{worker:15,advertiser:23},'tiktok:comment':{worker:20,advertiser:31},
 'instagram:follow':{worker:15,advertiser:23},'instagram:like':{worker:12,advertiser:19},'instagram:share':{worker:20,advertiser:31},'instagram:comment':{worker:25,advertiser:39},
 'x:follow':{worker:15,advertiser:23},'x:like':{worker:12,advertiser:19},'x:share':{worker:20,advertiser:31},'x:comment':{worker:25,advertiser:39},
 'linkedin:follow':{worker:15,advertiser:23},'linkedin:like':{worker:12,advertiser:19},'linkedin:share':{worker:20,advertiser:31},'linkedin:comment':{worker:25,advertiser:39},
 'youtube:like':{worker:50,advertiser:77},'youtube:comment':{worker:100,advertiser:154},'youtube:subscribe':{worker:150,advertiser:231},'play_store:review':{worker:100,advertiser:154},'app_store:review':{worker:200,advertiser:308},'marketplace:engage':{worker:10,advertiser:16},
}
export function asText(value:unknown,min:number,max:number,label:string){const text=typeof value==='string'?value.trim():'';if(text.length<min||text.length>max)throw new Error(`${label} must be ${min} to ${max} characters.`);return text}
export function asHttpsUrl(value:unknown){const text=asText(value,8,2000,'Target URL');let url:URL;try{url=new URL(text)}catch{throw new Error('Enter a valid target URL.')}if(url.protocol!=='https:'||url.username||url.password)throw new Error('Target URL must use HTTPS.');return url.toString()}
export function asMoney(value:unknown,min:number,max:number){const amount=Number(value);if(!Number.isFinite(amount)||amount<min||amount>max||Math.round(amount*100)!==amount*100)throw new Error(`Amount must be between ₦${min.toLocaleString()} and ₦${max.toLocaleString()}.`);return amount}
export function normalizeNigerianPhone(value:unknown){let phone=String(value??'').replace(/[^0-9]/g,'');if(phone.startsWith('0'))phone=`234${phone.slice(1)}`;if(!/^234[789][0-9]{9}$/.test(phone))throw new Error('Enter a valid Nigerian WhatsApp number.');return phone}
export function bankAccount(value:unknown){const account=String(value??'').replace(/\s/g,'');if(!/^[0-9]{10}$/.test(account))throw new Error('Nigerian account numbers must contain 10 digits.');return account}

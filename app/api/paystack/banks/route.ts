import { NextResponse } from 'next/server'
import { paystack } from '@/lib/paystack'
import { apiError,consumeLimit,requireUser } from '@/lib/server/request'
export async function GET(){try{const user=await requireUser();await consumeLimit(user.id,'paystack:banks',30,3600);const data=await paystack<{data:Array<{name:string;code:string;slug:string}>}>('/bank?country=nigeria&currency=NGN&perPage=100');return NextResponse.json({banks:data.data.map(({name,code})=>({name,code}))},{headers:{'Cache-Control':'private, max-age=3600'}})}catch(error){return apiError(error)}}

import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { processEmailOutbox } from '@/lib/email'
function equal(a:string,b:string){return a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b))}
async function handle(request:Request){const configured=process.env.CRON_SECRET??'',provided=request.headers.get('authorization')?.replace(/^Bearer\s+/,'')??'';if(!configured||!equal(configured,provided))return NextResponse.json({error:'Unauthorized'},{status:401});try{return NextResponse.json(await processEmailOutbox())}catch{return NextResponse.json({error:'Outbox processing failed'},{status:500})}}
export {handle as GET,handle as POST}

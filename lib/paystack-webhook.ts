import { createHmac,timingSafeEqual } from 'node:crypto'
export function verifyPaystackSignature(raw:string,signature:string,secret:string){const expected=createHmac('sha512',secret).update(raw).digest('hex');if(signature.length!==expected.length)return false;return timingSafeEqual(Buffer.from(signature,'utf8'),Buffer.from(expected,'utf8'))}

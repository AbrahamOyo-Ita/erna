import sharp from 'sharp'
import { ApiError } from './request'

const allowed=new Set(['image/jpeg','image/png','image/webp'])
export async function sanitizeImage(file:File,maxBytes:number,maxDimension:number){
 if(!allowed.has(file.type)) throw new ApiError(415,'Only JPEG, PNG, and WebP images are allowed.')
 if(file.size<32||file.size>maxBytes) throw new ApiError(413,`Image must be smaller than ${Math.floor(maxBytes/1024/1024)} MB.`)
 const input=Buffer.from(await file.arrayBuffer())
 try{
  const image=sharp(input,{failOn:'error',limitInputPixels:25_000_000})
  const meta=await image.metadata()
  if(!['jpeg','png','webp'].includes(meta.format??'')) throw new Error('Unsupported decoded format')
  if(!meta.width||!meta.height||meta.width<20||meta.height<20) throw new Error('Invalid image dimensions')
  // Re-encoding without withMetadata() strips EXIF, GPS, comments and embedded profiles.
  return await image.rotate().resize({width:maxDimension,height:maxDimension,fit:'inside',withoutEnlargement:true}).webp({quality:82,effort:4}).toBuffer()
 }catch{throw new ApiError(415,'The uploaded file is not a valid, safe image.')}
}

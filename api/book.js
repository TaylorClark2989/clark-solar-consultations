const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
module.exports = async (req,res)=>{
 if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
 try{
  const b=req.body||{}, need=['name','phone','address','city','zip','date','time'];
  for(const k of need) if(!String(b[k]||'').trim()) return res.status(400).json({error:'Please complete all required fields.'});
  const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
  let bill_path=null;
  if(b.billData){
   const m=String(b.billData).match(/^data:(image\/jpeg|image\/png|image\/webp|application\/pdf);base64,(.+)$/);
   if(!m) return res.status(400).json({error:'Please upload a JPG, PNG, WebP, or PDF.'});
   const buf=Buffer.from(m[2],'base64'); if(buf.length>5242880) return res.status(400).json({error:'Bill upload must be 5 MB or smaller.'});
   const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf'}[m[1]];
   bill_path=crypto.randomUUID()+'.'+ext;
   const up=await supabase.storage.from('electric-bills').upload(bill_path,buf,{contentType:m[1]}); if(up.error) throw up.error;
  }
  const {data,error}=await supabase.from('solar_consultations').insert({customer_name:b.name,phone:b.phone,email:b.email||null,street_address:b.address,city:b.city,zip:b.zip,preferred_date:b.date,appointment_time:b.time,notes:b.notes||null,bill_path}).select('id').single();
  if(error){if(bill_path) await supabase.storage.from('electric-bills').remove([bill_path]); if(error.code==='23505') return res.status(409).json({error:'That appointment time was just taken. Please choose another time.'}); throw error}
  const resend=new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({from:process.env.SOLAR_NOTIFICATION_FROM,to:'taylor@clarksolarconsultations.com',subject:'New solar consultation — '+b.date+' '+b.time,html:`<h2>New Solar Consultation</h2><p><b>Name:</b> ${esc(b.name)}<br><b>Phone:</b> ${esc(b.phone)}<br><b>Email:</b> ${esc(b.email||'Not provided')}<br><b>Address:</b> ${esc(b.address)}, ${esc(b.city)} ${esc(b.zip)}<br><b>Date:</b> ${esc(b.date)}<br><b>Time:</b> ${esc(b.time)} Eastern<br><b>Notes:</b> ${esc(b.notes||'None')}<br><b>Usage graph uploaded:</b> ${bill_path?'Yes':'No'}</p>`});
  return res.status(200).json({ok:true,id:data.id});
 }catch(e){return res.status(500).json({error:'We could not schedule the appointment. Please call or text Taylor at 937-503-2737.'})}
};
function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
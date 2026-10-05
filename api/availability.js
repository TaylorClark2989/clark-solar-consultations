const { createClient } = require('@supabase/supabase-js');
module.exports=async(req,res)=>{
 if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
 const date=String(req.query.date||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({error:'Invalid date'});
 try{
  const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
  const {data,error}=await supabase.from('solar_consultations').select('appointment_time').eq('preferred_date',date);
  if(error) throw error;
  return res.status(200).json({booked:(data||[]).map(x=>String(x.appointment_time).slice(0,5))});
 }catch(e){return res.status(500).json({error:'Availability unavailable'})}
};
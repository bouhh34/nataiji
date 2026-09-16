import nodemailer from 'nodemailer';

const nativeFetch=globalThis.fetch;
const resendUrl='https://api.resend.com/emails';
let transporter=null;

function gmailConfigured(){return Boolean(process.env.GMAIL_USER&&process.env.GMAIL_APP_PASSWORD)}
function getTransporter(){
  if(!transporter){
    transporter=nodemailer.createTransport({
      host:'smtp.gmail.com',
      port:465,
      secure:true,
      auth:{
        user:String(process.env.GMAIL_USER||'').trim(),
        pass:String(process.env.GMAIL_APP_PASSWORD||'').replace(/\s+/g,'')
      }
    });
  }
  return transporter;
}

if(typeof nativeFetch==='function'){
  globalThis.fetch=async function(input,init){
    const url=typeof input==='string'?input:input?.url;
    if(url===resendUrl&&gmailConfigured()){
      try{
        const payload=JSON.parse(String(init?.body||'{}'));
        const to=Array.isArray(payload.to)?payload.to:payload.to?[payload.to]:[];
        if(!to.length)throw new Error('missing_recipient');
        const user=String(process.env.GMAIL_USER||'').trim();
        const display=String(process.env.GMAIL_FROM_NAME||'Nataiji | نتائجي').trim();
        const info=await getTransporter().sendMail({
          from:`${display} <${user}>`,
          to,
          subject:String(payload.subject||'Nataiji'),
          html:String(payload.html||''),
          text:String(payload.text||'')||undefined
        });
        return new Response(JSON.stringify({id:info.messageId||`gmail-${Date.now()}`}),{status:200,headers:{'Content-Type':'application/json'}});
      }catch(err){
        console.error(`[mail] gmail_delivery_failed code=${String(err?.code||'unknown').slice(0,80)}`);
        return new Response(JSON.stringify({error:'gmail_delivery_failed'}),{status:502,headers:{'Content-Type':'application/json'}});
      }
    }
    return nativeFetch(input,init);
  };
}

console.log(`Nataiji mail provider: ${gmailConfigured()?'gmail':'resend'}`);

import nodemailer from 'nodemailer';

const nativeFetch=globalThis.fetch;
const resendUrl='https://api.resend.com/emails';
const mailjetUrl='https://api.mailjet.com/v3.1/send';
let transporter=null;

function gmailConfigured(){return Boolean(process.env.GMAIL_USER&&process.env.GMAIL_APP_PASSWORD)}
function mailjetConfigured(){return Boolean(process.env.MAILJET_API_KEY&&process.env.MAILJET_SECRET_KEY&&process.env.MAILJET_SENDER_EMAIL)}
function selectedProvider(){
  const requested=String(process.env.MAIL_PROVIDER||'').trim().toLowerCase();
  if(requested==='mailjet'&&mailjetConfigured())return 'mailjet';
  if(requested==='gmail'&&gmailConfigured())return 'gmail';
  if(requested==='resend')return 'resend';
  if(mailjetConfigured())return 'mailjet';
  if(gmailConfigured())return 'gmail';
  return 'resend';
}
function getTransporter(){
  if(!transporter){
    transporter=nodemailer.createTransport({
      host:'smtp.gmail.com',
      port:465,
      secure:true,
      connectionTimeout:15000,
      greetingTimeout:15000,
      socketTimeout:30000,
      auth:{
        user:String(process.env.GMAIL_USER||'').trim(),
        pass:String(process.env.GMAIL_APP_PASSWORD||'').replace(/\s+/g,'')
      }
    });
  }
  return transporter;
}

async function sendViaMailjet(payload){
  const to=(Array.isArray(payload.to)?payload.to:payload.to?[payload.to]:[]).filter(Boolean);
  if(!to.length)throw new Error('missing_recipient');
  const senderEmail=String(process.env.MAILJET_SENDER_EMAIL||'').trim();
  const senderName=String(process.env.MAILJET_FROM_NAME||process.env.GMAIL_FROM_NAME||'Nataiji | نتائجي').trim();
  const token=Buffer.from(`${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`).toString('base64');
  const r=await nativeFetch(mailjetUrl,{
    method:'POST',
    headers:{Authorization:`Basic ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({Messages:[{
      From:{Email:senderEmail,Name:senderName},
      To:to.map(email=>({Email:String(email)})),
      Subject:String(payload.subject||'Nataiji'),
      HTMLPart:String(payload.html||''),
      TextPart:String(payload.text||'')||undefined
    }]})
  });
  if(!r.ok)throw Object.assign(new Error('mailjet_delivery_failed'),{code:`MAILJET_${r.status}`});
  const data=await r.json().catch(()=>({}));
  const id=data?.Messages?.[0]?.To?.[0]?.MessageID||`mailjet-${Date.now()}`;
  return new Response(JSON.stringify({id}),{status:200,headers:{'Content-Type':'application/json'}});
}

if(typeof nativeFetch==='function'){
  globalThis.fetch=async function(input,init){
    const url=typeof input==='string'?input:input?.url;
    if(url===resendUrl){
      const provider=selectedProvider();
      if(provider==='mailjet'){
        try{
          const payload=JSON.parse(String(init?.body||'{}'));
          return await sendViaMailjet(payload);
        }catch(err){
          console.error(`[mail] mailjet_delivery_failed code=${String(err?.code||'unknown').slice(0,80)}`);
          return new Response(JSON.stringify({error:'mailjet_delivery_failed'}),{status:502,headers:{'Content-Type':'application/json'}});
        }
      }
      if(provider==='gmail'){
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
    }
    return nativeFetch(input,init);
  };
}

console.log(`Nataiji mail provider: ${selectedProvider()}`);

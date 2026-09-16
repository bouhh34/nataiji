const nativeFetch=globalThis.fetch;
if(typeof nativeFetch==='function'){
  globalThis.fetch=async function(input,init){
    const url=typeof input==='string'?input:input?.url;
    if(url==='https://api.resend.com/emails'){
      const started=Date.now();
      try{
        const res=await nativeFetch(input,init);
        const clone=res.clone();
        let body='';
        try{body=await clone.text()}catch{}
        const safe=body.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[redacted-email]').slice(0,600);
        console.log(`[resend] status=${res.status} ok=${res.ok} ms=${Date.now()-started}${safe?` body=${safe}`:''}`);
        return res;
      }catch(err){
        console.error(`[resend] network_error ms=${Date.now()-started} message=${String(err?.message||err).slice(0,300)}`);
        throw err;
      }
    }
    return nativeFetch(input,init);
  };
}

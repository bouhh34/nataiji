import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {brotliCompressSync, gzipSync, constants} from 'node:zlib';

// Compress public text once at startup, never authenticated API responses.
export function staticDelivery(root) {
  const files = new Map();
  function visit(dir) {
    for (const item of fs.readdirSync(dir, {withFileTypes:true})) {
      const file = path.join(dir,item.name);
      if (item.isDirectory()) { visit(file); continue; }
      if (!item.isFile() || !/\.(?:html|js|css|svg|webmanifest)$/.test(item.name)) continue;
      const raw = fs.readFileSync(file);
      const variants = {
        identity: raw,
        gzip: gzipSync(raw),
        br: brotliCompressSync(raw, {params:{[constants.BROTLI_PARAM_QUALITY]:4}}),
      };
      const etags = Object.fromEntries(Object.entries(variants).map(([encoding,data])=>
        [encoding,'"'+crypto.createHash('sha256').update(data).digest('hex')+'"']));
      files.set('/'+path.relative(root,file).split(path.sep).join('/'), {variants,etags});
    }
  }
  visit(root);
  return (req,res,next)=>{
    if (!['GET','HEAD'].includes(req.method)) return next();
    const name = req.path === '/' ? '/index.html' : req.path;
    const entry = files.get(name);
    if (!entry || req.headers.range) return next();
    const encoding = req.acceptsEncodings('br','gzip','identity');
    res.vary('Accept-Encoding');
    if (!encoding) return res.status(406).end();
    res.type(path.extname(name));
    res.setHeader('Cache-Control', /\.html$/.test(name)||name==='/sw.js'
      ? 'no-store, no-cache, must-revalidate' : 'public, max-age=0, must-revalidate');
    res.setHeader('ETag',entry.etags[encoding]);
    if (encoding!=='identity') res.setHeader('Content-Encoding',encoding);
    if (req.fresh) return res.status(304).end();
    res.setHeader('Content-Length',entry.variants[encoding].length);
    return res.end(req.method==='HEAD' ? undefined : entry.variants[encoding]);
  };
}

import {cpSync,mkdirSync} from 'node:fs';
const out='public/vendor/student-import';mkdirSync(out,{recursive:true});
for(const [from,to] of [['tesseract.js/dist/tesseract.min.js','tesseract.min.js'],['tesseract.js/dist/worker.min.js','worker.min.js'],['pdfjs-dist/build/pdf.mjs','pdf.mjs'],['pdfjs-dist/build/pdf.worker.mjs','pdf.worker.mjs'],['pdfjs-dist/cmaps','cmaps'],['pdfjs-dist/standard_fonts','standard_fonts']])cpSync('node_modules/'+from,out+'/'+to,{recursive:true});
cpSync('node_modules/tesseract.js-core',out+'/core',{recursive:true});
for(const lang of ['ara','fra'])cpSync(`node_modules/@tesseract.js-data/${lang}/4.0.0/${lang}.traineddata.gz`,`${out}/${lang}.traineddata.gz`);

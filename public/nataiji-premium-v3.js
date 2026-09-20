(()=>{'use strict';if(window.__nataijiPremiumV3)return;window.__nataijiPremiumV3=true;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const labels={home:['الرئيسية','Accueil'],grades:['النتائج','Résultats'],students:['التلاميذ','Élèves'],reports:['التقارير','Rapports'],more:['المزيد','Plus']};
function decorate(){const nav=q('#bottomNav');if(nav)qa('button[data-view]',nav).forEach(b=>{const key=b.dataset.view,span=q('span',b);if(span&&!span.dataset.v3){span.dataset.v3='1'}});
 const h=q('header');if(h&&!q('.premium-brand-name',h)){const x=document.createElement('div');x.className='premium-brand-name';x.innerHTML='<b>Nataiji</b><small>نتائجي</small>';h.appendChild(x)}
 if(window.feather)window.feather.replace({class:'lux-feather','stroke-width':1.8});
}
const s=document.createElement('style');s.textContent='@media(max-width:760px){header .premium-brand-name{position:absolute;z-index:2;top:100px;left:50%;transform:translateX(-50%);text-align:center;color:#fff;line-height:1}header .premium-brand-name b{display:block;font-family:Georgia,serif;font-size:23px;font-weight:600;letter-spacing:.03em}header .premium-brand-name small{display:block;margin-top:5px;color:#e2bd62;font-size:12px;font-weight:800}}';document.head.appendChild(s);
new MutationObserver(()=>setTimeout(decorate,40)).observe(document.documentElement,{childList:true,subtree:true});addEventListener('DOMContentLoaded',()=>setTimeout(decorate,100));setTimeout(decorate,500);
})();
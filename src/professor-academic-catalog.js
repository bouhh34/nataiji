const SUBJECTS={
  arabic:{key:'arabic',ar:'اللغة العربية',fr:'Langue arabe'},
  french:{key:'french',ar:'اللغة الفرنسية',fr:'Français'},
  english:{key:'english',ar:'اللغة الإنجليزية',fr:'Anglais'},
  math:{key:'math',ar:'الرياضيات',fr:'Mathématiques'},
  islamic:{key:'islamic',ar:'التربية الإسلامية',fr:'Éducation islamique'},
  islamic_thought:{key:'islamic_thought',ar:'الفكر الإسلامي',fr:'Pensée islamique'},
  legislation_exegesis:{key:'legislation_exegesis',ar:'التشريع والتفسير',fr:'Législation et exégèse'},
  philosophy:{key:'philosophy',ar:'الفلسفة',fr:'Philosophie'},
  history_geo:{key:'history_geo',ar:'التاريخ والجغرافيا',fr:'Histoire-Géographie'},
  civic:{key:'civic',ar:'التربية المدنية',fr:'Éducation civique'},
  natural_sciences:{key:'natural_sciences',ar:'العلوم الطبيعية',fr:'Sciences naturelles'},
  physical_sciences:{key:'physical_sciences',ar:'العلوم الفيزيائية',fr:'Sciences physiques'},
  technology:{key:'technology',ar:'التكنولوجيا',fr:'Technologie'},
  informatics:{key:'informatics',ar:'الإعلام الآلي',fr:'Informatique'},
  eps:{key:'eps',ar:'التربية البدنية',fr:'Éducation physique et sportive'}
};

const ALIASES=new Map([
  ['العربية','arabic'],['اللغة العربية','arabic'],['arabe','arabic'],['langue arabe','arabic'],
  ['الفرنسية','french'],['اللغة الفرنسية','french'],['français','french'],['francais','french'],['langue française','french'],
  ['الإنجليزية','english'],['الانجليزية','english'],['اللغة الإنجليزية','english'],['anglais','english'],['english','english'],
  ['الرياضيات','math'],['رياضيات','math'],['mathématiques','math'],['mathematiques','math'],['maths','math'],
  ['التربية الإسلامية','islamic'],['التربية الاسلامية','islamic'],['instruction religieuse','islamic'],['éducation islamique','islamic'],
  ['الفكر الإسلامي','islamic_thought'],['الفكر الاسلامي','islamic_thought'],['pensée islamique','islamic_thought'],['pensee islamique','islamic_thought'],
  ['التشريع والتفسير','legislation_exegesis'],['التشريع و التفسير','legislation_exegesis'],['législation et exégèse','legislation_exegesis'],['legislation et exegese','legislation_exegesis'],
  ['الفلسفة','philosophy'],['philosophie','philosophy'],
  ['التاريخ والجغرافيا','history_geo'],['التاريخ و الجغرافيا','history_geo'],['histoire-géographie','history_geo'],['histoire géographie','history_geo'],
  ['التربية المدنية','civic'],['instruction civique','civic'],['éducation civique','civic'],
  ['العلوم الطبيعية','natural_sciences'],['sciences naturelles','natural_sciences'],['svt','natural_sciences'],
  ['العلوم الفيزيائية','physical_sciences'],['الفيزياء','physical_sciences'],['الفيزياء والكيمياء','physical_sciences'],['sciences physiques','physical_sciences'],['physique','physical_sciences'],['physique-chimie','physical_sciences'],
  ['التكنولوجيا','technology'],['تكنولوجيا','technology'],['technologie','technology'],
  ['الإعلام الآلي','informatics'],['المعلوماتية','informatics'],['informatique','informatics'],
  ['التربية البدنية','eps'],['الرياضة','eps'],['eps','eps'],['éducation physique','eps'],['éducation physique et sportive','eps']
]);

const BRANCHES={
  M:{code:'M',ar:'شعبة الرياضيات',fr:'Mathématiques'},
  SN:{code:'SN',ar:'شعبة العلوم الطبيعية',fr:'Sciences naturelles'},
  LM:{code:'LM',ar:'شعبة الآداب العصرية',fr:'Lettres modernes'},
  LO:{code:'LO',ar:'شعبة الآداب الأصلية',fr:'Lettres originelles'}
};

const branch=(code,expectedCoefficientTotal,subjects)=>({
  ...BRANCHES[code],expectedCoefficientTotal,subjects
});

// First cycle plus the lycée levels requested by the professor flow.
// 5AS/6AS are branch-aware: each branch carries its own subject list and coefficients.
const LEVELS=[
  {
    code:'1AS',ar:'السنة الأولى إعدادية',fr:'1re année secondaire',cycle:'first',expectedCoefficientTotal:27,
    subjects:[
      ['math',6],['arabic',5],['french',4],
      ['english',2],['islamic',2],['history_geo',2],['natural_sciences',2],
      ['civic',1],['technology',1],['informatics',1],['eps',1]
    ]
  },
  {
    code:'2AS',ar:'السنة الثانية إعدادية',fr:'2e année secondaire',cycle:'first',expectedCoefficientTotal:28,
    subjects:[
      ['math',6],['arabic',5],['french',4],
      ['english',2],['islamic',2],['history_geo',2],['natural_sciences',2],
      ['physical_sciences',1],['civic',1],['technology',1],['informatics',1],['eps',1]
    ]
  },
  {
    code:'3AS',ar:'السنة الثالثة إعدادية',fr:'3e année secondaire',cycle:'first',expectedCoefficientTotal:28,
    subjects:[
      ['math',6],['arabic',5],['french',4],
      ['english',2],['islamic',2],['history_geo',2],['natural_sciences',2],
      ['physical_sciences',1],['civic',1],['technology',1],['informatics',1],['eps',1]
    ]
  },
  {
    code:'5AS',ar:'السنة الخامسة الثانوية',fr:'5e année secondaire',cycle:'second',
    branches:[
      branch('M',30,[
        ['math',7],['physical_sciences',5],['natural_sciences',3],
        ['arabic',3],['french',2],['english',2],['philosophy',2],
        ['history_geo',2],['islamic',1],['civic',1],['informatics',1],['eps',1]
      ]),
      branch('SN',30,[
        ['natural_sciences',6],['math',4],['physical_sciences',4],
        ['arabic',3],['french',3],['english',2],['philosophy',2],
        ['history_geo',2],['islamic',1],['civic',1],['informatics',1],['eps',1]
      ]),
      branch('LM',30,[
        ['arabic',4],['french',4],['philosophy',4],['history_geo',3],['english',3],
        ['math',2],['physical_sciences',2],['natural_sciences',2],['islamic',2],
        ['informatics',2],['civic',1],['eps',1]
      ]),
      branch('LO',30,[
        ['arabic',4],['islamic_thought',4],['legislation_exegesis',4],['history_geo',3],
        ['french',2],['english',2],['philosophy',2],['math',2],
        ['physical_sciences',2],['natural_sciences',2],['civic',2],['eps',1]
      ])
    ]
  },
  {
    code:'6AS',ar:'السنة السادسة الثانوية',fr:'6e année secondaire',cycle:'second',
    branches:[
      branch('M',32,[
        ['math',8],['physical_sciences',7],['natural_sciences',3],
        ['arabic',3],['french',2],['english',2],['philosophy',2],
        ['history_geo',2],['islamic',1],['civic',1],['eps',1]
      ]),
      branch('SN',30,[
        ['natural_sciences',6],['physical_sciences',6],['math',4],
        ['arabic',3],['french',2],['english',2],['philosophy',2],
        ['history_geo',2],['islamic',1],['civic',1],['eps',1]
      ]),
      branch('LM',30,[
        ['arabic',5],['philosophy',5],['french',4],['history_geo',3],['english',3],
        ['math',2],['natural_sciences',2],['islamic',2],['physical_sciences',1],
        ['informatics',1],['civic',1],['eps',1]
      ]),
      branch('LO',30,[
        ['legislation_exegesis',6],['arabic',5],['islamic_thought',4],['history_geo',3],
        ['french',2],['philosophy',2],['math',2],['civic',2],['english',1],
        ['physical_sciences',1],['natural_sciences',1],['eps',1]
      ])
    ]
  }
];

export const PROFESSOR_CATALOG_VERSION='MR-SECONDARY-2026-V3';

function levelFor(code){
  return LEVELS.find(x=>x.code===String(code||'').toUpperCase())||null;
}
function branchFor(level,branchCode){
  if(!level||!Array.isArray(level.branches)||!level.branches.length)return null;
  return level.branches.find(x=>x.code===String(branchCode||'').toUpperCase())||null;
}
function materializeSubject([key,coefficient]){
  return {...SUBJECTS[key],coefficient,official:coefficient!=null};
}
function subjectPairsFor(level,branchCode=''){
  if(!level)return[];
  const b=branchFor(level,branchCode);
  if(Array.isArray(level.branches)&&level.branches.length)return b?.subjects||[];
  return level.subjects||[];
}

export function normalizeProfessorSubjectKey(value){
  const raw=String(value||'').trim();
  if(!raw)return'';
  if(SUBJECTS[raw])return raw;
  return ALIASES.get(raw.toLowerCase())||ALIASES.get(raw)||'';
}

export function inferProfessorLevelCode(name){
  const s=String(name||'').toUpperCase().replace(/\s+/g,'');
  const m=s.match(/(?:^|[^0-9])([12356])AS(?:$|[^A-Z0-9])/i)||s.match(/^([12356])AS/i);
  return m?m[1]+'AS':'';
}

export function professorCatalog(){
  return {
    version:PROFESSOR_CATALOG_VERSION,
    levels:LEVELS.map(level=>({
      code:level.code,ar:level.ar,fr:level.fr,cycle:level.cycle,
      expectedCoefficientTotal:level.expectedCoefficientTotal??null,
      subjects:(level.subjects||[]).map(materializeSubject),
      branches:(level.branches||[]).map(b=>({
        code:b.code,ar:b.ar,fr:b.fr,expectedCoefficientTotal:b.expectedCoefficientTotal,
        subjects:(b.subjects||[]).map(materializeSubject)
      }))
    }))
  };
}

export function professorSubjectFor(levelCode,subjectKeyOrName,branchCode=''){
  const level=levelFor(levelCode);
  if(!level)return null;
  const key=normalizeProfessorSubjectKey(subjectKeyOrName);
  if(!key)return null;
  const pair=subjectPairsFor(level,branchCode).find(x=>x[0]===key);
  if(!pair)return null;
  return {...SUBJECTS[key],coefficient:pair[1],official:pair[1]!=null};
}

export function officialProfessorCoefficient(levelCode,subjectKeyOrName,branchCode=''){
  const subject=professorSubjectFor(levelCode,subjectKeyOrName,branchCode);
  return subject?.official?Number(subject.coefficient):null;
}

export function professorSubjectLabel(subjectKeyOrName,lang='ar'){
  const key=normalizeProfessorSubjectKey(subjectKeyOrName);
  return key&&SUBJECTS[key]?SUBJECTS[key][lang==='fr'?'fr':'ar']:String(subjectKeyOrName||'');
}

export function expectedProfessorCoefficientTotal(levelCode,branchCode=''){
  const level=levelFor(levelCode);
  if(!level)return null;
  const b=branchFor(level,branchCode);
  const total=b?.expectedCoefficientTotal??level.expectedCoefficientTotal;
  return Number.isFinite(Number(total))?Number(total):null;
}

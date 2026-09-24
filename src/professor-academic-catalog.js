const SUBJECTS={
  arabic:{key:'arabic',abbr:'AR',ar:'اللغة العربية',fr:'Langue arabe'},
  french:{key:'french',abbr:'FR',ar:'اللغة الفرنسية',fr:'Français'},
  english:{key:'english',abbr:'ANG',ar:'اللغة الإنجليزية',fr:'Anglais'},
  math:{key:'math',abbr:'MATS',ar:'الرياضيات',fr:'Mathématiques'},
  islamic:{key:'islamic',abbr:'IR',ar:'التربية الإسلامية',fr:'Éducation islamique'},
  islamic_thought:{key:'islamic_thought',abbr:'IR',ar:'الفكر الإسلامي',fr:'Pensée islamique'},
  legislation_exegesis:{key:'legislation_exegesis',abbr:'LEG',ar:'التشريع والتفسير',fr:'Législation et exégèse'},
  philosophy:{key:'philosophy',abbr:'PH',ar:'الفلسفة',fr:'Philosophie'},
  history_geo:{key:'history_geo',abbr:'HG',ar:'التاريخ والجغرافيا',fr:'Histoire-Géographie'},
  civic:{key:'civic',abbr:'IC',ar:'التربية المدنية',fr:'Éducation civique'},
  natural_sciences:{key:'natural_sciences',abbr:'SN',ar:'العلوم الطبيعية',fr:'Sciences naturelles'},
  physical_sciences:{key:'physical_sciences',abbr:'PC',ar:'الفيزياء والكيمياء',fr:'Physique-Chimie'},
  technology_informatics:{key:'technology_informatics',abbr:'TI',ar:'التكنولوجيا والمعلوماتية',fr:'Technologie et informatique'},
  technology:{key:'technology',abbr:'TECH',ar:'التكنولوجيا',fr:'Technologie'},
  informatics:{key:'informatics',abbr:'INFO',ar:'الإعلام الآلي',fr:'Informatique'},
  eps:{key:'eps',abbr:'EPS',ar:'التربية البدنية',fr:'Éducation physique et sportive'}
};

const ALIASES=new Map([
  ['العربية','arabic'],['اللغة العربية','arabic'],['arabe','arabic'],['langue arabe','arabic'],
  ['الفرنسية','french'],['اللغة الفرنسية','french'],['français','french'],['francais','french'],['langue française','french'],
  ['الإنجليزية','english'],['الانجليزية','english'],['اللغة الإنجليزية','english'],['anglais','english'],['english','english'],
  ['الرياضيات','math'],['رياضيات','math'],['mathématiques','math'],['mathematiques','math'],['maths','math'],
  ['التربية الإسلامية','islamic'],['التربية الاسلامية','islamic'],['instruction religieuse','islamic'],['éducation islamique','islamic'],
  ['الفكر الإسلامي','islamic_thought'],['الفكر الاسلامي','islamic_thought'],['pensée islamique','islamic_thought'],['pensee islamique','islamic_thought'],
  ['التشريع','legislation_exegesis'],['التشريع والتفسير','legislation_exegesis'],['التشريع و التفسير','legislation_exegesis'],['législation','legislation_exegesis'],['legislation','legislation_exegesis'],['législation et exégèse','legislation_exegesis'],['legislation et exegese','legislation_exegesis'],
  ['الفلسفة','philosophy'],['philosophie','philosophy'],
  ['التاريخ والجغرافيا','history_geo'],['التاريخ و الجغرافيا','history_geo'],['histoire-géographie','history_geo'],['histoire géographie','history_geo'],
  ['التربية المدنية','civic'],['instruction civique','civic'],['éducation civique','civic'],
  ['العلوم الطبيعية','natural_sciences'],['sciences naturelles','natural_sciences'],['svt','natural_sciences'],
  ['العلوم الفيزيائية','physical_sciences'],['الفيزياء','physical_sciences'],['الفيزياء والكيمياء','physical_sciences'],['sciences physiques','physical_sciences'],['physique','physical_sciences'],['physique-chimie','physical_sciences'],['physique chimie','physical_sciences'],
  ['التكنولوجيا والمعلوماتية','technology_informatics'],['التكنولوجيا و المعلوماتية','technology_informatics'],['technologie et informatique','technology_informatics'],['technologie-informatique','technology_informatics'],
  ['التكنولوجيا','technology'],['تكنولوجيا','technology'],['technologie','technology'],
  ['الإعلام الآلي','informatics'],['المعلوماتية','informatics'],['informatique','informatics'],
  ['التربية البدنية','eps'],['الرياضة','eps'],['eps','eps'],['éducation physique','eps'],['éducation physique et sportive','eps']
]);

const BRANCHES={
  A:{code:'A',ar:'شعبة الآداب العصرية',fr:'Lettres modernes'},
  C:{code:'C',ar:'شعبة الرياضيات',fr:'Mathématiques'},
  D:{code:'D',ar:'شعبة العلوم الطبيعية',fr:'Sciences naturelles'},
  O:{code:'O',ar:'شعبة الآداب الأصلية',fr:'Lettres originelles'}
};
const BRANCH_ALIASES={M:'C',SN:'D',LM:'A',LO:'O',A:'A',C:'C',D:'D',O:'O'};

const branch=(code,expectedCoefficientTotal,subjects)=>({
  ...BRANCHES[code],expectedCoefficientTotal,subjects
});

// Official references supplied for the professor flow:
// - 1AS–3AS: current three-year collège table.
// - 5AS–7AS: official secondary timetable/coefficient table (sections A/C/D/O).
const LEVELS=[
  {
    code:'1AS',ar:'السنة الأولى إعدادية',fr:'1re année secondaire',cycle:'first',expectedCoefficientTotal:27,
    subjects:[
      ['islamic',3],['arabic',5],['french',4],['english',2],['history_geo',1],['civic',1],
      ['math',6],['natural_sciences',2],['technology_informatics',2],['eps',1]
    ]
  },
  {
    code:'2AS',ar:'السنة الثانية إعدادية',fr:'2e année secondaire',cycle:'first',expectedCoefficientTotal:28,
    subjects:[
      ['islamic',3],['arabic',5],['french',4],['english',2],['history_geo',1],['civic',1],
      ['math',6],['natural_sciences',2],['physical_sciences',1],['technology_informatics',2],['eps',1]
    ]
  },
  {
    code:'3AS',ar:'السنة الثالثة إعدادية',fr:'3e année secondaire',cycle:'first',expectedCoefficientTotal:28,
    subjects:[
      ['islamic',3],['arabic',5],['french',4],['english',2],['history_geo',1],['civic',1],
      ['math',6],['natural_sciences',2],['physical_sciences',1],['technology_informatics',2],['eps',1]
    ]
  },
  {
    code:'5AS',ar:'السنة الخامسة الثانوية',fr:'5e année secondaire',cycle:'second',
    branches:[
      branch('A',29,[
        ['arabic',5],['french',5],['english',3],['philosophy',2],['islamic',2],['civic',1],
        ['math',2],['physical_sciences',2],['natural_sciences',2],['history_geo',4],['eps',1]
      ]),
      branch('C',30,[
        ['arabic',3],['french',3],['english',2],['philosophy',2],['islamic',2],['civic',1],
        ['math',6],['physical_sciences',5],['natural_sciences',3],['history_geo',2],['eps',1]
      ]),
      branch('D',30,[
        ['arabic',3],['french',3],['english',2],['philosophy',2],['islamic',2],['civic',1],
        ['math',4],['physical_sciences',4],['natural_sciences',6],['history_geo',2],['eps',1]
      ]),
      branch('O',30,[
        ['arabic',5],['french',2],['english',2],['philosophy',3],['islamic',3],['civic',1],
        ['math',2],['physical_sciences',2],['natural_sciences',2],['history_geo',3],['legislation_exegesis',4],['eps',1]
      ])
    ]
  },
  {
    code:'6AS',ar:'السنة السادسة الثانوية',fr:'6e année secondaire',cycle:'second',
    branches:[
      branch('A',30,[
        ['arabic',5],['french',5],['english',3],['philosophy',4],['islamic',2],['civic',1],
        ['math',2],['physical_sciences',1],['natural_sciences',2],['history_geo',4],['eps',1]
      ]),
      branch('C',30,[
        ['arabic',2],['french',2],['english',2],['philosophy',2],['islamic',2],['civic',1],
        ['math',7],['physical_sciences',6],['natural_sciences',3],['history_geo',2],['eps',1]
      ]),
      branch('D',30,[
        ['arabic',2],['french',2],['english',2],['philosophy',2],['islamic',2],['civic',1],
        ['math',4],['physical_sciences',6],['natural_sciences',6],['history_geo',2],['eps',1]
      ]),
      branch('O',30,[
        ['arabic',6],['french',2],['english',1],['philosophy',3],['islamic',3],['civic',1],
        ['math',2],['physical_sciences',1],['natural_sciences',1],['history_geo',3],['legislation_exegesis',6],['eps',1]
      ])
    ]
  },
  {
    code:'7AS',ar:'السنة السابعة الثانوية',fr:'7e année secondaire',cycle:'second',
    branches:[
      branch('A',30,[
        ['arabic',6],['french',6],['english',4],['philosophy',5],['islamic',2],
        ['math',2],['history_geo',4],['eps',1]
      ]),
      branch('C',30,[
        ['arabic',3],['french',3],['english',2],['islamic',2],
        ['math',8],['physical_sciences',7],['natural_sciences',4],['eps',1]
      ]),
      branch('D',30,[
        ['arabic',2],['french',2],['english',2],['islamic',2],
        ['math',6],['physical_sciences',7],['natural_sciences',8],['eps',1]
      ]),
      branch('O',30,[
        ['arabic',6],['french',2],['philosophy',4],['islamic',4],
        ['math',2],['natural_sciences',2],['history_geo',3],['legislation_exegesis',6],['eps',1]
      ])
    ]
  }
];

export const PROFESSOR_CATALOG_VERSION='MR-SECONDARY-OFFICIAL-2026-V4';

function levelFor(code){
  return LEVELS.find(x=>x.code===String(code||'').toUpperCase())||null;
}
export function normalizeProfessorBranchCode(value){
  return BRANCH_ALIASES[String(value||'').trim().toUpperCase()]||String(value||'').trim().toUpperCase();
}
function branchFor(level,branchCode){
  if(!level||!Array.isArray(level.branches)||!level.branches.length)return null;
  const code=normalizeProfessorBranchCode(branchCode);
  return level.branches.find(x=>x.code===code)||null;
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
  const m=s.match(/(?:^|[^0-9])([123567])AS(?:$|[^A-Z0-9])/i)||s.match(/^([123567])AS/i);
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

export function professorSubjectAbbreviation(levelCode,subjectKeyOrName,branchCode=''){
  return professorSubjectFor(levelCode,subjectKeyOrName,branchCode)?.abbr||SUBJECTS[normalizeProfessorSubjectKey(subjectKeyOrName)]?.abbr||'';
}

export function expectedProfessorCoefficientTotal(levelCode,branchCode=''){
  const level=levelFor(levelCode);
  if(!level)return null;
  const b=branchFor(level,branchCode);
  const total=b?.expectedCoefficientTotal??level.expectedCoefficientTotal;
  return Number.isFinite(Number(total))?Number(total):null;
}

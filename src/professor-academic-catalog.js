const SUBJECTS={
  arabic:{key:'arabic',ar:'اللغة العربية',fr:'Langue arabe'},
  french:{key:'french',ar:'اللغة الفرنسية',fr:'Français'},
  english:{key:'english',ar:'اللغة الإنجليزية',fr:'Anglais'},
  math:{key:'math',ar:'الرياضيات',fr:'Mathématiques'},
  islamic:{key:'islamic',ar:'التربية الإسلامية',fr:'Éducation islamique'},
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
  ['التاريخ والجغرافيا','history_geo'],['التاريخ و الجغرافيا','history_geo'],['histoire-géographie','history_geo'],['histoire géographie','history_geo'],
  ['التربية المدنية','civic'],['instruction civique','civic'],['éducation civique','civic'],
  ['العلوم الطبيعية','natural_sciences'],['sciences naturelles','natural_sciences'],['svt','natural_sciences'],
  ['العلوم الفيزيائية','physical_sciences'],['الفيزياء','physical_sciences'],['sciences physiques','physical_sciences'],['physique','physical_sciences'],
  ['التكنولوجيا','technology'],['تكنولوجيا','technology'],['technologie','technology'],
  ['الإعلام الآلي','informatics'],['المعلوماتية','informatics'],['informatique','informatics'],
  ['التربية البدنية','eps'],['الرياضة','eps'],['eps','eps'],['éducation physique','eps'],['éducation physique et sportive','eps']
]);

// 2025 first-cycle curriculum. Only coefficients directly confirmed in current
// curriculum material are locked here; the remaining subjects stay selectable
// with a manual coefficient until their current official coefficient is verified.
const LEVELS=[
  {
    code:'1AS',ar:'السنة الأولى إعدادية',fr:'1re année secondaire',cycle:'first',
    subjects:[
      ['math',6],['arabic',5],['french',4],['english',2],['history_geo',2],['eps',1],
      ['islamic',null],['natural_sciences',null],['civic',null],['technology',null],['informatics',null],['physical_sciences',null]
    ]
  },
  {
    code:'2AS',ar:'السنة الثانية إعدادية',fr:'2e année secondaire',cycle:'first',
    subjects:[
      ['math',6],['english',2],['arabic',null],['french',null],['islamic',null],['history_geo',null],
      ['natural_sciences',null],['physical_sciences',null],['civic',null],['technology',null],['informatics',null],['eps',null]
    ]
  },
  {
    code:'3AS',ar:'السنة الثالثة إعدادية',fr:'3e année secondaire',cycle:'first',
    subjects:[
      ['math',6],['english',2],['arabic',null],['french',null],['islamic',null],['history_geo',null],
      ['natural_sciences',null],['physical_sciences',null],['civic',null],['technology',null],['informatics',null],['eps',null]
    ]
  }
];

export const PROFESSOR_CATALOG_VERSION='MR-SECONDARY-2025-V1';

export function normalizeProfessorSubjectKey(value){
  const raw=String(value||'').trim();
  if(!raw)return'';
  if(SUBJECTS[raw])return raw;
  return ALIASES.get(raw.toLowerCase())||ALIASES.get(raw)||'';
}

export function inferProfessorLevelCode(name){
  const s=String(name||'').toUpperCase().replace(/\s+/g,'');
  const m=s.match(/(?:^|[^0-9])([123])AS(?:$|[^A-Z0-9])/i)||s.match(/^([123])AS/i);
  return m?m[1]+'AS':'';
}

export function professorCatalog(){
  return {
    version:PROFESSOR_CATALOG_VERSION,
    levels:LEVELS.map(level=>({
      code:level.code,ar:level.ar,fr:level.fr,cycle:level.cycle,branches:[],
      subjects:level.subjects.map(([key,coefficient])=>({...SUBJECTS[key],coefficient,official:coefficient!=null}))
    }))
  };
}

export function professorSubjectFor(levelCode,subjectKeyOrName){
  const level=LEVELS.find(x=>x.code===String(levelCode||'').toUpperCase());
  if(!level)return null;
  const key=normalizeProfessorSubjectKey(subjectKeyOrName);
  if(!key)return null;
  const pair=level.subjects.find(x=>x[0]===key);
  if(!pair)return null;
  return {...SUBJECTS[key],coefficient:pair[1],official:pair[1]!=null};
}

export function officialProfessorCoefficient(levelCode,subjectKeyOrName){
  const subject=professorSubjectFor(levelCode,subjectKeyOrName);
  return subject?.official?Number(subject.coefficient):null;
}

export function professorSubjectLabel(subjectKeyOrName,lang='ar'){
  const key=normalizeProfessorSubjectKey(subjectKeyOrName);
  return key&&SUBJECTS[key]?SUBJECTS[key][lang==='fr'?'fr':'ar']:String(subjectKeyOrName||'');
}

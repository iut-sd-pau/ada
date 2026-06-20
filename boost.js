/* ================================================================
   FLASH BRAIN - boost.js  (v4)
   Avatars SVG · Collection & Deck · Boutique · Competitions
   Notifications · Couche sociale Firebase REELLE (amis/DM/echanges)
   Charge APRES engine.js sur chaque page.
================================================================ */

/* ============================================================
   A) AVATAR  -  pieces + rendu SVG en couches
   cost=0 -> gratuit ; sinon prix + monnaie ('coin'|'gem')
   req    -> grade minimum requis (avantage de grade), optionnel
============================================================ */
const AV_SKINS=[
  {id:'sk1',c:'#ffdbb0',cost:0},{id:'sk2',c:'#f1c27d',cost:0},{id:'sk3',c:'#c68642',cost:0},
  {id:'sk4',c:'#8d5524',cost:0},{id:'sk5',c:'#6d4030',cost:0},
  {id:'sk6',c:'#a0e8ff',cost:40,cur:'coin'},{id:'sk7',c:'#caa6ff',cost:40,cur:'coin'},
  {id:'sk8',c:'#7CFC9B',cost:60,cur:'coin'},{id:'sk9',c:'#ff9bb0',cost:60,cur:'coin'},
  {id:'sk12',c:'#b0f0d8',cost:60,cur:'coin'},{id:'sk13',c:'#ffc7e0',cost:60,cur:'coin'},
  {id:'sk14',c:'#9fd0ff',cost:80,cur:'coin'},{id:'sk15',c:'#d6b3ff',cost:80,cur:'coin'},
  {id:'sk10',c:'#cfd8ff',cost:8,cur:'gem'},{id:'sk11',c:'#ffd166',cost:12,cur:'gem',req:'as'},
  {id:'sk16',c:'#7CFCD0',cost:14,cur:'gem'},{id:'sk17',c:'#ff7b7b',cost:14,cur:'gem'},
  {id:'sk18',c:'#c0c0ff',cost:20,cur:'gem',req:'champion'},{id:'sk19',c:'#ffe08a',cost:30,cur:'gem',req:'legende'},
];
const AV_FACES=[{id:'fa1',cost:0},{id:'fa2',cost:0},{id:'fa3',cost:0},{id:'fa4',cost:30,cur:'coin'}]; // round / square / oval / diamant
const AV_EYES=[
  {id:'ey1',cost:0},{id:'ey2',cost:0},{id:'ey3',cost:30,cur:'coin'}/*shades*/,
  {id:'ey4',cost:50,cur:'coin'}/*star*/,{id:'ey5',cost:30,cur:'coin'}/*wink*/,
  {id:'ey8',cost:40,cur:'coin'}/*angry*/,{id:'ey9',cost:40,cur:'coin'}/*sleepy*/,
  {id:'ey6',cost:10,cur:'gem'}/*glow*/,{id:'ey7',cost:18,cur:'gem',req:'champion'}/*laser*/,
  {id:'ey10',cost:12,cur:'gem'}/*heart*/,{id:'ey11',cost:22,cur:'gem',req:'mythe'}/*rainbow*/,
];
const AV_HAIR=[
  {id:'ha0',cost:0},{id:'ha1',cost:0},{id:'ha2',cost:0},{id:'ha3',cost:40,cur:'coin'},
  {id:'ha4',cost:60,cur:'coin'},{id:'ha5',cost:60,cur:'coin'},{id:'ha6',cost:80,cur:'coin'},
  {id:'ha8',cost:70,cur:'coin'}/*mohawk*/,{id:'ha9',cost:70,cur:'coin'}/*long*/,
  {id:'ha7',cost:14,cur:'gem'}/*flame*/,{id:'ha10',cost:18,cur:'gem'}/*ice*/,
  {id:'ha11',cost:26,cur:'gem',req:'legende'}/*galaxy*/,
];
const AV_HAIRCOLORS=['#3a2a20','#0d0d0d','#a8631f','#e0c068','#ff4b00','#00e5ff','#a855f7','#ff5fa2','#06d6a0','#ffffff','#3b82f6','#ef476f','#7CFC9B','#ffd166'];
const AV_HATS=[
  {id:'no',cost:0},{id:'h1',cost:50,cur:'coin'}/*cap*/,{id:'h6',cost:50,cur:'coin'}/*beanie*/,
  {id:'h3',cost:90,cur:'coin'}/*headset*/,{id:'h8',cost:70,cur:'coin'}/*bandana*/,
  {id:'h9',cost:80,cur:'coin'}/*cap arriere*/,{id:'h10',cost:90,cur:'coin'}/*casque*/,
  {id:'h2',cost:25,cur:'gem',req:'legende'}/*crown*/,{id:'h4',cost:16,cur:'gem'}/*halo*/,
  {id:'h5',cost:16,cur:'gem'}/*horns*/,{id:'h7',cost:20,cur:'gem',req:'maitre'}/*wizard*/,
  {id:'h11',cost:22,cur:'gem'}/*cyber visor*/,{id:'h12',cost:40,cur:'gem',req:'mythe'}/*couronne royale*/,
];
const AV_AURAS=[
  {id:'au0',cost:0},{id:'au1',c:'#00e5ff',cost:0},{id:'au2',c:'#a855f7',cost:60,cur:'coin'},
  {id:'au3',c:'#ffd166',cost:90,cur:'coin',req:'elite'},{id:'au4',c:'#ff4b00',cost:15,cur:'gem'},
  {id:'au5',c:'rainbow',cost:30,cur:'gem',req:'champion'},{id:'au6',c:'#06d6a0',cost:12,cur:'gem'},
  {id:'au7',c:'#ff5fa2',cost:14,cur:'gem'},{id:'au8',c:'#3b82f6',cost:14,cur:'gem'},
  {id:'au9',c:'gold',cost:45,cur:'gem',req:'legende'}/*aura doree pulsee*/,
];
const AV_OUTFITS=['#00e5ff','#a855f7','#ff4b00','#06d6a0','#ffd166','#ef476f','#3b82f6','#94a3b8','#0d0d0d','#ffffff','#7CFC9B','#ff5fa2','#f59e0b','#8b5cf6','#10b981','#e11d48'];

const AVATAR_CATS={skin:AV_SKINS,face:AV_FACES,eyes:AV_EYES,hair:AV_HAIR,hat:AV_HATS,aura:AV_AURAS};

/* ---- generation procedurale d'accessoires (teintes) pour atteindre 500+ ----
   On AJOUTE seulement (on ne renomme/supprime jamais d'id existant), donc les
   objets deja achetes par les joueurs restent valides. */
function _hslHex(h,s,l){
  s/=100;l/=100;const k=n=>(n+h/30)%12;const a=s*Math.min(l,1-l);
  const f=n=>{const c=l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));return Math.round(255*c).toString(16).padStart(2,'0');};
  return '#'+f(0)+f(8)+f(4);
}
(function _genAvatarExtras(){
  // teintes de peau supplementaires (fantaisie) : ~210 nouvelles
  for(let i=0;i<210;i++){
    const h=Math.round((i*137.508)%360), s=45+(i%5)*11, l=42+(i%6)*7;
    const c=_hslHex(h,s,l);
    let cost,cur,req;
    if(i<14){cost=40+ (i%4)*15;cur='coin';}
    else if(i<150){cost=60+ (i%6)*15;cur='coin';}
    else {cost=8+(i%12);cur='gem'; if(i>=195)req='legende'; else if(i>=175)req='champion';}
    AV_SKINS.push({id:'sk_g'+i,c,cost,cur,...(req?{req}:{})});
  }
  // auras colorees supplementaires : ~235 nouvelles
  for(let i=0;i<235;i++){
    const h=Math.round((i*99.7+40)%360), s=70+(i%4)*8, l=52+(i%4)*6;
    const c=_hslHex(h,s,l);
    let cost,cur,req;
    if(i<120){cost=70+ (i%6)*15;cur='coin';}
    else {cost=10+(i%14);cur='gem'; if(i>=185)req='mythe'; else if(i>=160)req='elite';}
    AV_AURAS.push({id:'au_g'+i,c,cost,cur,...(req?{req}:{})});
  }
})();
/* nombre total d'accessoires (info) */
function avatarItemCount(){return AV_SKINS.length+AV_FACES.length+AV_EYES.length+AV_HAIR.length+AV_HATS.length+AV_AURAS.length;}
/* tire un accessoire payant aleatoire NON encore possede (pour les gains d'arcade) */
function randomLockedAvatarItem(p){
  p=p||loadProfile();const owned=p.ownedItems||[];const pool=[];
  for(const cat of ['skin','aura','eyes','hair','hat']){
    (AVATAR_CATS[cat]||[]).forEach(it=>{ if(it.cost && !it.req && !owned.includes(cat+':'+it.id)) pool.push({cat,id:it.id}); });
  }
  if(!pool.length)return null;
  return pool[Math.floor(Math.random()*pool.length)];
}
function grantAvatarItem(cat,id){
  const p=loadProfile();p.ownedItems=p.ownedItems||[];const key=cat+':'+id;
  if(!p.ownedItems.includes(key)){p.ownedItems.push(key);saveProfile(p);return true;}
  return false;
}
function avPart(cat,id){return (AVATAR_CATS[cat]||[]).find(x=>x.id===id);}
function skinColor(id){return (AV_SKINS.find(s=>s.id===id)||AV_SKINS[1]).c;}

/* item possede ? (gratuit = toujours possede). Accepte un id OU l'objet item. */
function ownsItem(p,cat,idOrObj){
  const it=(idOrObj&&typeof idOrObj==='object')?idOrObj:avPart(cat,idOrObj);
  if(!it)return true;
  if(!it.cost)return true;
  const id=it.id;
  return (p.ownedItems||[]).includes(cat+':'+id);
}
function itemUnlockedByRank(p,it){if(!it||!it.req)return true;return getRankIndex(getRank(p.xp).id)>=getRankIndex(it.req);}

/* --- RENDU SVG --- */
function renderAvatar(av,size){
  av={...DEFAULT_AVATAR,...(av||{})};size=size||96;
  const sk=skinColor(av.skin), out=av.outfit||'#00e5ff', hc=av.hairColor||'#3a2a20';
  let bg='';
  const auraDef=AV_AURAS.find(a=>a.id===av.aura);
  if(auraDef&&auraDef.id!=='au0'){
    if(auraDef.c==='rainbow'){
      bg='<defs><radialGradient id="rb"><stop offset="55%" stop-color="transparent"/><stop offset="75%" stop-color="#ff4b00" stop-opacity=".5"/><stop offset="85%" stop-color="#ffd166" stop-opacity=".5"/><stop offset="92%" stop-color="#06d6a0" stop-opacity=".5"/><stop offset="100%" stop-color="#a855f7" stop-opacity=".5"/></radialGradient></defs><circle cx="50" cy="50" r="49" fill="url(#rb)"/>';
    } else if(auraDef.id==='au4'){
      bg='<circle cx="50" cy="50" r="47" fill="none" stroke="#ff4b00" stroke-width="3" opacity=".5"/><circle cx="50" cy="50" r="43" fill="none" stroke="#ffd166" stroke-width="2" opacity=".4"/>';
    } else if(auraDef.c==='gold'){
      bg='<defs><radialGradient id="gd"><stop offset="60%" stop-color="transparent"/><stop offset="100%" stop-color="#ffd166" stop-opacity=".55"/></radialGradient></defs><circle cx="50" cy="50" r="49" fill="url(#gd)"/><circle cx="50" cy="50" r="47" fill="none" stroke="#ffd166" stroke-width="2.5" opacity=".7"/>';
    } else { bg='<circle cx="50" cy="50" r="48" fill="'+auraDef.c+'" opacity=".18"/><circle cx="50" cy="50" r="48" fill="none" stroke="'+auraDef.c+'" stroke-width="2" opacity=".5"/>'; }
  }
  // buste / tenue
  let body='<path d="M22 100 Q22 74 50 74 Q78 74 78 100 Z" fill="'+out+'"/><path d="M40 76 h20 v8 a10 10 0 0 1 -20 0 Z" fill="'+sk+'"/>';
  // tete (face shape)
  let head;
  if(av.face==='fa2') head='<rect x="30" y="26" width="40" height="44" rx="12" fill="'+sk+'"/>';
  else if(av.face==='fa3') head='<ellipse cx="50" cy="48" rx="19" ry="24" fill="'+sk+'"/>';
  else if(av.face==='fa4') head='<path d="M50 24 L70 48 L50 72 L30 48 Z" fill="'+sk+'"/>';
  else head='<circle cx="50" cy="46" r="21" fill="'+sk+'"/>';
  // oreilles
  head+='<circle cx="29" cy="48" r="4" fill="'+sk+'"/><circle cx="71" cy="48" r="4" fill="'+sk+'"/>';
  // yeux
  let eyes;
  switch(av.eyes){
    case 'ey2': eyes='<path d="M40 47 q4 -5 8 0" stroke="#1a1a2a" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M52 47 q4 -5 8 0" stroke="#1a1a2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>';break;
    case 'ey3': eyes='<rect x="36" y="42" width="28" height="9" rx="4" fill="#0d0d0d"/><rect x="38" y="44" width="9" height="5" rx="2" fill="#00e5ff" opacity=".7"/><rect x="53" y="44" width="9" height="5" rx="2" fill="#00e5ff" opacity=".7"/>';break;
    case 'ey4': eyes='<text x="40" y="50" font-size="9">⭐</text><text x="54" y="50" font-size="9">⭐</text>';break;
    case 'ey5': eyes='<circle cx="44" cy="46" r="2.6" fill="#1a1a2a"/><path d="M52 46 q4 -3 8 0" stroke="#1a1a2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>';break;
    case 'ey6': eyes='<circle cx="44" cy="46" r="3.4" fill="#00e5ff"/><circle cx="56" cy="46" r="3.4" fill="#00e5ff"/><circle cx="44" cy="46" r="6" fill="#00e5ff" opacity=".3"/><circle cx="56" cy="46" r="6" fill="#00e5ff" opacity=".3"/>';break;
    case 'ey7': eyes='<rect x="40" y="44" width="6" height="4" fill="#ff2d55"/><rect x="54" y="44" width="6" height="4" fill="#ff2d55"/><rect x="46" y="45.5" width="8" height="1.5" fill="#ff2d55" opacity=".6"/>';break;
    case 'ey8': eyes='<path d="M40 43 l8 3" stroke="#1a1a2a" stroke-width="2.4" stroke-linecap="round"/><path d="M60 43 l-8 3" stroke="#1a1a2a" stroke-width="2.4" stroke-linecap="round"/><circle cx="44" cy="47" r="2.6" fill="#1a1a2a"/><circle cx="56" cy="47" r="2.6" fill="#1a1a2a"/>';break;
    case 'ey9': eyes='<path d="M40 47 q4 3 8 0" stroke="#1a1a2a" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M52 47 q4 3 8 0" stroke="#1a1a2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>';break;
    case 'ey10': eyes='<text x="39.5" y="50" font-size="9">❤️</text><text x="53.5" y="50" font-size="9">❤️</text>';break;
    case 'ey11': eyes='<circle cx="44" cy="46" r="3.4" fill="#a855f7"/><circle cx="56" cy="46" r="3.4" fill="#06d6a0"/><circle cx="44" cy="46" r="6" fill="#ff5fa2" opacity=".25"/><circle cx="56" cy="46" r="6" fill="#ffd166" opacity=".25"/>';break;
    default: eyes='<circle cx="44" cy="46" r="2.8" fill="#1a1a2a"/><circle cx="56" cy="46" r="2.8" fill="#1a1a2a"/>';
  }
  eyes+='<path d="M44 56 q6 5 12 0" stroke="#1a1a2a" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>';
  // cheveux
  let hair='';
  switch(av.hair){
    case 'ha1': hair='<path d="M29 44 Q30 22 50 22 Q70 22 71 44 Q66 32 50 31 Q34 32 29 44 Z" fill="'+hc+'"/>';break;
    case 'ha2': hair='<path d="M30 42 L34 24 L40 36 L46 22 L52 36 L58 23 L64 37 L70 42 Q60 30 50 30 Q40 30 30 42 Z" fill="'+hc+'"/>';break;
    case 'ha3': hair='<path d="M28 60 Q24 26 50 24 Q76 26 72 60 L72 44 Q70 32 50 31 Q30 32 28 44 Z" fill="'+hc+'"/>';break;
    case 'ha4': hair='<path d="M44 20 h12 v24 h-12 Z" fill="'+hc+'"/><path d="M44 20 q6 -6 12 0 v6 h-12 Z" fill="'+hc+'"/>';break;
    case 'ha5': hair='<circle cx="50" cy="32" r="20" fill="'+hc+'"/><circle cx="34" cy="40" r="9" fill="'+hc+'"/><circle cx="66" cy="40" r="9" fill="'+hc+'"/>';break;
    case 'ha6': hair='<path d="M29 44 Q30 24 50 24 Q70 24 71 44 Q66 32 50 31 Q34 32 29 44 Z" fill="'+hc+'"/><path d="M70 34 q14 6 8 26 q-6 -4 -10 -18 Z" fill="'+hc+'"/>';break;
    case 'ha7': hair='<path d="M30 42 L34 24 L40 36 L46 22 L52 36 L58 23 L64 37 L70 42 Q60 30 50 30 Q40 30 30 42 Z" fill="#ff4b00"/><path d="M38 30 L44 18 L50 30 Z" fill="#ffd166" opacity=".9"/>';break;
    case 'ha8': hair='<path d="M44 12 q6 8 6 32 q0 -24 6 -32 Z" fill="'+hc+'"/><rect x="46" y="14" width="8" height="20" fill="'+hc+'"/>';break;
    case 'ha9': hair='<path d="M27 46 Q26 24 50 24 Q74 24 73 46 L73 70 Q70 56 70 44 Q68 32 50 31 Q32 32 30 44 Q30 56 27 70 Z" fill="'+hc+'"/>';break;
    case 'ha10': hair='<path d="M29 44 Q30 22 50 22 Q70 22 71 44 Q66 32 50 31 Q34 32 29 44 Z" fill="#9fe9ff"/><path d="M34 30 l3 -8 l3 8 Z M60 30 l3 -8 l3 8 Z" fill="#e0f7ff"/>';break;
    case 'ha11': hair='<path d="M29 44 Q30 22 50 22 Q70 22 71 44 Q66 32 50 31 Q34 32 29 44 Z" fill="#3b1d6e"/><circle cx="40" cy="32" r="1.4" fill="#fff"/><circle cx="52" cy="28" r="1.6" fill="#ffd166"/><circle cx="60" cy="34" r="1.2" fill="#7CFC9B"/><circle cx="46" cy="36" r="1" fill="#ff5fa2"/>';break;
    case 'ha0': default: hair='';
  }
  // chapeau / accessoire
  let hat='';
  switch(av.hat){
    case 'h1': hat='<path d="M28 38 Q30 22 50 22 Q70 22 72 38 Z" fill="#ef476f"/><path d="M50 38 h26 q2 0 2 4 h-28 Z" fill="#d23a5e"/>';break;
    case 'h6': hat='<path d="M28 40 Q30 24 50 24 Q70 24 72 40 Z" fill="#3b82f6"/><rect x="27" y="38" width="46" height="6" rx="3" fill="#2563eb"/>';break;
    case 'h3': hat='<path d="M27 46 a23 23 0 0 1 46 0" fill="none" stroke="#222" stroke-width="4"/><rect x="22" y="44" width="8" height="14" rx="4" fill="#00e5ff"/><rect x="70" y="44" width="8" height="14" rx="4" fill="#00e5ff"/>';break;
    case 'h8': hat='<path d="M28 36 Q50 28 72 36 L70 42 Q50 36 30 42 Z" fill="#ff4b00"/><path d="M70 38 l8 4 l-7 2 Z" fill="#ff4b00"/>';break;
    case 'h2': hat='<path d="M34 28 L40 16 L50 26 L60 16 L66 28 Z" fill="#ffd166" stroke="#e0a800" stroke-width="1"/><circle cx="40" cy="16" r="2.2" fill="#ef476f"/><circle cx="50" cy="24" r="2.2" fill="#06d6a0"/><circle cx="60" cy="16" r="2.2" fill="#3b82f6"/>';break;
    case 'h4': hat='<ellipse cx="50" cy="18" rx="16" ry="4" fill="none" stroke="#ffd166" stroke-width="3"/>';break;
    case 'h5': hat='<path d="M34 30 Q28 14 36 18 Q38 26 42 30 Z" fill="#ef476f"/><path d="M66 30 Q72 14 64 18 Q62 26 58 30 Z" fill="#ef476f"/>';break;
    case 'h7': hat='<path d="M30 36 Q50 -6 70 36 Z" fill="#a855f7"/><path d="M28 36 h44 q2 0 2 4 h-48 Z" fill="#7c3aed"/><text x="46" y="22" font-size="8">✦</text>';break;
    case 'h9': hat='<path d="M28 40 Q30 24 50 24 Q70 24 72 40 Z" fill="#10b981"/><path d="M24 40 h12 q2 0 2 4 h-16 Z" fill="#059669"/>';break;
    case 'h10': hat='<path d="M27 44 a23 23 0 0 1 46 0 v4 h-46 Z" fill="#475569"/><rect x="46" y="20" width="8" height="10" rx="2" fill="#94a3b8"/><circle cx="50" cy="18" r="3" fill="#00e5ff"/>';break;
    case 'h11': hat='<rect x="30" y="40" width="40" height="9" rx="4" fill="#0d0d0d"/><rect x="33" y="42" width="34" height="5" rx="2" fill="#00e5ff" opacity=".8"/><rect x="28" y="40" width="6" height="9" rx="2" fill="#1f2937"/><rect x="66" y="40" width="6" height="9" rx="2" fill="#1f2937"/>';break;
    case 'h12': hat='<path d="M32 28 L38 14 L46 24 L50 12 L54 24 L62 14 L68 28 Z" fill="#ffd166" stroke="#e0a800" stroke-width="1.2"/><rect x="32" y="28" width="36" height="5" rx="2" fill="#e0a800"/><circle cx="50" cy="20" r="2.4" fill="#ef476f"/><circle cx="40" cy="20" r="2" fill="#3b82f6"/><circle cx="60" cy="20" r="2" fill="#06d6a0"/>';break;
  }
  return '<svg viewBox="0 0 100 100" width="'+size+'" height="'+size+'" xmlns="http://www.w3.org/2000/svg">'+bg+body+head+hair+eyes+hat+'</svg>';
}

/* ============================================================
   B) COLLECTION  -  ~1000 cartes generees, 7 raretes
   Raretes (de la plus commune a la plus rare) :
     commun · peu_commun · rare · tres_rare · epique · legendaire · dore
   w = poids de TIRAGE (probabilite, normalisee). Plus c'est haut,
   plus c'est frequent. Le dore ("secret/doré") est extremement rare.
   bonus.type : coin | xp | joker | luck  (coin/xp/luck = fraction)
============================================================ */
const RARITY={
  commun:     {c:'#9aa7bd', w:5200, lbl:'C',  fr:'Commun',     en:'Common'},
  peu_commun: {c:'#46d39a', w:1750, lbl:'PC', fr:'Peu commun', en:'Uncommon'},
  rare:       {c:'#3b82f6', w:560,  lbl:'R',  fr:'Rare',       en:'Rare'},
  tres_rare:  {c:'#a855f7', w:150,  lbl:'TR', fr:'Tres rare',  en:'Very rare'},
  epique:     {c:'#ec4899', w:46,   lbl:'E',  fr:'Epique',     en:'Epic'},
  legendaire: {c:'#ffd166', w:13,   lbl:'L',  fr:'Legendaire', en:'Legendary'},
  dore:       {c:'#ffb200', w:3,    lbl:'★',  fr:'Dore',       en:'Golden'},
};
const RARITY_ORDER=['commun','peu_commun','rare','tres_rare','epique','legendaire','dore'];

/* ---- generateur deterministe de cartes (ids stables c0001..c1000) ---- */
const _CARD_COUNTS={commun:360,peu_commun:255,rare:180,tres_rare:110,epique:57,legendaire:28,dore:10}; // = 1000
const _CARD_EMOJI=['🧠','⚡','🔊','👾','🌀','🔬','✴️','⚛️','🔐','🌌','⏱️','🪞','🔋','🕊️','🖤','🧬','👻','🗿','💫','🔮','🔥','👑','🌑','🌟','🦊','🐉','🦅','🐺','🦁','🐯','🦈','🐙','🦂','🕷️','🦋','🐝','🦄','🐲','🦖','🦕','🌶️','🍀','🍁','🌊','🌪️','🌈','☄️','🪐','🌙','☀️','⭐','💎','🔱','⚔️','🛡️','🏹','🗡️','💥','✨','💠','🔆','🌠','🪽','👁️','🦾','🤖','👽','🛸','🎆','🎇','🧿','📿','💀','☠️','🃏','♠️','♥️','♦️','♣️','🎲','🧩','🎯','🏆','🥇','🌐','🧊','❄️','🔥','💧','🌋','⛰️','🌫️','🪨','🌿','🍄','🦷','🧪','⚗️','🔭','📡','🛰️','🦠','🪬','🪄','🔥','⚜️','🛟'];
const _CARD_PRE=['Synap','Vol','Echo','Pix','Gli','Nan','Veg','Quar','Ciph','Aur','Temp','Mir','Sera','Onyx','Hel','Spec','Tit','Nov','Orac','Phoe','Zen','Ecl','Gen','Kry','Zar','Lum','Umb','Cryo','Pyr','Hydro','Aer','Geo','Astro','Neo','Xeno','Hyper','Mega','Ultra','Proto','Vortex','Flux','Pulse','Quanta','Stell','Nebul','Cosm','Drak','Wyr','Fenr','Hely','Sol','Lun','Terra','Vita','Mort','Bell','Vela','Cael','Ferro','Volt','Ampe','Ohm','Tesl','Mu','Sig','Del','Omeg','Alph','Bet','Gam','Zet','Eta','Iot','Kap','Nyx','Hex','Aki','Ryu','Kaze','Hoshi','Tora','Kumo','Yami','Hikari'];
const _CARD_SUF=['tron','rax','ion','ex','os','ar','is','um','yx','or','el','an','ix','us','en','al','ius','eon','aris','oth','yr','esh','ako','une','ova','ema','aze','ito','aku','ron','dyr','vex','zor','quil','wing','claw','fang','core','byte','wave','storm','blade','born','fall','rise','light','dusk','dawn','void','star','flare','frost','ember','shade','spark','pulse','gale','tide','stone','root','flame'];

const RANK_BONUS={ // (min,max) du bonus passif selon la rarete + type joker
  commun:[.01,.02], peu_commun:[.02,.03], rare:[.03,.05], tres_rare:[.05,.07],
  epique:[.07,.09], legendaire:[.10,.13], dore:[.15,.22]
};
function _seedRand(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
function _genCharacters(){
  const out=[]; const rnd=_seedRand(20260619); let n=1;
  const usedNames=new Set();
  RARITY_ORDER.forEach(rar=>{
    const count=_CARD_COUNTS[rar]; const [lo,hi]=RANK_BONUS[rar];
    for(let i=0;i<count;i++){
      const id='c'+String(n++).padStart(4,'0');
      // nom unique
      let name;
      do{ name=_CARD_PRE[Math.floor(rnd()*_CARD_PRE.length)]+_CARD_SUF[Math.floor(rnd()*_CARD_SUF.length)]; }
      while(usedNames.has(name) && usedNames.size<_CARD_PRE.length*_CARD_SUF.length);
      usedNames.add(name);
      name=name.charAt(0).toUpperCase()+name.slice(1);
      const emoji=_CARD_EMOJI[Math.floor(rnd()*_CARD_EMOJI.length)];
      const rIdx=RARITY_ORDER.indexOf(rar);
      // 6 types de pouvoirs repartis -> beaucoup moins de redondance
      // coin, xp, luck (fractions) ; time (secondes) ; gem (gemmes/partie) ; joker (rare+)
      let type;
      const roll=rnd();
      if(rIdx>=2 && roll<0.10) type='joker';
      else if(roll<0.24) type='coin';
      else if(roll<0.42) type='xp';
      else if(roll<0.60) type='luck';
      else if(roll<0.80) type='time';
      else type='gem';
      let val;
      if(type==='joker') val=(rIdx>=4?2:1);
      else if(type==='time') val=[1,1,2,2,3,3,4][rIdx]||1;          // +secondes de reflexion
      else if(type==='gem')  val=[1,1,2,2,3,3,4][rIdx]||1;          // +gemmes par partie
      else val=Math.round((lo+rnd()*(hi-lo))*1000)/1000;           // coin/xp/luck
      out.push({id,name,emoji,rarity:rar,bonus:{type,val}});
    }
  });
  return out;
}
const CHARACTERS=_genCharacters();
const CARD_BY_ID={}; CHARACTERS.forEach(c=>CARD_BY_ID[c.id]=c);
function cardById(id){return CARD_BY_ID[id];}
function rarMeta(r){return RARITY[r]||RARITY.commun;}
function rarLabelFull(r){const m=rarMeta(r);return (typeof getLang==='function'&&getLang()==='en')?m.en:m.fr;}

function cardBonus(p,type){p=p||loadProfile();let s=0;(p.deck||[]).forEach(id=>{const c=cardById(id);if(c&&c.bonus.type===type&&(type==='coin'||type==='xp'||type==='time'||type==='gem'))s+=c.bonus.val;});return s;}
function deckTime(p){return cardBonus(p,'time');}   // secondes de reflexion en plus
function deckGem(p){return cardBonus(p,'gem');}     // gemmes par partie en plus
function deckLuck(p){p=p||loadProfile();let s=0;(p.deck||[]).forEach(id=>{const c=cardById(id);if(c&&c.bonus.type==='luck')s+=c.bonus.val;});return s;}
function deckJokerStart(p){p=p||loadProfile();let s=0;(p.deck||[]).forEach(id=>{const c=cardById(id);if(c&&c.bonus.type==='joker')s+=c.bonus.val;});return s;}
function collectionCount(p){p=p||loadProfile();return Object.keys(p.collection||{}).filter(k=>p.collection[k]>0).length;}
function ownedCopies(p,id){p=p||loadProfile();return (p.collection||{})[id]||0;}
function grantCard(id){const p=loadProfile();p.collection=p.collection||{};const isNew=!p.collection[id];p.collection[id]=(p.collection[id]||0)+1;saveProfile(p);return isNew;}

/* chance totale de tomber sur du rare+ = chance des cartes (deck) + grade */
function totalLuck(p){p=p||loadProfile();let l=deckLuck(p);if(typeof rankLuck==='function')l+=rankLuck(p);return l;}

/* tirage de rarete : luck deplace le poids vers les raretes superieures.
   Volontairement TRES dur pour le haut du tableau. */
function rollRarity(luck){
  luck=luck||0;
  const mult={commun:1-Math.min(.45,luck*1.2), peu_commun:1+luck*.3, rare:1+luck*1.5,
    tres_rare:1+luck*3, epique:1+luck*5, legendaire:1+luck*8, dore:1+luck*12};
  const w={}; let tot=0;
  RARITY_ORDER.forEach(r=>{ w[r]=RARITY[r].w*(mult[r]||1); tot+=w[r]; });
  let x=Math.random()*tot;
  for(let i=RARITY_ORDER.length-1;i>=0;i--){const r=RARITY_ORDER[i];if(x<w[r])return r;x-=w[r];}
  return 'commun';
}
function openPack(n,luck){
  n=n||3; if(luck==null)luck=totalLuck();
  const out=[];
  const prof=loadProfile();const coll=prof.collection||{};
  for(let i=0;i<n;i++){
    const rar=rollRarity(luck);
    const pool=CHARACTERS.filter(c=>c.rarity===rar);
    let card;
    // sur les raretes basses : 45% du temps, on retombe sur une carte DEJA possedee
    // (de cette rarete) -> cree des doublons recyclables, sans bloquer la collection
    if((rar==='commun'||rar==='peu_commun')&&Math.random()<0.45){
      const owned=pool.filter(c=>(coll[c.id]||0)>0);
      if(owned.length)card=owned[Math.floor(Math.random()*owned.length)];
    }
    if(!card)card=pool[Math.floor(Math.random()*pool.length)];
    const isNew=grantCard(card.id);
    if(isNew)coll[card.id]=1;else coll[card.id]=(coll[card.id]||0)+1;
    out.push({id:card.id,isNew});
  }
  const p=loadProfile();p.packsOpened=(p.packsOpened||0)+1;saveProfile(p);
  return out;
}

/* RECYCLAGE des doublons -> pieces + gemmes (autre source de gemmes).
   On garde 1 exemplaire de chaque carte ; chaque copie en trop rapporte
   selon la rarete. */
const _RECYCLE={commun:{coin:3,gem:0},peu_commun:{coin:6,gem:0},rare:{coin:12,gem:0},
  tres_rare:{coin:25,gem:1},epique:{coin:50,gem:2},legendaire:{coin:120,gem:5},dore:{coin:300,gem:12}};
function countDuplicates(p){p=p||loadProfile();let n=0;Object.keys(p.collection||{}).forEach(id=>{const c=p.collection[id]||0;if(c>1)n+=c-1;});return n;}
function recycleDuplicates(){
  const p=loadProfile();let coins=0,gems=0,recycled=0;
  Object.keys(p.collection||{}).forEach(id=>{
    const c=cardById(id); if(!c)return; const have=p.collection[id]||0;
    if(have>1){ const extra=have-1; const r=_RECYCLE[c.rarity]||_RECYCLE.commun;
      coins+=r.coin*extra; gems+=r.gem*extra; recycled+=extra; p.collection[id]=1; }
  });
  if(recycled){ p.coins=(p.coins||0)+coins; p.gems=(p.gems||0)+gems; saveProfile(p); }
  return {coins,gems,recycled};
}

/* ============================================================
   C) BOUTIQUE
============================================================ */
const SHOP_ITEMS={
  packs:[
    {id:'pack0',n:'Mini Pack',d:'1 carte',cards:1,cost:50,cur:'coin',emoji:'🎴'},
    {id:'pack1',n:'Pack Standard',d:'3 cartes',cards:3,cost:140,cur:'coin',emoji:'📦'},
    {id:'pack1b',n:'Gros Pack',d:'5 cartes',cards:5,cost:230,cur:'coin',emoji:'📦'},
    {id:'pack_xl',n:'Pack Geant',d:'12 cartes',cards:12,cost:520,cur:'coin',emoji:'📚'},
    {id:'pack2',n:'Pack Premium',d:'5 cartes · meilleures chances',cards:5,cost:25,cur:'gem',emoji:'🎁',luck:.18},
    {id:'pack3',n:'Pack Legende',d:'5 cartes · chance epique++',cards:5,cost:60,cur:'gem',emoji:'💠',luck:.45},
    {id:'pack4',n:'Pack Mythique',d:'8 cartes · chance legendaire++',cards:8,cost:120,cur:'gem',emoji:'🌌',luck:.8},
    {id:'pack_diam',n:'Pack Diamant',d:'15 cartes · legendaire/dore++',cards:15,cost:320,cur:'gem',emoji:'💎',luck:1.0},
    {id:'pack5',n:'Coffre Doré',d:'10 cartes · vise le doré ★',cards:10,cost:220,cur:'gem',emoji:'🏆',luck:1.4},
  ],
  boosters:[
    {id:'jk_skip',n:'Joker Passer x3',cost:90,cur:'coin',emoji:'⏭️',give:{joker:'skip',n:3}},
    {id:'jk_skip5',n:'Joker Passer x5',cost:140,cur:'coin',emoji:'⏭️',give:{joker:'skip',n:5}},
    {id:'jk_time',n:'Joker +5s x3',cost:70,cur:'coin',emoji:'⏱️',give:{joker:'time',n:3}},
    {id:'jk_hint',n:'Joker Indice x3',cost:60,cur:'coin',emoji:'💡',give:{joker:'hint',n:3}},
    {id:'jk_hint5',n:'Joker Indice x5',cost:100,cur:'coin',emoji:'💡',give:{joker:'hint',n:5}},
    {id:'jk_mega',n:'Pack Jokers x9',d:'3 de chaque',cost:18,cur:'gem',emoji:'🃏',give:{jokerAll:3}},
    {id:'jk_ultra',n:'Pack Jokers x15',d:'5 de chaque',cost:32,cur:'gem',emoji:'🎰',give:{jokerAll:5}},
    {id:'coins_s',n:'Sac de 250 pieces',cost:10,cur:'gem',emoji:'🪙',give:{coins:250}},
    {id:'coins_l',n:'Coffre de 700 pieces',cost:25,cur:'gem',emoji:'💰',give:{coins:700}},
    {id:'coins_xl',n:'Tresor de 1500 pieces',cost:45,cur:'gem',emoji:'💰',give:{coins:1500}},
  ],
  gems:[
    {id:'g1',n:'10 gemmes',cost:320,cur:'coin',emoji:'💎',give:{gems:10}},
    {id:'g2',n:'25 gemmes',cost:700,cur:'coin',emoji:'💎',give:{gems:25}},
    {id:'g3',n:'60 gemmes',cost:1500,cur:'coin',emoji:'💎',give:{gems:60}},
    {id:'g4',n:'150 gemmes',cost:3400,cur:'coin',emoji:'👑',give:{gems:150}},
    {id:'g5',n:'400 gemmes',cost:7000,cur:'coin',emoji:'👑',give:{gems:400}},
  ],
};

/* ============================================================
   D) COMPETITIONS MONDIALES (planifiees 2027 -> 2031)
============================================================ */
const COMPETITIONS=[
  {id:'cup2027a',name:'Open d\'Hiver',date:'2027-01-15',tier:'Bronze',reward:50,emoji:'❄️'},
  {id:'cup2027b',name:'Grand Prix de Printemps',date:'2027-04-12',tier:'Argent',reward:80,emoji:'🌸'},
  {id:'cup2027c',name:'Championnat d\'Ete',date:'2027-07-20',tier:'Or',reward:120,emoji:'☀️'},
  {id:'cup2027d',name:'Mondial d\'Automne',date:'2027-10-18',tier:'Or',reward:140,emoji:'🍂'},
  {id:'cup2028a',name:'Coupe des Nations',date:'2028-03-09',tier:'Platine',reward:200,emoji:'🌍'},
  {id:'cup2028b',name:'Tournoi des Maitres',date:'2028-09-14',tier:'Platine',reward:240,emoji:'🛡️'},
  {id:'cup2029a',name:'Ligue des Legendes Mentales',date:'2029-05-22',tier:'Diamant',reward:350,emoji:'💠'},
  {id:'cup2030a',name:'Mondial Anniversaire',date:'2030-06-18',tier:'Mythe',reward:500,emoji:'🎉'},
  {id:'cup2031a',name:'Grand Chelem Cerebral',date:'2031-08-08',tier:'Mythe',reward:600,emoji:'🏆'},
];
function compStatus(c){
  const now=Date.now(),d=new Date(c.date).getTime();
  if(now<d-86400000)return 'upcoming';
  if(now<=d+86400000)return 'live';
  return 'ended';
}

/* ============================================================
   E) NOTIFICATIONS (local + alimentees par la couche sociale)
============================================================ */
function _notifs(){try{return JSON.parse(localStorage.getItem('fb_notifs')||'[]');}catch{return[];}}
/* suivi des DM deja vus : { otherUid: dernierTsNotifie } */
let _openDM=null;
function _dmSeen(){try{return JSON.parse(localStorage.getItem('fb_dm_seen')||'{}');}catch{return{};}}
function _saveDmSeen(o){try{localStorage.setItem('fb_dm_seen',JSON.stringify(o||{}));}catch{}}
function _saveNotifs(a){try{localStorage.setItem('fb_notifs',JSON.stringify(a.slice(0,60)));}catch{}}
function addNotif(type,data){
  const a=_notifs();
  const key=type+'|'+JSON.stringify(data||{});
  if(a.find(n=>n.key===key&&Date.now()-n.ts<60000))return; // anti-doublon
  a.unshift({id:'n'+Date.now()+Math.random().toString(36).slice(2,5),key,type,data:data||{},ts:Date.now(),read:false});
  _saveNotifs(a);updateBells();
}
function getNotifs(){return _notifs();}
function unreadCount(){return _notifs().filter(n=>!n.read).length;}
function markAllRead(){const a=_notifs();a.forEach(n=>n.read=true);_saveNotifs(a);updateBells();}
function clearNotifs(){_saveNotifs([]);updateBells();}
function notifText(n){
  const d=n.data||{};
  switch(n.type){
    case 'friend_req':return '👤 '+(d.pseudo||'?')+' veut t\'ajouter en ami';
    case 'friend_acc':return '✅ '+(d.pseudo||'?')+' a accepte ta demande';
    case 'dm':return '💬 '+(d.pseudo||'?')+' : '+(d.msg||'').slice(0,40);
    case 'trade':return '🔄 Echange propose par '+(d.pseudo||'?');
    case 'trade_done':return '🔄 Echange avec '+(d.pseudo||'?')+' termine';
    case 'rankup':return '🎖️ Nouveau grade : '+t('rank_'+d.rank);
    case 'comp':return '🏆 Inscription : '+(d.name||'competition');
    default:return d.msg||'Notification';
  }
}
/* cloche : injecte un bouton avec pastille dans #bellSlot s'il existe */
function mountBell(){
  document.querySelectorAll('[data-bell]').forEach(slot=>{
    if(slot.dataset.mounted)return;slot.dataset.mounted='1';
    const b=document.createElement('button');b.className='bellbtn';b.innerHTML='🔔<span class="bdot" style="display:none"></span>';
    b.onclick=()=>{SFX&&SFX.navigate&&SFX.navigate();location.href='notifications.html';};
    slot.appendChild(b);
  });
  updateBells();
}
function updateBells(){
  const n=unreadCount();
  document.querySelectorAll('.bellbtn .bdot').forEach(d=>{
    if(n>0){d.style.display='flex';d.textContent=n>9?'9+':n;}else d.style.display='none';
  });
}

/* ============================================================
   F) COUCHE SOCIALE FIREBASE  (amis / demandes / DM / echanges)
   Tout est REEL via la Realtime Database. Sans config -> degrade
   proprement (ok=false, jamais de faux joueurs).
   Modele :
     users/{uid}     : {pseudo,pseudoLower,xp,rank,avatar,lastSeen}
     friends/{uid}/{fid} : {pseudo,since}
     requests/{uid}/{fromUid} : {pseudo,ts}
     dm/{thread}/{push} : {from,name,msg,ts}
     trades/{uid}/{push}: {fromUid,fromPseudo,give:[ids],status,ts}
============================================================ */
const Social={
  ok(){return typeof fbReady==='function'&&fbReady();},
  configured(){return typeof fbConfigured==='function'&&fbConfigured();},

  async publishMe(){
    if(!this.ok())return;
    const p=loadProfile();if(!p.pseudo)return;
    try{await _db.ref('users/'+myUid()).update({
      pseudo:p.pseudo,pseudoLower:p.pseudo.toLowerCase(),xp:p.xp,rank:getRank(p.xp).id,
      avatar:p.avatar||DEFAULT_AVATAR,lastSeen:Date.now()
    });}catch(e){}
  },

  async findUser(pseudo){
    if(!this.ok()||!pseudo)return null;
    try{
      const s=await _db.ref('users').orderByChild('pseudoLower').equalTo(pseudo.trim().toLowerCase()).limitToFirst(1).once('value');
      const d=s.val();if(!d)return null;
      const uid=Object.keys(d)[0];return {uid,...d[uid]};
    }catch(e){return null;}
  },

  async sendRequest(pseudo){
    if(!this.ok())return {ok:false,err:'nodb'};
    const u=await this.findUser(pseudo);
    if(!u)return {ok:false,err:'notfound'};
    if(u.uid===myUid())return {ok:false,err:'self'};
    const friends=await this.friendsOnce();
    if(friends[u.uid])return {ok:false,err:'already'};
    const me=loadProfile();
    try{await _db.ref('requests/'+u.uid+'/'+myUid()).set({pseudo:me.pseudo,ts:Date.now()});
      return {ok:true,pseudo:u.pseudo};}catch(e){return {ok:false,err:'exc'};}
  },

  listenRequests(cb){
    if(!this.ok())return;
    _db.ref('requests/'+myUid()).on('value',s=>{const d=s.val()||{};
      Object.entries(d).forEach(([uid,r])=>addNotif('friend_req',{uid,pseudo:r.pseudo}));
      cb&&cb(Object.entries(d).map(([uid,r])=>({uid,...r})));
    });
  },
  async requestsOnce(){if(!this.ok())return [];try{const d=(await _db.ref('requests/'+myUid()).once('value')).val()||{};return Object.entries(d).map(([uid,r])=>({uid,...r}));}catch{return[];}},

  async accept(fromUid,fromPseudo){
    if(!this.ok())return false;const me=loadProfile();
    try{
      await _db.ref('friends/'+myUid()+'/'+fromUid).set({pseudo:fromPseudo,since:Date.now()});
      await _db.ref('friends/'+fromUid+'/'+myUid()).set({pseudo:me.pseudo,since:Date.now()});
      await _db.ref('requests/'+myUid()+'/'+fromUid).remove();
      addNotif('friend_acc',{pseudo:fromPseudo});
      return true;
    }catch(e){return false;}
  },
  async decline(fromUid){if(!this.ok())return;try{await _db.ref('requests/'+myUid()+'/'+fromUid).remove();}catch{}},

  listenFriends(cb){if(!this.ok()){cb&&cb([]);return;}_db.ref('friends/'+myUid()).on('value',async s=>{
    const d=s.val()||{};const list=Object.entries(d).map(([uid,r])=>({uid,...r}));
    // enrichir avec presence/xp
    for(const f of list){try{const u=(await _db.ref('users/'+f.uid).once('value')).val();if(u){f.xp=u.xp;f.rank=u.rank;f.avatar=u.avatar;f.lastSeen=u.lastSeen;}}catch{}}
    cb&&cb(list);
  });},
  async friendsOnce(){if(!this.ok())return {};try{return (await _db.ref('friends/'+myUid()).once('value')).val()||{};}catch{return{};}},
  async removeFriend(uid){if(!this.ok())return;try{await _db.ref('friends/'+myUid()+'/'+uid).remove();await _db.ref('friends/'+uid+'/'+myUid()).remove();}catch{}},

  thread(a,b){return [a,b].sort().join('__');},
  async sendDM(toUid,msg){
    if(!this.ok())return;msg=(msg||'').trim().slice(0,300);if(!msg)return;
    const me=loadProfile();const ts=Date.now();
    try{
      await _db.ref('dm/'+this.thread(myUid(),toUid)).push({from:myUid(),name:me.pseudo,msg,ts});
      // pointeur dans la boite de reception de l'autre -> sert a generer la notif "DM recu"
      await _db.ref('inbox/'+toUid+'/'+myUid()).set({from:myUid(),name:me.pseudo,msg,ts});
    }catch{}
  },
  listenDM(otherUid,cb){if(!this.ok()){cb&&cb([]);return ()=>{};}
    const ref=_db.ref('dm/'+this.thread(myUid(),otherUid)).limitToLast(80);
    const h=ref.on('value',s=>{const d=s.val()||{};cb&&cb(Object.values(d).sort((a,b)=>a.ts-b.ts));});
    return ()=>{try{ref.off('value',h);}catch{}};
  },
  /* notifie l'autre d'un nouveau DM (poll global) */
  listenInbox(){
    if(!this.ok())return;
    // demandes
    this.listenRequests();
    // echanges entrants
    _db.ref('trades/'+myUid()).on('child_added',s=>{const tr=s.val();if(tr&&tr.status==='pending')addNotif('trade',{pseudo:tr.fromPseudo,id:s.key});});
    // ---- DM recus ----
    _db.ref('inbox/'+myUid()).on('value',s=>{
      const d=s.val()||{};
      const seen=_dmSeen();let changed=false;
      Object.entries(d).forEach(([fromUid,m])=>{
        if(!m||!m.ts)return;
        if((seen[fromUid]||0) < m.ts){
          // ne pas notifier la discussion actuellement ouverte
          if(_openDM!==fromUid){addNotif('dm',{uid:fromUid,pseudo:m.name||'?',msg:m.msg||'',ts:m.ts});}
          seen[fromUid]=m.ts;changed=true;
        }
      });
      if(changed)_saveDmSeen(seen);
    });
  },
  /* marque la discussion avec otherUid comme lue (appele a l'ouverture du chat) */
  markDMRead(otherUid){
    if(!otherUid)return;_openDM=otherUid;
    const seen=_dmSeen();seen[otherUid]=Date.now();_saveDmSeen(seen);
    try{ if(this.ok()) _db.ref('inbox/'+myUid()+'/'+otherUid).remove(); }catch{}
  },
  /* a appeler quand on quitte une discussion */
  closeDM(){_openDM=null;},

  /* ECHANGE de cartes : reel via Firebase comme bus de messages.
     L'initiateur propose 'give' (cartes qu'il donne) contre 'want'.
     A l'acceptation, chaque cote applique l'echange a SA collection locale. */
  async proposeTrade(toUid,give,want){
    if(!this.ok())return {ok:false,err:'nodb'};
    const me=loadProfile();
    // verifier qu'on possede bien les cartes 'give'
    for(const id of give){if((me.collection[id]||0)<1)return {ok:false,err:'missing'};}
    try{await _db.ref('trades/'+toUid).push({fromUid:myUid(),fromPseudo:me.pseudo,give,want:want||[],status:'pending',ts:Date.now()});
      return {ok:true};}catch(e){return {ok:false,err:'exc'};}
  },
  async tradesOnce(){if(!this.ok())return [];try{const d=(await _db.ref('trades/'+myUid()).once('value')).val()||{};return Object.entries(d).map(([k,v])=>({key:k,...v}));}catch{return[];}},
  async acceptTrade(tr){
    if(!this.ok())return false;
    const me=loadProfile();
    // je dois posseder les 'want'
    for(const id of (tr.want||[])){if((me.collection[id]||0)<1)return false;}
    // j'applique : je perds 'want', je recois 'give'
    (tr.want||[]).forEach(id=>{me.collection[id]=Math.max(0,(me.collection[id]||0)-1);});
    (tr.give||[]).forEach(id=>{me.collection[id]=(me.collection[id]||0)+1;});
    me.tradesDone=(me.tradesDone||0)+1;saveProfile(me);
    try{
      // signaler a l'initiateur d'appliquer l'inverse
      await _db.ref('tradeResults/'+tr.fromUid).push({byPseudo:me.pseudo,give:tr.give,want:tr.want||[],ts:Date.now()});
      await _db.ref('trades/'+myUid()+'/'+tr.key).remove();
    }catch{}
    addNotif('trade_done',{pseudo:tr.fromPseudo});
    return true;
  },
  async declineTrade(tr){if(!this.ok())return;try{await _db.ref('trades/'+myUid()+'/'+tr.key).remove();}catch{}},
  /* l'initiateur applique l'inverse quand l'autre a accepte */
  listenTradeResults(){
    if(!this.ok())return;
    _db.ref('tradeResults/'+myUid()).on('child_added',async s=>{
      const r=s.val();if(!r)return;const me=loadProfile();
      (r.give||[]).forEach(id=>{me.collection[id]=Math.max(0,(me.collection[id]||0)-1);}); // j'avais donne
      (r.want||[]).forEach(id=>{me.collection[id]=(me.collection[id]||0)+1;});             // je recois
      me.tradesDone=(me.tradesDone||0)+1;saveProfile(me);
      addNotif('trade_done',{pseudo:r.byPseudo});
      try{await _db.ref('tradeResults/'+myUid()+'/'+s.key).remove();}catch{}
    });
  },
};

/* publie mon profil + ecoute la boite de reception sur chaque page */
document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>{ try{ if(Social.ok()){Social.publishMe();Social.listenInbox();Social.listenTradeResults();} }catch(e){} },800);
  mountBell();
});

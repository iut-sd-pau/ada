/* ================================================================
   FLASH BRAIN - engine.js  (v3)
   Firebase reel - Lobby - Partie synchronisee (hote-arbitre)
   Chat - Amis - Pieces - XP - Rangs - Profil - Narrateur - Succes
================================================================ */

/* ============================================================
   1) CONFIG FIREBASE
   ------------------------------------------------------------
   POUR JOUER EN LIGNE (entre vrais joueurs), tu DOIS coller ici
   la config de TON projet Firebase (gratuit). Voir LISEZMOI.txt.
   Tant que c'est "VOTRE_...", les modes Solo/Local/Defi marchent
   hors-ligne, mais l'Arene en ligne affichera "a configurer".
============================================================ */
const FB_CFG = {
  apiKey: "AIzaSyC3ZVhgcPTPX-_rAwTHtuyQd_gztmedY2w",
  authDomain: "flashbrain-cf41b.firebaseapp.com",
  databaseURL: "https://flashbrain-cf41b-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "flashbrain-cf41b",
  storageBucket: "flashbrain-cf41b.firebasestorage.app",
  messagingSenderId: "930556461435",
  appId: "1:930556461435:web:6ca739ff45b44a1536fdde",
  measurementId: "G-B29S6KM11T"
};

let _db=null, _fbOk=false, _isLocal=false;
/* fbReady    : un backend (Firebase OU LocalDB) est disponible
   fbConfigured : compatibilite -> vrai des qu'un backend est dispo
   fbReal     : Firebase reel configure (multi-appareils a distance)
   fbIsLocal  : on tourne sur le backend local (meme appareil/onglets) */
function fbReady(){ return _fbOk; }
function fbReal(){ return FB_CFG.apiKey && FB_CFG.apiKey.indexOf('VOTRE_')!==0; }
function fbIsLocal(){ return _isLocal; }
function fbConfigured(){ return _fbOk; }

function _initFB(){
  if(_fbOk)return;
  // 1) Firebase reel si configure
  if(fbReal()){
    try{
      if(typeof firebase!=='undefined'){
        if(!firebase.apps.length)firebase.initializeApp(FB_CFG);
        _db=firebase.database();_fbOk=true;_isLocal=false;return;
      }
    }catch(e){console.warn('[FB]',e.message);}
  }
  // 2) Repli LOCAL (zero config) : chat + salles + amis + multi sur le
  //    meme appareil / entre onglets, sans rien installer.
  try{
    if(typeof LocalDB!=='undefined'){ _db=LocalDB;_fbOk=true;_isLocal=true; }
  }catch(e){console.warn('[LocalDB]',e&&e.message);}
}

/* ============================================================
   2) IDENTITE STABLE (uid persistant par appareil)
============================================================ */
function myUid(){
  let u=localStorage.getItem('fb_uid');
  if(!u){u='u'+Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);localStorage.setItem('fb_uid',u);}
  return u;
}

/* ============================================================
   3) LEADERBOARD GLOBAL
============================================================ */
async function fbSetScore(pseudo,xp,rankId){
  if(!_db||!pseudo)return;
  let av=null;try{av=loadProfile().avatar;}catch(e){}
  try{await _db.ref('lb/'+myUid()).set({pseudo,xp,rank:rankId,avatar:av,ts:Date.now()});}catch{}
}
async function fbGetLB(n=30){
  if(!_db)return null;
  try{
    const s=await _db.ref('lb').orderByChild('xp').limitToLast(n).once('value');
    const d=s.val();if(!d)return[];
    return Object.values(d).sort((a,b)=>b.xp-a.xp);
  }catch{return null;}
}

/* ---- Classement du DEFI DU JOUR (par date) ----
   Cle : daily/{seed}/{uid}. Classement = plus de bonnes reponses,
   puis le plus RAPIDE (timeMs croissant). N'affecte pas le LB global. */
async function fbSetDailyScore(seed,pseudo,correct,total,timeMs,streak){
  if(!_db||!pseudo||!seed)return;
  try{await _db.ref('daily/'+seed+'/'+myUid()).set({uid:myUid(),pseudo,correct,total,timeMs,streak,ts:Date.now()});}catch{}
}
async function fbGetDailyLB(seed,n=200){
  if(!_db||!seed)return null;
  try{
    const s=await _db.ref('daily/'+seed).limitToLast(n).once('value');
    const d=s.val();if(!d)return[];
    return Object.values(d).sort((a,b)=>(b.correct-a.correct)||((a.timeMs||1e12)-(b.timeMs||1e12)));
  }catch{return null;}
}

/* ============================================================
   4) AMIS (liste locale + presence via leaderboard)
============================================================ */
function loadFriends(){try{return JSON.parse(localStorage.getItem('fb_friends')||'[]');}catch{return[];}}
function saveFriends(a){try{localStorage.setItem('fb_friends',JSON.stringify(a));}catch{}}
function addFriend(pseudo){
  pseudo=(pseudo||'').trim(); if(!pseudo)return false;
  const f=loadFriends(); if(f.find(x=>x.toLowerCase()===pseudo.toLowerCase()))return false;
  f.push(pseudo); saveFriends(f); return true;
}
function removeFriend(pseudo){ saveFriends(loadFriends().filter(x=>x!==pseudo)); }

/* ============================================================
   4b) SALLES ACTIVES (pour le Monde : lobby + en jeu, non vides)
============================================================ */
async function fbGetActiveRooms(){
  if(!_db)return null;
  try{
    const s=await _db.ref('rooms').limitToLast(40).once('value');
    const d=s.val(); if(!d)return [];
    const out=[];
    Object.values(d).forEach(r=>{
      if(!r||!r.meta)return;
      const m=r.meta;
      if(m.status!=='lobby'&&m.status!=='playing')return;
      const players=r.players?Object.values(r.players).filter(p=>p&&p.online!==false):[];
      if(!players.length)return;                 // salle vide -> ignorer
      out.push({code:m.code,host:m.hostName,status:m.status,max:m.maxPlayers||4,count:players.length});
    });
    return out.sort((a,b)=>b.count-a.count);
  }catch{return null;}
}

/* ============================================================
   5) RANGS
============================================================ */
/* Grades plus durs a atteindre : 10 paliers, courbe exponentielle.
   Chaque grade donne des AVANTAGES (perks) cumulables :
     coinMult : multiplicateur de pieces gagnees
     gemReward: gemmes offertes en atteignant le grade
     freeJoker: jokers offerts a chaque montee
*/
/* Grades BEAUCOUP plus durs : 13 paliers, courbe ~x2.4 a chaque cran.
   Perks cumulables et VISIBLES :
     coinMult  : multiplicateur de pieces gagnees
     xpMult    : multiplicateur d'XP (accelere un peu en haut, mais
                 les seuils montent plus vite -> globalement plus dur)
     gemReward : gemmes offertes en atteignant le grade
     freeJoker : jokers offerts a chaque montee
     luck      : bonus permanent de chance de carte rare (paliers)
     gemDrip   : gemmes offertes a la fin de CHAQUE partie (passif) */
const RANKS=[
  {id:'recrue',  icon:'🪖',minXP:0,     css:'rank-recrue',  coinMult:1.00,xpMult:1.00,gemReward:0,  freeJoker:0,luck:0.00,gemDrip:0},
  {id:'agent',   icon:'🔵',minXP:1200,  css:'rank-agent',   coinMult:1.05,xpMult:1.00,gemReward:5,  freeJoker:1,luck:0.01,gemDrip:0},
  {id:'expert',  icon:'💜',minXP:3200,  css:'rank-expert',  coinMult:1.10,xpMult:1.00,gemReward:8,  freeJoker:1,luck:0.02,gemDrip:0},
  {id:'elite',   icon:'⭐',minXP:7000,  css:'rank-elite',   coinMult:1.16,xpMult:1.02,gemReward:14, freeJoker:1,luck:0.03,gemDrip:1},
  {id:'maitre',  icon:'🛡️',minXP:14000, css:'rank-maitre',  coinMult:1.24,xpMult:1.03,gemReward:22, freeJoker:2,luck:0.04,gemDrip:1},
  {id:'as',      icon:'♦️',minXP:27000, css:'rank-as',      coinMult:1.34,xpMult:1.04,gemReward:32, freeJoker:2,luck:0.05,gemDrip:1},
  {id:'veteran', icon:'🎖️',minXP:50000, css:'rank-veteran', coinMult:1.46,xpMult:1.05,gemReward:48, freeJoker:2,luck:0.06,gemDrip:2},
  {id:'champion',icon:'🏆',minXP:92000, css:'rank-champion',coinMult:1.60,xpMult:1.06,gemReward:70, freeJoker:3,luck:0.08,gemDrip:2},
  {id:'legende', icon:'🔥',minXP:165000,css:'rank-legende', coinMult:1.78,xpMult:1.08,gemReward:110,freeJoker:3,luck:0.10,gemDrip:3},
  {id:'mythe',   icon:'👑',minXP:300000,css:'rank-mythe',   coinMult:2.00,xpMult:1.10,gemReward:170,freeJoker:4,luck:0.13,gemDrip:4},
  {id:'titan',   icon:'🌋',minXP:540000,css:'rank-mythe',   coinMult:2.25,xpMult:1.12,gemReward:260,freeJoker:5,luck:0.16,gemDrip:5},
  {id:'oracle',  icon:'🔱',minXP:980000,css:'rank-mythe',   coinMult:2.55,xpMult:1.15,gemReward:400,freeJoker:6,luck:0.20,gemDrip:7},
  {id:'cosmos',  icon:'🌌',minXP:1800000,css:'rank-mythe',  coinMult:3.00,xpMult:1.20,gemReward:650,freeJoker:8,luck:0.25,gemDrip:10},
];
function getRank(xp){let r=RANKS[0];for(const k of RANKS){if(xp>=k.minXP)r=k;}return r;}
/* avantage de grade pour la chance de carte (utilise par boost.js) */
function rankLuck(p){p=p||loadProfile();return getRank(p.xp).luck||0;}
function getRankIndex(id){return RANKS.findIndex(r=>r.id===id);}
function getNextRank(xp){for(const k of RANKS){if(xp<k.minXP)return k;}return null;}
function getXPPct(xp){const r=getRank(xp),n=getNextRank(xp);if(!n)return 100;return Math.round(((xp-r.minXP)/(n.minXP-r.minXP))*100);}

/* ============================================================
   6) PROFIL + PIECES + JOKERS
============================================================ */
const DEFAULT_AVATAR={skin:'sk2',face:'fa1',eyes:'ey1',hair:'ha0',hairColor:'#3a2a20',hat:'no',outfit:'#00e5ff',outfitStyle:'os0',aura:'au0'};
const DP={pseudo:'',xp:0,coins:0,gems:0,gamesPlayed:0,wins:0,bestStreak:0,totalCorrect:0,
  firstTime:true,achievements:[],createdAt:null,dailyCount:0,onlineWins:0,lastDaily:null,
  perfectGames:0,fastAnswers:0,jokers:{skip:1,time:1,hint:1},arcadeBest:{},
  avatar:{...DEFAULT_AVATAR},ownedItems:[],collection:{},deck:[],
  arcadeWins:0,tradesDone:0,packsOpened:0,competitionsJoined:[]};
function loadProfile(){try{const r=localStorage.getItem('fb_profile');const p=r?{...DP,...JSON.parse(r)}:{...DP};p.avatar={...DEFAULT_AVATAR,...(p.avatar||{})};p.jokers={skip:0,time:0,hint:0,...(p.jokers||{})};p.collection=p.collection||{};p.ownedItems=p.ownedItems||[];p.deck=p.deck||[];return p;}catch{return{...DP,avatar:{...DEFAULT_AVATAR}};}}
function saveProfile(p){try{localStorage.setItem('fb_profile',JSON.stringify(p));}catch{}}

/* multiplicateur total de pieces = grade x cartes equipees */
function coinMult(p){p=p||loadProfile();let m=getRank(p.xp).coinMult||1;m+=(typeof cardBonus==='function'?cardBonus(p,'coin'):0);return m;}
function xpBonus(p){p=p||loadProfile();return (typeof cardBonus==='function'?cardBonus(p,'xp'):0);} // bonus plat % via cartes

function addXP(n){
  const p=loadProfile(),old=getRank(p.xp);
  const mult=(1+xpBonus(p))*(getRank(p.xp).xpMult||1);   // cartes + avantage de grade
  p.xp+=Math.round(n*mult);const nw=getRank(p.xp);
  if(old.id!==nw.id){
    // recompenses de montee de grade (peut sauter plusieurs paliers)
    let oi=getRankIndex(old.id),ni=getRankIndex(nw.id);
    for(let i=oi+1;i<=ni;i++){const rk=RANKS[i];p.gems=(p.gems||0)+(rk.gemReward||0);
      p.jokers=p.jokers||{};const jk=['skip','time','hint'][i%3];p.jokers[jk]=(p.jokers[jk]||0)+(rk.freeJoker||0);}
    saveProfile(p);
    showToast('🎉 '+t('rank_'+nw.id)+' ! +'+(nw.gemReward||0)+' 💎','flash',3800);Audio?.SFX?.levelup?.();vibrate([100,50,200,50,300]);
    if(typeof addNotif==='function')addNotif('rankup',{rank:nw.id});
    if(typeof Social!=='undefined')Social.publishMe&&Social.publishMe();
  } else { saveProfile(p); }
  fbSetScore(p.pseudo,p.xp,nw.id);
  return p;
}
function addCoins(n,raw){const p=loadProfile();const gain=raw?n:Math.round(n*coinMult(p));p.coins=Math.max(0,(p.coins||0)+gain);saveProfile(p);return p.coins;}
function spendCoins(n){const p=loadProfile();if((p.coins||0)<n)return false;p.coins-=n;saveProfile(p);return true;}
function addGems(n){const p=loadProfile();p.gems=Math.max(0,(p.gems||0)+n);saveProfile(p);return p.gems;}
function spendGems(n){const p=loadProfile();if((p.gems||0)<n)return false;p.gems-=n;saveProfile(p);return true;}

/* gemmes passives offertes a la fin de chaque partie (avantage de grade) */
function grantGemDrip(){const p=loadProfile();const d=getRank(p.xp).gemDrip||0;if(d>0){p.gems=(p.gems||0)+d;saveProfile(p);}return d;}
/* resume lisible des avantages d'un grade */
function rankPerks(rk){
  const out=[];
  if(rk.coinMult>1)out.push('x'+rk.coinMult.toFixed(2)+' 🪙');
  if(rk.xpMult>1)out.push('x'+rk.xpMult.toFixed(2)+' XP');
  if(rk.luck>0)out.push('+'+Math.round(rk.luck*100)+'% ✨');
  if(rk.gemDrip>0)out.push('+'+rk.gemDrip+' 💎/partie');
  if(rk.gemReward>0)out.push('+'+rk.gemReward+' 💎 palier');
  if(rk.freeJoker>0)out.push('+'+rk.freeJoker+' 🃏 palier');
  return out;
}

/* ============================================================
   7) PREFS
============================================================ */
const DP2={lang:'fr',sfxEnabled:true,musicEnabled:true,musicVol:0.32,sfxVol:0.72,
  narratorEnabled:true,vibrateEnabled:true,musicStyle:'auto'};
function loadPrefs(){try{const r=localStorage.getItem('fb_prefs');return r?{...DP2,...JSON.parse(r)}:{...DP2};}catch{return{...DP2};}}
function savePrefs(p){try{localStorage.setItem('fb_prefs',JSON.stringify(p));}catch{}}
function applyPrefs(){
  const p=loadPrefs();
  if(typeof Audio!=='undefined'){Audio.setSFX(p.sfxEnabled);Audio.setMusic(p.musicEnabled);Audio.setMVol(p.musicVol??0.32);Audio.setSVol(p.sfxVol??0.72);Audio.setStyle(p.musicStyle||'auto');}
  _nar=p.narratorEnabled!==false;_vib=p.vibrateEnabled!==false;
}

/* ============================================================
   8) ACHIEVEMENTS
============================================================ */
const ACHIEVEMENTS=[
  {id:'first_game',icon:'🎮',gem:1, check:p=>p.gamesPlayed>=1},
  {id:'first_win', icon:'🏆',gem:2, check:p=>p.wins>=1},
  {id:'streak_3',  icon:'🔥',gem:1, check:p=>p.bestStreak>=3},
  {id:'streak_5',  icon:'💥',gem:2, check:p=>p.bestStreak>=5},
  {id:'streak_10', icon:'⚡',gem:4, check:p=>p.bestStreak>=10},
  {id:'games_10',  icon:'🎯',gem:2, check:p=>p.gamesPlayed>=10},
  {id:'games_50',  icon:'🎖️',gem:5, check:p=>p.gamesPlayed>=50},
  {id:'games_100', icon:'💎',gem:10,check:p=>p.gamesPlayed>=100},
  {id:'correct_50',icon:'🧠',gem:2, check:p=>p.totalCorrect>=50},
  {id:'correct_200',icon:'🔬',gem:5, check:p=>p.totalCorrect>=200},
  {id:'correct_1000',icon:'🌟',gem:15,check:p=>p.totalCorrect>=1000},
  {id:'rank_agent',icon:'🔵',gem:5, check:p=>p.xp>=1200},
  {id:'rank_expert',icon:'💜',gem:8, check:p=>p.xp>=3200},
  {id:'rank_elite',icon:'⭐',gem:12,check:p=>p.xp>=7000},
  {id:'rank_legende',icon:'👑',gem:30,check:p=>p.xp>=165000},
  {id:'daily_3',   icon:'📅',gem:3, check:p=>(p.dailyCount||0)>=3},
  {id:'daily_7',   icon:'📆',gem:6, check:p=>(p.dailyCount||0)>=7},
  {id:'online_win',icon:'🌍',gem:4, check:p=>(p.onlineWins||0)>=1},
  {id:'no_miss',   icon:'💯',gem:5, check:p=>(p.perfectGames||0)>=1},
  {id:'speed_5',   icon:'⚡',gem:3, check:p=>(p.fastAnswers||0)>=5},
  {id:'rich_100',  icon:'🪙',gem:2, check:p=>(p.coins||0)>=100},
  {id:'collector_50',icon:'📒',gem:8, check:p=>(typeof collectionCount==='function'?collectionCount(p):0)>=50},
  {id:'collector_250',icon:'🗂️',gem:20,check:p=>(typeof collectionCount==='function'?collectionCount(p):0)>=250},
  {id:'collector_500',icon:'🏛️',gem:50,check:p=>(typeof collectionCount==='function'?collectionCount(p):0)>=500},
];
function checkAchievements(profile){
  const news=[];
  for(const a of ACHIEVEMENTS){if(!profile.achievements.includes(a.id)&&a.check(profile)){profile.achievements.push(a.id);if(a.gem)profile.gems=(profile.gems||0)+a.gem;news.push(a);}}
  if(news.length){saveProfile(profile);news.forEach((a,i)=>setTimeout(()=>{showToast(a.icon+' '+t('ach_'+a.id)+(a.gem?' · +'+a.gem+' 💎':''),'warn',3000);Audio?.SFX?.achieve?.();},i*1500));}
}

/* ============================================================
   9) TOAST / VIBRATION / NARRATEUR
============================================================ */
let _tt=null;
function showToast(msg,type='neutral',dur=1800){
  let el=document.getElementById('fb-toast');
  if(!el){el=document.createElement('div');el.id='fb-toast';el.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(20px);padding:12px 22px;border-radius:14px;font-weight:700;font-size:.92rem;pointer-events:none;opacity:0;transition:opacity .2s,transform .2s;z-index:9999;backdrop-filter:blur(12px);font-family:Inter,sans-serif;max-width:90vw;text-align:center;word-break:break-word;';document.body.appendChild(el);}
  clearTimeout(_tt);el.textContent=msg;
  const bg={success:'rgba(6,214,160,.2)',danger:'rgba(239,71,111,.2)',flash:'rgba(255,75,0,.2)',warn:'rgba(255,209,102,.2)',neutral:'rgba(255,255,255,.08)',info:'rgba(0,229,255,.12)'};
  const bc={success:'#06d6a0',danger:'#ef476f',flash:'#ff4b00',warn:'#ffd166',neutral:'rgba(0,229,255,.2)',info:'#00e5ff'};
  const co={success:'#06d6a0',danger:'#ef476f',flash:'#ff4b00',warn:'#ffd166',neutral:'#dde8ff',info:'#00e5ff'};
  el.style.background=bg[type]||bg.neutral;el.style.border='1px solid '+(bc[type]||bc.neutral);el.style.color=co[type]||co.neutral;
  el.style.opacity='1';el.style.transform='translateX(-50%) translateY(0)';
  _tt=setTimeout(()=>{el.style.opacity='0';el.style.transform='translateX(-50%) translateY(10px)';},dur);
}
let _vib=true;
function vibrate(p){if(_vib&&'vibrate' in navigator){try{navigator.vibrate(p);}catch{}}}
let _nar=true;
const NAR={
  fr:{welcome:["Bienvenue, Agent !","FLASH BRAIN en ligne."],go:["GO ! MAINTENANT !","C'est parti !","En route !"],
      correct:["Excellent !","Bien joue !","Parfait !","Neurones en feu !","Bravo !"],
      wrong:["Rate !","Trop lent !","Erreur critique !"],flash:["FLASH ! Vite !","FLASH ! Maintenant !"],
      streak3:["3 de suite !"],streak5:["5 consecutives ! Machine !"],streak10:["10 !! LEGENDAIRE !!"],
      levelup:["Rang superieur !"],win:["Mission accomplie !","Tu es le meilleur !"],
      lose:["Recommence.","Prochaine fois !"],countdown3:["3"],countdown2:["2"],countdown1:["1"],
      steal:["A toi de voler !","Vol possible !"]},
  en:{welcome:["Welcome, Agent!","FLASH BRAIN online."],go:["GO! NOW!","Let's go, Agent!"],
      correct:["Excellent!","Well played!","Perfect!","Neurons on fire!"],
      wrong:["Missed!","Too slow!","Critical error!"],flash:["FLASH! Answer fast!","FLASH! Now!"],
      streak3:["3 in a row!"],streak5:["5 consecutive! Machine!"],streak10:["10!! LEGENDARY!!"],
      levelup:["New rank!"],win:["Mission complete!","You're the best!"],
      lose:["Try again.","Next time!"],countdown3:["3"],countdown2:["2"],countdown1:["1"],
      steal:["Your turn to steal!","Steal chance!"]}
};
function narrate(key){
  if(!_nar||!('speechSynthesis' in window))return;
  const lang=getLang(),lines=(NAR[lang]||NAR.fr)[key];if(!lines?.length)return;
  const txt=lines[Math.floor(Math.random()*lines.length)];
  try{window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(txt);
  u.lang=lang==='en'?'en-US':'fr-FR';u.rate=1.1;u.pitch=1.1;u.volume=.85;
  window.speechSynthesis.speak(u);}catch{}
}

/* ============================================================
   10) ONLINE - moteur de salle hote-arbitre
   ------------------------------------------------------------
   Etat partage sous rooms/{code} :
     meta   : {code,hostUid,hostName,maxPlayers,status,lang,diff,createdAt,lastActive}
     players: {uid:{name,isHost,score,streak,online,joinedAt,lastSeen}}
     game   : {round,maxRounds,phase,word,ruleId,flasher,activeUid,
               order,reveal,deadline,seq}
     submit : {uid,answer,ts}      (intention -> traitee par l'hote)
     flash  : {uid,ts}             (claim du flash -> transaction)
     chat   : {pushId:{name,msg,ts}}
============================================================ */
const Online = {
  code:null, name:null, uid:null, isHost:false,
  meta:null, players:{}, game:null,
  _refs:[], _hb:null, _hostTimer:null,
  onMeta:null, onPlayers:null, onGame:null, onChat:null,

  ref(p){ return _db.ref('rooms/'+this.code+(p?'/'+p:'')); },

  genCode(){ return Math.floor(1000+Math.random()*9000).toString(); },

  /* --- creer une salle (je deviens hote) --- */
  async create(code, name, maxPlayers, lang, diff){
    if(!_db)return false;
    this.code=code; this.name=name; this.uid=myUid(); this.isHost=true;
    try{
      await this.ref().set({
        meta:{code,hostUid:this.uid,hostName:name,maxPlayers:maxPlayers||4,
              status:'lobby',lang:lang||'fr',diff:diff||'normal',
              createdAt:Date.now(),lastActive:Date.now()},
        players:{[this.uid]:{name,isHost:true,score:0,streak:0,online:true,joinedAt:Date.now(),lastSeen:Date.now()}}
      });
      this._attach();
      return true;
    }catch(e){console.warn('[create]',e.message);return false;}
  },

  /* --- ecrit seulement le doc salle (sans attacher) : utilise par setup --- */
  async createRoomDoc(code, name, maxPlayers, lang, diff){
    if(!_db)return false;
    const uid=myUid();
    try{
      await _db.ref('rooms/'+code).set({
        meta:{code,hostUid:uid,hostName:name,maxPlayers:maxPlayers||4,
              status:'lobby',lang:lang||'fr',diff:diff||'normal',
              createdAt:Date.now(),lastActive:Date.now()},
        players:{[uid]:{name,isHost:true,score:0,streak:0,online:true,joinedAt:Date.now(),lastSeen:Date.now()}}
      });
      return true;
    }catch(e){console.warn('[createRoomDoc]',e.message);return false;}
  },

  /* --- rejoindre une salle existante --- */
  async join(code, name){
    if(!_db)return {ok:false,err:'nodb'};
    this.code=code; this.name=name; this.uid=myUid();
    try{
      const snap=await this.ref('meta').once('value');
      const meta=snap.val();
      if(!meta)return {ok:false,err:'notfound'};
      const pl=(await this.ref('players').once('value')).val()||{};
      const count=Object.keys(pl).length;
      const already=!!pl[this.uid];
      if(!already && count>=(meta.maxPlayers||4))return {ok:false,err:'full'};
      this.isHost=(meta.hostUid===this.uid);
      await this.ref('players/'+this.uid).update({
        name,isHost:this.isHost,score:0,streak:0,online:true,
        joinedAt:already?(pl[this.uid].joinedAt||Date.now()):Date.now(),lastSeen:Date.now()
      });
      this._attach();
      return {ok:true,status:meta.status};
    }catch(e){console.warn('[join]',e.message);return {ok:false,err:'exc'};}
  },

  _attach(){
    this._detach();
    // presence : se retire proprement a la deconnexion
    try{ this.ref('players/'+this.uid).onDisconnect().remove(); }catch{}
    // heartbeat
    this._hb=setInterval(()=>{ if(_db&&this.code) this.ref('players/'+this.uid+'/lastSeen').set(Date.now()).catch(()=>{}); },4000);

    const mref=this.ref('meta');
    const mh=mref.on('value',s=>{ this.meta=s.val(); this.onMeta&&this.onMeta(this.meta); this._maybeBecomeHost(); });
    this._refs.push([mref,'value',mh]);

    const pref=this.ref('players');
    const ph=pref.on('value',s=>{ this.players=s.val()||{}; this.onPlayers&&this.onPlayers(this.players); });
    this._refs.push([pref,'value',ph]);

    const gref=this.ref('game');
    const gh=gref.on('value',s=>{ this.game=s.val(); this.onGame&&this.onGame(this.game); });
    this._refs.push([gref,'value',gh]);

    const cref=this.ref('chat').limitToLast(50);
    const ch=cref.on('value',s=>{ this.onChat&&this.onChat(s.val()||{}); });
    this._refs.push([cref,'value',ch]);

    // l'hote ecoute flash + submit pour arbitrer
    if(this.isHost) this._hostListeners();
  },

  _detach(){
    this._refs.forEach(([r,ev,h])=>{try{r.off(ev,h);}catch{}});
    this._refs=[];
    if(this._hb){clearInterval(this._hb);this._hb=null;}
    if(this._hostTimer){clearTimeout(this._hostTimer);this._hostTimer=null;}
    if(this._wd){clearInterval(this._wd);this._wd=null;}
    this._hostBound=false;
  },

  /* l'hote a quitte -> le plus ancien present devient hote */
  _maybeBecomeHost(){
    if(!this.meta||this.isHost)return;
    const hostUid=this.meta.hostUid;
    if(this.players[hostUid]&&this.players[hostUid].online!==false)return; // hote encore la
    const present=Object.entries(this.players).filter(([u,p])=>p&&p.online!==false)
      .sort((a,b)=>(a[1].joinedAt||0)-(b[1].joinedAt||0));
    if(present.length && present[0][0]===this.uid){
      this.isHost=true;
      this.ref('meta').update({hostUid:this.uid,hostName:this.name});
      this.ref('players/'+this.uid+'/isHost').set(true);
      this._hostListeners();
    }
  },

  /* --- ACTIONS JOUEUR --- */
  setReadyName(name){ this.ref('players/'+this.uid+'/name').set(name); this.name=name; },

  async claimFlash(){
    if(!_db||!this.game||this.game.phase!=='flash')return false;
    const me=this.uid;
    const res=await this.ref('game/flasher').transaction(cur=> cur==null?me:cur);
    return res.committed && res.snapshot.val()===me;
  },

  submitAnswer(answer){
    if(!_db)return;
    this.ref('submit').set({uid:this.uid,answer,ts:Date.now()});
  },

  sendChat(msg){
    msg=(msg||'').trim().slice(0,160); if(!msg||!_db)return;
    this.ref('chat').push({name:this.name,msg,ts:Date.now()});
  },

  async leave(){
    if(!_db||!this.code)return;
    try{ await this.ref('players/'+this.uid).remove(); }catch{}
    // si plus personne -> on nettoie la salle
    try{
      const pl=(await this.ref('players').once('value')).val();
      if(!pl) await this.ref().remove();
    }catch{}
    this._detach(); this.code=null;
  },

  /* l'hote demarre la partie depuis le lobby */
  startGame(maxRounds){
    if(!this.isHost||!_db)return;
    const order=this._connectedUids();
    if(!order.length)return;
    // reset scores
    const upd={};
    order.forEach(u=>{upd['players/'+u+'/score']=0;upd['players/'+u+'/streak']=0;});
    upd['meta/status']='playing';
    this.ref().update(upd);
    this._newRound(1, maxRounds||5);
  },

  _connectedUids(){
    return Object.entries(this.players)
      .filter(([u,p])=>p&&p.online!==false)
      .sort((a,b)=>(a[1].joinedAt||0)-(b[1].joinedAt||0))
      .map(([u])=>u);
  },

  /* ---------- BOUCLE ARBITRE (hote uniquement) ---------- */
  _hostListeners(){
    if(this._hostBound)return; this._hostBound=true;
    // flash claim -> passer en phase answer (tolerant aux courses d'etat)
    this.ref('game/flasher').on('value',s=>{
      const f=s.val();
      if(!f)return;
      const g=this.game;
      // on accepte si on est (ou etait tres recemment) en phase flash
      if(g && g.phase==='flash'){ this._setAnswerer(f, true); }
    });
    // submit -> valider
    this.ref('submit').on('value',async s=>{
      const sub=s.val(); if(!sub)return;
      await this.ref('submit').remove();
      this._judge(sub.uid, sub.answer);
    });
    // WATCHDOG : auto-repare une partie figee (timer perdu, hote change,
    // onglet en veille...). Toutes les 1s, si la deadline de la phase
    // courante est depassee, on force la transition adequate. C'est ce
    // qui empeche "ca bloque chez certains joueurs en pleine partie".
    if(!this._wd){
      this._wd=setInterval(()=>{ try{ this._watch(); }catch(e){} },1000);
    }
  },

  _watch(){
    if(!this.isHost||!_db)return;
    const g=this.game; if(!g||!g.deadline)return;
    const late=Date.now()-g.deadline;
    if(late<1200)return;                 // petite marge de tolerance
    if(this._wdSeq===g.seq && this._wdPhase===g.phase && Date.now()-(this._wdAt||0)<2500)return;
    this._wdSeq=g.seq;this._wdPhase=g.phase;this._wdAt=Date.now();
    if(g.phase==='countdown'){
      const gg={...g,phase:'flash',deadline:Date.now()+((g.flashWindow||7)*1000)};
      this._hostSet(gg);
    } else if(g.phase==='flash'){
      if(!g.flasher) this._reveal(null,null,'noflash');
    } else if(g.phase==='answer'){
      if(g.activeUid) this._afterAttempt(g.activeUid,false,'timeout','');
      else this._reveal(null,null,'fail');
    } else if(g.phase==='reveal'){
      const next=g.round+1;
      if(next>g.maxRounds)this._finish(); else this._newRound(next,g.maxRounds);
    }
  },

  _hostSet(g){ this.ref('game').set(g); this.game=g; },

  _newRound(round, maxRounds){
    const lang=this.meta?.lang||'fr';
    const order=this._connectedUids();
    let pool=getGameWords(lang).filter(w=>!(this._used||new Set()).has(w));
    if(!pool.length){this._used=new Set();pool=getGameWords(lang);}
    const word=pool[Math.floor(Math.random()*pool.length)];
    (this._used=this._used||new Set()).add(word);
    const _diff0=this.meta?.diff||'normal';
    const _fl=foldAccents((word||'a').toLowerCase())[0];
    const hardPool=HARD_ONLINE.filter(id=>onlineRuleFeasible(id,_fl));
    const allPool=ONLINE_RULE_POOL.filter(id=>onlineRuleFeasible(id,_fl));
    let rule;
    if((_diff0==='hard'||_diff0==='extreme')&&Math.random()<(_diff0==='extreme'?0.75:0.5)){
      rule=(hardPool.length?hardPool:allPool)[Math.floor(Math.random()*(hardPool.length?hardPool.length:allPool.length))];
    }else{
      rule=allPool[Math.floor(Math.random()*allPool.length)];
    }
    if(!rule)rule='long';
    const diff=_diff0;
    const flashWindow=({easy:9,normal:7,hard:5,extreme:4}[diff]||7);
    const g={round,maxRounds:maxRounds||(this.game?.maxRounds||5),phase:'countdown',
      word,ruleId:rule,flasher:null,activeUid:null,order,answered:[],
      reveal:null,deadline:Date.now()+3200,seq:(this.game?.seq||0)+1,flashWindow};
    this._hostSet(g);
    // apres le decompte -> phase flash
    this._hostAfter(3200,()=>{
      const gg={...g,phase:'flash',deadline:Date.now()+flashWindow*1000};
      this._hostSet(gg);
      this._hostAfter(flashWindow*1000,()=>{
        // personne n'a flashe
        if(this.game&&this.game.phase==='flash'&&!this.game.flasher) this._reveal(null,null,'noflash');
      });
    });
  },

  _setAnswerer(uid, fromFlash){
    const diff=this.meta?.diff||'normal';
    const ansWindow=({easy:12,normal:9,hard:6,extreme:5}[diff]||9);
    const g={...this.game,phase:'answer',activeUid:uid,
      flasher:fromFlash?uid:(this.game.flasher),deadline:Date.now()+ansWindow*1000};
    this._hostSet(g);
    this._hostAfter(ansWindow*1000,()=>{
      if(this.game&&this.game.phase==='answer'&&this.game.activeUid===uid){
        this._afterAttempt(uid,false,'timeout','');  // delai depasse
      }
    });
  },

  async _judge(uid, answer){
    if(!this.game||this.game.phase!=='answer'||this.game.activeUid!==uid)return;
    const lang=this.meta?.lang||'fr';
    const word=this.game.word, rule=ONLINE_RULES[this.game.ruleId];
    const a=foldAccents((answer||'').toLowerCase().normalize('NFC'));
    const m=foldAccents(word.toLowerCase());
    let ok=true, reason='';
    if(!a){ok=false;reason='empty';}
    else if(!(await isValidWord(answer,lang))){ok=false;reason='notword';}
    else if(a===m){ok=false;reason='same';}
    else if(a[0]!==m[0]){ok=false;reason='letter';}
    else if(rule&&!rule.check(a)){ok=false;reason='rule';}
    this._afterAttempt(uid, ok, reason, answer);
  },

  _afterAttempt(uid, ok, reason, answer){
    const isFlasher=(uid===this.game.flasher);
    if(ok){
      const pts=isFlasher?2:1;
      const cur=this.players[uid]?.score||0;
      const st=(this.players[uid]?.streak||0)+1;
      this.ref('players/'+uid).update({score:cur+pts,streak:st});
      this._reveal(uid,answer,'win',pts);
    } else {
      if(isFlasher||this.game.activeUid===this.game.flasher){
        // le flasher rate -> reset son streak
        this.ref('players/'+uid+'/streak').set(0);
      } else {
        this.ref('players/'+uid+'/streak').set(0);
      }
      // chercher le prochain voleur parmi les joueurs connectes (temps reel)
      const answered=[...(this.game.answered||[]),uid];
      const pool=this._connectedUids();
      const next=pool.find(u=>u!==this.game.flasher && !answered.includes(u));
      if(next){
        const g={...this.game,answered,reveal:{uid,ok:false,reason,answer,steal:true}};
        this._hostSet(g);
        this._hostAfter(1400,()=>{ this._setAnswerer(next,false); });
      } else {
        this._reveal(null,null,'fail');
      }
    }
  },

  _reveal(winnerUid, answer, kind, pts){
    const g={...this.game,phase:'reveal',deadline:Date.now()+2400,
      reveal:{uid:winnerUid,answer,kind,pts:pts||0,word:this.game.word}};
    this._hostSet(g);
    this._hostAfter(2400,()=>{
      const next=this.game.round+1;
      if(next>this.game.maxRounds){ this._finish(); }
      else { this._newRound(next, this.game.maxRounds); }
    });
  },

  _finish(){
    const standings=this._connectedUids().map(u=>({uid:u,name:this.players[u]?.name||'?',score:this.players[u]?.score||0}))
      .sort((a,b)=>b.score-a.score);
    const g={...this.game,phase:'over',standings};
    this._hostSet(g);
    this.ref('meta/status').set('finished');
  },

  /* retour au lobby pour rejouer (hote) */
  backToLobby(){
    if(!this.isHost)return;
    this.ref('game').remove();
    this.ref('meta/status').set('lobby');
    this._used=new Set();
  },

  _hostAfter(ms, fn){
    if(this._hostTimer)clearTimeout(this._hostTimer);
    this._hostTimer=setTimeout(()=>{ try{fn();}catch(e){console.warn(e);} }, ms);
  },
};

/* --- regles utilisees en ligne (sous-ensemble lisible) --- */
/* Regles online : memes ids que le local (pour reutiliser les libelles).
   Aucune regle imposant la 1re lettre (conflit avec "meme 1re lettre"). */
const ONLINE_RULES={
  long:{check:w=>w.length>=6},
  short:{check:w=>w.length<=4},
  long7:{check:w=>w.length>=7},
  long8:{check:w=>w.length>=8},
  five:{check:w=>w.length===5},
  six:{check:w=>w.length===6},
  four:{check:w=>w.length===4},
  len_even:{check:w=>w.length%2===0},
  len_odd:{check:w=>w.length%2===1},
  end_e:{check:w=>foldAccents(w).endsWith('e')},
  end_s:{check:w=>foldAccents(w).endsWith('s')},
  end_vowel:{check:w=>'aeiouy'.includes(foldAccents(w).slice(-1))},
  end_cons:{check:w=>'bcdfghjklmnpqrstvwxz'.includes(foldAccents(w).slice(-1))},
  double:{check:w=>/(.)\1/.test(foldAccents(w))},
  two_vowels:{check:w=>(foldAccents(w).match(/[aeiouy]/g)||[]).length>=2},
  three_vowels:{check:w=>(foldAccents(w).match(/[aeiouy]/g)||[]).length>=3},
  has_r:{check:w=>foldAccents(w).includes('r')},
  repeat_letter:{check:w=>{const o={};for(const ch of foldAccents(w)){o[ch]=(o[ch]||0)+1;if(o[ch]>=2)return true;}return false;}},
  no_a:{check:w=>!foldAccents(w).includes('a')},
  no_e:{check:w=>!foldAccents(w).includes('e')},
  no_s:{check:w=>!foldAccents(w).includes('s')},
  no_i:{check:w=>!foldAccents(w).includes('i')},
  no_e_long:{check:w=>!foldAccents(w).includes('e')&&w.length>=6},
};
const HARD_ONLINE=['long7','long8','three_vowels','no_e_long','no_a','no_e','no_i','six','repeat_letter','end_cons'];
const ONLINE_RULE_POOL=Object.keys(ONLINE_RULES);
/* satisfiable pour un mot commencant par `fl` ? (meme logique que le local) */
function onlineRuleFeasible(id,fl){
  switch(id){
    case 'no_a':return fl!=='a';
    case 'no_e':case 'no_e_long':return fl!=='e';
    case 'no_i':return fl!=='i';
    case 'no_s':return fl!=='s';
    case 'four':case 'five':case 'six':case 'long8':return !'kwxyz'.includes(fl);
    default:return true;
  }
}

/* ============================================================
   11) UTILS + INIT
============================================================ */
function pickRandom(arr){return arr[Math.floor(Math.random()*arr.length)];}
/* ===== Defi du jour : aleatoire DETERMINISTE par date =====
   Tous les joueurs obtiennent le meme defi le meme jour (style Wordle).
   Base sur la date LOCALE pour coller au compte a rebours affiche. */
function dailyDayNumber(d){d=d||new Date();return Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000);}
function dailySeedStr(d){d=d||new Date();const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());}
function dailyNumber(d){return (dailyDayNumber(d)%99999)+1;} /* numero affiche, stable et coherent avec le puzzle */
function _fbHash32(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=(h<<13)|(h>>>19);}return (Math.imul(h^(h>>>16),2246822507)^Math.imul(h^(h>>>13),3266489909))>>>0;}
function seededRng(seedStr){let a=_fbHash32(String(seedStr));return function(){a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}
function seededPick(arr,rnd){return arr[Math.floor(rnd()*arr.length)];}
function setActiveNav(id){document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.nav===id));}
function goTo(page){Audio?.SFX?.navigate?.();window.location.href=page;}

document.addEventListener('DOMContentLoaded',()=>{_initFB();applyPrefs();});
window.addEventListener('beforeunload',()=>{ if(Online.code) try{Online.ref('players/'+Online.uid).remove();}catch{} });

/* ================================================================
   FLASH BRAIN - localnet.js
   "LocalDB" : un mini-backend temps reel compatible avec l'API
   Firebase Realtime Database, SANS aucune configuration.
   Transport : localStorage (persistance) + BroadcastChannel + events
   'storage' (synchro instantanee entre onglets / fenetres du meme
   navigateur, et donc entre deux joueurs sur le meme appareil).

   Objectif : que le CHAT, les SALLES, les AMIS, les ECHANGES et le
   MULTIJOUEUR synchronise fonctionnent immediatement, meme si
   personne n'a configure Firebase. Si Firebase est configure, c'est
   lui qui est utilise (voir engine.js). Sinon -> LocalDB.

   On implemente uniquement le sous-ensemble de l'API utilise par le
   jeu : ref(path) -> set/update/remove/push/once/on/off/transaction
   /onDisconnect().remove() + requetes orderByChild/equalTo/
   limitToFirst/limitToLast.
================================================================ */
(function(){
  'use strict';
  const ROOT_KEY='fb_lnet_root';
  const CHAN='fb_lnet_chan';

  /* ---------- arbre racine en localStorage ---------- */
  function readRoot(){
    try{return JSON.parse(localStorage.getItem(ROOT_KEY)||'{}');}catch{return {};}
  }
  function writeRoot(tree){
    try{localStorage.setItem(ROOT_KEY,JSON.stringify(tree));}catch{}
  }
  function clone(v){return v===undefined?undefined:JSON.parse(JSON.stringify(v));}
  function eqJSON(a,b){return JSON.stringify(a===undefined?null:a)===JSON.stringify(b===undefined?null:b);}

  function splitPath(p){return (p||'').split('/').filter(Boolean);}
  function getAt(tree,path){
    let cur=tree;
    for(const k of splitPath(path)){ if(cur==null||typeof cur!=='object')return undefined; cur=cur[k]; }
    return cur;
  }
  function setAt(tree,path,val){
    const parts=splitPath(path);
    if(!parts.length){return (val==null?{}:val);}
    let cur=tree;
    for(let i=0;i<parts.length-1;i++){
      const k=parts[i];
      if(cur[k]==null||typeof cur[k]!=='object')cur[k]={};
      cur=cur[k];
    }
    const last=parts[parts.length-1];
    if(val===undefined||val===null)delete cur[last];
    else cur[last]=val;
    return tree;
  }
  function removeAt(tree,path){return setAt(tree,path,undefined);}

  /* ---------- bus inter-onglets ---------- */
  let bc=null;
  try{ bc=('BroadcastChannel' in window)?new BroadcastChannel(CHAN):null; }catch{ bc=null; }
  const listeners=[]; // {path, query, event, cb, last, knownKeys}

  function bump(){
    const tok=Date.now()+':'+Math.random();
    try{ if(bc)bc.postMessage(tok); }catch{}
    // fallback meme-onglet : on relit/notifie tout de suite
    notifyAll();
  }
  function onExternal(){ notifyAll(); }
  if(bc) bc.onmessage=onExternal;
  // 'storage' se declenche dans les AUTRES onglets quand on ecrit
  window.addEventListener('storage',e=>{ if(e.key===ROOT_KEY||e.key===null) notifyAll(); });

  /* recompute + dispatch pour chaque listener actif */
  function notifyAll(){
    const tree=readRoot();
    for(const L of listeners){
      try{
        if(L.event==='value'){
          const v=resolveQuery(tree,L);
          if(!eqJSON(v,L.last)){ L.last=clone(v); L.cb(makeSnap(L.lastPath,L.last)); }
        } else if(L.event==='child_added'){
          const raw=getAt(tree,L.path);
          const obj=(raw&&typeof raw==='object')?raw:{};
          for(const k of Object.keys(obj)){
            if(!L.knownKeys.has(k)){ L.knownKeys.add(k); L.cb(makeSnap(L.path+'/'+k,obj[k],k)); }
          }
          // purge des cles disparues (pour pouvoir re-emettre si recreees)
          for(const k of Array.from(L.knownKeys)){ if(!(k in obj))L.knownKeys.delete(k); }
        }
      }catch(e){}
    }
  }

  /* ---------- snapshot facon Firebase ---------- */
  function makeSnap(path,val,key){
    return {
      key: key!==undefined?key:(splitPath(path).slice(-1)[0]||null),
      val: ()=> (val===undefined?null:clone(val)),
      exists: ()=> val!=null,
      forEach: (fn)=>{ const o=(val&&typeof val==='object')?val:{}; for(const k of Object.keys(o)){ if(fn(makeSnap(path+'/'+k,o[k],k)))return true; } return false; }
    };
  }

  /* ---------- application d'une requete (tri/filtre/limite) ---------- */
  function resolveQuery(tree,q){
    let v=getAt(tree,q.path);
    if(!q.query)return v;
    if(v==null||typeof v!=='object')return v;
    let entries=Object.entries(v);
    const Q=q.query;
    if(Q.orderByChild){
      entries.sort((a,b)=>{
        const av=a[1]&&a[1][Q.orderByChild], bv=b[1]&&b[1][Q.orderByChild];
        return (av>bv?1:av<bv?-1:0);
      });
    } else {
      entries.sort((a,b)=>(a[0]>b[0]?1:a[0]<b[0]?-1:0)); // par cle (ordre d'insertion via push horodate)
    }
    if(Q.equalTo!==undefined && Q.orderByChild){
      entries=entries.filter(([k,val])=>val&&val[Q.orderByChild]===Q.equalTo);
    }
    if(Q.limitToFirst)entries=entries.slice(0,Q.limitToFirst);
    if(Q.limitToLast)entries=entries.slice(-Q.limitToLast);
    const out={}; entries.forEach(([k,val])=>out[k]=val); return out;
  }

  /* ---------- onDisconnect : on retire a la fermeture ---------- */
  const disconnectOps=[]; // {path}
  function flushDisconnect(){
    if(!disconnectOps.length)return;
    const tree=readRoot();
    disconnectOps.forEach(op=>{ try{ removeAt(tree,op.path);}catch{} });
    writeRoot(tree);
    try{ if(bc)bc.postMessage('dc:'+Date.now()); }catch{}
  }
  window.addEventListener('pagehide',flushDisconnect);
  window.addEventListener('beforeunload',flushDisconnect);

  /* ---------- Reference ---------- */
  function Ref(path,query){ this._path=path; this._query=query||null; }
  Ref.prototype.child=function(p){ return new Ref(this._path+'/'+p, null); };
  Ref.prototype.orderByChild=function(k){ return new Ref(this._path,{...(this._query||{}),orderByChild:k}); };
  Ref.prototype.equalTo=function(v){ return new Ref(this._path,{...(this._query||{}),equalTo:v}); };
  Ref.prototype.limitToFirst=function(n){ return new Ref(this._path,{...(this._query||{}),limitToFirst:n}); };
  Ref.prototype.limitToLast=function(n){ return new Ref(this._path,{...(this._query||{}),limitToLast:n}); };

  Ref.prototype.set=function(val){ const tree=readRoot(); setAt(tree,this._path,val==null?undefined:clone(val)); writeRoot(tree); bump(); return Promise.resolve(); };
  Ref.prototype.update=function(obj){
    const tree=readRoot(); let cur=getAt(tree,this._path);
    if(cur==null||typeof cur!=='object')cur={};
    cur={...cur,...clone(obj)};
    // gestion des cles imbriquees "a/b/c" dans update (utilisees par startGame)
    Object.keys(obj||{}).forEach(k=>{ if(k.indexOf('/')>=0){ delete cur[k]; setAt(tree,this._path+'/'+k,clone(obj[k])); } });
    setAt(tree,this._path,cur); writeRoot(tree); bump(); return Promise.resolve();
  };
  Ref.prototype.remove=function(){ const tree=readRoot(); removeAt(tree,this._path); writeRoot(tree); bump(); return Promise.resolve(); };
  Ref.prototype.push=function(val){
    const key='L'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
    const tree=readRoot(); setAt(tree,this._path+'/'+key, val==null?true:clone(val)); writeRoot(tree); bump();
    const r=new Ref(this._path+'/'+key,null); r.key=key; return r;
  };
  Ref.prototype.once=function(){ const tree=readRoot(); const v=resolveQuery(tree,{path:this._path,query:this._query}); return Promise.resolve(makeSnap(this._path,v)); };
  Ref.prototype.on=function(event,cb){
    const L={path:this._path,lastPath:this._path,query:this._query,event,cb,last:undefined,knownKeys:new Set()};
    listeners.push(L);
    // emission initiale (comme Firebase)
    try{
      const tree=readRoot();
      if(event==='value'){ L.last=clone(resolveQuery(tree,{path:this._path,query:this._query})); cb(makeSnap(this._path,L.last)); }
      else if(event==='child_added'){ const raw=getAt(tree,this._path); const obj=(raw&&typeof raw==='object')?raw:{}; for(const k of Object.keys(obj)){ L.knownKeys.add(k); cb(makeSnap(this._path+'/'+k,obj[k],k)); } }
    }catch(e){}
    cb.__lnet=L; return cb;
  };
  Ref.prototype.off=function(event,cb){
    for(let i=listeners.length-1;i>=0;i--){
      const L=listeners[i];
      if(L.path===this._path && (!event||L.event===event) && (!cb||L.cb===cb)) listeners.splice(i,1);
    }
  };
  Ref.prototype.transaction=function(fn){
    const tree=readRoot(); const cur=getAt(tree,this._path);
    const next=fn(cur===undefined?null:clone(cur));
    if(next===undefined){ return Promise.resolve({committed:false,snapshot:makeSnap(this._path,cur)}); }
    setAt(tree,this._path,clone(next)); writeRoot(tree); bump();
    return Promise.resolve({committed:true,snapshot:makeSnap(this._path,next)});
  };
  Ref.prototype.onDisconnect=function(){
    const path=this._path;
    return { remove:()=>{ disconnectOps.push({path}); return Promise.resolve(); },
             set:(v)=>{ disconnectOps.push({path,val:v}); return Promise.resolve(); },
             cancel:()=>{ for(let i=disconnectOps.length-1;i>=0;i--){ if(disconnectOps[i].path===path)disconnectOps.splice(i,1);} } };
  };

  /* ---------- objet "database" expose ---------- */
  const LocalDB={
    ref:(p)=>new Ref(p||'',null),
    __isLocal:true,
    goOnline:()=>{}, goOffline:()=>{}
  };

  // menage periodique : retire les salles fantomes (joueurs hors-ligne depuis >30s)
  setInterval(()=>{
    try{
      const tree=readRoot(); const rooms=tree.rooms||{}; let changed=false; const now=Date.now();
      Object.keys(rooms).forEach(code=>{
        const r=rooms[code]; if(!r)return;
        const players=r.players||{};
        Object.keys(players).forEach(uid=>{ const pl=players[uid]; if(pl&&pl.lastSeen&&now-pl.lastSeen>30000){ delete players[uid]; changed=true; } });
        if(!Object.keys(players).length){ delete rooms[code]; changed=true; }
      });
      if(changed){ writeRoot(tree); bump(); }
    }catch(e){}
  },12000);

  window.LocalDB=LocalDB;
})();

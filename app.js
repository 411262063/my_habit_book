import {firebaseConfig} from './firebase-config.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js';
import {getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,sendPasswordResetEmail} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';
import {initializeFirestore,getFirestore,persistentLocalCache,persistentMultipleTabManager,collection,doc,setDoc,onSnapshot} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const pd=s=>{const[a,b,c]=s.split('-').map(Number);return new Date(a,b-1,c)};
const addDays=(s,n)=>{const d=pd(s);d.setDate(d.getDate()+n);return ymd(d)};
const today=()=>ymd(new Date());
const WD='日一二三四五六';
const mondayOf=s=>{const d=pd(s);d.setDate(d.getDate()-((d.getDay()+6)%7));return ymd(d)};
const nid=()=>Math.random().toString(36).slice(2,9);
const fmt=n=>Math.round(n*100)/100;
function fmtDT(iso){const d=new Date(iso);if(isNaN(d))return '';return d.getFullYear()+'/'+pad(d.getMonth()+1)+'/'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())}
const COLORS=['#23756A','#3B6FD8','#C2456B','#D98A1F','#7A5AC8','#5E8C2E'];
const THEMES=[{k:'teal',n:'青綠',l:'#23756A',d:'#4FB3A3'},{k:'blue',n:'藍',l:'#2F5FD0',d:'#86A6F5'},{k:'rose',n:'玫瑰',l:'#B83D62',d:'#EE8AA8'},{k:'orange',n:'橘',l:'#B0600E',d:'#F2A95C'},{k:'purple',n:'紫',l:'#6A4BC0',d:'#AE99F2'},{k:'gray',n:'灰',l:'#66706E',d:'#A3ADAA'},{k:'ink',n:'墨黑',l:'#2E3A37',d:'#C9D3D0'}];
function hex2rgb(h){h=String(h||'#000000').replace('#','');return [0,2,4].map(i=>parseInt(h.substr(i,2),16)||0)}
function rgb2hex(r,g,b){return '#'+[r,g,b].map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('')}
function mixHex(h,w,t){const a=hex2rgb(h),b=hex2rgb(w);return rgb2hex(...a.map((x,i)=>x+(b[i]-x)*t))}
function lum(h){const c=hex2rgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function themeColors(t){if(t.accent==='custom'&&/^#[0-9a-f]{6}$/i.test(t.custom||'')){const c=t.custom;return {l:lum(c)>.45?mixHex(c,'#000000',.35):c,d:lum(c)<.18?mixHex(c,'#ffffff',.45):c}}return THEMES.find(x=>x.k===t.accent)||THEMES[0]}
function applyTheme(){const t=S.cfg.theme||{};const r=document.documentElement;
  if(t.mode==='light'||t.mode==='dark')r.setAttribute('data-theme',t.mode);else r.removeAttribute('data-theme');
  const a=r.getAttribute('data-theme');const dark=a==='dark'||(a!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);
  const th=themeColors(t);const ac=dark?th.d:th.l;r.style.setProperty('--accent',ac);r.style.setProperty('--good',ac);
  const dk=t.accent==='custom'&&t.ink==='dark';r.style.setProperty('--accent-ink',dk?'var(--ink-on-bright)':'var(--ink-on-deep)');r.style.setProperty('--accent-fill',fillFor(ac,dk?INK_DARK:'#FFFFFF'))}
/* 按鈕文字顏色：內建主題色一律白字；自訂主題色可以選白色（ink 沒設或 'white'）或深色（ink:'dark'），淺色、深色模式用同一個 */
const INK_DARK='#101614';/* 跟 style.css 的 --ink-on-bright 一樣 */
/* 按鈕底色：字看不清楚時，白字就把底色一點一點加黑、深色字就加白，直到對比到 4.5 */
function fillFor(c,ink){if(!/^#[0-9a-f]{6}$/i.test(c||''))return c;const li=lum(ink),to=li>.5?'#000000':'#FFFFFF';
  const cr=x=>{const a=lum(x);return (Math.max(a,li)+.05)/(Math.min(a,li)+.05)};let x=c,t=0;while(cr(x)<4.5&&t<.9){t=Math.round((t+.05)*100)/100;x=mixHex(c,to,t)}return x}
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>applyTheme())}catch(e){}
const TYPES={
  check:{label:'打勾',group:'pre',desc:'做了就按一下'},
  options:{label:'選項',group:'pre',desc:'從預先寫好的狀態裡選一個'},
  ratio:{label:'比例',group:'pre',desc:'記做到幾分之幾或百分比，例如睡眠 7/10、跟練操做了 60%'},
  number:{label:'數字',group:'manual',desc:'輸入數量，可設目標和快速加按鈕'},
  time:{label:'時間',group:'manual',desc:'記下幾點，例如起床時間'},
  text:{label:'文字',group:'manual',desc:'寫一段筆記'},
  list:{label:'多筆清單',group:'manual',desc:'一天記好幾筆，例如三餐份量、記帳'}
};

const S={cfg:{habits:[],rewards:[],redeemed:[]},days:{},rowEdit:null,restore:null,bmsg:'',view:'today',date:today(),
  calMonth:today().slice(0,7),calFilter:'all',mode:'loading',edit:null,confirm:null,drafts:{},
  user:null,auth:{view:'login',email:'',pw:'',pw2:'',err:'',busy:false,msg:''}};

/* ---------- storage ---------- */
let base=null,unsub=null;const timers={},inflight={},dirty={};
const LS='habit-book-v1';
let fbAuth=null,fbDb=null,fbReady=false;
try{
  const app=initializeApp(firebaseConfig);
  fbAuth=getAuth(app);
  try{fbDb=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})})}
  catch(e2){fbDb=getFirestore(app)} /* 離線快取用不到時（例如 Safari 隱私瀏覽），退回沒有離線快取但一樣能同步的模式 */
  fbReady=true;
}catch(e){fbReady=false}
function authErrMsg(e){const M={
  'auth/invalid-email':'email 格式不對，請檢查一下。',
  'auth/user-not-found':'找不到這個帳號，email 有打對嗎？',
  'auth/wrong-password':'密碼不對。',
  'auth/invalid-credential':'email 或密碼不對。',
  'auth/email-already-in-use':'這個 email 已經註冊過了，直接登入就好。',
  'auth/weak-password':'密碼至少要 6 個字。',
  'auth/too-many-requests':'嘗試太多次了，請稍後再試。',
  'auth/network-request-failed':'連不到網路，請檢查網路連線再試一次。'
};return (e&&M[e.code])||'發生錯誤，請再試一次。'}
function saveLocal(){try{localStorage.setItem(LS,JSON.stringify({cfg:S.cfg,days:S.days}))}catch(e){}}
function loadLocal(){try{const j=JSON.parse(localStorage.getItem(LS)||'null');if(j){S.cfg=j.cfg||S.cfg;S.days=j.days||{}}}catch(e){}}
function setSync(t){$('#sync').textContent=t}
function body(key){return key==='config'?S.cfg:{date:key.slice(2),e:S.days[key.slice(2)]||{}}}
function save(key,delay=400){
  if(S.mode!=='cloud'){saveLocal();return}
  clearTimeout(timers[key]);
  timers[key]=setTimeout(()=>{timers[key]=null;writeDoc(key)},delay);
  setSync('同步中…');
}
async function writeDoc(key){
  if(inflight[key]){dirty[key]=true;return}
  inflight[key]=true;
  try{await setDoc(doc(base,key),JSON.parse(JSON.stringify(body(key))))}
  catch(e){
    inflight[key]=false;
    if(e&&e.code==='unavailable'){setTimeout(()=>writeDoc(key),800+Math.random()*800);return}
    if(e&&e.code==='permission-denied'){S.mode='local';saveLocal();setSync('你目前沒有在雲端儲存資料的權限，紀錄先存在這個瀏覽器。');return}
    setSync(e&&e.code==='resource-exhausted'?'雲端空間已滿，最新的變更沒有存到。':'這筆變更沒有存到雲端，請稍後再試一次。');return;
  }
  inflight[key]=false;
  if(dirty[key]){dirty[key]=false;return writeDoc(key)}
  if(!Object.values(inflight).some(Boolean)&&!Object.values(timers).some(Boolean))setSync('已同步到雲端，手機和電腦看到的是同一份。');
}
function dayKey(ds){return 'd-'+ds}
function entries(ds){return S.days[ds]||(S.days[ds]={})}
/* 鎖定時順便記下「判斷完成要用到的設定」s，之後修改過去那天的紀錄，就照當天的設定重算，不照現在的 */
function lockSnap(h){const s={type:h.type,points:Number(h.points)||0};if(h.target!==undefined)s.target=h.target;if(h.dir!=null)s.dir=h.dir;if(h.minCount!=null)s.minCount=h.minCount;
  if(h.type==='options')s.od=(h.options||[]).map(o=>!!(o&&o.done));return s}
function fromSnap(h,s){const x=Object.assign({},h,{type:s.type,points:s.points,target:s.target,dir:s.dir,minCount:s.minCount});if(s.od)x.options=s.od.map(d=>({done:d}));return x}
function relock(ds,h){const e=entries(ds);const r=e.__r||(e.__r={});const v=e[h.id];const old=r[h.id];const past=ds<today();
  let use=h;
  if(past&&old){if(old.s)use=fromSnap(h,old.s);else if(old.d)use=Object.assign({},h,{points:Number(old.p)||0})} /* 舊的鎖定沒有 s：點數用當時拿到的，完成與否用現在的目標 */
  const s=lockSnap(use);
  if(v===undefined){if(past&&old)r[h.id]={d:false,p:0,s};else delete r[h.id];return} /* 過去的紀錄清掉時保留 s，再填回來還是照當天的設定 */
  const d=isDone(use,v);r[h.id]={d,p:d?s.points:0,s}}
function setVal(ds,hid,v){const e=entries(ds);if(v===null||v===undefined)delete e[hid];else e[hid]=v;const h=S.cfg.habits.find(x=>x.id===hid);if(h)relock(ds,h);save(dayKey(ds))}
function setCfg(){save('config',200)}
/* 改設定或刪除習慣之前，先用「舊的」設定把還沒鎖定的紀錄鎖起來，過去的結果和點數才不會跟著變 */
function lockUnlocked(h,skip){for(const d in S.days){if(d===skip)continue;const e=S.days[d];if(e[h.id]!==undefined&&!(e.__r&&e.__r[h.id])){relock(d,h);save(dayKey(d),50)}}}

async function init(){
  render();
  if(!fbReady){useLocal('這裡連不到雲端服務，資料只會存在這個瀏覽器。');return}
  try{
    onAuthStateChanged(fbAuth,u=>{
      if(u){S.user=u;startCloud(u.uid)}
      else{S.user=null;stopCloud();S.mode='auth';S.auth=Object.assign(S.auth,{err:'',busy:false});render()}
    },()=>{useLocal('連不到雲端，資料先存在這個瀏覽器。')});
  }catch(e){useLocal('連不到雲端，資料先存在這個瀏覽器。')}
}
function startCloud(uid){
  if(unsub){unsub();unsub=null}
  S.mode='loading';render();
  base=collection(fbDb,'data/users/'+uid);
  const slow=setTimeout(()=>{if(S.mode==='loading')setSync('雲端連線比較慢，資料還在載入…')},10000);
  unsub=onSnapshot(base,snap=>{
    if(!snap.metadata.fromCache)clearTimeout(slow);
    for(const d of snap.docs){
      const k=d.id;if(timers[k]||inflight[k])continue;
      const v=JSON.parse(JSON.stringify(d.data()||{}));/* snapshots are frozen: copy before editing */
      if(k==='config'){S.cfg={habits:v.habits||[],rewards:v.rewards||[],redeemed:v.redeemed||[],theme:v.theme||{},goals:v.goals||{},mig:v.mig||{},rwSort:v.rwSort||'custom',lastBackup:v.lastBackup||null};migrate()}
      else if(k.startsWith('d-'))S.days[k.slice(2)]=v.e||{};
    }
    if(S.mode==='loading'){S.mode='cloud';setSync('已同步到雲端，手機和電腦看到的是同一份。')}
    renderSoon();
  },err=>{clearTimeout(slow);if(S.mode==='loading')useLocal('連不到雲端，資料先存在這個瀏覽器。');else setSync('和雲端的連線中斷了，重新整理頁面可以再連一次。')});
}
function stopCloud(){if(unsub){unsub();unsub=null}Object.keys(timers).forEach(k=>{clearTimeout(timers[k]);delete timers[k]});base=null;S.cfg={habits:[],rewards:[],redeemed:[]};S.days={}}
function useLocal(msg){S.mode='local';loadLocal();migrate();setSync(msg);render()}

/* ---------- logic ---------- */
function freqLabel(h){const f=h.freq||{kind:'daily'};
  if(f.kind==='weekdays')return '每週'+(f.days||[]).slice().sort((a,b)=>((a+6)%7)-((b+6)%7)).map(d=>WD[d]).join('、');
  if(f.kind==='weekly')return '每週 '+(f.times||1)+' 次';return '每天'}
function scheduled(h,ds){if(h.created&&ds<h.created)return false;const f=h.freq||{kind:'daily'};
  if(f.kind==='weekdays')return (f.days||[]).includes(pd(ds).getDay());return true}
function isDone(h,v){
  if(v===undefined||v===null||v==='')return false;
  switch(h.type){
    case 'check':return v===true;
    case 'options':return !!(h.options&&h.options[v]&&h.options[v].done);
    case 'number':if(typeof v!=='number')return false;if(h.target===''||h.target==null||h.dir==='none')return true;return h.dir==='le'?v<=h.target:v>=h.target;
    case 'time':if(typeof v!=='string')return false;if(!h.target||h.dir==='none')return true;return h.dir==='after'?v>=h.target:v<=h.target;
    case 'text':return String(v).trim()!=='';
    case 'ratio':if(typeof v!=='number')return false;if(h.dir!=='none'&&h.target!==''&&h.target!=null)return v>=h.target;return v>0;
    case 'list':return Array.isArray(v)&&v.length>=(h.minCount||1);
  }return false}
function doneOn(h,ds){const e=S.days[ds]||{};if(e.__r&&e.__r[h.id])return e.__r[h.id].d;return isDone(h,e[h.id])}
function ptsOn(h,ds){const e=S.days[ds]||{};if(e.__r&&e.__r[h.id])return e.__r[h.id].p;return isDone(h,e[h.id])?(Number(h.points)||0):0}
function weekCount(h,ds){const m=mondayOf(ds);let c=0;for(let i=0;i<7;i++)if(doneOn(h,addDays(m,i)))c++;return c}
function earned(){let p=0;for(const ds in S.days){const e=S.days[ds];const r=e.__r||{};for(const k in e){if(k==='__r'||k==='__log')continue;if(r[k]){p+=Number(r[k].p)||0;continue}const h=S.cfg.habits.find(x=>x.id===k);if(h&&isDone(h,e[k]))p+=Number(h.points)||0}}return p}
function spent(){return (S.cfg.redeemed||[]).reduce((a,r)=>a+(Number(r.cost)||0),0)}
function balance(){return earned()-spent()}
function dayRatio(ds){const hs=S.cfg.habits.filter(h=>(h.freq||{}).kind!=='weekly'&&scheduled(h,ds));
  const d=hs.filter(h=>doneOn(h,ds)).length;return {d,t:hs.length}}
function migrate(){const m=S.cfg.mig||{};if(m.ex)return;const h=S.cfg.habits.find(x=>x.name==='跟練操'&&x.type!=='list');S.cfg.mig=Object.assign({},m,{ex:1});
  if(h){for(const d in S.days){const e=S.days[d];if(e[h.id]!==undefined&&!(e.__r&&e.__r[h.id])){relock(d,h);save(dayKey(d),80)}}
    Object.assign(h,{name:'運動',type:'list',presets:'跟練操,皮拉提斯,重訓,有氧,走路',fields:['時間:分鐘'],minCount:1,labelHint:'內容'})}
  if(S.cfg.habits.length||h)setCfg()}
function calcEval(ex){let t=String(ex).replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/[*/+\-.]+$/,'');if(t==='')return null;
  if(!/^-?\d*\.?\d+([*/+\-]\d*\.?\d+)*$/.test(t))return null;try{const r=Function('return ('+t+')')();return isFinite(r)?Math.round(r*100)/100:null}catch(e){return null}}
function vCalc(){const c=S.calc;const x=S.cfg.habits.find(h=>h.id===c.hid);if(!x)return '';const r=calcEval(c.ex);const hasT=x.dir!=='none'&&x.target!==''&&x.target!=null;
  const K=(k,l,cls,lab)=>'<button class="key '+(cls||'')+'" data-act="key" data-v="'+k+'"'+(lab?' aria-label="'+lab+'"':'')+'>'+l+'</button>';
  return '<div class="modal" data-act="calcbg"><div class="sheet calcsheet" role="dialog" aria-modal="true" aria-label="記錄 '+esc(x.name)+'"><div class="row between"><b style="font-size:17px">'+esc(x.name)+'</b><span class="meta">'+(hasT?(x.dir==='le'?'最多 ':'目標 ')+fmt(x.target)+' '+esc(x.unit||''):'')+'</span></div>'+
  '<div class="cdisp"><div class="cex">'+(esc(c.ex)||'&nbsp;')+'</div><div class="cres">= '+(r==null?'—':fmt(Math.max(0,r)))+' <small>'+esc(x.unit||'')+'</small></div></div>'+
  '<div class="keys"><div class="kn">'+['7','8','9','4','5','6','1','2','3','.','0'].map(k=>K(k,k)).join('')+K('back','<span aria-hidden="true">⌫</span>','','刪除一個字')+'</div>'+
  '<div class="ko">'+K('+','+','op')+K('−','−','op')+K('×','×','op')+K('÷','÷','op')+K('C','C','','全部清除')+'<button class="key" data-act="calcclose">取消</button><button class="key ok" data-act="calcok">確定</button></div></div>'+
  '<p class="hint" style="margin:8px 0 0">一開始顯示今天的數字，直接按 + 300 就是加上去；按 C 可以清掉重打。</p></div></div>'}
function calcKey(k){const c=S.calc;if(!c)return;let e=c.ex;const ops='+−×÷';
  if(k==='C'){e='';c.cleared=true}else if(k==='back'){e=e.slice(0,-1)}
  else if(ops.includes(k)){if(e==='')return;if(ops.includes(e.slice(-1)))e=e.slice(0,-1);e+=k}
  else if(k==='.'){const seg=e.split(/[+−×÷]/).pop();if(seg.includes('.'))return;e+=(seg===''?'0':'')+'.'}
  else{if(e.length>24)return;e+=k}
  c.ex=e;$('#modal').innerHTML=vCalc()}
function sortIcon(m){const L=m==='asc'?[4,7,10]:m==='desc'?[10,7,4]:[10,10,10];
  const arrow=m==='custom'?'<polyline points="16,6 18,3 20,6" fill="none"/><polyline points="16,12 18,15 20,12" fill="none"/>':'<line x1="18" y1="3" x2="18" y2="15"/><polyline points="15,12 18,15 21,12" fill="none"/>';
  return '<svg width="24" height="20" viewBox="0 0 22 18" aria-hidden="true"><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="2" y1="4" x2="'+(2+L[0])+'" y2="4"/><line x1="2" y1="9" x2="'+(2+L[1])+'" y2="9"/><line x1="2" y1="14" x2="'+(2+L[2])+'" y2="14"/>'+arrow+'</g></svg>'}
let DRAG=null;
document.addEventListener('pointerdown',ev=>{const g=ev.target.closest('[data-grip]');if(!g)return;const item=g.closest('[data-ditem]');const list=item&&item.closest('[data-dlist]');if(!list)return;
  ev.preventDefault();DRAG={item,list,id:ev.pointerId,y:ev.clientY};item.classList.add('dragging');S.dragging=true;try{g.setPointerCapture(ev.pointerId)}catch(e){}});
document.addEventListener('pointermove',ev=>{if(!DRAG||ev.pointerId!==DRAG.id)return;ev.preventDefault();const {item,list}=DRAG;
  const sibs=[...list.querySelectorAll(':scope > [data-ditem]')].filter(n=>n!==item);let before=null;
  for(const n of sibs){const r=n.getBoundingClientRect();if(ev.clientY<r.top+r.height/2){before=n;break}}
  if(before!==item.nextElementSibling||(!before&&item!==list.lastElementChild)){list.insertBefore(item,before)}
  if(ev.clientY<70)window.scrollBy(0,-12);else if(ev.clientY>window.innerHeight-70)window.scrollBy(0,12)},{passive:false});
function endDrag(){if(!DRAG)return;const {item,list}=DRAG;item.classList.remove('dragging');const ids=[...list.querySelectorAll(':scope > [data-ditem]')].map(n=>n.dataset.ditem);
  const key=list.dataset.dlist;const arr=key==='habits'?S.cfg.habits:S.cfg.rewards;const before=arr.map(x=>x.id).join();
  const sorted=ids.map(id=>arr.find(x=>x.id===id)).filter(Boolean);arr.filter(x=>!ids.includes(x.id)).forEach(x=>sorted.push(x));
  if(key==='habits')S.cfg.habits=sorted;else S.cfg.rewards=sorted;DRAG=null;S.dragging=false;if(sorted.map(x=>x.id).join()!==before)setCfg();render()}
document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',endDrag);
document.addEventListener('keydown',ev=>{const g=ev.target.closest&&ev.target.closest('[data-grip]');if(!g||(ev.key!=='ArrowUp'&&ev.key!=='ArrowDown'))return;ev.preventDefault();
  const item=g.closest('[data-ditem]');const list=item.closest('[data-dlist]');const key=list.dataset.dlist;const arr=(key==='habits'?S.cfg.habits:S.cfg.rewards).slice();
  const i=arr.findIndex(x=>x.id===item.dataset.ditem);const j=ev.key==='ArrowUp'?i-1:i+1;if(j<0||j>=arr.length)return;[arr[i],arr[j]]=[arr[j],arr[i]];
  if(key==='habits')S.cfg.habits=arr;else S.cfg.rewards=arr;setCfg();render();const ng=document.querySelector('[data-ditem="'+item.dataset.ditem+'"] [data-grip]');ng&&ng.focus()});
function logOf(ds,hid){const e=S.days[ds]||{};return ((e.__log||{})[hid])||[]}
function setLog(ds,hid,arr){const e=entries(ds);e.__log=Object.assign({},e.__log||{});if(arr&&arr.length)e.__log[hid]=arr;else delete e.__log[hid]}
function ring(pct,color,size,inner,th){const p=Math.max(0,Math.min(1,pct||0));return '<span class="ring'+(p>=1&&inner&&inner.indexOf('✓')>=0?' full':'')+'" style="--p:'+Math.round(p*100)+';--rc:'+color+';--sz:'+size+'px;--th:'+(th||5)+'px">'+(inner||'')+'</span>'}
function ratioMax(h){return h.mode==='pct'?100:Math.max(2,Math.min(1000,Number(h.denom)||10))}
function ratioTxt(h,v){return h.mode==='pct'?fmt(v)+'%':fmt(v)+' / '+ratioMax(h)}
function habitPct(h,v){if(h.type==='ratio'&&typeof v==='number')return v/ratioMax(h);if(h.type==='number'&&typeof v==='number'&&h.dir==='ge'&&h.target)return v/h.target;if(h.type==='list'&&Array.isArray(v))return v.length/(h.minCount||1);return 0}
const FIELD_UNIT={'主食':'拳','蛋白':'掌心','蛋白質':'掌心','蔬菜':'拳','金額':'元'};
function fName(f){return String(f).split(/[:：]/)[0].trim()}
function fUnit(f){const p=String(f).split(/[:：]/);return p.length>1?p[1].trim():(FIELD_UNIT[p[0].trim()]||'')}
function labelPh(h){return (h.fields||[]).some(f=>fName(f)==='主食')?'吃了什麼':'內容'}
function presetsOf(h){if(h.presets!=null&&String(h.presets).trim()!=='')return String(h.presets).split(/[,，、／\/]/).map(s=>s.trim()).filter(Boolean);if(h.presets==null){const l=String(h.labelHint||'').split(/[／\/、]/).map(s=>s.trim()).filter(Boolean);if(l.length>1)return l}return []}
function listSums(h,v){const n=(h.fields||[]).length;const s=new Array(n).fill(0);(v||[]).forEach(r=>(r.f||[]).forEach((x,i)=>{if(i<n)s[i]+=Number(x)||0}));return s}

/* ---------- render ---------- */
let pending=false;
function renderSoon(){if(S.dragging){pending=true;return}const a=document.activeElement;if(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)&&(a.closest('#view')||a.closest('#modal'))){pending=true;return}render()}
document.addEventListener('focusout',()=>setTimeout(()=>{if(pending){pending=false;renderSoon()}},0));
function render(){
  applyTheme();
  $('#ptsVal').textContent=balance();
  $('#tabs').style.display=(S.mode==='auth'||S.mode==='loading')?'none':'';
  document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-current',b.dataset.v===S.view?'page':'false'));
  const v=$('#view');
  if(S.mode==='loading'){v.innerHTML='<div class="card empty">正在載入你的紀錄…</div>';$('#modal').innerHTML='';return}
  if(S.mode==='auth'){v.innerHTML=vAuth();$('#modal').innerHTML='';return}
  v.innerHTML=S.view==='today'?vToday():S.view==='cal'?vCal():S.view==='habits'?vHabits():S.view==='settings'?vSettings():vRewards();
  $('#modal').innerHTML=S.edit?vEdit():S.calc?vCalc():'';
}
function vAuth(){
  const a=S.auth;let h='<div class="stack"><div class="card">';
  if(a.view==='reset'){
    h+='<b>重設密碼</b><p class="hint" style="margin:6px 0 10px">輸入註冊時用的 email，我們會寄一封重設密碼的信過去。</p>';
    h+='<div class="fld"><label for="au-email">Email</label><input type="email" id="au-email" data-au="email" value="'+esc(a.email)+'" autocomplete="username"></div>';
    if(a.err)h+='<p class="hint" style="color:var(--warn)">'+esc(a.err)+'</p>';
    if(a.msg)h+='<p class="hint">'+esc(a.msg)+'</p>';
    h+='<div class="row"><button class="btn pri big" data-act="authreset"'+(a.busy?' disabled':'')+'>寄出重設信</button></div>';
    h+='<p style="margin-top:12px"><button class="btn ghost sm" data-act="authview" data-v="login">回到登入</button></p>';
  }else{
    const signup=a.view==='signup';
    h+='<b>'+(signup?'建立帳號':'登入')+'</b><p class="hint" style="margin:6px 0 10px">'+(signup?'手機和電腦用同一個帳號登入，資料就會自動同步。':'用你的帳號登入，手機和電腦都能看到同一份紀錄。')+'</p>';
    h+='<div class="fld"><label for="au-email">Email</label><input type="email" id="au-email" data-au="email" value="'+esc(a.email)+'" autocomplete="username"></div>';
    h+='<div class="fld"><label for="au-pw">密碼</label><input type="password" id="au-pw" data-au="pw" value="'+esc(a.pw)+'" autocomplete="'+(signup?'new-password':'current-password')+'"></div>';
    if(signup)h+='<div class="fld"><label for="au-pw2">再輸入一次密碼</label><input type="password" id="au-pw2" data-au="pw2" value="'+esc(a.pw2)+'" autocomplete="new-password"></div>';
    if(a.err)h+='<p class="hint" style="color:var(--warn)">'+esc(a.err)+'</p>';
    h+='<div class="row"><button class="btn pri big" data-act="'+(signup?'authsignup':'authlogin')+'"'+(a.busy?' disabled':'')+'>'+(signup?'建立帳號並登入':'登入')+'</button></div>';
    h+='<p style="margin-top:12px">'+(signup?'已經有帳號了？<button class="btn ghost sm" data-act="authview" data-v="login">登入</button>':'還沒有帳號？<button class="btn ghost sm" data-act="authview" data-v="signup">建立帳號</button>　<button class="btn ghost sm" data-act="authview" data-v="reset">忘記密碼</button>')+'</p>';
  }
  return h+'</div></div>'}
function dateTitle(ds){const d=pd(ds);return (d.getMonth()+1)+'/'+d.getDate()+'（'+WD[d.getDay()]+'）'}
function vToday(){
  const ds=S.date,isT=ds===today();const hs=S.cfg.habits;
  let h='<div class="stack">';
  h+='<div class="card datebar"><button class="circ" data-act="day" data-v="-1" aria-label="前一天">‹</button><div class="d">'+dateTitle(ds)+(isT?'':'<div><button class="btn sm ghost" data-act="gotoday">回到今天</button></div>')+'</div><button class="circ" data-act="day" data-v="1" aria-label="後一天">›</button></div>';
  if(!hs.length)return h+vStarter()+'</div>';
  const due=hs.filter(x=>scheduled(x,ds));const done=due.filter(x=>doneOn(x,ds));
  let pts=0;due.forEach(x=>pts+=ptsOn(x,ds));
  {const pc=due.length?done.length/due.length:0;h+='<div class="card hhead">'+ring(pc,'var(--accent)',68,'<span style="font-size:17px">'+Math.round(pc*100)+'%</span>',7)+'<div class="grow"><div class="hname">完成 '+done.length+' / '+due.length+' 項</div><div class="meta">這天得到 '+pts+' 點'+(done.length===due.length&&due.length?'，全部完成！':'')+'</div></div></div>'}
  const off=hs.filter(x=>!scheduled(x,ds));
  for(const x of due)h+=vHabitCard(x,ds);
  if(off.length)h+='<p class="hint">今天沒有排：'+off.map(x=>esc(x.name)).join('、')+'</p>';
  return h+'</div>'}
function vStarter(){return '<div class="card empty"><p><b>還沒有任何習慣</b></p><p>可以先套用建議的習慣（起床、飲食、喝水、步數、跟練操、記帳、睡眠分數），之後隨時改。</p><div class="row" style="justify-content:center"><button class="btn pri" data-act="template">套用建議習慣</button><button class="btn" data-act="new">自己新增</button></div></div>'}
function vHabitCard(x,ds){
  const v=(S.days[ds]||{})[x.id];const d=doneOn(x,ds);
  let chip=d?'<span class="chip done">完成 +'+ptsOn(x,ds)+'</span>':'<span class="chip">未完成</span>';
  if((x.freq||{}).kind==='weekly'){const c=weekCount(x,ds),t=x.freq.times||1;chip+=' <span class="chip week">本週 '+c+'/'+t+'</span>'}
  const hc=esc(x.color||COLORS[0]);
  let h='<div class="card habit" style="--hc:'+hc+';--hc-ink:var(--ink-on-deep)"><div class="hhead">'+ring(d?1:habitPct(x,v),hc,40,d?'<span>✓</span>':'',5)+'<div class="grow"><div class="hname">'+esc(x.name)+'</div><div class="meta">'+freqLabel(x)+'</div></div><div style="margin-right:14px">'+chip+'</div></div><div style="margin-top:12px">';
  const a='data-h="'+x.id+'"';
  switch(x.type){
    case 'check':h+='<button class="tick" data-act="check" '+a+' aria-pressed="'+(v===true)+'"><span class="o">✓</span><span>'+(v===true?'已完成<span class="meta" style="display:block;font-weight:400">再按一下可以取消</span>':'做完了就按一下')+'</span></button>';break;
    case 'options':h+='<div class="seg" style="--hc:'+esc(x.color)+'">'+(x.options||[]).map((o,i)=>'<button data-act="opt" '+a+' data-v="'+i+'" aria-pressed="'+(v===i)+'">'+esc(o.label)+'</button>').join('')+'</div>';break;
    case 'number':{
      const hasT=x.dir!=='none'&&x.target!==''&&x.target!=null;const up=x.dir!=='le';const has=typeof v==='number';
      const steps=String(x.steps||'').split(/[,，\s]+/).map(Number).filter(n=>n>0);
      const log=logOf(ds,x.id);const lsum=log.reduce((q,r)=>q+(Number(r.a)||0),0);const pre=has?fmt(v-lsum):0;
      const pc=hasT&&up&&has?v/x.target:(hasT&&!up&&has?Math.min(1,v/x.target):0);
      let msg='';if(hasT&&has)msg=up?(v>=x.target?'今天已經達標了':'還差 '+fmt(x.target-v)+' '+esc(x.unit||'')):(v<=x.target?'在目標內，還有 '+fmt(x.target-v)+' '+esc(x.unit||''):'超過目標 '+fmt(v-x.target)+' '+esc(x.unit||''));
      else if(hasT)msg=(up?'目標 ':'最多 ')+fmt(x.target)+' '+esc(x.unit||'');else msg='有記錄就算完成';
      h+='<div class="acc">'+ring(pc,hc,124,'<span class="accv"><b>'+(has?fmt(v):0)+'</b><small>'+(hasT?(up?'/ ':'最多 ')+fmt(x.target)+' ':'')+esc(x.unit||'')+'</small></span>',10)+
        '<div class="accr"><div class="meta" style="font-size:14px">'+msg+'</div>'+(steps.length?'<div class="qrow">'+steps.map(s2=>'<button class="cup" data-act="add" '+a+' data-v="'+s2+'">+'+s2+'</button>').join('')+'</div>':'')+
        '<button class="btn pri recbtn" data-act="calcopen" '+a+'>記錄</button></div></div>';
      if(log.length||pre>0)h+='<div class="logs"><span class="meta">今天的紀錄（點 × 可以復原那一次）</span><div class="row" style="gap:6px">'+(pre>0?'<span class="logc">之前 '+pre+'<button data-act="dellog" '+a+' data-v="pre" aria-label="刪除">×</button></span>':'')+log.map((r,k)=>'<span class="logc"><i>'+esc(r.t||'')+'</i> '+(r.set!=null?'設為 '+fmt(r.set):((r.a>=0?'+':'')+fmt(r.a)))+'<button data-act="dellog" '+a+' data-v="'+k+'" aria-label="復原這一次">×</button></span>').join('')+'</div></div>';
      break}
    case 'time':{
      const tgt=x.target&&x.dir!=='none'?'目標 '+x.target+(x.dir==='after'?' 之後':' 之前'):'';
      h+='<div class="row between"><div class="row"><input type="time" id="t-'+x.id+'" data-in="time" '+a+' value="'+esc(typeof v==='string'?v:'')+'"><button class="btn sm" data-act="now" '+a+'>現在</button>'+(v?'<button class="btn sm ghost" data-act="clear" '+a+'>清除</button>':'')+'</div><span class="meta">'+tgt+'</span></div>';break}
    case 'ratio':{const mx=ratioMax(x);const has=typeof v==='number';
      const tgt=(x.dir!=='none'&&x.target!==''&&x.target!=null)?'目標 ≥ '+ratioTxt(x,x.target):'';
      h+='<div class="row between"><div><span class="val" id="rv-'+x.id+'">'+(has?ratioTxt(x,v):'—')+'</span></div><span class="meta">'+tgt+'</span></div>';
      if(x.mode!=='pct'&&mx<=10)h+='<div class="pips" style="--hc:'+hc+';grid-template-columns:repeat('+mx+',1fr)">'+Array.from({length:mx},(_,k)=>'<button class="pip'+(has&&k<v?' on':'')+'" data-act="ratio" '+a+' data-v="'+(k+1)+'" aria-label="'+(k+1)+' / '+mx+'">'+(k+1)+'</button>').join('')+'</div>';
      else{const st=x.mode==='pct'?5:1;h+='<input type="range" class="rslide" style="--hc:'+hc+'" min="0" max="'+mx+'" step="'+st+'" data-in="ratio" '+a+' value="'+(has?v:0)+'" aria-label="'+esc(x.name)+'">';
        if(x.mode!=='pct')h+='<div class="row"><label class="meta" for="rn-'+x.id+'">直接輸入</label><input type="number" inputmode="numeric" class="num" id="rn-'+x.id+'" data-in="ratio" '+a+' min="0" max="'+mx+'" value="'+(has?v:'')+'"><span class="meta">/ '+mx+'</span></div>';
        if(x.mode==='pct')h+='<div class="row">'+[25,50,75,100].map(q=>'<button class="btn sm" data-act="ratio" '+a+' data-v="'+q+'">'+q+'%</button>').join('')+'</div>'}
      if(has)h+='<button class="btn sm ghost" data-act="clear" '+a+' style="margin-top:4px">清除</button>';break}
    case 'text':h+='<textarea id="x-'+x.id+'" data-in="text" '+a+' placeholder="寫點什麼…">'+esc(typeof v==='string'?v:'')+'</textarea>';break;
    case 'list':{
      const rows=Array.isArray(v)?v:[];const fl=x.fields||[];const sums=listSums(x,rows);
      h+='<div class="list">'+(rows.length?rows.map((r,i)=>'<div class="li lrow"><span class="mv"><button class="btn sm ghost" data-act="rowup" '+a+' data-v="'+i+'" aria-label="往上移"'+(i?'':' disabled')+'>▲</button><button class="btn sm ghost" data-act="rowdown" '+a+' data-v="'+i+'" aria-label="往下移"'+(i<rows.length-1?'':' disabled')+'>▼</button></span><span class="lt"><span>'+(r.tag?'<span class="tag">'+esc(r.tag)+'</span>':'')+'<b>'+esc(r.label||(r.tag?'':'第 '+(i+1)+' 筆'))+'</b></span><span class="lv">'+fl.map((f,j)=>esc(fName(f))+' '+fmt(Number((r.f||[])[j])||0)+esc(fUnit(f))).join('・')+'</span></span><span class="row"><button class="btn sm ghost" data-act="editrow" '+a+' data-v="'+i+'">修改</button><button class="btn sm ghost" data-act="delrow" '+a+' data-v="'+i+'" aria-label="刪除這筆">刪除</button></span></div>').join(''):'<span class="meta">還沒有紀錄</span>')+'</div>';
      if(rows.length&&fl.length)h+='<div class="meta">合計：'+fl.map((f,j)=>esc(fName(f))+' '+fmt(sums[j])+esc(fUnit(f))).join('・')+(x.minCount>1?'（至少 '+x.minCount+' 筆算完成）':'')+'</div>';
      const dr=S.drafts[x.id]||{};const pre=presetsOf(x);const re=S.rowEdit&&S.rowEdit.hid===x.id;
      h+='<div class="addbox">'+(re?'<div class="meta">正在修改第 '+(S.rowEdit.i+1)+' 筆</div>':'')+'<div class="addline">'+(pre.length?'<select id="g-'+x.id+'" data-in="dtag" '+a+' aria-label="標籤"><option value="">不選標籤</option>'+pre.map(p=>'<option'+(dr.tag===p?' selected':'')+'>'+esc(p)+'</option>').join('')+'</select>':'')+'<input type="text" id="l-'+x.id+'" data-in="dlabel" '+a+' placeholder="'+esc(labelPh(x))+'" value="'+esc(dr.label||'')+'" aria-label="內容"></div>';
      h+=(fl.length?'<div class="fields">'+fl.map((f,j)=>'<label for="f-'+x.id+'-'+j+'">'+esc(fName(f))+'<input type="number" inputmode="decimal" step="0.5" id="f-'+x.id+'-'+j+'" data-in="dfield" data-j="'+j+'" '+a+' placeholder="'+esc(fUnit(f))+'" value="'+esc((dr.f||[])[j]??'')+'"></label>').join('')+'</div>':'')+'<div class="row" style="justify-content:flex-end"><button class="btn ghost sm" data-act="rowcancel" '+a+(re||dr.label||dr.tag?'':' hidden')+'>取消</button><button class="btn pri" data-act="addrow" '+a+'>'+(re?'更新這筆':'＋ 新增一筆')+'</button></div></div>';break}
  }
  return h+'</div></div>'}

function vCal(){
  const [y,m]=S.calMonth.split('-').map(Number);const first=new Date(y,m-1,1);const days=new Date(y,m,0).getDate();
  const lead=(first.getDay()+6)%7;const t=today();const hs=S.cfg.habits;
  const one=S.calFilter==='all'?null:hs.find(h=>h.id===S.calFilter);
  let h='<div class="stack"><div class="card datebar"><button class="circ" data-act="mon" data-v="-1" aria-label="上個月">‹</button><div class="d">'+y+' 年 '+m+' 月</div><button class="circ" data-act="mon" data-v="1" aria-label="下個月">›</button></div>';
  {const g=((S.cfg.goals||{})[S.calMonth])||'';h+='<div class="card goalcard"><label class="hname" for="mgoal" style="display:block;margin-bottom:6px">'+m+' 月目標</label><textarea id="mgoal" data-in="mgoal" placeholder="寫下這個月想達成的事，例如：腰圍少 2 公分、每週跟練操 5 次">'+esc(g)+'</textarea></div>'}
  if(one)h+='<div class="card hhead"><span style="width:14px;height:14px;flex:none;background:'+esc(one.color)+';transform:rotate(45deg);border-radius:2px"></span><div class="grow"><div class="hname">'+esc(one.name)+' 的目標</div><div class="meta" style="font-size:15px;color:var(--ink)">'+goalText(one)+'</div></div></div>';
  h+='<div class="card"><div class="fld" style="margin-bottom:10px"><label for="calf">看哪個習慣</label><select id="calf" data-in="calf"><option value="all">全部習慣（完成比例）</option>'+hs.map(x=>'<option value="'+x.id+'"'+(S.calFilter===x.id?' selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></div>';
  h+='<div class="cal">'+'一二三四五六日'.split('').map(c=>'<div class="h">'+c+'</div>').join('');
  for(let i=0;i<lead;i++)h+='<div class="cell out"></div>';
  let sumD=0,sumT=0,doneDays=0,schedDays=0,run=0,best=0;
  for(let d=1;d<=days;d++){
    const ds=y+'-'+pad(m)+'-'+pad(d);const fut=ds>t;let style='',inner='<span class="n">'+d+'</span>';
    if(!one){const r=dayRatio(ds);if(!fut&&r.t){sumD+=r.d;sumT+=r.t;const p=r.d/r.t;style='background:color-mix(in srgb,var(--accent-fill) '+Math.round(p*85)+'%,var(--card));'+(p>.55?'color:var(--accent-ink)':'');inner+='<span class="s" style="'+(p>.55?'color:inherit':'')+'">'+r.d+'/'+r.t+'</span>'}}
    else{const sc=scheduled(one,ds);const dn=doneOn(one,ds);
      if(!fut&&sc){schedDays++;if(dn){doneDays++;run++;best=Math.max(best,run)}else if(ds!==t)run=0}
      if(dn)inner+='<span class="dot" style="background:'+esc(one.color)+'"></span>';
      else if(sc&&!fut&&ds!==t)inner+='<span class="dot" style="border:2px solid '+esc(one.color)+'"></span>';
      else inner+='<span class="dot"></span>';}
    h+='<button class="cell'+(fut?' fut':'')+(ds===t?' today':'')+'" style="'+style+'" data-act="openday" data-v="'+ds+'" aria-label="'+m+'月'+d+'日">'+inner+'</button>';
  }
  h+='</div>';
  if(!one)h+='<div class="legend" style="margin-top:10px"><span><i style="background:var(--card)"></i>沒完成</span><span><i style="background:color-mix(in srgb,var(--accent) 45%,var(--card))"></i>完成一部分</span><span><i style="background:color-mix(in srgb,var(--accent) 85%,var(--card))"></i>全部完成</span><span>點日期可以補記</span></div>';
  else h+='<div class="legend" style="margin-top:10px"><span><i style="background:'+esc(one.color)+';border-radius:50%"></i>完成</span><span><i style="border:2px solid '+esc(one.color)+';border-radius:50%"></i>有排但沒做</span><span>點日期可以補記</span></div>';
  h+='</div>';
  const daysArr=[];for(let d=1;d<=days;d++)daysArr.push(y+'-'+pad(m)+'-'+pad(d));
  if(!one){h+='<div class="card stat"><div><b>'+(sumT?Math.round(sumD/sumT*100):0)+'%</b><span>本月完成比例</span></div><div><b>'+sumD+'</b><span>完成次數</span></div><div><b>'+sumT+'</b><span>應做次數</span></div></div>';
    h+='<div class="card"><div class="hname">每天完成比例</div><div class="meta">每一根是一天，越高代表那天做到越多項</div>'+svgCols(daysArr.map(ds=>{const r=dayRatio(ds);const ok=ds<=t&&r.t;return {ds,v:ok?Math.round(r.d/r.t*100):null,tip:ok?r.d+' / '+r.t+' 項（'+Math.round(r.d/r.t*100)+'%）':''}}),100,'var(--accent)',null,'%')+'</div>';
    h+='<div class="card"><div class="hname">各習慣本月完成率</div><div class="meta">點一下可以看那個習慣的詳細圖表</div><div class="hbars">'+hs.map(x=>{const st=habitMonth(x,daysArr,t);const pc=st.s?st.d/st.s:0;return '<button class="hbar" data-act="calpick" data-v="'+x.id+'" title="'+esc(x.name)+'：'+st.d+' / '+st.s+' 天"><span class="hb-n">'+esc(x.name)+'</span><span class="hb-t"><i style="width:'+(pc*100)+'%;background:'+esc(x.color)+'"></i></span><span class="hb-v">'+Math.round(pc*100)+'%<small>'+st.d+'/'+st.s+'</small></span></button>'}).join('')+'</div></div>';
    h+='<p class="hint">「每週幾次」的習慣不算在每天的比例裡，選單選那個習慣就看得到。</p>'}
  else{h+='<div class="card stat"><div><b>'+doneDays+'</b><span>本月完成天數</span></div><div><b>'+(schedDays?Math.round(doneDays/schedDays*100):0)+'%</b><span>完成比例</span></div><div><b>'+best+'</b><span>最長連續</span></div></div>';
    h+=habitChart(one,daysArr,t)}
  return h+'</div>'}

function goalText(x){const f=freqLabel(x);let g='';
  switch(x.type){
    case 'check':g='做完就算完成';break;
    case 'options':g='選到「'+(x.options||[]).filter(o=>o.done).map(o=>esc(o.label)).join('」或「')+'」算完成';break;
    case 'number':g=(x.dir==='none'||x.target===''||x.target==null)?'有記錄就算完成':(x.dir==='le'?'最多 ':'至少 ')+x.target+' '+esc(x.unit||'');break;
    case 'time':g=(!x.target||x.dir==='none')?'有記錄就算完成':x.target+(x.dir==='after'?' 之後':' 之前');break;
    case 'ratio':g=(x.dir==='none'||x.target===''||x.target==null)?'有記錄就算完成':'至少 '+ratioTxt(x,x.target);break;
    case 'text':g='寫下內容就算完成';break;
    case 'list':g='至少記 '+(x.minCount||1)+' 筆';break}
  return f+'，'+g+'。完成一次 '+(x.points||0)+' 點'}
function habitMonth(x,daysArr,t){let d=0,s=0;if((x.freq||{}).kind==='weekly'){const wk=new Set();daysArr.forEach(ds=>{if(ds<=t&&scheduled(x,ds))wk.add(mondayOf(ds));if(ds<=t&&doneOn(x,ds))d++});wk.forEach(m=>{s+=(x.freq.times||1)});return {d:Math.min(d,s),s}}
  daysArr.forEach(ds=>{if(ds<=t&&scheduled(x,ds)){s++;if(doneOn(x,ds))d++}});return {d,s}}
function svgCols(vals,max,color,target,unit,tlabel){
  const W=340,H=150,L=34,R=8,T=12,B=22,pw=W-L-R,ph=H-T-B,n=vals.length,cw=pw/n,bw=Math.max(3,cw-2);
  const mx=Math.max(max||0,target||0,...vals.map(v=>v.v||0))||1;const top=niceMax(mx);
  const yy=v=>T+ph-(v/top)*ph;let g='';
  [0,top/2,top].forEach(v=>{g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy(v)+'" y2="'+yy(v)+'" class="gl"/><text x="'+(L-6)+'" y="'+(yy(v)+4)+'" class="ax" text-anchor="end">'+fmt(v)+'</text>'});
  vals.forEach((v,i)=>{const x=L+i*cw+(cw-bw)/2;const d=Number(v.ds.slice(8));
    if(d===1||d%5===0)g+='<text x="'+(x+bw/2)+'" y="'+(H-6)+'" class="ax" text-anchor="middle">'+d+'</text>';
    if(v.v==null)return;const hgt=Math.max(v.v>0?2:0,(v.v/top)*ph);const y0=T+ph;
    const r=Math.min(3,bw/2,hgt);const ok=v.ok===false?' style="opacity:.45"':'';
    g+='<g class="col"><rect x="'+(x-1)+'" y="'+T+'" width="'+(bw+2)+'" height="'+ph+'" fill="transparent"/>'+(hgt>0?'<path d="M'+x+','+y0+'V'+(y0-hgt+r)+'Q'+x+','+(y0-hgt)+' '+(x+r)+','+(y0-hgt)+'H'+(x+bw-r)+'Q'+(x+bw)+','+(y0-hgt)+' '+(x+bw)+','+(y0-hgt+r)+'V'+y0+'Z" fill="'+color+'"'+ok+'/>':'<line x1="'+x+'" x2="'+(x+bw)+'" y1="'+(y0-1)+'" y2="'+(y0-1)+'" stroke="'+color+'" stroke-width="2"/>')+'<title>'+(Number(v.ds.slice(5,7)))+'/'+d+'：'+esc(v.tip)+'</title></g>'});
  if(target!=null&&target!==''){const ty=yy(target);g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+ty+'" y2="'+ty+'" class="tl"/><text x="'+(W-R)+'" y="'+(ty-4)+'" class="ax tlt" text-anchor="end">'+(tlabel||'目標 '+fmt(target)+(unit||''))+'</text>'}
  return '<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="每日長條圖">'+g+'</svg>'}
function niceMax(v){const e=Math.pow(10,Math.floor(Math.log10(v)));const f=v/e;return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*e}
function habitChart(x,daysArr,t){const c=esc(x.color);let h='<div class="card">';
  const day=ds=>(S.days[ds]||{})[x.id];
  if(x.type==='number'||x.type==='ratio'){const tg=(x.dir!=='none'&&x.target!==''&&x.target!=null)?Number(x.target):null;const mx=x.type==='ratio'?ratioMax(x):0;
    const unit=x.type==='ratio'?(x.mode==='pct'?'%':''):(x.unit||'');
    const vals=daysArr.map(ds=>{const v=day(ds);const has=ds<=t&&typeof v==='number';return {ds,v:has?v:null,ok:has?doneOn(x,ds):true,tip:has?(x.type==='ratio'?ratioTxt(x,v):fmt(v)+' '+(x.unit||''))+(doneOn(x,ds)?'，達標':'，未達標'):''}});
    const got=vals.filter(v=>v.v!=null);let avg=got.length?got.reduce((a,b)=>a+b.v,0)/got.length:0;avg=avg>=100?Math.round(avg):Math.round(avg*10)/10;
    h+='<div class="hname">每天的數值</div><div class="meta">虛線是目標，淡色的柱子代表那天沒達標。本月平均 '+(got.length?(x.type==='ratio'?ratioTxt(x,fmt(avg)):fmt(avg)+' '+esc(x.unit||'')):'—')+'</div>'+svgCols(vals,mx,c,tg,unit,tg!=null?('目標 '+(x.type==='ratio'?ratioTxt(x,tg):fmt(tg)+' '+(x.unit||''))):null)}
  else if(x.type==='list'){const fl=x.fields||[];
    const vals=daysArr.map(ds=>{const v=day(ds);const has=ds<=t&&Array.isArray(v);const sm=has?listSums(x,v):[];return {ds,v:has?v.length:null,ok:has?doneOn(x,ds):true,tip:has?v.length+' 筆'+(fl.length?'；'+fl.map((f,j)=>fName(f)+' '+fmt(sm[j])+fUnit(f)).join('、'):''):''}});
    h+='<div class="hname">每天記了幾筆</div><div class="meta">虛線是「至少幾筆算完成」，把手指移到柱子上可以看當天合計</div>'+svgCols(vals,x.minCount||1,c,x.minCount||1,' 筆','至少 '+(x.minCount||1)+' 筆');
    if(fl.length){const tot=new Array(fl.length).fill(0);let nd=0;daysArr.forEach(ds=>{const v=day(ds);if(ds<=t&&Array.isArray(v)&&v.length){nd++;listSums(x,v).forEach((a,j)=>tot[j]+=a)}});
      if(nd)h+='<div class="meta" style="margin-top:6px">有記錄的 '+nd+' 天，平均每天：'+fl.map((f,j)=>esc(fName(f))+' '+fmt(tot[j]/nd)+esc(fUnit(f))).join('・')+'</div>'}}
  else{const weeks=[];daysArr.forEach(ds=>{if(ds>t)return;const m=mondayOf(ds);let w=weeks.find(q=>q.m===m);if(!w){w={m,d:0,s:0};weeks.push(w)}if(scheduled(x,ds)){w.s++;if(doneOn(x,ds))w.d++}});
    if((x.freq||{}).kind==='weekly')weeks.forEach(w=>w.s=x.freq.times||1);for(let k=weeks.length-1;k>=0;k--)if(!weeks[k].s)weeks.splice(k,1);
    h+='<div class="hname">每週完成情況</div><div class="meta">每一列是一週，看得出哪一週比較容易做到</div><div class="hbars">'+(weeks.length?weeks.map(w=>{const pc=w.s?Math.min(1,w.d/w.s):0;const d0=pd(w.m);return '<div class="hbar" title="'+w.d+' / '+w.s+'"><span class="hb-n">'+(d0.getMonth()+1)+'/'+d0.getDate()+' 那週</span><span class="hb-t"><i style="width:'+(pc*100)+'%;background:'+c+'"></i></span><span class="hb-v">'+w.d+'/'+w.s+'</span></div>'}).join(''):'<span class="meta">這個月還沒有資料</span>')+'</div>'}
  return h+'</div>'}
function vHabits(){
  const hs=S.cfg.habits;let h='<div class="stack"><button class="btn pri big" data-act="new">＋ 新增習慣</button>';
  if(!hs.length)return h+vStarter()+'</div>';
  h+='<div class="stack" data-dlist="habits">';hs.forEach((x,i)=>{h+='<div class="card habit" data-ditem="'+x.id+'" style="--hc:'+esc(x.color)+'"><div class="hhead"><span class="grip" data-grip="1" aria-label="按住拖動來排序" role="button" tabindex="0"><svg width="14" height="20" viewBox="0 0 14 20" aria-hidden="true"><g fill="currentColor"><circle cx="4" cy="4" r="1.6"/><circle cx="10" cy="4" r="1.6"/><circle cx="4" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="4" cy="16" r="1.6"/><circle cx="10" cy="16" r="1.6"/></g></svg></span><span style="width:14px;height:14px;flex:none;background:'+esc(x.color)+';transform:rotate(45deg);border-radius:2px"></span><div class="grow"><div class="hname">'+esc(x.name)+'</div><div class="meta">'+freqLabel(x)+'・'+TYPES[x.type].label+'・'+(x.points||0)+' 點'+'</div></div><div class="row" style="flex-wrap:nowrap;margin-right:16px"><button class="btn sm" data-act="edit" data-h="'+x.id+'">編輯</button></div></div></div>'});h+='</div>';
  h+='<p class="hint">刪除習慣：按「編輯」，最下面有刪除。</p>';
  return h+'</div>'}

function rgb2hsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;
  if(d){h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;if(h<0)h+=360}return [h,mx?d/mx:0,mx]}
function hsv2hex(h,s,v){const f=n=>{const k=(n+h/60)%6;return v-v*s*Math.max(0,Math.min(k,4-k,1))};return rgb2hex(f(5)*255,f(3)*255,f(1)*255)}
let HSV=null;
function savedColors(t){const saved=t.saved||[];const c=t.accent==='custom'?(t.custom||''):'';if(!saved.length&&!S.showPicker)return '';return '<div style="margin-top:12px"><div class="lb" style="font-size:14px;font-weight:700;margin-bottom:6px">我的顏色</div>'+(saved.length?'<div class="row" style="gap:10px">'+saved.map((x,i)=>'<span class="savedc"><button class="dot2" data-act="usecolor" data-v="'+esc(x)+'" style="background:'+esc(x)+'" aria-label="使用 '+esc(x)+'" aria-pressed="'+(x.toLowerCase()===c.toLowerCase())+'"></button><button class="xdel" data-act="delcolor" data-v="'+i+'" aria-label="刪除這個顏色">×</button></span>').join('')+'</div>':'<span class="group">還沒有儲存的顏色。調好顏色後按「儲存顏色」。</span>')+'</div>'}
function customPanel(t){const c=t.custom||'#23756A';HSV=rgb2hsv(...hex2rgb(c));const [h,sa,v]=HSV;const saved=t.saved||[];
  return '<div class="cpanel">'+
  '<div class="svbox" id="svBox" style="background-color:hsl('+h+',100%,50%)"><span class="knob" id="svKnob" style="left:'+(sa*100)+'%;top:'+((1-v)*100)+'%;background:'+c+'"></span></div>'+
  '<div class="huebar" id="hueBar"><span class="knob" id="hueKnob" style="left:'+(h/360*100)+'%;background:hsl('+h+',100%,50%)"></span></div>'+
  '<div class="row" style="flex-wrap:nowrap;gap:10px"><span id="cPrev" class="cprev" style="background:'+c+'"></span><label class="group" for="cHexIn" style="display:flex;flex-direction:column;gap:2px">色碼<input type="text" id="cHexIn" data-in="hexin" value="'+c.toUpperCase()+'" maxlength="7" style="width:96px;font-variant-numeric:tabular-nums" autocomplete="off" spellcheck="false"></label><button class="btn pri sm" data-act="savecolor" style="margin-left:auto;white-space:nowrap">儲存顏色</button></div>'+
  '<div class="fld" style="margin:0"><span class="lb">按鈕文字</span><div class="row" style="gap:10px"><div class="seg">'+[['white','白色'],['dark','深色']].map(([k,n])=>'<button data-act="tink" data-v="'+k+'" aria-pressed="'+((t.ink==='dark'?'dark':'white')===k)+'">'+n+'</button>').join('')+'</div><span class="meta">預覽</span><span class="btn pri sm" aria-hidden="true">記錄</span></div></div>'+
  '<span class="group">太淺的顏色在淺色模式會自動調深一點，太深的顏色在深色模式會自動調亮一點。按鈕的底色也會照文字顏色微調，讓字看得清楚。</span></div>'}
function syncCustom(hex,fromHsv){S.cfg.theme=Object.assign({},S.cfg.theme,{accent:'custom',custom:hex});applyTheme();
  if(!fromHsv)HSV=rgb2hsv(...hex2rgb(hex));const [h,sa,v]=HSV;
  const pv=$('#cPrev');if(pv)pv.style.background=hex;const hi=$('#cHexIn');if(hi&&hi!==document.activeElement)hi.value=hex.toUpperCase();
  const sb=$('#svBox');if(sb)sb.style.backgroundColor='hsl('+h+',100%,50%)';const k=$('#svKnob');if(k){k.style.left=(sa*100)+'%';k.style.top=((1-v)*100)+'%';k.style.background=hex}
  const hk=$('#hueKnob');if(hk){hk.style.left=(h/360*100)+'%';hk.style.background='hsl('+h+',100%,50%)'}}
let drag=null;
document.addEventListener('pointerdown',ev=>{const box=ev.target.closest('#svBox,#hueBar');if(!box||!HSV)return;drag=box.id;box.setPointerCapture&&box.setPointerCapture(ev.pointerId);ev.preventDefault();pickAt(box,ev)});
document.addEventListener('pointermove',ev=>{if(!drag)return;const box=document.getElementById(drag);if(box)pickAt(box,ev)});
document.addEventListener('pointerup',()=>{if(drag){drag=null;setCfg()}});
document.addEventListener('pointercancel',()=>{if(drag){drag=null;setCfg()}});
function pickAt(box,ev){const r=box.getBoundingClientRect();const x=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width)),y=Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height));
  if(box.id==='hueBar')HSV[0]=x*359.9;else{HSV[1]=x;HSV[2]=1-y}syncCustom(hsv2hex(...HSV),true)}
function vSettings(){let h='<div class="stack">';
  h+='<div class="card"><b>帳號</b><p class="hint" style="margin:4px 0 10px">目前登入：'+esc((S.user&&S.user.email)||'')+'<br>手機和電腦用同一個帳號登入，資料就會同步。</p><button class="btn ghost" data-act="signout">登出</button></div>';
  {const t=S.cfg.theme||{};
  h+='<div class="card"><b>外觀</b><div class="fld" style="margin:8px 0 10px"><span class="lb">主題色</span><div class="row" style="gap:14px">'+THEMES.map(x=>'<button class="swc" data-act="taccent" data-v="'+x.k+'" aria-pressed="'+((t.accent||'teal')===x.k)+'"><i style="background:linear-gradient(135deg,'+x.l+' 50%,'+x.d+' 50%)"></i>'+x.n+'</button>').join('')+'<button class="swc" data-act="taccent" data-v="custom" aria-pressed="'+(t.accent==='custom')+'" aria-expanded="'+(!!S.showPicker)+'"><i style="background:conic-gradient(#e33,#ec3,#3c5,#3ae,#73e,#e3a,#e33)"></i>自訂</button></div>'+(S.showPicker?customPanel(t):'')+savedColors(t)+'<span class="group">圓圈左上是淺色模式的顏色，右下是深色模式的顏色。</span></div><div class="fld" style="margin:0"><span class="lb">顯示模式</span><div class="seg">'+[['','跟隨系統'],['light','淺色'],['dark','深色']].map(([k,n])=>'<button data-act="tmode" data-v="'+k+'" aria-pressed="'+((t.mode||'')===k)+'">'+n+'</button>').join('')+'</div></div></div>'}
  h+='<div class="card"><b>備份與還原</b><p class="hint" style="margin:4px 0 10px">你的紀錄已經自動存在雲端、手機和電腦會自動同步，平常不需要手動備份。這裡的「下載備份檔」只是多一層保險——例如想留一份存檔，或要把資料搬到別的帳號時用，不下載也完全不影響雲端的資料。</p><p class="meta" style="margin:0 0 10px">'+(S.cfg.lastBackup?'上次手動備份：'+fmtDT(S.cfg.lastBackup):'還沒有手動備份過')+'</p><div class="fld" style="margin-bottom:10px"><label for="bkName">檔案名稱</label><div class="row" style="flex-wrap:nowrap"><input type="text" id="bkName" data-in="bkname" value="'+esc(S.bkName??('習慣打卡本備份-'+today()))+'" style="flex:1;min-width:0" autocomplete="off"><span class="meta">.json</span></div></div><div class="row"><button class="btn pri" data-act="backup">下載備份檔</button><label class="btn" for="restoreFile">從備份檔還原</label><input type="file" id="restoreFile" accept=".json,application/json" data-in="restore" style="position:absolute;width:1px;height:1px;opacity:0"></div>'+(S.bmsg?'<p class="hint">'+esc(S.bmsg)+'</p>':'');
  if(S.restore)h+='<div style="margin-top:10px"><p><b>確定要還原嗎？</b>現在的所有習慣和紀錄會換成備份檔裡的內容（'+esc(S.restore.info)+'）。</p><div class="row"><button class="btn danger" data-act="restore2">確定還原</button><button class="btn ghost" data-act="restorecancel">取消</button></div></div>';
  return h+'</div></div>'}

function vRewards(){
  const srt=S.cfg.rwSort||'custom';const r0=S.cfg.rewards||[];const r=srt==='asc'?r0.slice().sort((a,b)=>a.cost-b.cost):srt==='desc'?r0.slice().sort((a,b)=>b.cost-a.cost):r0;const bal=balance();
  let h='<div class="stack"><div class="card hhead"><span class="hex bighex">'+bal+'</span><div class="grow"><div class="hname">可用點數</div><div class="meta">累積 '+earned()+' 點・已兌換 '+spent()+' 點。點數只會增加，沒做到不會扣分。</div></div></div>';
  h+='<div class="row between" style="margin-top:4px"><b>獎勵清單</b>'+(r.length>1?'<button class="sortbtn" data-act="rwsort" aria-label="排序：'+(srt==='asc'?'點數少到多':srt==='desc'?'點數多到少':'自訂順序')+'，按一下切換">'+sortIcon(srt)+'</button>':'')+'</div><div class="stack" data-dlist="rewards">'+(r.length?r.map(x=>{const c=S.confirm==='rd-'+x.id;if(S.rwEdit===x.id)return '<div class="ticket editing"><div class="tl"><label class="meta" for="rwn-'+x.id+'">獎勵名稱</label><input type="text" id="rwn-'+x.id+'" value="'+esc(x.name)+'"><span class="row"><button class="btn sm pri" data-act="rwsave" data-v="'+x.id+'">儲存</button><button class="btn sm ghost" data-act="rwcancel">取消</button></span></div><div class="tr"><label class="meta" for="rwc-'+x.id+'">點數</label><input type="number" inputmode="numeric" id="rwc-'+x.id+'" value="'+x.cost+'" style="width:76px;text-align:center;padding:8px 4px"></div></div>';return '<div class="ticket" data-ditem="'+x.id+'"><div class="tl"><span class="row" style="flex-wrap:nowrap;gap:6px">'+(srt==='custom'?'<span class="grip" data-grip="1" aria-label="按住拖動來排序" role="button" tabindex="0"><svg width="14" height="20" viewBox="0 0 14 20" aria-hidden="true"><g fill="currentColor"><circle cx="4" cy="4" r="1.6"/><circle cx="10" cy="4" r="1.6"/><circle cx="4" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="4" cy="16" r="1.6"/><circle cx="10" cy="16" r="1.6"/></g></svg></span>':'')+'<b>'+esc(x.name)+'</b></span><span class="row">'+(c?'<button class="btn sm pri" data-act="redeem2" data-v="'+x.id+'">確定兌換</button><button class="btn sm ghost" data-act="cancel">取消</button>':'<button class="btn sm '+(bal>=x.cost?'pri':'')+'" data-act="redeem" data-v="'+x.id+'"'+(bal>=x.cost?'':' disabled')+'>'+(bal>=x.cost?'兌換':'還差 '+(x.cost-bal))+'</button><button class="btn sm ghost" data-act="rwedit" data-v="'+x.id+'">編輯</button><button class="btn sm ghost" data-act="delrw" data-v="'+x.id+'" aria-label="刪除獎勵">刪除</button>')+'</span></div><div class="tr"><span class="cost">'+x.cost+'</span><span class="meta">點</span></div></div>'}).join(''):'<span class="meta">還沒有獎勵，在下面新增一個。</span>')+'</div>';
  h+='<div class="card"><b>新增獎勵</b><div class="row" style="margin-top:8px"><input type="text" id="rwName" placeholder="獎勵，例如：一件新衣服" style="flex:1"><input type="number" id="rwCost" class="num" placeholder="點數" inputmode="numeric"><button class="btn pri" data-act="addrw">新增</button></div>'+(r.length?'':'<div style="margin-top:8px"><button class="btn sm" data-act="rwtemplate">套用建議獎勵</button></div>')+'</div>';
  const rd=(S.cfg.redeemed||[]).slice().reverse();
  if(rd.length)h+='<div class="card"><b>兌換紀錄</b><div class="list">'+rd.map(x=>'<div class="li"><span>'+esc(x.name)+'</span><span class="meta">'+esc(x.date)+'・'+x.cost+' 點</span></div>').join('')+'</div></div>';
  return h+'</div>'}

/* ---------- edit form ---------- */
function blankHabit(){return {id:nid(),name:'',color:COLORS[S.cfg.habits.length%COLORS.length],type:'check',freq:{kind:'daily',days:[1,2,3,4,5],times:3},
  points:10,options:[{label:'做到了',done:true},{label:'沒做',done:false}],
  unit:'',target:'',dir:'ge',mode:'frac',denom:10,steps:'',fields:['數量'],minCount:1,labelHint:'名稱',created:today()}}
function vEdit(){
  const e=S.edit;const f=e.freq;const isNew=!S.cfg.habits.some(h=>h.id===e.id);
  let h='<div class="modal" data-act="bgclose"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="eh"><h2 id="eh">'+(isNew?'新增習慣':'編輯習慣')+'</h2>';
  h+='<div class="fld"><label for="e-name">名稱</label><input type="text" id="e-name" data-e="name" value="'+esc(e.name)+'" placeholder="例如：喝水"></div>';
  h+='<div class="fld"><span class="lb">顏色</span><div class="row">'+COLORS.map(c=>'<button class="sw" style="background:'+c+'" data-act="ecolor" data-v="'+c+'" aria-pressed="'+(e.color===c)+'" aria-label="顏色"></button>').join('')+'</div></div>';
  h+='<div class="fld"><span class="lb">頻率</span><div class="seg">'+[['daily','每天'],['weekdays','每週指定幾天'],['weekly','每週幾次']].map(([k,l])=>'<button data-act="efreq" data-v="'+k+'" aria-pressed="'+(f.kind===k)+'">'+l+'</button>').join('')+'</div>';
  if(f.kind==='weekdays')h+='<div class="seg">'+[1,2,3,4,5,6,0].map(d=>'<button data-act="eday" data-v="'+d+'" aria-pressed="'+(f.days||[]).includes(d)+'">'+WD[d]+'</button>').join('')+'</div>';
  if(f.kind==='weekly')h+='<div class="row"><span>一週</span><input type="number" class="num" id="e-times" data-e="times" min="1" max="7" value="'+(f.times||3)+'"><span>次</span></div>';
  h+='</div>';
  h+='<div class="fld"><label for="e-type">紀錄方式</label><select id="e-type" data-e="type"><optgroup label="預先寫好，只要更新狀態">'+Object.entries(TYPES).filter(t=>t[1].group==='pre').map(([k,t])=>'<option value="'+k+'"'+(e.type===k?' selected':'')+'>'+t.label+'</option>').join('')+'</optgroup><optgroup label="當下手動輸入">'+Object.entries(TYPES).filter(t=>t[1].group==='manual').map(([k,t])=>'<option value="'+k+'"'+(e.type===k?' selected':'')+'>'+t.label+'</option>').join('')+'</optgroup></select><span class="group">'+TYPES[e.type].desc+'</span></div>';
  if(e.type==='options'){h+='<div class="fld"><span class="lb">狀態選項（勾選的選項算完成）</span>'+e.options.map((o,i)=>'<div class="optrow"><input type="text" id="e-o-'+i+'" data-e="optlabel" data-i="'+i+'" value="'+esc(o.label)+'" aria-label="選項名稱"><label class="row" style="font-size:14px"><input type="checkbox" data-e="optdone" data-i="'+i+'"'+(o.done?' checked':'')+'>算完成</label><button class="btn sm ghost" data-act="delopt" data-v="'+i+'" aria-label="刪除選項">刪除</button></div>').join('')+'<button class="btn sm" data-act="addopt" style="align-self:flex-start">＋ 選項</button></div>'}
  if(e.type==='number')h+='<div class="fld"><span class="lb">單位與目標</span><div class="row"><input type="text" id="e-unit" data-e="unit" class="num" placeholder="單位，如 ml" value="'+esc(e.unit)+'"><select id="e-dir" data-e="dir" aria-label="目標方向"><option value="ge"'+(e.dir==='ge'?' selected':'')+'>至少</option><option value="le"'+(e.dir==='le'?' selected':'')+'>最多</option><option value="none"'+(e.dir==='none'?' selected':'')+'>不設目標</option></select>'+(e.dir!=='none'?'<input type="number" id="e-target" data-e="target" class="num" placeholder="目標" value="'+esc(e.target)+'">':'')+'</div><label for="e-steps" class="group">快速加按鈕（用逗號分開，例如 250,473,500；可留空）</label><input type="text" id="e-steps" data-e="steps" value="'+esc(e.steps)+'"></div>';
  if(e.type==='time')h+='<div class="fld"><span class="lb">目標時間</span><div class="row"><select id="e-dir" data-e="dir" aria-label="目標方向"><option value="le"'+(e.dir!=='after'&&e.dir!=='none'?' selected':'')+'>在這之前</option><option value="after"'+(e.dir==='after'?' selected':'')+'>在這之後</option><option value="none"'+(e.dir==='none'?' selected':'')+'>不設目標</option></select>'+(e.dir!=='none'?'<input type="time" id="e-target" data-e="ttarget" value="'+esc(e.target)+'">':'')+'</div></div>';
  if(e.type==='ratio')h+='<div class="fld"><span class="lb">怎麼記</span><div class="seg">'+[['frac','幾分之幾'],['pct','百分比']].map(([k,n])=>'<button data-act="emode" data-v="'+k+'" aria-pressed="'+((e.mode||'frac')===k)+'">'+n+'</button>').join('')+'</div>'+((e.mode||'frac')==='frac'?'<div class="row"><span>滿分</span><input type="number" class="num" id="e-denom" data-e="denom" min="2" max="1000" value="'+(e.denom||10)+'"><span class="group">10 以下會顯示成一排可以點的圓點</span></div>':'')+'<div class="row"><select id="e-dir" data-e="dir" aria-label="目標"><option value="ge"'+(e.dir!=='none'?' selected':'')+'>至少</option><option value="none"'+(e.dir==='none'?' selected':'')+'>不設目標（有記就算完成）</option></select>'+(e.dir!=='none'?'<input type="number" id="e-target" data-e="target" class="num" placeholder="'+((e.mode||'frac')==='pct'?'例如 80':'例如 7')+'" value="'+esc(e.target)+'"><span>'+((e.mode||'frac')==='pct'?'%':'/ '+(e.denom||10))+'</span>':'')+'</div></div>';
  if(e.type==='list')h+='<div class="fld"><label for="e-fields">每筆要填的數字欄位（用逗號分開）</label><input type="text" id="e-fields" data-e="fields" value="'+esc((e.fields||[]).join(','))+'" placeholder="例如：主食:拳,蛋白:掌心,蔬菜:拳"><span class="group">想在輸入框顯示單位，就寫成「名稱:單位」，例如「蛋白:掌心」。</span><label for="e-pre" class="group">標籤（用逗號分開，記錄時可以從下拉選單選）</label><input type="text" id="e-pre" data-e="presets" value="'+esc(presetsOf(e).join(','))+'" placeholder="例如：早餐,午餐,晚餐,點心"><div class="row"><span>一天至少</span><input type="number" class="num" id="e-min" data-e="minCount" min="1" value="'+(e.minCount||1)+'"><span>筆算完成</span></div></div>';
  h+='<div class="fld"><label for="e-pts">完成一次得幾點</label><input type="number" class="num" id="e-pts" data-e="points" min="0" value="'+(e.points??10)+'"></div>';
  h+='<div class="row"><button class="btn pri" data-act="esave">儲存</button><button class="btn" data-act="eclose">取消</button></div>';
  if(!isNew)h+='<div style="margin-top:20px">'+(S.confirm==='del-'+e.id?'<p class="hint">刪除後，過去的紀錄不會再顯示，但已經賺到的點數會保留。</p><div class="row"><button class="btn danger" data-act="edel2">確定刪除</button><button class="btn ghost" data-act="cancel">不要刪</button></div>':'<button class="btn danger sm" data-act="edel">刪除這個習慣</button>')+'</div>';
  return h+'</div></div>'}
function editInput(el){
  const e=S.edit,k=el.dataset.e,v=el.value;
  switch(k){
    case 'name':case 'unit':case 'steps':case 'labelHint':case 'presets':e[k]=v;break;
    case 'times':e.freq.times=Math.max(1,Math.min(7,parseInt(v)||1));break;
    case 'type':e.type=v;if(v==='time'&&(e.dir==='ge'))e.dir='le';if(v==='number'&&e.dir==='le'&&!e.target)e.dir='ge';e.target='';rerenderModal();break;
    case 'dir':e.dir=v;rerenderModal();break;
    case 'target':e.target=v===''?'':Number(v);break;
    case 'ttarget':e.target=v;break;
    case 'fields':e.fields=v.split(/[,，]/).map(s=>s.trim()).filter(Boolean);break;
    case 'minCount':e.minCount=Math.max(1,parseInt(v)||1);break;
    case 'optlabel':e.options[el.dataset.i].label=v;break;
    case 'optdone':e.options[el.dataset.i].done=el.checked;break;
    case 'denom':e.denom=Math.max(2,Math.min(1000,parseInt(v)||10));break;
    case 'points':e.points=Math.max(0,parseInt(v)||0);break;
  }}
function rerenderModal(){const sc=$('.sheet')?.scrollTop||0;$('#modal').innerHTML=vEdit();const s=$('.sheet');if(s)s.scrollTop=sc}

/* ---------- templates ---------- */
function template(){
  const t=today();const mk=o=>Object.assign(blankHabit(),o,{id:nid(),created:t});
  S.cfg.habits=S.cfg.habits.concat([
    mk({name:'8:00 前起床',type:'time',target:'08:00',dir:'le',color:COLORS[3],points:10}),
    mk({name:'飲食份量',type:'list',presets:'早餐,午餐,點心,晚餐',fields:['主食','蛋白','蔬菜'],labelHint:'早餐／午餐／晚餐／點心',minCount:3,color:COLORS[0],points:15}),
    mk({name:'喝水',type:'number',unit:'ml',target:2500,dir:'ge',steps:'250,473,500',color:COLORS[1],points:10}),
    mk({name:'步數',type:'number',unit:'步',target:8000,dir:'ge',color:COLORS[5],points:10}),
    mk({name:'運動',type:'list',presets:'跟練操,皮拉提斯,重訓,有氧,走路',fields:['時間:分鐘'],minCount:1,color:COLORS[2],points:15}),
    mk({name:'記帳',type:'list',presets:'早餐,午餐,晚餐,飲料點心,交通,其他',fields:['金額'],labelHint:'花在哪裡',minCount:1,color:COLORS[4],points:5}),
    mk({name:'睡眠分數',type:'ratio',mode:'frac',denom:10,dir:'none',target:'',color:COLORS[3],points:5})
  ]);setCfg();render()}
function rwTemplate(){S.cfg.rewards=(S.cfg.rewards||[]).concat([['看一場電影',250],['按摩',400],['新的運動服',500],['一件新衣服',600]].map(([n,c])=>({id:nid(),name:n,cost:c})));setCfg();render()}

/* ---------- events ---------- */
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act]');if(!b)return;const act=b.dataset.act,v=b.dataset.v,hid=b.dataset.h;
  if(act==='bgclose'){if(ev.target===b){S.edit=null;S.confirm=null;render()}return}
  const ds=S.date;const H=S.cfg.habits.find(h=>h.id===hid);
  switch(act){
    case 'tab':S.view=v;S.confirm=null;render();window.scrollTo(0,0);break;
    case 'day':S.date=addDays(S.date,Number(v));S.rowEdit=null;render();break;
    case 'gotoday':S.date=today();S.rowEdit=null;render();break;
    case 'check':setVal(ds,hid,(entries(ds)[hid]===true)?null:true);render();break;
    case 'opt':setVal(ds,hid,entries(ds)[hid]===Number(v)?null:Number(v));render();break;
    case 'add':{const cur=entries(ds)[hid];const n=new Date();setLog(ds,hid,logOf(ds,hid).concat({t:pad(n.getHours())+':'+pad(n.getMinutes()),a:Number(v)}));setVal(ds,hid,fmt((typeof cur==='number'?cur:0)+Number(v)));render();break}
    case 'calcopen':{const cur=entries(ds)[hid];S.calc={hid,ex:typeof cur==='number'?String(fmt(cur)):'',cleared:false};render();break}
    case 'key':calcKey(v);break;
    case 'calcclose':S.calc=null;render();break;
    case 'calcbg':if(ev.target===b){S.calc=null;render()}break;
    case 'calcok':{const c=S.calc;const r0=calcEval(c.ex);if(r0==null){const d=$('.cres');if(d)d.textContent='請輸入數字';break}const r=Math.max(0,fmt(r0));
      const cur=entries(ds)[c.hid];const cv=typeof cur==='number'?cur:0;const n=new Date();const tm=pad(n.getHours())+':'+pad(n.getMinutes());
      if(r!==cv||typeof cur!=='number'){const ent={t:tm,a:fmt(r-cv)};const CH=S.cfg.habits.find(q=>q.id===c.hid)||{};if(c.cleared||typeof cur!=='number'&&!CH.steps)ent.set=r;setLog(ds,c.hid,logOf(ds,c.hid).concat(ent))}
      setVal(ds,c.hid,r);S.calc=null;render();break}
    case 'dellog':{const cur=entries(ds)[hid];const c=typeof cur==='number'?cur:0;const lg=logOf(ds,hid).slice();let sub=0;if(v==='pre'){sub=c-lg.reduce((q,r)=>q+(Number(r.a)||0),0)}else{sub=Number(lg[Number(v)].a)||0;lg.splice(Number(v),1);setLog(ds,hid,lg)}const r=fmt(c-sub);setVal(ds,hid,r>0?r:(lg.length?0:null));render();break}
    case 'clear':setVal(ds,hid,null);render();break;
    case 'now':{const n=new Date();setVal(ds,hid,pad(n.getHours())+':'+pad(n.getMinutes()));render();break}
    case 'addrow':{const dr=S.drafts[hid]||{};const fl=H.fields||[];const f=fl.map((_,j)=>Number((dr.f||[])[j])||0);
      if(!(dr.label||'').trim()&&!dr.tag&&f.every(x=>!x))break;
      const rows=Array.isArray(entries(ds)[hid])?entries(ds)[hid].slice():[];const row={label:(dr.label||'').trim(),f};if(dr.tag)row.tag=dr.tag;
      if(S.rowEdit&&S.rowEdit.hid===hid&&rows[S.rowEdit.i])rows[S.rowEdit.i]=row;else rows.push(row);
      S.rowEdit=null;setVal(ds,hid,rows);S.drafts[hid]={};render();break}
    case 'editrow':{const r=(entries(ds)[hid]||[])[Number(v)];if(!r)break;S.rowEdit={hid,i:Number(v)};S.drafts[hid]={label:r.label,tag:r.tag||'',f:(r.f||[]).map(String)};render();break}
    case 'rowup':case 'rowdown':{const i=Number(v),j=act==='rowup'?i-1:i+1;const rows=(entries(ds)[hid]||[]).slice();if(j<0||j>=rows.length)break;[rows[i],rows[j]]=[rows[j],rows[i]];if(S.rowEdit&&S.rowEdit.hid===hid){if(S.rowEdit.i===i)S.rowEdit.i=j;else if(S.rowEdit.i===j)S.rowEdit.i=i}setVal(ds,hid,rows);render();break}
    case 'rowcancel':S.rowEdit=null;S.drafts[hid]={};render();break;
    case 'delrow':{S.rowEdit=null;const rows=(entries(ds)[hid]||[]).slice();rows.splice(Number(v),1);setVal(ds,hid,rows.length?rows:null);render();break}
    case 'mon':{const [y,m]=S.calMonth.split('-').map(Number);const d=new Date(y,m-1+Number(v),1);S.calMonth=d.getFullYear()+'-'+pad(d.getMonth()+1);render();break}
    case 'openday':S.date=v;S.view='today';render();window.scrollTo(0,0);break;
    case 'template':template();break;
    case 'rwtemplate':rwTemplate();break;
    case 'new':S.edit=blankHabit();S.confirm=null;render();break;
    case 'edit':S.edit=JSON.parse(JSON.stringify(Object.assign(blankHabit(),H)));S.confirm=null;render();break;
    case 'ecolor':S.edit.color=v;rerenderModal();break;
    case 'efreq':S.edit.freq.kind=v;rerenderModal();break;
    case 'emode':S.edit.mode=v;S.edit.target='';rerenderModal();break;
    case 'ratio':setVal(ds,hid,entries(ds)[hid]===Number(v)&&H.mode!=='pct'?null:Number(v));render();break;
    case 'eday':{const d=Number(v);const s=S.edit.freq.days||[];S.edit.freq.days=s.includes(d)?s.filter(x=>x!==d):s.concat(d);rerenderModal();break}
    case 'addopt':S.edit.options.push({label:'',done:false});rerenderModal();break;
    case 'delopt':S.edit.options.splice(Number(v),1);rerenderModal();break;
    case 'esave':{const e=S.edit;document.querySelectorAll('#modal [data-e]').forEach(el=>{if(el.dataset.e!=='type'&&el.dataset.e!=='dir')editInput(el)});
      if(!e.name.trim()){const n=$('#e-name');n.focus();n.placeholder='請先填名稱';break}
      if(e.type==='options')e.options=e.options.filter(o=>o.label.trim());
      if(e.type==='options'&&!e.options.length)e.options=[{label:'做到了',done:true}];
      if(e.freq.kind==='weekdays'&&!(e.freq.days||[]).length)e.freq.days=[1,2,3,4,5];
      if(e.type==='list'&&!(e.fields||[]).length)e.fields=['數量'];
      e.name=e.name.trim();const i=S.cfg.habits.findIndex(h=>h.id===e.id);
      if(i>=0){lockUnlocked(S.cfg.habits[i],today());S.cfg.habits[i]=e}else S.cfg.habits.push(e);
      {const t=today();if(S.days[t]&&S.days[t][e.id]!==undefined){relock(t,e);save(dayKey(t))}}
      S.edit=null;setCfg();render();break}
    case 'eclose':S.edit=null;S.confirm=null;render();break;
    case 'edel':S.confirm='del-'+S.edit.id;rerenderModal();break;
    case 'edel2':{const old=S.cfg.habits.find(h=>h.id===S.edit.id);if(old)lockUnlocked(old)}S.cfg.habits=S.cfg.habits.filter(h=>h.id!==S.edit.id);S.edit=null;S.confirm=null;setCfg();render();break;
    case 'savecolor':{const c=(S.cfg.theme||{}).custom;if(!c)break;const sv=((S.cfg.theme.saved)||[]).filter(x=>x.toLowerCase()!==c.toLowerCase());sv.push(c);S.cfg.theme=Object.assign({},S.cfg.theme,{saved:sv.slice(-12)});setCfg();render();break}
    case 'usecolor':syncCustom(v);setCfg();render();break;
    case 'delcolor':{const sv=((S.cfg.theme.saved)||[]).slice();sv.splice(Number(v),1);S.cfg.theme=Object.assign({},S.cfg.theme,{saved:sv});setCfg();render();break}
    case 'calpick':S.calFilter=v;render();window.scrollTo(0,0);break;
    case 'taccent':if(v==='custom'){if(S.showPicker){S.showPicker=false;render();break}S.showPicker=true}else S.showPicker=false;S.cfg.theme=Object.assign({},S.cfg.theme,{accent:v});if(v==='custom'&&!S.cfg.theme.custom){const r=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();S.cfg.theme.custom=/^#[0-9a-f]{6}$/i.test(r)?r:'#23756A'}setCfg();render();break;
    case 'tmode':S.cfg.theme=Object.assign({},S.cfg.theme,{mode:v});setCfg();render();break;
    case 'tink':S.cfg.theme=Object.assign({},S.cfg.theme,{ink:v});setCfg();render();break;
    case 'backup':{try{const data=JSON.stringify({app:'habit-book',v:1,exported:new Date().toISOString(),cfg:S.cfg,days:S.days});
        let nm=String(S.bkName??('習慣打卡本備份-'+today())).replace(/\.json$/i,'').replace(/[\\/:*?"<>|]/g,'-').trim()||('習慣打卡本備份-'+today());
        const blob=new Blob([data],{type:'application/json'});const u=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=u;a.download=nm+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);
        S.cfg.lastBackup=new Date().toISOString();setCfg();
        S.bmsg='備份檔已經下載了。';}catch(e){S.bmsg='下載沒有成功，請再試一次。'}render();break}
    case 'authview':S.auth=Object.assign(S.auth,{view:v,err:'',msg:'',busy:false});render();break;
    case 'authlogin':(async()=>{const au=S.auth;au.err='';if(!au.email||!au.pw){au.err='請輸入 email 和密碼。';render();return}au.busy=true;render();
      try{await signInWithEmailAndPassword(fbAuth,au.email.trim(),au.pw)}catch(e){au.busy=false;au.err=authErrMsg(e);render()}})();break;
    case 'authsignup':(async()=>{const au=S.auth;au.err='';
      if(!au.email||!au.pw){au.err='請輸入 email 和密碼。';render();return}
      if(au.pw.length<6){au.err='密碼至少要 6 個字。';render();return}
      if(au.pw!==au.pw2){au.err='兩次輸入的密碼不一樣。';render();return}
      au.busy=true;render();
      try{await createUserWithEmailAndPassword(fbAuth,au.email.trim(),au.pw)}catch(e){au.busy=false;au.err=authErrMsg(e);render()}})();break;
    case 'authreset':(async()=>{const au=S.auth;au.err='';au.msg='';if(!au.email){au.err='請輸入 email。';render();return}au.busy=true;render();
      try{await sendPasswordResetEmail(fbAuth,au.email.trim());au.busy=false;au.msg='已經把重設密碼的信寄到 '+au.email+'，記得看看垃圾信件匣。';render()}catch(e){au.busy=false;au.err=authErrMsg(e);render()}})();break;
    case 'signout':signOut(fbAuth);break;
    case 'restore2':{const r=S.restore;S.restore=null;S.cfg=r.cfg;S.days=r.days;S.bmsg='已還原。';
      if(S.mode==='cloud'){save('config',0);Object.keys(S.days).forEach((d,i)=>save(dayKey(d),100+i*60))}else saveLocal();render();break}
    case 'restorecancel':S.restore=null;render();break;
    case 'cancel':S.confirm=null;S.edit?rerenderModal():render();break;
    case 'addrw':{const n=$('#rwName').value.trim(),c=parseInt($('#rwCost').value);if(!n||!(c>0)){$(!n?'#rwName':'#rwCost').focus();break}
      S.cfg.rewards=(S.cfg.rewards||[]).concat({id:nid(),name:n,cost:c});setCfg();render();break}
    case 'rwedit':S.rwEdit=v;S.confirm=null;render();const ne=document.getElementById('rwn-'+v);ne&&ne.focus();break;
    case 'rwcancel':S.rwEdit=null;render();break;
    case 'rwsave':{const n=($('#rwn-'+v).value||'').trim(),c=parseInt($('#rwc-'+v).value);if(!n){$('#rwn-'+v).focus();break}if(!(c>0)){$('#rwc-'+v).focus();break}
      S.cfg.rewards=S.cfg.rewards.map(r=>r.id===v?Object.assign({},r,{name:n,cost:c}):r);S.rwEdit=null;setCfg();render();break}
    case 'rwsort':{const o=['custom','asc','desc'];const c=S.cfg.rwSort||'custom';S.cfg.rwSort=o[(o.indexOf(c)+1)%3];setCfg();render();break}
    case 'delrw':S.cfg.rewards=S.cfg.rewards.filter(r=>r.id!==v);setCfg();render();break;
    case 'redeem':S.confirm='rd-'+v;render();break;
    case 'redeem2':{const r=S.cfg.rewards.find(x=>x.id===v);if(r&&balance()>=r.cost){S.cfg.redeemed=(S.cfg.redeemed||[]).concat({name:r.name,cost:r.cost,date:today()});setCfg()}S.confirm=null;render();break}
  }});
document.addEventListener('input',ev=>{
  const el=ev.target;
  if(el.dataset.au){S.auth[el.dataset.au]=el.value;return}
  if(el.dataset.e){editInput(el);return}
  if(el.dataset.in==='hexin'){let v=el.value.trim();if(v[0]!=='#')v='#'+v;if(/^#[0-9a-f]{6}$/i.test(v))syncCustom(v.toLowerCase());return}
  const hid=el.dataset.h;const k=el.dataset.in;if(!k)return;
  if(k==='text'){setVal(S.date,hid,el.value||null);return}
  if(k==='ratio'){const h=S.cfg.habits.find(x=>x.id===hid);const t=document.getElementById('rv-'+hid);if(h&&t)t.textContent=ratioTxt(h,Number(el.value));return}
  if(k==='dlabel'){(S.drafts[hid]=S.drafts[hid]||{}).label=el.value;return}
  if(k==='mgoal'){S.cfg.goals=Object.assign({},S.cfg.goals,{[S.calMonth]:el.value});setCfg();return}
  if(k==='bkname'){S.bkName=el.value;return}
  if(k==='dtag'){(S.drafts[hid]=S.drafts[hid]||{}).tag=el.value;return}
  if(k==='dfield'){const d=(S.drafts[hid]=S.drafts[hid]||{});d.f=d.f||[];d.f[el.dataset.j]=el.value;return}
});
document.addEventListener('change',ev=>{
  const el=ev.target;if(el.dataset.e)return;const hid=el.dataset.h;const k=el.dataset.in;
  if(k==='time'){setVal(S.date,hid,el.value||null);renderSoon()}
  if(k==='text'){renderSoon()}
  if(k==='ratio'){setVal(S.date,hid,Number(el.value));renderSoon()}
  if(k==='hexin'){setCfg();renderSoon()}
  if(k==='calf'){S.calFilter=el.value;render()}
  if(k==='restore'){const f=el.files&&el.files[0];if(!f)return;f.text().then(t=>{try{const j=JSON.parse(t);if(j.app!=='habit-book'||!j.cfg||!j.days)throw 0;
    S.restore={cfg:{habits:j.cfg.habits||[],rewards:j.cfg.rewards||[],redeemed:j.cfg.redeemed||[],theme:j.cfg.theme||{},goals:j.cfg.goals||{},mig:j.cfg.mig||{},rwSort:j.cfg.rwSort||'custom',lastBackup:j.cfg.lastBackup||null},days:j.days,info:(j.cfg.habits||[]).length+' 個習慣、'+Object.keys(j.days).length+' 天的紀錄，備份於 '+String(j.exported||'').slice(0,10)};S.bmsg=''}
    catch(e){S.bmsg='這個檔案不是習慣打卡本的備份檔。'}render()})}
});
document.addEventListener('keydown',ev=>{
  if(ev.key==='Escape'&&S.edit){S.edit=null;S.confirm=null;render()}
  if(S.calc){const k=ev.key;const map={'*':'×','/':'÷','-':'−','+':'+',Backspace:'back',Delete:'C'};if(/^[0-9.]$/.test(k)){calcKey(k);ev.preventDefault()}else if(map[k]){calcKey(map[k]);ev.preventDefault()}else if(k==='Enter'||k==='='){const b=document.querySelector('[data-act="calcok"]');b&&b.click();ev.preventDefault()}else if(k==='Escape'){S.calc=null;render()}return}
  if(ev.key==='Enter'&&ev.target.dataset&&(ev.target.dataset.in==='dfield'||ev.target.dataset.in==='dlabel')){ev.preventDefault();const b=document.querySelector('[data-act="addrow"][data-h="'+ev.target.dataset.h+'"]');b&&b.click()}
  if(ev.key==='Enter'&&ev.target.dataset&&ev.target.dataset.au){ev.preventDefault();const b=document.querySelector('#view [data-act^="auth"]:not([data-act="authview"])');b&&b.click()}
});
init();

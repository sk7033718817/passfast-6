/* PassFast main app: vault, encryption, voice, UI logic */
const $=id=>document.getElementById(id),enc=new TextEncoder(),dec=new TextDecoder();
let key=null,vault=[],salt=null,timer=null;
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))),ub=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const mem={};
async function derive(pw,s){const m=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt:s,iterations:250000,hash:'SHA-256'},m,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function save(){const iv=crypto.getRandomValues(new Uint8Array(12));
 const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(JSON.stringify(vault)));
 const d=JSON.stringify({s:b64(salt),iv:b64(iv),ct:b64(ct)});mem.v=d;store.set('vault_v1',d)}
const raw=()=>store.get('vault_v1')||mem.v;
const first=!raw();
if(!first){$('lockmsg').textContent='Welcome back! Master Password daalo.';$('mp2').classList.add('hide')}
$('unlock').onclick=async()=>{
 const pw=$('mp').value;$('err').textContent='';
 const _w=Math.ceil(((window.__lu||0)-Date.now())/1000);if(_w>0){$('err').textContent='Bahut galat try. '+_w+' second ruko.';return}
 if(pw.length<6){$('err').textContent='Kam se kam 6 character rakho.';return}
 try{
  if(first){if(pw.length<8||!/[A-Za-z]/.test(pw)||!/[0-9]/.test(pw)){$('err').textContent='Naya Master Password: 8+ akshar, letters aur numbers dono.';return}if(pw!==$('mp2').value){$('err').textContent='Dono password match nahi hue.';return}
   salt=crypto.getRandomValues(new Uint8Array(16));key=await derive(pw,salt);vault=[];await save()}
  else{const d=JSON.parse(raw());salt=ub(d.s);key=await derive(pw,salt);
   vault=JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:ub(d.iv)},key,ub(d.ct))))}
  try{if(window.PasswordCredential&&!first)navigator.credentials.store(new PasswordCredential({id:'vault-owner',password:pw,name:'PassFast'})).catch(()=>{})}catch(e){}$('fp').classList.add('ok');$('fptxt').textContent='ACCESS GRANTED ✓';$('lockmsg').textContent='Access mil gaya ✅';await new Promise(r=>setTimeout(r,900));$('lock').classList.add('hide');$('app').classList.remove('hide');$('app').classList.add('enter');render();store.set('pf_f','0');window.__f=0;window.fpAsk&&fpAsk();
 }catch(e){window.__f=(+store.get('pf_f')||0)+1;store.set('pf_f',String(window.__f));if(store.get('pf_wipe')==='1'){if(window.__f>=10){window.wipeVault&&wipeVault();return}setTimeout(()=>{$('err').textContent+=' ⚠️ '+(10-window.__f)+' try bache, phir vault mit jayega.'},0)}if(window.__f>=5)window.__lu=Date.now()+Math.min(300,5*2**(window.__f-5))*1000;$('err').textContent='Galat Master Password ❌';$('fptxt').textContent='ACCESS DENIED';$('fp').classList.add('bad');setTimeout(()=>{$('fp').classList.remove('bad');$('fptxt').textContent='TOUCH TO UNLOCK'},900)}
};
$('mp').onkeydown=e=>{if(e.key==='Enter'&&!$('mp2').offsetParent)$('unlock').click()};
$('lockbtn').onclick=()=>location.reload();

function esc(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const BR=[
[/gmail|google|mail/i,'<rect width="48" height="48" rx="11" fill="#fff"/><path d="M7 38V18l7 5.300V38z" fill="#4285f4"/><path d="M41 38V18l-7 5.300V38z" fill="#34a853"/><path d="M7 18l17 13 17-13-2.500-4.500L24 22 9.500 13.500z" fill="#ea4335"/><path d="M41 18v-4.500l-2.500.0z" fill="#fbbc04"/>'],
[/insta/i,'<defs><linearGradient id="igg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#feda75"/><stop offset=".35" stop-color="#fa7e1e"/><stop offset=".6" stop-color="#d62976"/><stop offset=".8" stop-color="#962fbf"/><stop offset="1" stop-color="#4f5bd5"/></linearGradient></defs><rect width="48" height="48" rx="13" fill="url(#igg)"/><rect x="11" y="11" width="26" height="26" rx="8" fill="none" stroke="#fff" stroke-width="3"/><circle cx="24" cy="24" r="6.500" fill="none" stroke="#fff" stroke-width="3"/><circle cx="32.500" cy="15.500" r="2" fill="#fff"/>'],
[/facebook|^fb$/i,'<circle cx="24" cy="24" r="24" fill="#1877f2"/><path d="M26.500 46V28.500h5l.9-6h-5.900v-3.800c0-1.700.8-3 3.200-3H32V10.600c-.5-.1-2.400-.3-4.400-.3-4.600 0-7.500 2.700-7.500 7.600v4.600H15v6h5.100V46z" fill="#fff"/>'],
[/whats|watsapp/i,'<circle cx="24" cy="24" r="24" fill="#25d366"/><path d="M24 10a14 14 0 0 0-12 21.200L10 38l7-1.900A14 14 0 1 0 24 10z" fill="none" stroke="#fff" stroke-width="3"/><path d="M19 17c-.6 0-1.300.3-1.800 1-.7 1-1 2.500.5 4.800 1.700 2.700 4.400 5.400 7.600 6.200 1.900.5 3.500-.3 4.200-1.600.2-.6.1-1-.2-1.100l-2.800-1.400c-.4-.2-.8-.1-1 .3l-1 1.100c-1.900-.7-3.900-2.600-4.700-4.500l1-1c.3-.3.4-.7.2-1l-1.300-2.800c-.2-.3-.5-.2-.7-.2z" fill="#fff"/>'],
[/snap/i,'<rect width="48" height="48" rx="11" fill="#fffc00"/><path d="M24 9c-5 0-8 3.500-8 8v4c-1 .5-3 .6-3 1.600 0 1.500 3 1.800 3 2.800-.5 2-3 3.500-5 4 0 1.200 3 1.500 4.500 2.200.5 1 .5 2 2 2 1.500 0 3-1 5.500-1s4 1 5.500 1c1.500 0 1.500-1 2-2 1.500-.7 4.500-1 4.500-2.200-2-.5-4.500-2-5-4 0-1 3-1.300 3-2.800 0-1-2-1.100-3-1.600v-4c0-4.500-3-8-8-8z" fill="#fff" stroke="#111" stroke-width="2" stroke-linejoin="round"/>'],
[/twitter|^x$|^x\b/i,'<rect width="48" height="48" rx="11" fill="#000"/><path d="M12 11l24 26M36 11L12 37" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'],
[/youtube|^yt$/i,'<rect y="9" width="48" height="30" rx="9" fill="#f00"/><path d="M20 17v14l12-7z" fill="#fff"/>'],
[/linkedin/i,'<rect width="48" height="48" rx="9" fill="#0a66c2"/><rect x="9" y="19" width="6" height="20" fill="#fff"/><circle cx="12" cy="12.500" r="3.500" fill="#fff"/><path d="M20 19h5.500v2.800c.9-1.700 3-3.200 5.800-3.200 5.200 0 6.700 3.300 6.700 8V39h-6V28c0-2.300-.5-4-2.800-4-2.700 0-3.700 1.900-3.700 4.400V39h-5.500z" fill="#fff"/>'],
[/telegram/i,'<circle cx="24" cy="24" r="24" fill="#29a9eb"/><path d="M10 23.500l25-10c1.200-.4 2.200.3 1.800 2l-4.300 20.300c-.3 1.400-1.200 1.800-2.300 1.100l-6.500-4.800-3.100 3c-.3.300-.7.600-1.300.6l.5-6.600 12-10.900c.5-.5-.1-.7-.8-.3L16.500 27.600l-6.400-2c-1.400-.4-1.400-1.400.1-2.100z" fill="#fff"/>'],
[/netflix/i,'<rect width="48" height="48" rx="10" fill="#111"/><path d="M15 9h6v30h-6zM27 9h6v30h-6z" fill="#b20710"/><path d="M15 9h6l12 30h-6z" fill="#e50914"/>'],
[/amazon/i,'<rect width="48" height="48" rx="11" fill="#232f3e"/><text x="24" y="28" font-size="26" font-weight="700" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif">a</text><path d="M11 34c8 5 19 5 26 0" stroke="#ff9900" stroke-width="3" fill="none" stroke-linecap="round"/>'],
[/flipkart/i,'<rect width="48" height="48" rx="11" fill="#2874f0"/><text x="24" y="35" font-size="30" font-weight="800" text-anchor="middle" fill="#ffe500" font-family="Arial,sans-serif">f</text>'],
[/paytm/i,'<rect width="48" height="48" rx="11" fill="#fff" stroke="#ddd"/><text x="24" y="28" text-anchor="middle" font-size="14" font-weight="800" font-family="Arial,sans-serif"><tspan fill="#002e6e">pay</tspan><tspan fill="#00baf2">tm</tspan></text>'],
[/phone ?pe/i,'<circle cx="24" cy="24" r="24" fill="#5f259f"/><text x="24" y="33" font-size="26" font-weight="700" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif">₹</text>'],
[/swiggy/i,'<rect width="48" height="48" rx="11" fill="#fc8019"/><text x="24" y="34" font-size="28" font-weight="800" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif">S</text>'],
[/zomato/i,'<rect width="48" height="48" rx="11" fill="#e23744"/><text x="24" y="33" font-size="26" font-weight="800" font-style="italic" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif">zomato</text>'],
[/spotify/i,'<circle cx="24" cy="24" r="24" fill="#1ed760"/><path d="M12 18c8-3 18-2 25 2M14 25c7-2.500 15-1.500 21 2M16 32c6-2 12-1.200 17 1.500" stroke="#000" stroke-width="3.500" fill="none" stroke-linecap="round"/>'],
[/github/i,'<circle cx="24" cy="24" r="24" fill="#181717"/><path fill="#fff" d="M24 8C15.200 8 8 15.200 8 24c0 7.100 4.600 13.100 10.900 15.200.8.100 1.100-.3 1.100-.8v-2.800c-4.400 1-5.400-2.100-5.400-2.100-.7-1.800-1.800-2.300-1.800-2.300-1.400-1 .1-1 .1-1 1.600.1 2.400 1.600 2.400 1.600 1.400 2.400 3.700 1.700 4.600 1.300.1-1 .6-1.700 1-2.100-3.500-.4-7.200-1.800-7.200-7.900 0-1.700.6-3.100 1.600-4.200-.2-.4-.7-2 .2-4.200 0 0 1.300-.4 4.300 1.600a14.800 14.800 0 0 1 7.800 0c3-2 4.300-1.600 4.300-1.600.9 2.200.3 3.800.2 4.200 1 1.100 1.600 2.500 1.600 4.200 0 6.100-3.700 7.500-7.200 7.900.6.500 1.100 1.500 1.100 3v4.400c0 .4.300.9 1.100.8C35.400 37.100 40 31.100 40 24c0-8.800-7.200-16-16-16z"/>'],
[/bank|sbi|hdfc|icici|axis/i,'<rect width="48" height="48" rx="11" fill="#1e3a8a"/><path d="M24 9L9 17v3h30v-3zM12 22v12h4V22zM20 22v12h4V22zM28 22v12h4V22zM34 22v12h2V22zM9 36v3h30v-3z" fill="#fff"/>'],
[/aadhaar|aadhar|govt/i,'<rect width="48" height="48" rx="11" fill="#fff" stroke="#ddd"/><rect x="0" y="0" width="48" height="12" rx="11" fill="#ff9933"/><rect x="0" y="36" width="48" height="12" rx="11" fill="#138808"/><circle cx="24" cy="24" r="8" fill="none" stroke="#000080" stroke-width="2.500"/>']
];
function icon(n,sz){let inner=null;for(const [re,svg] of BR){if(re.test(n)){inner=svg;break}}
 if(!inner){let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))%360;inner=`<rect width="48" height="48" rx="12" fill="hsl(${h},70%,48%)"/><text x="24" y="33" font-size="26" font-weight="700" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif">${esc((n[0]||'?').toUpperCase())}</text>`}
 return `<svg viewBox="0 0 48 48" width="${sz}" height="${sz}" aria-hidden="true" style="flex:none">${inner}</svg>`}
const SITES=[['Gmail','📧'],['Instagram','📸'],['Facebook','👍'],['WhatsApp','💬'],['Twitter/X','🐦'],['YouTube','▶️'],['LinkedIn','💼'],['Snapchat','👻'],['Telegram','✈️'],['Netflix','🎬'],['Amazon','📦'],['Flipkart','🛒'],['Paytm','💳'],['PhonePe','📱'],['Swiggy','🍔'],['Zomato','🍕'],['Spotify','🎵'],['GitHub','🐙'],['Bank','🏦'],['Aadhaar/Govt','🪪']];
$('chips').innerHTML=SITES.map(([n],k)=>`<button type="button" class="chip" style="animation-delay:${k*.03}s" data-a="pick" data-v="${n}">${icon(n,22)} ${n}</button>`).join('');
function pick(n){$('n').value=n;$('u').focus()}
function ic(n){return icon(n,22)+' '}
function render(){const f=$('q').value.toLowerCase();$('cnt').textContent='('+vault.length+')';
 $('tiles').innerHTML=vault.map((v,i)=>`<button type="button" class="tile" style="animation-delay:${i*.04}s" data-a="show" data-v="${i}">${icon(v.n,40)}<span>${esc(v.n)}</span></button>`).join('')||'<p class="s">Abhi koi button nahi. Neeche se password save karo.</p>';
 $('list').innerHTML=vault.map((v,i)=>({v,i})).filter(o=>o.v.n.toLowerCase().includes(f)).map(({v,i})=>
 `<div class="kv item" style="animation:up .4s ease both;animation-delay:${i*.05}s"><div><b style="display:flex;align-items:center;gap:8px">${icon(v.n,24)} ${esc(v.n)}</b><br><small>${esc(v.u)}${v.nick?' · 🗣️ '+esc(v.nick):''}</small></div>
 <div class="row" style="flex:none"><button class="g" data-a="show" data-v="${i}">Dekho</button><button class="d" data-a="del" data-v="${i}">🗑 Delete</button></div></div>`).join('')||'<p class="s">Abhi kuch save nahi hai.</p>'}
$('q').oninput=render;
$('add').onclick=async()=>{const n=$('n').value.trim(),u=$('u').value.trim(),p=$('p').value;
 if(!n||!p)return;vault.push({n,u,p,nick:$('nick').value.trim()});await save();['n','u','p','nick'].forEach(x=>$(x).value='');render();updSel()};
async function del(i){const nm=vault[i]?vault[i].n:'';vault.splice(i,1);await save();clearTimeout(timer);$('result').innerHTML='';$('heard').textContent='🗑 '+nm+' delete ho gaya';render()}

function show(i){const v=vault[i];clearTimeout(timer);
 $('result').innerHTML=`<div class="card res"><b>✨ ${esc(v.n)}</b>
 <div class="kv"><div><span class="l">Username</span>${esc(v.u||'-')}</div><button class="g" data-a="cp" data-v="${i}" data-k="u">Copy</button></div>
 <div class="kv"><div><span class="l">Password</span>${esc(v.p)}</div><button class="g" data-a="cp" data-v="${i}" data-k="p">Copy</button></div>
 <button type="button" class="d" style="width:100%;margin-top:6px" data-a="del" data-v="${i}">🗑 Delete / Unsave karo</button><div class="bar"><i id="bar"></i></div><small style="color:var(--mut)">15 second me chhup jayega</small></div>`;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{const b=$('bar');if(b)b.style.width='0'}));
 timer=setTimeout(()=>$('result').innerHTML='',15000);$('result').scrollIntoView({behavior:'smooth'})}
async function cp(i,k){try{await navigator.clipboard.writeText(vault[i][k]);$('heard').textContent='Copy ho gaya ✅'}catch(e){$('heard').textContent='Copy nahi hua, manually select karo.'}}

const alias={instagram:['इंस्टाग्राम','इंस्टा','insta','instagram'],gmail:['जीमेल','जी मेल','gmail','google','गूगल','email','ईमेल'],
 whatsapp:['व्हाट्सएप','व्हाट्सऐप','वॉट्सएप','वाट्सएप','व्हाट्स','whatsapp','whats app'],facebook:['फेसबुक','फेस बुक','facebook','fb'],
 twitter:['ट्विटर','twitter'],telegram:['टेलीग्राम','telegram'],flipkart:['फ्लिपकार्ट','flipkart'],spotify:['स्पॉटिफाई','spotify'],zomato:['ज़ोमैटो','जोमैटो','zomato'],swiggy:['स्विगी','swiggy'],phonepe:['फोनपे','phonepe'],github:['गिटहब','github'],bank:['बैंक','bank'],youtube:['यूट्यूब','youtube'],linkedin:['लिंक्डइन','linkedin'],paytm:['पेटीएम','paytm'],amazon:['अमेज़न','अमेजन','amazon'],netflix:['नेटफ्लिक्स','netflix'],snapchat:['स्नैपचैट','snapchat']};
function norm(s){s=s.toLowerCase();for(const k in alias)for(const a of alias[k])if(s.includes(a.toLowerCase()))s+=' '+k;return s}
function findBy(t){const T=norm(t);const hits=[];
 vault.forEach((v,i)=>{const n=norm(v.n);let sc=0;const nk=(v.nick||'').toLowerCase().trim();if(nk&&T.includes(nk))sc=5;
  if(sc){}else if(T.includes(v.n.toLowerCase()))sc=2;
  else for(const k in alias)if(T.includes(k)&&n.includes(k))sc=2;
  if(sc&&v.u&&T.includes(v.u.toLowerCase()))sc=Math.max(sc,3);if(sc)hits.push([sc,i])});
 hits.sort((a,b)=>b[0]-a[0]);const top=hits.length?hits[0][0]:0;return (top===5?hits.filter(h=>h[0]===5):hits).map(h=>h[1])}

let LANG=store.get('lang')||'hi-IN',AN=store.get('aname')||'J.A.R.V.I.S.';
function hudIdle(){$('hud').textContent=AN.toUpperCase()+' ONLINE · TAP KARO'}
function langTxt(){$('lang').textContent='🌐 Bhasha: '+(LANG==='hi-IN'?'हिंदी (Hindi)':'English / Hinglish')+' (badalne ke liye tap)'}
$('aname').value=store.get('aname')||'';$('req').checked=store.get('req')==='1';hudIdle();langTxt();
$('aname').oninput=()=>{const v=$('aname').value.trim();AN=v||'J.A.R.V.I.S.';store.set('aname',v);hudIdle()};
$('req').onchange=()=>store.set('req',$('req').checked?'1':'0');
$('lang').onclick=()=>{LANG=LANG==='hi-IN'?'en-IN':'hi-IN';store.set('lang',LANG);langTxt()};
function listenOnce(btn,cb){if(!SR){$('heard').textContent='Is browser me voice support nahi hai.';return}
 const r=new SR();r.lang=LANG;r.onstart=()=>{btn.textContent='🎧';$('heard').textContent='Naam bolo...'};
 r.onresult=e=>cb(e.results[0][0].transcript.trim());
 r.onerror=e=>{$('heard').textContent=e.error==='not-allowed'?'Mic blocked hai. Chrome ke alag tab me kholo aur Allow karo':'Dikkat: '+e.error};
 r.onend=()=>{btn.textContent='🎤'};try{r.start()}catch(e){}}
$('nickmic').onclick=()=>listenOnce($('nickmic'),t=>{$('nick').value=t;$('heard').textContent='Voice naam: "'+t+'" ✅'});
$('anamemic').onclick=()=>listenOnce($('anamemic'),t=>{$('aname').value=t;$('aname').oninput();$('heard').textContent='Mic ka naam: "'+t+'" ✅'});
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let rec=null,always=false,busy=false,hist=[],samp;
async function getSamp(){if(samp!==undefined)return samp;try{samp=window.claude?await window.claude.use('sample'):null}catch(e){samp=null}return samp}
let aiDead=false,aiHist=[];const aiOn=()=>store.get('pf_ai')!=='0';
async function aiAsk(t){if(aiDead||!aiOn()||navigator.onLine===false)return null;const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),12000);
 try{const r=await fetch('/api/jarvis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:t,hist:aiHist,lang:LANG,name:AN}),signal:ac.signal});
  if(r.status===404||r.status===503){aiDead=true;return null}if(!r.ok)return null;
  const j=await r.json(),a=String(j.reply||'').trim();if(!a)return null;aiHist.push({u:t,a:a});aiHist=aiHist.slice(-6);return a}catch(e){return null}finally{clearTimeout(tm)}}
try{$('aion').checked=aiOn();$('aion').onchange=()=>store.set('pf_ai',$('aion').checked?'1':'0')}catch(e){}
function updAlways(){$('always').textContent=always?'🟢 Hamesha sun raha hoon (band karne ko tap)':'⚪ Hamesha sunna: band (chalane ko tap)'}updAlways();
const TTS=Object.assign({on:true,rate:1,pitch:1,voice:''},(()=>{try{return JSON.parse(store.get('tts')||'{}')}catch(e){return {}}})());
const saveTTS=()=>store.set('tts',JSON.stringify(TTS));
function fillVoices(){try{const vs=speechSynthesis.getVoices().filter(v=>/^(hi|en-IN)/i.test(v.lang));$('tvoice').innerHTML='<option value="">Auto voice</option>'+vs.map(v=>`<option value="${esc(v.name)}"${v.name===TTS.voice?' selected':''}>${esc(v.name)} (${v.lang})</option>`).join('')}catch(e){}}
try{speechSynthesis.onvoiceschanged=fillVoices}catch(e){}fillVoices();
$('tson').checked=TTS.on;$('trate').value=TTS.rate;$('tpitch').value=TTS.pitch;
$('tson').onchange=()=>{TTS.on=$('tson').checked;saveTTS()};$('trate').oninput=()=>{TTS.rate=+$('trate').value;saveTTS()};
$('tpitch').oninput=()=>{TTS.pitch=+$('tpitch').value;saveTTS()};$('tvoice').onchange=()=>{TTS.voice=$('tvoice').value;saveTTS()};
$('ttest').onclick=()=>{const o=TTS.on;TTS.on=true;speak(LANG==='hi-IN'?'नमस्ते, मैं '+AN+' हूँ। बताइए, क्या करना है?':'Hello, main '+AN+' hoon. Bataiye kya karna hai?',()=>{TTS.on=o})};
$('wave').innerHTML=Array.from({length:26},(_,k)=>`<i style="animation-delay:${(k%7)*.08}s"></i>`).join('');
$('send').onclick=()=>{getSamp();const t=$('cmd').value.trim();if(!t||busy)return;$('cmd').value='';$('heard').textContent='"'+t+'"';handle(t,true)};
$('cmd').onkeydown=e=>{if(e.key==='Enter')$('send').click()};
$('diag').onclick=async()=>{const o=[],ok=(b,t)=>o.push((b?'✅ ':'❌ ')+t);
 ok(isSecureContext,'Secure page (https)');ok(!!SR,'Voice sunne ki suvidha is browser me');
 let pol=true;try{const fp=document.featurePolicy||document.permissionsPolicy;if(fp&&fp.allowsFeature)pol=fp.allowsFeature('microphone')}catch(e){}
 ok(pol,'Is page ko mic ki ijazat (Claude ke frame se)');
 try{if(navigator.permissions){const st=await navigator.permissions.query({name:'microphone'});ok(st.state!=='denied','Browser mic permission: '+st.state)}}catch(e){}
 let stream=null;
 try{stream=await navigator.mediaDevices.getUserMedia({audio:true});ok(true,'Mic khul gaya! Ab bolo, neeche bar hilni chahiye 🎙️')}catch(e){ok(false,'Mic nahi khula: '+(e.name||e.message))}
 $('dout').innerHTML=o.join('<br>');
 if(stream){const ac=new (window.AudioContext||window.webkitAudioContext)(),an=ac.createAnalyser();an.fftSize=256;ac.createMediaStreamSource(stream).connect(an);
  const d=new Uint8Array(an.frequencyBinCount),t0=Date.now();(function lp(){an.getByteFrequencyData(d);const v=d.reduce((a,b)=>a+b,0)/d.length;$('mlev').style.width=Math.min(100,v*2.2)+'%';
   if(Date.now()-t0<8000)requestAnimationFrame(lp);else{stream.getTracks().forEach(t=>t.stop());ac.close();$('mlev').style.width='0'}})()}
 else $('dout').innerHTML+='<br><br>👉 <b>Kya karein:</b><br>1) Chrome address bar ke 🔒 icon pe Mic = Allow.<br>2) Phone Settings → Apps → Chrome → Permissions → Microphone → Allow.<br>3) Agar "page ko mic ki ijazat" ❌ hai, to Claude ne is page ko aise frame me khola hai jahan mic band hai. Tab tak <b>upar wale box me likho ya keyboard ke 🎤 se bolo</b>, wo poora kaam karta hai.'};
(function(){const c=$('fx'),x=c.getContext('2d');let W,H,P=[];function rs(){W=c.width=innerWidth;H=c.height=innerHeight}rs();addEventListener('resize',rs);
 for(let i=0;i<45;i++)P.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*2+.6,v:Math.random()*.5+.15,h:[185,270,320][i%3]});
 (function f(){x.clearRect(0,0,W,H);for(const p of P){p.y-=p.v;if(p.y<-5){p.y=H+5;p.x=Math.random()*W}x.beginPath();x.fillStyle='hsla('+p.h+',100%,65%,.55)';x.shadowBlur=10;x.shadowColor='hsl('+p.h+',100%,65%)';x.arc(p.x,p.y,p.r,0,7);x.fill()}requestAnimationFrame(f)})()})();
function speak(t,cb){let done=false;const fin=()=>{if(done)return;done=true;$('wave').classList.remove('sp');hudIdle();cb&&cb()};
 if(!TTS.on)return fin();
 try{if(!('speechSynthesis' in window)){$('hud').textContent='🔇 IS BROWSER ME AWAAZ NAHI';return fin()}
  const txt=String(t).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu,'').replace(/\s+/g,' ').trim();if(!txt)return fin();
  const ss=speechSynthesis;ss.cancel();
  setTimeout(()=>{if(done)return;const u=new SpeechSynthesisUtterance(txt);u.rate=TTS.rate;u.pitch=TTS.pitch;
   const dev=/[\u0900-\u097F]/.test(txt),want=dev?'hi-IN':'en-IN',vs=ss.getVoices();
   const pv=vs.find(v=>v.name===TTS.voice)||vs.find(v=>v.lang.replace('_','-')===want)||vs.find(v=>v.lang.toLowerCase().indexOf(want.slice(0,2))===0);
   if(pv){u.voice=pv;u.lang=pv.lang}else u.lang=want;
   let started=false;u.onstart=()=>{started=true};u.onend=fin;
   u.onerror=()=>{$('hud').textContent=dev?'🔇 HINDI AWAAZ NAHI MILI: Mic settings me Bhasha English karo':'🔇 AWAAZ NAHI MILI';fin()};
   $('hud').textContent=AN.toUpperCase()+' BOL RAHA HAI...';$('wave').classList.add('sp');
   try{ss.resume()}catch(e){}ss.speak(u);
   setTimeout(()=>{if(!started&&!done&&!ss.speaking){$('hud').textContent=dev?'🔇 HINDI AWAAZ NAHI MILI: Mic settings me Bhasha English karo':'🔇 AWAAZ NAHI MILI. Test karo 🔊';fin()}},3000)},150);
  setTimeout(fin,20000)}catch(e){fin()}} function resume(){if(always)setTimeout(startRec,300)}
function localReply(t){const ids=findBy(t),hi=LANG==='hi-IN';
 if(ids.length===1){show(ids[0]);return hi?'ये लीजिए, '+vault[ids[0]].n+' की जानकारी स्क्रीन पर है।':'Ye lo, '+vault[ids[0]].n+' ki details screen par hain.'}
 if(ids.length>1){$('result').innerHTML='<div class="card res"><b>Kaunsa account?</b>'+ids.map(k=>`<div class="kv"><div>${esc(vault[k].n)}<br><small>${esc(vault[k].u)}</small></div><button data-a="show" data-v="${k}">Dikhao</button></div>`).join('')+'</div>';return hi?'कई अकाउंट मिले, कौन सा चाहिए?':'Kai account mile, kaunsa chahiye?'}
 return hi?'माफ़ कीजिए, मुझे समझ नहीं आया।':'Sorry, mujhe samajh nahi aaya.'}
async function handle(text,typed){
 busy=true;let t=text,reply='';
 if(/^\s*(bas|bas karo|bas itna|bas ho gaya|ruko|rukiye|stop|band karo|bye|bye bye|alvida|बस|बस करो|बस इतना|रुको|रुकिए|बंद करो|अलविदा)\s*[.!।]?\s*$/i.test(t)){always=false;updAlways();const bye=LANG==='hi-IN'?'ठीक है, जब ज़रूरत हो माइक दबाइए।':'Theek hai, jab zarurat ho mic dabana.';$('say').textContent=bye;hist=[];aiHist=[];busy=false;return speak(bye)}
 if($('req').checked&&!typed){const nm=AN.toLowerCase().replace(/[.\s]/g,'');
  if(!t.toLowerCase().replace(/[.\s]/g,'').includes(nm)){busy=false;if(!always)$('heard').textContent='Pehle "'+AN+'" bolo 😉';$('say').textContent='💡 Pehle "'+AN+'" bolo, phir apni baat.';return resume()}}
 $('say').textContent='🤔 soch raha hoon...';
 let acted=false;const _lr=window.__localFirst?window.__localFirst(t):null;if(_lr){reply=_lr;acted=true}const sm=acted?null:await getSamp();if(sm){try{
  const list=vault.map((v,k)=>({i:k,naam:v.n,voice_naam:v.nick||''}));
  const prompt=`Tum "${AN}" ho, Iron Man ke Jarvis jaisa friendly voice assistant, ek password vault app ke andar. User ki baat samjho, chhota natural jawab do (1-2 vakya) aur zarurat ho to action chuno.
Bhasha: ${LANG==='hi-IN'?'Hindi (Devanagari lipi me)':'simple Hinglish ya English'}.
Vault ke accounts (sirf naam; password/username tumhe nahi diye jaate): ${JSON.stringify(list)}
Pichli baatcheet: ${hist.join(' | ')||'koi nahi'}
User ne abhi kaha: ${JSON.stringify(t)}
Sirf valid JSON do, aur kuch nahi: {"reply":"bolne wala jawab","action":"show|prefill|delete|list|lock|none","index":number ya null,"name":"prefill ke liye account ka naam ya null"}
Niyam: user kisi account ka password/username maange to action "show" aur sahi index (voice_naam ya naam se match; Hindi/English spelling ka fark ignore karo; agar do match hon ya pata na ho to action "none" aur poocho). Naya password save karna ho to "prefill" aur name. Delete maange to "delete" aur index. Accounts ki list maange to "list" aur reply me naam bolo. Password ya username reply me KABHI mat bolo. Normal baat ya sawal ka seedha jawab do, action "none".`;
  let r=await sm.json(prompt,{cache:false});
  if(typeof r==='string')r=JSON.parse(r.replace(/```json|```/g,'').trim());
  reply=String(r.reply||'');const a=r.action,k=Number.isInteger(r.index)?r.index:-1;
  if(a==='show'&&vault[k]){show(k)}
  else if(a==='prefill'){$('n').value=r.name||'';$('u').focus();$('n').scrollIntoView({behavior:'smooth'})}
  else if(a==='delete'&&vault[k]){$('q').value=vault[k].n;render();$('list').scrollIntoView({behavior:'smooth'});reply+=LANG==='hi-IN'?' हटाने के लिए 🗑 दबाइए।':' Hatane ke liye 🗑 dabao.'}
  else if(a==='lock'){setTimeout(()=>location.reload(),2500)}
  acted=true;
 }catch(e){acted=false}}
 if(!acted&&!sm&&!findBy(t).length){const ai=await aiAsk(t);if(ai){reply=ai;acted=true}}
 if(!acted)reply=localReply(t);
 hist.push('User: '+t+' → Tum: '+reply);hist=hist.slice(-5);
 $('say').textContent=reply;busy=false;speak(reply,resume)}
function startRec(){
 if(!SR){$('heard').textContent='Is browser me voice support nahi hai. Chrome use karo.';return}
 if(rec||busy)return;
 try{const fp=document.featurePolicy||document.permissionsPolicy;if(fp&&fp.allowsFeature&&!fp.allowsFeature('microphone')){$('heard').textContent='Is frame me mic band hai 🔒 Neeche box me keyboard ka 🎤 dabake bolo, main khud sun lunga 👇';$('cmd').focus();always=false;updAlways();return}}catch(e){}
 rec=new SR();rec.lang=LANG;rec.interimResults=true;
 rec.onstart=()=>{$('mic').classList.add('on');$('hud').textContent='LISTENING...';$('heard').textContent=always?'Sun raha hoon... bolo 🎧 (rokne ke liye "bas" bolo)':'Sun raha hoon... bolo 🎧'};
 rec.onresult=e=>{window.__ns=0;const r=e.results[e.results.length-1];$('heard').textContent='"'+r[0].transcript+'"';if(r.isFinal)handle(r[0].transcript)};
 rec.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed'){always=false;updAlways();$('heard').textContent='Mic blocked hai 🔒 Neeche box me keyboard ka 🎤 dabake bolo 👇';$('cmd').focus()}else if(e.error!=='no-speech'&&e.error!=='aborted')$('heard').textContent='Dikkat: '+e.error;else if(e.error==='no-speech'){window.__ns=(window.__ns||0)+1;if(always&&window.__ns>=3){always=false;updAlways();$('say').textContent='🎧 Kuch sunai nahi diya, mic band kar diya. Dobara tap karo.'}else if(!always)$('say').textContent='🎧 Kuch sunai nahi diya. Mic dabake dobara bolo.'}};
 rec.onend=()=>{$('mic').classList.remove('on');rec=null;if(!busy){hudIdle();if(always)setTimeout(startRec,400)}};
 try{rec.start()}catch(e){rec=null}}
$('mic').onclick=()=>{getSamp();if(rec){always=false;updAlways();rec.stop();return}try{speechSynthesis.cancel()}catch(e){}always=true;updAlways();startRec()};
$('always').onclick=()=>{getSamp();always=!always;updAlways();if(always){try{speechSynthesis.cancel()}catch(e){}startRec()}else if(rec)rec.stop()};
function eye(b,...ids){b.onclick=()=>{const h=$(ids[0]).type==='password';ids.forEach(i=>$(i).type=h?'text':'password');b.textContent=h?'🙈':'👁'}}
eye($('eye'),'p');eye($('eye0'),'mp','mp2');
let atm;$('cmd').addEventListener('input',()=>{clearTimeout(atm);if(!$('auto').checked||$('cmd').value.trim().length<2)return;atm=setTimeout(()=>{if(!busy)$('send').click()},2000)});
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a,v=b.dataset.v;
 if(a==='flip'){document.querySelectorAll('.owner').forEach(o=>o.classList.toggle('on'))}else if(a==='pick'){$('n').value=v;updSel();$('sel').scrollIntoView({behavior:'smooth',block:'center'});$('u').focus({preventScroll:true})}
 else if(a==='show')show(+v);
 else if(a==='cp')cp(+v,b.dataset.k);
 else if(a==='del'){if(b.dataset.arm){b.dataset.arm='';del(+v)}else{b.dataset.arm='1';const o=b.textContent;b.textContent='Pakka? Dobara dabao ❗';setTimeout(()=>{b.dataset.arm='';b.textContent=o},3000)}}});
(function(){const pats=['70 9 34 11','96 14 40 9','56 8 80 12','110 10 30 16'];let h='';
 for(let k=0;k<9;k++){const rx=7+k*5.8;h+=`<ellipse cx="60" cy="80" rx="${rx}" ry="${rx*1.22}" stroke-dasharray="${pats[k%4]}" transform="rotate(${k*37} 60 80)"/>`}
 $('ridges').innerHTML=h})();
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('vaultfp',1);r.onupgradeneeded=()=>r.result.createObjectStore('k');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function idbOp(m,k,v){const d=await idb();return new Promise((res,rej)=>{const t=d.transaction('k',m==='get'?'readonly':'readwrite'),o=t.objectStore('k');const q=m==='get'?o.get(k):m==='put'?o.put(v,k):o.delete(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
const fpOn=()=>false;
function fpEnv(){if(location.protocol==='file:')return 'Ye file seedha phone se khuli hai. Fingerprint ke liye isse https wali apni website par kholo.';if(!window.isSecureContext)return 'Page https nahi hai. Fingerprint ke liye https link chahiye.';if(window.top!==window)return 'Ye page Claude ke frame ke andar khula hai, isliye fingerprint block hai. Zip ko apni hosting (Netlify/Cloudflare Pages) par daalo aur wahi link seedha kholo.';return ''}
function fpErr(e){const n=e&&e.name;if(n==='NotAllowedError')return 'Fingerprint cancel hua, ya Claude ke frame me allowed nahi hai. Master password se kholo.';if(n==='SecurityError')return 'Is page par fingerprint allowed nahi (security). Master password se kholo.';if(n==='NotSupportedError')return 'Is phone par ye fingerprint tarika support nahi.';return 'Fingerprint dikkat: '+(n||e)}
function fpUi(){$('fpst').textContent=fpOn()?'✅ Chalu hai. Lock screen par fingerprint pad dabao.':'⚪ Abhi band hai.';$('fpbtn').textContent=fpOn()?'Fingerprint unlock band karo':'Fingerprint unlock ON karo 👆';
 if(!$('lock').classList.contains('hide'))$('fptxt').textContent=fpOn()?'FINGERPRINT PAD DABAO 👆':'TOUCH TO UNLOCK'}
$('fpbtn').onclick=async()=>{
 if(fpOn()){try{await idbOp('del','key')}catch(e){}store.set('fp','0');fpUi();return}
 const _e=fpEnv();if(_e){$('fpst').textContent='❌ '+_e;return}
 if(!window.PublicKeyCredential||!navigator.credentials){$('fpst').textContent='❌ Is browser me fingerprint (WebAuthn) nahi hai. Chrome use karo.';return}
 try{const ok=await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();if(!ok){$('fpst').textContent='❌ Phone me fingerprint/screen lock set nahi hai ya allowed nahi.';return}
  $('fpst').textContent='Phone ka fingerprint maang raha hai... 👆';
  const c=await navigator.credentials.create({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),rp:{name:'PassFast'},user:{id:crypto.getRandomValues(new Uint8Array(16)),name:'vault-owner',displayName:'Vault Owner'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'preferred'},timeout:60000}});
  await idbOp('put','key',key);store.set('fpcred',b64(c.rawId));store.set('fp','1');fpUi()
 }catch(e){$('fpst').textContent='❌ '+fpErr(e)}};
async function fpUnlock(){
 await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:'public-key',id:ub(store.get('fpcred')),transports:['internal']}],userVerification:'required',timeout:60000}});
 const k=await idbOp('get','key');if(!k){store.set('fp','0');fpUi();throw new Error('Fingerprint data nahi mila. Password se kholo aur dobara ON karo.')}
 const d=JSON.parse(raw());salt=ub(d.s);key=k;vault=JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:ub(d.iv)},key,ub(d.ct))));
 $('fp').classList.add('ok');$('fptxt').textContent='ACCESS GRANTED ✓';$('lockmsg').textContent='Fingerprint match ✅';await new Promise(r=>setTimeout(r,900));
 $('lock').classList.add('hide');$('app').classList.remove('hide');$('app').classList.add('enter');render();fpUi()}
$('fp').onclick=async()=>{
 if(fpOn()&&!$('mp').value){$('err').textContent='';try{await fpUnlock()}catch(e){$('err').textContent=fpErr(e);$('fp').classList.add('bad');setTimeout(()=>$('fp').classList.remove('bad'),900);$('mp').focus()}return}
 if($('mp').value)$('unlock').click();else{$('mp').focus();$('fptxt').textContent='KEYBOARD KE UPAR 🔑 SUGGESTION DABAO ↓'}};
fpUi();
const PHOTO="data:image/jpeg;base64,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";
const OWN=`<button type="button" class="ownchip"><img src="${PHOTO}" alt="" width="40" height="40"><span><small>ORGANISER</small><b>S.K Aayan</b></span><i aria-hidden="true">›</i></button>`;
document.querySelectorAll('.ownslot').forEach(e=>e.innerHTML=OWN);
try{localStorage.removeItem('sname2')}catch(e){}
$('lf').addEventListener('submit',e=>e.preventDefault());
$('mp').addEventListener('input',e=>{if(!first&&$('mp').value.length>=6&&(!e.inputType||e.inputType==='insertReplacementText'))setTimeout(()=>{if(!$('lock').classList.contains('hide'))$('unlock').click()},350)});
function updSel(){const n=$('n').value.trim();
 $('sel').innerHTML=n?`${icon(n,34)}<span>✅ ${esc(n)}</span><small style="color:var(--mut);font-weight:400;margin-left:auto">ke liye save ho raha hai</small>`:'';
 document.querySelectorAll('.chip[data-a="pick"]').forEach(c=>c.classList.toggle('on',!!n&&c.dataset.v===n));
 $('u').placeholder=n?n+' ka username / email / number':'Username / Email / Number';$('p').placeholder=n?n+' ka password':'Password'}
$('n').addEventListener('input',updSel);
$('fpgo').onclick=()=>$('fp').click();
$('pwgo').onclick=()=>{$('mp').focus();$('fptxt').textContent='PASSWORD DAALO ↓'};
$('fpchrome').onclick=async()=>{const pw=$('fpmp').value,o=$('fpst2');if(pw.length<6){o.textContent='❌ Master Password daalo.';return}
 try{const d=JSON.parse(raw());const k=await derive(pw,ub(d.s));await crypto.subtle.decrypt({name:'AES-GCM',iv:ub(d.iv)},k,ub(d.ct))}catch(e){o.textContent='❌ Galat Master Password.';return}
 try{if(!window.PasswordCredential)throw new Error('np');await navigator.credentials.store(new PasswordCredential({id:'vault-owner',password:pw,name:'PassFast'}));$('fpmp').value='';o.textContent='✅ Chrome ko bhej diya. "Save password" popup aaye to Save dabao. Ab lock screen par fingerprint pad dabao.'}
 catch(e){o.textContent='⚠️ Chrome ne seedha save nahi kiya. Koi baat nahi: Lock karke Master Password se kholo, jab "Save password" popup aaye tab Save dabao. Bas ho gaya.'}};

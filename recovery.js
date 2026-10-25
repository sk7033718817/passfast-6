/* PassFast phone recovery.
   Register: verify phone by SMS OTP BEFORE the vault is created -> recovery is ON from day one.
   Forgot password: phone OTP -> server releases a recovery key -> opens the encrypted recovery copy -> NEW Master Password.
   The server never sees passwords or vault data. The phone number is only used to send the SMS and derive the key. */
(function(){
try{
var g=function(i){return document.getElementById(i)},enc=new TextEncoder(),dec=new TextDecoder();
var tt=function(h,e){var l=window.__lang||'hx';return(l==='hx'||l==='hi')?h:e};
var LS={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}},del:function(k){try{localStorage.removeItem(k)}catch(e){}}};
var b64=function(b){var a=new Uint8Array(b),s='';for(var i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);return btoa(s)},ub=function(s){return Uint8Array.from(atob(s),function(c){return c.charCodeAt(0)})};
var rkey=null,recovered=null,busy=false;
function hasRec(){return LS.get('pf_rec')==='1'&&!!LS.get('pf_recblob')}
function say(el,t,good){if(typeof el==='string')el=g(el);if(!el)return;el.style.color=good?'var(--ac)':'var(--bad)';el.textContent=t}
function api(name,body){return fetch('/api/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})}).then(function(r){return r.json().catch(function(){return{}}).then(function(j){if(!r.ok){var e=new Error(j.error||('HTTP '+r.status));e.status=r.status;throw e}return j})},function(){var e=new Error('net');e.status=0;throw e})}
function soft(e){return e&&(e.status===0||e.status===404||e.status===503)}
var inPreview=(function(){var t=false;try{t=window.top!==window.self}catch(e){t=true}return t||/claude|anthropic/i.test(String(location.hostname||''))})();
function emsg(e){
 if(e.status===404)return tt('Server function nahi mila (api folder deploy nahi hua). Poora zip Vercel par deploy karo.','Server function not found (the api folder was not deployed). Deploy the whole zip on Vercel.');
 if(e.status===503)return tt('Twilio keys set nahi hain. Vercel > Environment Variables me daalo aur redeploy karo.','Twilio keys are not set. Add them in Vercel > Environment Variables and redeploy.');
 if(e.status===0)return tt('Server tak nahi pahunch paaye. Internet check karo.','Could not reach the server. Check your internet.');
 if(e.status===502)return tt('SMS nahi gaya. Twilio number/credit check karo (trial me sirf verified numbers par jata hai).','SMS failed. Check your Twilio number/credit (trial accounts only text verified numbers).');
 return e.message}
var PREVIEW_MSG=function(){return tt('ℹ️ Ye Claude preview hai, yahan SMS nahi ja sakta. Apni Vercel site par (Twilio setup ke baad) asli OTP aayega. Abhi demo ke liye neeche wala button dabao.','ℹ️ This is the Claude preview; SMS cannot be sent here. On your own Vercel site (after Twilio setup) the real OTP arrives. For a demo, use the button below.')};
function norm(s){s=String(s||'').replace(/[\s\-()]/g,'');if(/^[6-9]\d{9}$/.test(s))return'+91'+s;if(/^\+[1-9]\d{7,14}$/.test(s))return s;return null}

/* ---- crypto ---- */
async function dk(secret,salt){var m=await crypto.subtle.importKey('raw',enc.encode(secret),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:salt,iterations:100000,hash:'SHA-256'},m,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function wrap(v,rk){var s=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),k=await dk(rk,s);var ct=await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},k,enc.encode(JSON.stringify(v)));return JSON.stringify({s:b64(s),iv:b64(iv),ct:b64(ct),t:Date.now()})}
async function unwrap(rec,rk){var o=JSON.parse(rec),k=await dk(rk,ub(o.s));return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:ub(o.iv)},k,ub(o.ct))))}
/* the recovery key is itself kept encrypted under the Master-Password key, so a normal unlock can refresh the copy */
async function sealRk(rk,k){var iv=crypto.getRandomValues(new Uint8Array(12));var ct=await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},k,enc.encode(rk));LS.set('pf_rkenc',JSON.stringify({iv:b64(iv),ct:b64(ct)}))}
async function loadRk(){try{if(rkey||!key)return;var o=JSON.parse(LS.get('pf_rkenc')||'null');if(!o)return;rkey=dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:ub(o.iv)},key,ub(o.ct)))}catch(e){}}
async function refresh(){try{if(!rkey||!key)return;await sealRk(rkey,key);LS.set('pf_recblob',await wrap(vault,rkey));LS.set('pf_rec','1')}catch(e){}}
window.__loadRk=loadRk;
if(typeof save==='function'){var orig=save;save=async function(){await orig.apply(this,arguments);await refresh()}}
if(typeof MutationObserver!=='undefined'&&g('lock')){new MutationObserver(function(){if(g('lock').classList.contains('hide'))loadRk().then(sync)}).observe(g('lock'),{attributes:true,attributeFilter:['class']})}

/* ---- phone + OTP widget (used on 3 screens) ---- */
function widget(box,o){
 box.innerHTML='<div class="row" style="margin:6px 0"><input type="tel" class="pw-ph" inputmode="tel" placeholder="Mobile number (10 ank, ya +country code)" autocomplete="tel" style="flex:1;min-width:150px"><button type="button" class="pw-send" style="flex:none">📨 OTP bhejo</button></div><div class="pw-s2 hide"><input class="pw-otp" inputmode="numeric" maxlength="6" placeholder="SMS ka 6 ank wala OTP" autocomplete="one-time-code"><button type="button" class="pw-ver" style="width:100%;margin-top:6px">✔️ OTP verify karo</button></div><p class="s pw-msg" style="margin:6px 0 0;font-size:13px"></p>'+(o.skip?'<button type="button" class="g pw-skip hide" style="width:100%;margin-top:6px;font-size:13px">Bina phone ke aage badho (recovery nahi hogi)</button>':'');
 var q=function(c){return box.querySelector(c)},tok=null,wait=0,msg=q('.pw-msg');
 q('.pw-send').onclick=async function(){
  if(busy||wait>0)return;var ph=norm(q('.pw-ph').value);if(!ph)return say(msg,tt('Sahi mobile number daalo (10 ank).','Enter a valid mobile number (10 digits).'));
  if(inPreview){say(msg,PREVIEW_MSG());var s0=q('.pw-skip');if(s0)s0.classList.remove('hide');return}busy=true;try{var j=await api('phone-send',{phone:ph});tok=j.otp;q('.pw-s2').classList.remove('hide');say(msg,tt('✅ OTP '+j.to+' par SMS se bhej diya. 10 minute me daalo.','✅ OTP sent by SMS to '+j.to+'. Enter it within 10 minutes.'),true);
   wait=30;var t=setInterval(function(){wait--;if(wait<=0)clearInterval(t)},1000)}
  catch(e){say(msg,emsg(e));if(soft(e)&&o.skip){var s=q('.pw-skip');if(s)s.classList.remove('hide')}}busy=false};
 q('.pw-ver').onclick=async function(){var c=q('.pw-otp').value.trim();if(!tok)return say(msg,tt('Pehle "OTP bhejo" dabao.','Tap "Send OTP" first.'));if(!/^\d{6}$/.test(c))return say(msg,tt('6 ank ka OTP likho.','Enter the 6-digit OTP.'));
  try{var j=await api('phone-verify',{otp:tok,code:c});say(msg,tt('✅ Number verify ho gaya.','✅ Number verified.'),true);o.onOk(j.rk,j.phone)}catch(e){say(msg,emsg(e))}};
 var sk=q('.pw-skip');if(sk){sk.onclick=function(){o.skip()};if(inPreview){sk.classList.remove('hide');msg.style.color='var(--mut)';msg.textContent=PREVIEW_MSG()}}
}

/* ---- 1) first launch: register phone before creating the vault ---- */
var isFirst=!(typeof raw==='function'&&raw());
function showForm(){g('phreg').classList.add('hide');g('lf').classList.remove('hide')}
if(isFirst&&g('phreg')){
 g('lf').classList.add('hide');g('phreg').classList.remove('hide');
 var rb=g('rstv'),ro=g('rcopen');if(rb)rb.classList.add('hide');if(ro)ro.classList.add('hide');
 widget(g('phbox'),{skip:function(){showForm()},onOk:function(rk,ph){rkey=rk;LS.set('pf_phone',ph);showForm();g('lockmsg').textContent=tt('Number verify ✅ Ab apna Master Password banao.','Number verified ✅ Now create your Master Password.')}});
}

/* ---- 2) Settings: turn recovery on for an existing vault / turn off ---- */
function sync(){var on=hasRec();if(!g('recst'))return;g('recoff').classList.toggle('hide',!on);g('recbox').classList.toggle('hide',on);
 say('recst',on?tt('✅ Recovery ON hai ('+(LS.get('pf_phone')||'phone')+').','✅ Recovery is ON ('+(LS.get('pf_phone')||'phone')+').'):tt('⚪ Recovery band hai. Number verify karke ON karo.','⚪ Recovery is off. Verify your number to turn it on.'),on)}
if(g('recbox'))widget(g('recbox'),{onOk:async function(rk,ph){if(typeof key==='undefined'||!key)return say('recst',tt('Pehle vault unlock karo, phir ON karo.','Unlock the vault first, then turn it on.'));rkey=rk;LS.set('pf_phone',ph);await refresh();sync()}});
if(g('recoff'))g('recoff').onclick=function(){rkey=null;['pf_recblob','pf_rec','pf_rkenc','pf_phone'].forEach(LS.del);sync()};

/* ---- 3) forgot Master Password ---- */
if(g('rcopen'))g('rcopen').onclick=function(){var p=g('recpanel');p.classList.toggle('hide');if(p.classList.contains('hide'))return;
 if(!hasRec()){say('rcmsg',tt('❌ Is device par Recovery pehle ON nahi thi, isliye data wapas nahi aa sakta. Naya vault banane ke liye upar wala button use karo.','❌ Recovery was not turned on before on this device, so the data cannot be restored. Use the button above to start a new vault.'));g('rcbox').classList.add('hide');return}
 g('rcbox').classList.remove('hide');say('rcmsg',tt('Wahi mobile number daalo jisse register kiya tha.','Enter the same mobile number you registered with.'),true);
 widget(g('rcbox'),{onOk:async function(rk){try{recovered=await unwrap(LS.get('pf_recblob'),rk);rkey=rk;
  say('rcmsg',tt('✅ OTP sahi hai. '+recovered.length+' entries mili. Ab naya Master Password banao.','✅ OTP verified. '+recovered.length+' entries found. Now create a new Master Password.'),true);g('rcbox').classList.add('hide');g('rcstep3').classList.remove('hide')}
  catch(e){say('rcmsg',tt('Ye number us recovery se match nahi karta, ya recovery data kharab hai.','This number does not match the recovery, or the recovery data is damaged.'))}}})};
if(g('rcset'))g('rcset').onclick=async function(){var a=g('rcn1').value,b=g('rcn2').value;
 if(!recovered)return say('rcmsg',tt('Pehle OTP verify karo.','Verify the OTP first.'));
 if(a.length<8||!/[A-Za-z]/.test(a)||!/[0-9]/.test(a))return say('rcmsg',tt('Naya password: 8+ akshar, letters aur numbers dono.','New password: 8+ characters, letters and numbers.'));
 if(a!==b)return say('rcmsg',tt('Dono password alag hain.','The two passwords do not match.'));
 try{
  var salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  var m=await crypto.subtle.importKey('raw',enc.encode(a),'PBKDF2',false,['deriveKey']);
  var k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:salt,iterations:250000,hash:'SHA-256'},m,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  var ct=await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},k,enc.encode(JSON.stringify(recovered)));
  var back=JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:iv},k,ct)));   /* prove the new vault opens BEFORE replacing the old one */
  if(back.length!==recovered.length)throw new Error('check');
  LS.set('vault_v1_old',LS.get('vault_v1')||'');LS.set('vault_v1',JSON.stringify({s:b64(salt),iv:b64(iv),ct:b64(ct)}));
  await sealRk(rkey,k);LS.set('pf_recblob',await wrap(recovered,rkey));LS.set('pf_rec','1');LS.del('pf_f');
  say('rcmsg',tt('✅ Naya Master Password set. Data wahi hai. Ab login karo.','✅ New Master Password set. Your data is intact. Sign in now.'),true);
  setTimeout(function(){location.reload()},1200)
 }catch(e){say('rcmsg',tt('Kuch galat hua, purana vault safe hai. Dobara try karo.','Something went wrong; the old vault is untouched. Try again.'))}};
sync();
}catch(err){console.error('PassFast recovery failed:',err)}
})();

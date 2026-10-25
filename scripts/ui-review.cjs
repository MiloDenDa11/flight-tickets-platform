// Browser QA without additional npm dependencies. Uses Chrome's local DevTools protocol.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname,'..');
const output = path.join(root,'.ui-review');
fs.mkdirSync(output,{ recursive:true });
const profile = path.join(output,'chrome-'+Date.now());
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const origin = 'http://localhost:5175';
const pause = ms => new Promise(r => setTimeout(r,ms));
let browser;
let chrome;
let ws;
const ownedServers=[];
const errors=[];
async function main() {
  async function ready(url) { try { return (await fetch(url)).status===200; } catch { return false; } }
  async function ensure(url,script,cwd) {
    if(await ready(url)) return;
    const child=spawn(process.execPath,[script],{ cwd,env:{...process.env,PORT:'3002',FRONTEND_URL:origin,VITE_DEV_PORT:'5175',DEV_API_PROXY:'http://127.0.0.1:3002'},windowsHide:true,stdio:['ignore','pipe','pipe'] }); ownedServers.push(child);
    let log=''; child.stderr.on('data',d => { log+=d; }); child.stdout.on('data',d => { log+=d; });
    for(let i=0;i<100;i++) { if(await ready(url)) return; if(child.exitCode!==null) throw new Error('Preview server exited: '+log.slice(-2000)); await pause(200); }
    throw new Error('Preview server not ready: '+log.slice(-2000));
  }
  await ensure('http://127.0.0.1:3002/api/v1/health',path.join(root,'backend/dist/src/server.js'),path.join(root,'backend'));
  await ensure(origin,path.join(root,'frontend/node_modules/vite/bin/vite.js'),path.join(root,'frontend'));
  assert.equal((await fetch(origin)).status,200,'Vite preview must be running');
  chrome = spawn(chromePath,['--headless=new','--disable-gpu','--no-sandbox','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{ windowsHide:true,stdio:'ignore' });
  chrome.on('error',error => { console.error(error.message); process.exitCode=1; });
  const portFile=path.join(profile,'DevToolsActivePort');
  for(let i=0;i<100 && !fs.existsSync(portFile);i++) await pause(200);
  if(!fs.existsSync(portFile)) throw new Error('Chrome did not start');
  const port=Number(fs.readFileSync(portFile,'utf8').split('\n')[0]);
  const tabs=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page=tabs.find(t => t.type==='page' && t.url==='about:blank') ?? tabs.find(t => t.type==='page');
  if(!page) throw new Error('No Chrome page target');
  ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject) => { ws.addEventListener('open',resolve,{ once:true }); ws.addEventListener('error',reject,{ once:true }); });
  let seq=0; const pending=new Map();
  ws.addEventListener('message',event => {
    const m=JSON.parse(String(event.data));
    if(m.id && pending.has(m.id)) { const p=pending.get(m.id); pending.delete(m.id); m.error?p.reject(new Error(m.error.message)):p.resolve(m.result); }
    if(m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text+': '+(m.params.exceptionDetails.exception?.description ?? ''));
  });
  function send(method,params={}) { return new Promise((resolve,reject) => { const id=++seq; const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},20000);pending.set(id,{ resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);} }); ws.send(JSON.stringify({ id,method,params })); }); }
  browser=send;
  async function evaluate(expression) { const r=await send('Runtime.evaluate',{ expression,returnByValue:true,awaitPromise:true }); if(r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; }
  async function wait(expression,timeout=20000) { const start=Date.now(); while(Date.now()-start<timeout) { if(await evaluate(expression)) return; await pause(150); } throw new Error('Timed out waiting: '+expression); }
  async function navigate(route) { const result=await send('Page.navigate',{ url:origin+route }); if(result.errorText) throw new Error('Navigation failed: '+result.errorText); await wait('location.href.startsWith('+JSON.stringify(origin)+') && document.readyState === "complete"'); await pause(500); }
  async function fill(selector,value) { await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input');const p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`); }
  async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); }
  async function shot(name,width=1440,height=1100,mobile=false) {
    await send('Emulation.setDeviceMetricsOverride',{ width,height,deviceScaleFactor:1,mobile }); await pause(250);
    const image=await send('Page.captureScreenshot',{ format:'png',captureBeyondViewport:true }); fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(image.data,'base64'));
    const overflow=await evaluate('document.documentElement.scrollWidth > innerWidth + 1'); assert.equal(overflow,false,name+' horizontal overflow');
  }
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{ width:1440,height:1100,deviceScaleFactor:1,mobile:false });
  await navigate('/'); await wait(`document.querySelectorAll('select[aria-label="Điểm đi"] option').length >= 9`);
  assert.match(await evaluate('document.body.innerText'),/Chạm đến/);
  await shot('home-desktop'); await shot('home-mobile',390,844,true);
  await send('Emulation.setDeviceMetricsOverride',{ width:1440,height:1100,deviceScaleFactor:1,mobile:false });
  const date=new Date(Date.now()+86400000+7*3600000).toISOString().slice(0,10);
  await navigate('/flights?origin=SGN&destination=HAN&date='+date+'&passengers=1&cabinClass=PREMIUM');
  await wait('document.querySelectorAll(".flight-card").length >= 3');
  await shot('search-desktop'); await shot('search-mobile',390,844,true);
  await send('Emulation.setDeviceMetricsOverride',{ width:1440,height:1100,deviceScaleFactor:1,mobile:false });
  const file=fs.readFileSync(path.join(root,'backend','.env'),'utf8');
  const password=file.match(/^SEED_USER_PASSWORD=(.+)$/m)[1].trim();
  await click('.flight-card .button'); await wait('location.pathname === "/login"');
  await fill('input[type=email]','demo@flight.local'); await fill('input[type=password]',password); await click('.auth-form button[type=submit], .auth-form form .button');
  await wait('location.pathname === "/checkout" && document.querySelectorAll(".checkout-grid input").length > 3');
  await fill('input[autocomplete=name]','NGUYEN UI TEST'); await fill('input[type=date]','1995-05-10'); await fill('input[pattern="[A-Za-z0-9-]{5,30}"]','UI123456789'); await fill('input[type=tel]','0901234567'); await click('.order-summary input[type=checkbox]');
  await shot('checkout-desktop'); await click('.order-summary button[type=submit]');
  await wait('location.pathname.startsWith("/bookings/") && !!document.querySelector(".countdown")');
  await shot('hold-desktop'); await shot('hold-mobile',390,844,true);
  await send('Emulation.setDeviceMetricsOverride',{ width:1440,height:1100,deviceScaleFactor:1,mobile:false });
  await click('.order-summary .button'); await wait('document.body.innerText.includes("Hành trình đã sẵn sàng.")');
  assert.match(await evaluate('document.body.innerText'),/FT-/); await shot('ticket-desktop');
  await click('.order-summary .text-button.danger'); await click('.confirm-box .danger-button');
  await wait('document.querySelector(".page-head .badge")?.innerText === "Đã hủy"');
  await navigate('/profile'); await wait('document.querySelectorAll(".account-grid form").length === 4'); await shot('profile-mobile',390,844,true);
  // Sign in to admin using a new, isolated browser session cookie state.
  await send('Network.clearBrowserCookies');
  await send('Emulation.setDeviceMetricsOverride',{ width:1440,height:1100,deviceScaleFactor:1,mobile:false });
  await navigate('/login'); await wait('!!document.querySelector(".auth-form")');
  const adminPassword=file.match(/^SEED_ADMIN_PASSWORD=(.+)$/m)[1].trim();
  await fill('input[type=email]','admin@flight.local'); await fill('input[type=password]',adminPassword); await click('.auth-form form .button');
  await wait('location.pathname === "/bookings"');
  await navigate('/admin'); await wait('document.querySelectorAll(".stat-card").length === 4'); await shot('admin-desktop');
  await navigate('/admin/flights'); await wait('document.querySelectorAll("tbody tr").length > 0'); await shot('admin-flights-mobile',390,844,true);
  assert.deepEqual(errors,[],'No unhandled browser exceptions');
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({ checkedAt:new Date().toISOString(),passed:['home desktop/mobile','search desktop/mobile','protected checkout login','passenger form','seat hold','mock payment','ticket issuance','refund cancellation','profile mobile','admin dashboard','admin flight inventory mobile','no horizontal page overflow','no unhandled JS exceptions'] },null,2));
  console.log('Browser flow passed. Screenshots and results saved in .ui-review/.');
}
main().catch(async e => {
  console.error(e.stack); console.error('Browser exceptions:',errors);
  if(browser) {
    try {
      const dom=await browser('Runtime.evaluate',{ expression:'JSON.stringify({ url: location.href, body: document.body.innerText.slice(0,5000), html: document.documentElement.innerHTML.slice(0,2000) })',returnByValue:true });
      console.error(dom.result.value);
      const shot=await Promise.race([browser('Page.captureScreenshot',{ format:'png' }),pause(2000)]); if(shot) fs.writeFileSync(path.join(output,'failure.png'),Buffer.from(shot.data,'base64'));
    } catch {}
  }
  process.exitCode=1;
}).finally(async () => {
  if(browser) { try { await Promise.race([browser('Browser.close'),pause(1500)]); } catch {} }
  ws?.close(); if(chrome?.pid) chrome.kill();
  for(const child of ownedServers) child.kill();
});

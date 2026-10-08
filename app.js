const SUPABASE_URL='https://jpnwqoghmxpheotlstxx.supabase.co';
const SUPABASE_KEY='sb_publishable_2rqvTatoYZmq85T5RDUiAA_3cbMW1Rm';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const rates={followers:4500,likes:800,views:1200};
const serviceName={followers:'Followers',likes:'Likes',views:'Views'};
let state={session:null,profile:null,orders:[],balance:0,topups:[],customers:[],adminOrders:[],adminTopups:[],walletBalances:{},providerServices:[],view:'home'};
const app=document.getElementById('app');
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
async function loadProviderServices(){
  if(!state.session)return;

  const{data,error}=await sb.functions.invoke('smm-provider',{
    body:{action:'catalog'}
  });

  if(error){
    console.warn('Provider catalog error:',error);
    state.providerServices=[];
    return;
  }

  const rows=[];

  Object.entries(data?.data||{}).forEach(([platform,list])=>{
    (Array.isArray(list)?list:[]).forEach(s=>{
      rows.push({
        ...s,
        platform:String(platform).toLowerCase()
      });
    });
  });

  state.providerServices=rows
    .filter(s=>Number(s.service)>0&&Number(s.rate)>0&&Number(s.min)>=1)
    .sort((a,b)=>String(a.name).localeCompare(String(b.name)));
}
const money=n=>'₦'+Number(n||0).toLocaleString();
function shell(content){return `<div class="wrap"><header class="top"><div class="brand"><div class="mark">BTB</div><div><div class="eyebrow">BEYOND THE BINARY</div><h1>BOOST HUB</h1></div></div><div>${state.session?`<button class="pill" onclick="logout()">Sign out</button>`:`<button class="pill" onclick="showAuth('login')">Sign in</button>`}</div></header>${content}<a href="https://wa.me/2348120497174?text=Hello%20Beyond%20the%20Binary%20Boost%20Hub%2C%20I%20need%20help%20with%20my%20order." target="_blank" rel="noopener" class="btn" style="display:block;text-align:center;margin:18px 0">💬 WhatsApp Call Center</a><footer>BEYOND THE BINARY MEDIA • BOOST HUB</footer></div>`}
function authForm(mode){const login=mode==='login';return shell(`<section class="card auth"><div class="title"><div class="num">${login?'01':'00'}</div><div><h3>${login?'Welcome back':'Create your account'}</h3><p>${login?'Sign in to manage your boost orders.':'Register once to place and track orders.'}</p></div></div><form onsubmit="submitAuth(event,'${mode}')">${!login?'<label>Display name</label><input id="name" required placeholder="Your name">':''}<label>Email</label><input id="email" type="email" required placeholder="you@example.com"><label>Password</label><div class="password-wrap"><input id="password" type="password" minlength="6" required placeholder="At least 6 characters"><button type="button" class="password-toggle" onclick="const p=document.getElementById('password');p.type=p.type==='password'?'text':'password';this.textContent=p.type==='password'?'👁️':'🙈'">👁️</button></div>${login?'<button type="button" class="tab" style="margin:10px 0" onclick="forgotPassword()">Forgot password?</button>':''}<button class="btn" type="submit">${login?'Sign in':'Create account'}</button></form><div id="authmsg"></div><p class="hint" style="margin-top:14px">${login?'New here?':'Already have an account?'} <button class="tab" onclick="showAuth('${login?'register':'login'}')">${login?'Create account':'Sign in'}</button></p></section>`) }
function showAuth(mode){app.innerHTML=authForm(mode)} async function forgotPassword(){const email=document.getElementById('email')?.value?.trim()||'';const msg=document.getElementById('authmsg');if(!email){msg.innerHTML='<p class="error">Enter your email address first, then tap Forgot password.</p>';return}try{const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});if(error)throw error;msg.innerHTML='<p class="status">Password reset email sent. Check your email and follow the link to create a new password.</p>'}catch(x){msg.innerHTML=`<p class="error">${esc(x.message)}</p>`}}
async function submitAuth(e,mode){e.preventDefault();const msg=document.getElementById('authmsg');msg.innerHTML='';try{const emailEl=document.getElementById('email');const passwordEl=document.getElementById('password');const nameEl=document.getElementById('name');const emailValue=emailEl?.value?.trim()||'';const passwordValue=passwordEl?.value||'';const displayName=nameEl?.value?.trim()||'';let r;if(mode==='login')r=await sb.auth.signInWithPassword({email:emailValue,password:passwordValue});else r=await sb.auth.signUp({email:emailValue,password:passwordValue,options:{data:{display_name:displayName}}});if(r.error)throw r.error;if(mode==='register'&&!r.data.session){msg.innerHTML='<p class="status">Account created. Check your email to confirm, then sign in.</p>';return}await refresh();}catch(x){msg.innerHTML=`<p class="error">${esc(x.message)}</p>`}}
async function refresh(){const {data:{session}}=await sb.auth.getSession();state.session=session;state.profile=null;if(session){let p=await sb.from('users').select('*').eq('auth_user_id',session.user.id).single();if(p.error)console.warn(p.error);state.profile=p.data||null;await loadOrders();await loadProviderServices();}render()}
async function loadOrders(){if(!state.profile)return;const [o,w,t]=await Promise.all([sb.from('boost_orders').select('*').eq('user_id',state.profile.id).order('created_at',{ascending:false}),sb.from('wallet_transactions').select('amount_ngn').eq('user_id',state.profile.id),sb.from('wallet_topups').select('*').eq('user_id',state.profile.id).order('created_at',{ascending:false})]);state.orders=o.data||[];state.balance=(w.data||[]).reduce((a,x)=>a+Number(x.amount_ngn||0),0);state.topups=t.data||[];if(state.profile.role==='admin')await loadAdmin()}
async function loadAdmin(){const [u,o,w,t]=await Promise.all([sb.from('users').select('*').order('created_at',{ascending:false}),sb.from('boost_orders').select('*').order('created_at',{ascending:false}),sb.from('wallet_transactions').select('user_id,amount_ngn'),sb.from('wallet_topups').select('*').order('created_at',{ascending:false})]);state.customers=u.data||[];state.adminOrders=o.data||[];state.adminTopups=t.data||[];state.walletBalances={};(w.data||[]).forEach(x=>{state.walletBalances[x.user_id]=(state.walletBalances[x.user_id]||0)+Number(x.amount_ngn||0)})}
function topupHtml(rows){if(!rows.length)return '<div class="empty">No wallet funding requests yet.</div>';return rows.map(t=>`<div class="order"><div class="orderhead"><b>Top-up #${esc(t.id)}</b><b>${money(t.amount_ngn)}</b></div><small>Reference: ${esc(t.payment_reference||'Not provided')}</small><div class="status" style="margin-top:9px">${esc(t.status)}</div></div>`).join('')}

function walletCard(){return `<section class="card"><div class="title"><div class="num">03</div><div><h3>Funds Wallet</h3><p>Available balance: <b>${money(state.balance)}</b></p></div></div><div class="payment"><small>OPAY ACCOUNT</small><strong>9165647651</strong><span>Justice Trust Ugoala</span></div><button class="btn secondary" onclick="navigator.clipboard?.writeText('9165647651')">Copy OPay account</button><div class="notice" style="margin-top:12px">Send your chosen amount to the OPay account above, then enter the payment reference. Your wallet is credited after admin verification.</div><label style="margin-top:12px">Amount to fund (₦)</label><input id="topupAmount" type="number" min="100" step="100" placeholder="e.g. 5000"><label>OPay payment reference *</label><input id="topupRef" placeholder="Enter your OPay transaction reference"><button class="btn" onclick="submitTopup()">Submit funding request</button><div id="topupMsg"></div><div style="margin-top:14px"><h4 style="margin-bottom:8px">Funding history</h4>${topupHtml(state.topups)}</div></section>`}
async function submitTopup(){
  const amount=Math.round(Number(document.getElementById('topupAmount')?.value||0));
  const reference=document.getElementById('topupRef')?.value?.trim()||'';
  const msg=document.getElementById('topupMsg');

  if(!Number.isFinite(amount)||amount<100){
    msg.innerHTML='<p class="error">Enter a funding amount of at least ₦100.</p>';
    return;
  }

  if(!reference){
    msg.innerHTML='<p class="error">Enter your OPay payment reference.</p>';
    return;
  }

  const{error}=await sb.from('wallet_topups').insert({
    user_id:state.profile.id,
    amount_ngn:amount,
    payment_reference:reference
  });

  if(error){
    msg.innerHTML=`<p class="error">${esc(error.message)}</p>`;
    return;
  }

  msg.innerHTML='<p class="status good">Funding request submitted. Your wallet will be credited after admin verification.</p>';

  await loadOrders();
  setTimeout(render,700);
}
function home(){return shell(`<section class="hero"><small>SOCIAL PROMOTION</small><h2>Grow your social presence.<br><em>One order at a time.</em></h2><p>Choose your platform, paste the exact link, set your quantity and submit your order.</p></section>${!state.session?`<section class="card"><div class="title"><div class="num">00</div><div><h3>Account required</h3><p>Create an account or sign in before placing a boost order.</p></div></div><button class="btn" onclick="showAuth('register')">Create account</button> <button class="btn secondary" onclick="showAuth('login')">Log in</button></section>`:`${orderForm()}${walletCard()}<section class="card history"><div class="title"><div class="num">04</div><div><h3>Order history</h3><p>Orders paid from your wallet.</p></div></div>${ordersHtml(state.orders)}</section>`}`)}
function platformLabel(p){
  return p==='x'||p==='twitter'?'X':p.charAt(0).toUpperCase()+p.slice(1);
}

function providerPlatforms(){
  return [...new Set(state.providerServices.map(s=>s.platform))];
}

function providerOptionsForPlatform(p){
  return state.providerServices.filter(s=>s.platform===p);
}

function updateProviderServices(){
  const platform=document.getElementById('platform');
  const service=document.getElementById('service');
  if(!platform||!service)return;

  const services=providerOptionsForPlatform(platform.value);

  service.innerHTML=services.map(s=>
    `<option value="${esc(s.service)}">${esc(s.name)} — ₦${Number(s.rate).toLocaleString()} / 1,000</option>`
  ).join('');

  calc();
}

function orderForm(){
  const platforms=providerPlatforms();
  const firstPlatform=platforms[0]||'instagram';
  const services=providerOptionsForPlatform(firstPlatform);

  return `<div class="grid"><section class="card"><div class="title"><div class="num">01</div><div><h3>Build your order</h3><p>Tell us exactly where and what to deliver.</p></div></div><label>Social platform</label><select id="platform" onchange="updateProviderServices()">${platforms.map(p=>`<option value="${esc(p)}">${platformLabel(p)}</option>`).join('')}</select><label>Service</label><select id="service" onchange="calc()">${services.map(s=>`<option value="${esc(s.service)}">${esc(s.name)} — ₦${Number(s.rate).toLocaleString()} / 1,000</option>`).join('')}</select><label>Social media link *</label><input id="link" type="url" required placeholder="https://instagram.com/yourprofile"><label>Quantity *</label><input id="quantity" type="number" min="${Number(services[0]?.min||1)}" max="${Number(services[0]?.max||0)}" step="1" value="${Number(services[0]?.min||1000)}" oninput="calc()"><div class="quick">${[500,1000,2500,5000].map(q=>`<button type="button" onclick="setQty(${q})">${q.toLocaleString()}</button>`).join('')}</div><p class="hint" style="margin-top:8px">Enter the exact number you want.</p><div class="total"><div><small>ORDER TOTAL</small><strong id="total">₦0</strong></div><button class="btn" onclick="placeOrder()">Continue</button></div><div id="orderMsg"></div></section><aside class="card"><div class="title"><div class="num">02</div><div><h3>Pay with OPay</h3><p>Use your wallet balance for your order.</p></div></div><div class="payment"><small>OPAY ACCOUNT</small><strong>9165647651</strong><span>Justice Trust Ugoala</span></div><button class="btn secondary" onclick="navigator.clipboard?.writeText('9165647651')">Copy account number</button><div class="notice" style="margin-top:12px">Fund your wallet first. Your wallet is charged when the provider accepts the order.</div></aside></div>`;
}
function calc(){
  const q=Number(document.getElementById('quantity')?.value||0);
  const id=Number(document.getElementById('service')?.value||0);
  const s=state.providerServices.find(x=>Number(x.service)===id);
  const el=document.getElementById('total');

  if(!el||!s)return;

  el.textContent=money(Math.ceil((Number(s.rate)*q/1000)*1.5));

  const input=document.getElementById('quantity');
  if(input){
    input.min=Number(s.min||1);
    input.max=Number(s.max||0);
  }
}
function setQty(q){document.getElementById('quantity').value=q;calc()}
async function placeOrder(){
  const platform=document.getElementById('platform')?.value||'';
  const providerServiceId=Number(document.getElementById('service')?.value||0);
  const quantity=Number(document.getElementById('quantity')?.value||0);
  const social_link=document.getElementById('link')?.value?.trim()||'';
  const msg=document.getElementById('orderMsg');
  const selected=state.providerServices.find(s=>Number(s.service)===providerServiceId);

  if(!selected||!social_link||quantity<Number(selected.min||1)||quantity>Number(selected.max||Infinity)){
    msg.innerHTML='<p class="error">Check the service, link and quantity. Use a public link and stay within the provider limits.</p>';
    return;
  }

  const total=Math.ceil((Number(selected.rate)*quantity/1000)*1.5);

  if(total>state.balance){
    msg.innerHTML=`<p class="error">Insufficient wallet balance. You need ${money(total)} and your balance is ${money(state.balance)}. Fund your wallet first.</p>`;
    return;
  }

  msg.innerHTML='<p class="status">Submitting your order to the provider...</p>';

  const{data,error}=await sb.functions.invoke('smm-provider',{
    body:{
      action:'place_order',
      provider_service_id:providerServiceId,
      platform,
      service:selected.name,
      social_link,
      quantity
    }
  });

  if(error){
    let detail=error.message;
    try{
      if(error.context){
        const x=await error.context.json();
        detail=x.error||detail;
      }
    }catch{}
    msg.innerHTML=`<p class="error">${esc(detail)}</p>`;
    return;
  }

  if(!data?.ok){
    msg.innerHTML=`<p class="error">${esc(data?.error||'The provider did not accept the order.')}</p>`;
    return;
  }

  await loadOrders();

  msg.innerHTML=`<div class="status good" style="margin-top:12px">Order #${esc(data.order_id)} submitted successfully. Provider order #${esc(data.provider_order_id)}. ${money(data.total_ngn)} was deducted from your wallet.</div>`;
}
  
  
  
  
  

  
    
    
  

  

  
  
    
  

  
    
    
    
    
  

  
    
    
  

  


  

function ordersHtml(rows){
  if(!rows.length)return '<div class="empty">No orders yet.</div>';

  return rows.map(o=>`
    <div class="order">
      <div class="orderhead">
        <b>#${esc(o.id)} · ${esc(o.platform)} ${esc(o.service)}</b>
        <b>${money(o.total_amount_ngn)}</b>
      </div>

      <small>${esc(o.social_link)} · Qty ${Number(o.quantity).toLocaleString()}</small>

      <div class="status" style="margin-top:9px">
        ${esc(o.status)} · payment ${esc(o.payment_status)}
      </div>

      ${o.provider_order_id?`
        <small style="display:block;margin-top:8px">
          Provider order: <b>#${esc(o.provider_order_id)}</b>
        </small>
        <div class="status" style="margin-top:6px">
          Provider: ${esc(o.provider_status||'Pending')}
          ${o.provider_remains!=null?` · Remaining: ${Number(o.provider_remains).toLocaleString()}`:''}
        </div>
        <button class="btn secondary" style="margin-top:8px" onclick="refreshProviderStatus(${Number(o.id)})">
          Refresh delivery status
        </button>
      `:''}
    </div>
  `).join('');
}
async function refreshProviderStatus(orderId){
  const msg=document.getElementById('orderMsg');

  const{data,error}=await sb.functions.invoke('smm-provider',{
    body:{
      action:'status',
      order_id:Number(orderId)
    }
  });

  if(error){
    if(msg)msg.innerHTML=`<p class="error">${esc(error.message)}</p>`;
    return;
  }

  if(!data?.ok){
    if(msg)msg.innerHTML=`<p class="error">${esc(data?.error||'Could not refresh the provider status.')}</p>`;
    return;
  }

  await loadOrders();
  render();
}
function admin(){
  const pending=state.adminTopups.filter(t=>t.status==='pending');

  return shell(`
    <section class="hero">
      <small>ADMIN CONTROL PANEL</small>
      <h2>Manage Boost Hub.</h2>
      <p>Review wallet funding, orders and customer balances.</p>
    </section>

    <div class="admin-grid">

      <section class="card">
        <div class="title">
          <div class="num">01</div>
          <div>
            <h3>Customers</h3>
            <p>Current registered accounts.</p>
          </div>
        </div>

        ${state.customers.map(c=>`
          <div class="customer">
            <div>
              <b>${esc(c.display_name)}</b><br>
              <small>${esc(c.email)}</small>
            </div>
            <div>
              <b>${money(state.walletBalances[c.id]||0)}</b><br>
              <button type="button" class="tab admin-action"
                data-action="credit"
                data-id="${c.id}"
                data-name="${esc(c.display_name)}">
                Add balance
              </button>
            </div>
          </div>
        `).join('')}
      </section>

      <section class="card">
        <div class="title">
          <div class="num">02</div>
          <div>
            <h3>Wallet funding requests</h3>
            <p>Verify OPay payments before adding funds.</p>
          </div>
        </div>

        ${
          pending.length
          ? pending.map(t=>`
            <div class="order">
              <div class="orderhead">
                <b>Top-up #${esc(t.id)}</b>
                <b>${money(t.amount_ngn)}</b>
              </div>

              <small>
                User ${esc(t.user_id)} ·
                Reference: ${esc(t.payment_reference||'None')}
              </small>

              <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:9px">
                <button type="button" class="tab admin-action"
                  data-action="approve-topup"
                  data-id="${t.id}">
                  Approve
                </button>

                <button type="button" class="tab admin-action"
                  data-action="reject-topup"
                  data-id="${t.id}">
                  Reject
                </button>
              </div>
            </div>
          `).join('')
          : '<div class="empty">No pending wallet funding requests.</div>'
        }
      </section>

    </div>

    <section class="card" style="margin-top:18px">
      <div class="title">
        <div class="num">03</div>
        <div>
          <h3>Orders</h3>
          <p>Manage customer orders.</p>
        </div>
      </div>

      ${
        state.adminOrders.length
        ? state.adminOrders.map(o=>`
          <div class="order">
            <div class="orderhead">
              <b>#${o.id} · ${esc(o.platform)}</b>
              <b>${money(o.total_amount_ngn)}</b>
            </div>

            <small>
              User ${o.user_id} ·
              ${esc(o.service)} ·
              Qty ${Number(o.quantity).toLocaleString()}
            </small>

            <p style="font-size:12px;word-break:break-all">
              ${esc(o.social_link)}
            </p>

            <div style="display:flex;gap:7px;flex-wrap:wrap">
              <button type="button" class="tab admin-action"
                data-action="verify"
                data-id="${o.id}">
                Verify
              </button>

              <button type="button" class="tab admin-action"
                data-action="reject"
                data-id="${o.id}">
                Reject
              </button>

              <button type="button" class="tab admin-action"
                data-action="complete"
                data-id="${o.id}">
                Complete
              </button>
            </div>
          </div>
        `).join('')
        : '<div class="empty">No orders.</div>'
      }
    </section>
  `);
}
async function approveTopup(id){
  const{error}=await sb.rpc('approve_wallet_topup',{p_topup_id:id});
  if(error){
    alert(error.message);
  }else{
    alert('Wallet funding approved.');
    await loadOrders();
    render();
  }
}

async function rejectTopup(id){
  const{error}=await sb.rpc('reject_wallet_topup',{p_topup_id:id});
  if(error){
    alert(error.message);
  }else{
    alert('Wallet funding rejected.');
    await loadOrders();
    render();
  }
}
async function addCredit(uid,name){const raw=prompt(`Enter wallet amount for ${name}. Use a positive number to add credit or a negative number to deduct.`);if(raw===null)return;const amount=Number(raw);if(!Number.isFinite(amount)||amount===0)return alert('Enter a valid amount.');const {error}=await sb.from('wallet_transactions').insert({user_id:uid,amount_ngn:Math.round(amount),transaction_type:amount>0?'admin_credit':'admin_debit',reference:'Admin adjustment'});if(error)alert(error.message);else{alert('Balance updated.');await loadOrders();render()}}
async function updateOrder(id,status,payment_status){const {error}=await sb.from('boost_orders').update({status,payment_status}).eq('id',id);if(error)alert(error.message);else{await loadOrders();render()}}
document.addEventListener('click',async e=>{
  const b=e.target.closest('.admin-action');
  if(!b)return;

  const action=b.dataset.action;
  const id=Number(b.dataset.id);

  if(action==='credit'){
    addCredit(id,b.dataset.name);
    return;
  }

  if(action==='approve-topup'){
    await approveTopup(id);
    return;
  }

  if(action==='reject-topup'){
    await rejectTopup(id);
    return;
  }

  if(action==='verify'){
    updateOrder(id,'verified','verified');
    return;
  }

  if(action==='reject'){
    updateOrder(id,'cancelled','rejected');
    return;
  }

  if(action==='complete'){
    updateOrder(id,'completed','verified');
  }
});
async function logout(){await sb.auth.signOut();await refresh()}

function render(){if(!state.session){if(app.dataset.auth==='1')return;app.innerHTML=home();return}app.dataset.auth='0';app.innerHTML=state.profile?.role==='admin'?admin():home();}
sb.auth.onAuthStateChange(()=>setTimeout(refresh,0));refresh();

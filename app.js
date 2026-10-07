const SUPABASE_URL='https://jpnwqoghmxpheotlstxx.supabase.co';
const SUPABASE_KEY='sb_publishable_2rqvTatoYZmq85T5RDUiAA_3cbMW1Rm';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

const rates={followers:4500,likes:800,views:1200};
const serviceName={followers:'Followers',likes:'Likes',views:'Views'};

let state={
  session:null,
  profile:null,
  orders:[],
  balance:0,
  topups:[],
  customers:[],
  adminOrders:[],
  adminTopups:[],
  walletBalances:{}
};

const app=document.getElementById('app');

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#039;'
}[m]));

const money=n=>'₦'+Number(n||0).toLocaleString();

function shell(content){
  return `<div class="wrap">
<header class="top">
<div class="brand">
<div class="mark">BTB</div>
<div>
<div class="eyebrow">BEYOND THE BINARY</div>
<h1>BOOST HUB</h1>
</div>
</div>
<div>
${state.session?`<button class="pill" onclick="logout()">Sign out</button>`:`<button class="pill" onclick="showAuth('login')">Sign in</button>`}
</div>
</header>
${content}
<footer>BEYOND THE BINARY MEDIA • BOOST HUB</footer>
</div>`;
}

function authForm(mode){
  const login=mode==='login';

  return shell(`
<section class="card auth">
<div class="title">
<div class="num">${login?'01':'00'}</div>
<div>
<h3>${login?'Welcome back':'Create your account'}</h3>
<p>${login?'Sign in to manage your boost orders.':'Register once to place and track orders.'}</p>
</div>
</div>

<form onsubmit="submitAuth(event,'${mode}')">

${!login?`
<label>Display name</label>
<input id="name" required placeholder="Your name">
`:''}

<label>Email</label>
<input id="email" type="email" required placeholder="you@example.com">

<label>Password</label>
<div class="password-wrap">
<input id="password" type="password" minlength="6" required placeholder="At least 6 characters">
<button type="button" class="password-toggle" onclick="const p=document.getElementById('password');p.type=p.type==='password'?'text':'password';this.textContent=p.type==='password'?'👁️':'🙈'">👁️</button>
</div>

${login?`
<button type="button" class="tab" style="margin:10px 0" onclick="forgotPassword()">Forgot password?</button>
`:''}

<button class="btn" type="submit">${login?'Sign in':'Create account'}</button>

</form>

<div id="authmsg"></div>

<p class="hint" style="margin-top:14px">
${login?'New here?':'Already have an account?'}
<button class="tab" onclick="showAuth('${login?'register':'login'}')">
${login?'Create account':'Sign in'}
</button>
</p>

</section>`);
}

function showAuth(mode){
  app.dataset.auth='1';
  app.innerHTML=authForm(mode);
}

async function forgotPassword(){
  const email=document.getElementById('email')?.value?.trim()||'';
  const msg=document.getElementById('authmsg');

  if(!email){
    msg.innerHTML='<p class="error">Enter your email address first, then tap Forgot password.</p>';
    return;
  }

  try{
    const {error}=await sb.auth.resetPasswordForEmail(email,{
      redirectTo:window.location.origin
    });

    if(error)throw error;

    msg.innerHTML='<p class="status">Password reset email sent. Check your email and follow the link.</p>';
  }catch(x){
    msg.innerHTML='<p class="error">'+esc(x.message)+'</p>';
  }
}

async function submitAuth(e,mode){
  e.preventDefault();

  const msg=document.getElementById('authmsg');
  msg.innerHTML='';

  try{
    const email=document.getElementById('email')?.value?.trim()||'';
    const password=document.getElementById('password')?.value||'';
    const name=document.getElementById('name')?.value?.trim()||'';

    const r=mode==='login'
      ?await sb.auth.signInWithPassword({email,password})
      :await sb.auth.signUp({
        email,
        password,
        options:{data:{display_name:name}}
      });

    if(r.error)throw r.error;

    if(mode==='register'&&!r.data.session){
      msg.innerHTML='<p class="status">Account created. Check your email to confirm, then sign in.</p>';
      return;
    }

    await refresh();

  }catch(x){
    msg.innerHTML='<p class="error">'+esc(x.message)+'</p>';
  }
}

async function refresh(){
  const {data:{session}}=await sb.auth.getSession();

  state.session=session;
  state.profile=null;

  if(session){
    const p=await sb
      .from('users')
      .select('*')
      .eq('auth_user_id',session.user.id)
      .single();

    state.profile=p.data||null;

    if(state.profile){
      await loadOrders();
    }
  }

  render();
}

async function loadOrders(){
  if(!state.profile)return;

  const [o,w,t]=await Promise.all([
    sb.from('boost_orders')
      .select('*')
      .eq('user_id',state.profile.id)
      .order('created_at',{ascending:false}),

    sb.from('wallet_transactions')
      .select('amount_ngn')
      .eq('user_id',state.profile.id),

    sb.from('wallet_topups')
      .select('*')
      .eq('user_id',state.profile.id)
      .order('created_at',{ascending:false})
  ]);

  state.orders=o.data||[];

  state.balance=(w.data||[])
    .reduce((a,x)=>a+Number(x.amount_ngn||0),0);

  state.topups=t.data||[];

  if(state.profile.role==='admin'){
    await loadAdmin();
  }
}

async function loadAdmin(){
  const [u,o,w,t]=await Promise.all([
    sb.from('users')
      .select('*')
      .order('created_at',{ascending:false}),

    sb.from('boost_orders')
      .select('*')
      .order('created_at',{ascending:false}),

    sb.from('wallet_transactions')
      .select('user_id,amount_ngn'),

    sb.from('wallet_topups')
      .select('*')
      .order('created_at',{ascending:false})
  ]);

  state.customers=u.data||[];
  state.adminOrders=o.data||[];
  state.adminTopups=t.data||[];
  state.walletBalances={};

  (w.data||[]).forEach(x=>{
    state.walletBalances[x.user_id]=
      (state.walletBalances[x.user_id]||0)+Number(x.amount_ngn||0);
  });
}

function home(){

  if(!state.session){

    return shell(`
<section class="hero">
<small>SOCIAL PROMOTION</small>
<h2>Grow your social presence.<br><em>One order at a time.</em></h2>
<p>Fund your wallet, then use your balance to buy followers, likes or views.</p>
</section>

<section class="card">
<div class="title">
<div class="num">00</div>
<div>
<h3>Account required</h3>
<p>Create an account or sign in before using the Boost Hub.</p>
</div>
</div>

<button class="btn" onclick="showAuth('register')">Create account</button>
<button class="btn secondary" onclick="showAuth('login')">Log in</button>

</section>`);
  }

  return shell(`

<section class="hero">
<small>SOCIAL PROMOTION</small>
<h2>Grow your social presence.<br><em>One order at a time.</em></h2>
<p>Fund your wallet, then use your balance to buy followers, likes or views.</p>
</section>

<section class="card">

<div class="title">
<div class="num">01</div>
<div>
<h3>Wallet balance</h3>
<p>Available funds you can use for boosts.</p>
</div>
</div>

<div class="payment">
<small>AVAILABLE BALANCE</small>
<strong>${money(state.balance)}</strong>
<span>Use your wallet balance to place boost orders.</span>
</div>

${topupForm()}

${topupHistory()}

</section>

${orderForm()}

<section class="card history">

<div class="title">
<div class="num">04</div>
<div>
<h3>Order history</h3>
<p>Your completed and active boosts.</p>
</div>
</div>

${ordersHtml(state.orders)}

</section>
`);
}

function topupForm(){

  return `
<div class="notice" style="margin-top:12px">
<b>Add money to your wallet</b><br>
<span>
Pay to OPay, then submit the top-up request.
Your wallet is credited only after admin verification.
</span>
</div>

<label>Amount to add *</label>
<input id="topupAmount" type="number" min="100" step="1" placeholder="e.g. 1000">

<label>Payment reference (optional)</label>
<input id="topupRef" placeholder="Payment reference or note">

<div style="margin-top:12px">

<div class="payment">
<small>OPAY ACCOUNT</small>
<strong>9165647651</strong>
<span>Justice Trust Ugoala</span>
</div>

<button class="btn" type="button" onclick="submitTopup()">
I have paid — Submit top-up
</button>

</div>

<div id="topupMsg"></div>
`;
}

function topupHistory(){

  if(!state.topups.length)return '';

  return `
<div style="margin-top:18px">
<h4 style="margin-bottom:8px">Wallet top-up requests</h4>

${state.topups.slice(0,5).map(t=>`
<div class="order">

<div class="orderhead">
<b>${money(t.amount_ngn)}</b>
<b>${esc(t.status)}</b>
</div>

<small>
${esc(t.payment_reference||'No reference')}
· ${new Date(t.created_at).toLocaleString()}
</small>

</div>
`).join('')}

</div>
`;
}

async function submitTopup(){

  const amount=Math.round(
    Number(document.getElementById('topupAmount')?.value||0)
  );

  const reference=
    document.getElementById('topupRef')?.value?.trim()||'';

  const msg=document.getElementById('topupMsg');

  if(!Number.isFinite(amount)||amount<100){

    msg.innerHTML=
      '<p class="error">Enter a top-up amount of at least ₦100.</p>';

    return;
  }

  const {error}=await sb
    .from('wallet_topups')
    .insert({
      user_id:state.profile.id,
      amount_ngn:amount,
      payment_reference:reference
    });

  if(error){

    msg.innerHTML=
      '<p class="error">'+esc(error.message)+'</p>';

    return;
  }

  msg.innerHTML=
    '<p class="status good">Top-up request submitted. Your balance will increase after admin verification.</p>';

  await loadOrders();

  setTimeout(render,500);
}

function orderForm(){

  return `
<section class="card">

<div class="title">
<div class="num">02</div>
<div>
<h3>Build your boost</h3>
<p>Your wallet balance is used automatically when you place the order.</p>
</div>
</div>

<label>Social platform</label>

<select id="platform">
<option>Instagram</option>
<option>TikTok</option>
<option>Facebook</option>
<option>Telegram</option>
<option>X</option>
</select>

<label>Service</label>

<select id="service" onchange="calc()">

<option value="followers">
Followers — ₦4,500 / 1,000
</option>

<option value="likes">
Likes — ₦800 / 1,000
</option>

<option value="views">
Views — ₦1,200 / 1,000
</option>

</select>

<label>Social media link *</label>

<input
id="link"
type="url"
required
placeholder="https://instagram.com/yourprofile">

<label>Quantity *</label>

<input
id="quantity"
type="number"
min="1"
step="1"
value="1000"
oninput="calc()">

<div class="quick">

${[500,1000,2500,5000].map(q=>
`<button type="button" onclick="setQty(${q})">
${q.toLocaleString()}
</button>`
).join('')}

</div>

<div class="total">

<div>
<small>ORDER TOTAL</small>
<strong id="total">₦4,500</strong>
</div>

<button
class="btn"
type="button"
onclick="placeOrder()">
Boost Now
</button>

</div>

<div class="notice" style="margin-top:12px">
Wallet balance: <b>${money(state.balance)}</b>
</div>

<div id="orderMsg"></div>

</section>
`;
}

function calc(){

  const q=Number(
    document.getElementById('quantity')?.value||0
  );

  const s=
    document.getElementById('service')?.value||'followers';

  const el=document.getElementById('total');

  if(el){
    el.textContent=
      money(Math.round(rates[s]*q/1000));
  }
}

function setQty(q){

  const el=document.getElementById('quantity');

  if(el){
    el.value=q;
    calc();
  }
}

async function placeOrder(){

  const platform=
    document.getElementById('platform')?.value;

  const service=
    document.getElementById('service')?.value;

  const quantity=
    Number(document.getElementById('quantity')?.value||0);

  const social_link=
    document.getElementById('link')?.value?.trim()||'';

  const msg=
    document.getElementById('orderMsg');

  if(!social_link||quantity<1){

    msg.innerHTML=
      '<p class="error">Enter a valid link and quantity.</p>';

    return;
  }

  const {data,error}=await sb.rpc(
    'place_wallet_boost',
    {
      p_platform:platform,
      p_service:service,
      p_social_link:social_link,
      p_quantity:quantity
    }
  );

  if(error){

    msg.innerHTML=
      '<p class="error">'+esc(error.message)+'</p>';

    return;
  }

  msg.innerHTML=
    '<div class="status good" style="margin-top:12px">'+
    'Boost order #'+esc(data)+
    ' submitted. Your wallet was charged and the order is now processing.'+
    '</div>';

  await loadOrders();

  setTimeout(render,800);
}

function ordersHtml(rows){

  if(!rows.length){
    return '<div class="empty">No orders yet.</div>';
  }

  return rows.map(o=>`

<div class="order">

<div class="orderhead">

<b>
#${esc(o.id)}
· ${esc(o.platform)}
${esc(serviceName[o.service]||o.service)}
</b>

<b>${money(o.total_amount_ngn)}</b>

</div>

<small>
${esc(o.social_link)}
· Qty ${Number(o.quantity).toLocaleString()}
</small>

<div class="status" style="margin-top:9px">
${esc(o.status)}
· payment ${esc(o.payment_status)}
</div>

</div>

`).join('');
}

function admin(){

  return shell(`

<section class="hero">
<small>ADMIN CONTROL PANEL</small>
<h2>Manage Boost Hub.</h2>
<p>Review wallet top-ups, customer balances and boost orders.</p>
</section>

<section class="card">

<div class="title">
<div class="num">01</div>
<div>
<h3>Customers</h3>
<p>Current registered accounts and wallet balances.</p>
</div>
</div>

${state.customers.map(c=>`

<div class="customer">

<div>
<b>${esc(c.display_name)}</b>
<br>
<small>${esc(c.email)}</small>
</div>

<div>
<b>${money(state.walletBalances[c.id]||0)}</b>
<br>

<button
type="button"
class="tab admin-action"
data-action="credit"
data-id="${c.id}"
data-name="${esc(c.display_name)}">
Manual balance
</button>

</div>

</div>

`).join('')}

</section>

<section class="card">

<div class="title">

<div class="num">02</div>

<div>
<h3>Wallet top-ups</h3>
<p>Verify customer payments before crediting wallets.</p>
</div>

</div>

${
state.adminTopups.length

?state.adminTopups.map(t=>`

<div class="order">

<div class="orderhead">

<b>
#${t.id}
· ${money(t.amount_ngn)}
</b>

<b>${esc(t.status)}</b>

</div>

<small>
User ${t.user_id}
· ${esc(t.payment_reference||'No reference')}
</small>

<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px">

${
t.status==='pending'

?`

<button
type="button"
class="tab admin-action"
data-action="topup-verify"
data-id="${t.id}">
Verify top-up
</button>

<button
type="button"
class="tab admin-action"
data-action="topup-reject"
data-id="${t.id}">
Reject
</button>

`:''

}

</div>

</div>

`).join('')

:'<div class="empty">No top-up requests.</div>'
}

</section>

<section class="card">

<div class="title">

<div class="num">03</div>

<div>
<h3>Orders</h3>
<p>Legacy/manual orders and order status.</p>
</div>

</div>

${
state.adminOrders.length

?state.adminOrders.map(o=>`

<div class="order">

<div class="orderhead">

<b>
#${o.id}
· ${esc(o.platform)}
</b>

<b>${money(o.total_amount_ngn)}</b>

</div>

<small>
User ${o.user_id}
· ${esc(o.service)}
· Qty ${Number(o.quantity).toLocaleString()}
</small>

<p style="font-size:12px;word-break:break-all">
${esc(o.social_link)}
</p>

<div style="display:flex;gap:7px;flex-wrap:wrap">

<button
type="button"
class="tab admin-action"
data-action="verify"
data-id="${o.id}">
Verify payment
</button>

<button
type="button"
class="tab admin-action"
data-action="reject"
data-id="${o.id}">
Reject
</button>

<button
type="button"
class="tab admin-action"
data-action="complete"
data-id="${o.id}">
Complete
</button>

</div>

</div>

`).join('')

:'<div class="empty">No orders.</div>'
}

</section>

`);
}

async function addCredit(uid,name){

  const raw=prompt(
    `Enter wallet amount for ${name}. Use a positive number to add credit or a negative number to deduct.`
  );

  if(raw===null)return;

  const amount=Number(raw);

  if(!Number.isFinite(amount)||amount===0){
    return alert('Enter a valid amount.');
  }

  const {error}=await sb
    .from('wallet_transactions')
    .insert({
      user_id:uid,
      amount_ngn:Math.round(amount),
      transaction_type:
        amount>0?'admin_credit':'admin_debit',
      reference:'Admin adjustment'
    });

  if(error){

    alert(error.message);

  }else{

    alert('Balance updated.');

    await loadOrders();

    render();
  }
}

async function approveTopup(id){

  const {error}=await sb.rpc(
    'approve_wallet_topup',
    {p_topup_id:id}
  );

  if(error){
    alert(error.message);
    return;
  }

  alert('Wallet top-up verified and balance credited.');

  await loadAdmin();

  render();
}

async function rejectTopup(id){

  const {error}=await sb.rpc(
    'reject_wallet_topup',
    {p_topup_id:id}
  );

  if(error){
    alert(error.message);
    return;
  }

  alert('Wallet top-up rejected.');

  await loadAdmin();

  render();
}

async function updateOrder(id,status,payment_status){

  const {error}=await sb
    .from('boost_orders')
    .update({
      status,
      payment_status
    })
    .eq('id',id);

  if(error){

    alert(error.message);

  }else{

    await loadOrders();

    render();
  }
}

document.addEventListener('click',async e=>{

  const b=e.target.closest('.admin-action');

  if(!b)return;

  const action=b.dataset.action;
  const id=Number(b.dataset.id);

  if(action==='credit'){
    addCredit(id,b.dataset.name);
    return;
  }

  if(action==='topup-verify'){
    approveTopup(id);
    return;
  }

  if(action==='topup-reject'){
    rejectTopup(id);
    return;
  }

  if(action==='verify'){
    updateOrder(id,'verified','verified');
  }

  if(action==='reject'){
    updateOrder(id,'cancelled','rejected');
  }

  if(action==='complete'){
    updateOrder(id,'completed','verified');
  }

});

async function logout(){

  await sb.auth.signOut();

  await refresh();
}

function render(){

  if(!state.session){

    if(app.dataset.auth==='1')return;

    app.innerHTML=home();

    return;
  }

  app.dataset.auth='0';

  app.innerHTML=
    state.profile?.role==='admin'
    ?admin()
    :home();
}

sb.auth.onAuthStateChange(
  ()=>setTimeout(refresh,0)
);

refresh();

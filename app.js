const SUPABASE_URL='https://jpnwqoghmxpheotlstxx.supabase.co';
const SUPABASE_KEY='sb_publishable_2rqvTatoYZmq85T5RDUiAA_3cbMW1Rm';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const rates = {
  followers: 15000,
  likes: 8000,
  views: 2500
};

const fixedPrices = {
  followers: {
    100: 1500,
    500: 5000,
    1000: 9000
  },
  likes: {
    100: 130
  },
  views: {
    100: 80
  }
};
  
    
    
    
  
  
    
    
    
  
  
    
    
    
  

function priceTypeForName(name){
  const n=String(name||'').toLowerCase();
  if(/followers?|subscribers?/.test(n))return 'followers';
  if(/views?/.test(n))return 'views';
  if(/likes?/.test(n)&&!/comments?|reactions?/.test(n))return 'likes';
  return null;
}
function getFixedPrice(serviceType, quantity) {
  const prices = fixedPrices[String(serviceType).toLowerCase()];
  if (!prices) return null;

  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return null;

  const tiers = Object.keys(prices)
    .map(Number)
    .sort((a, b) => a - b);

  let tier = tiers[0];

  for (const t of tiers) {
    if (qty >= t) tier = t;
    else break;
  }

  return Math.ceil(prices[tier] * qty / tier);
}
  
  

  
  

  
    
    

  
  
    
    
  

  

const serviceName={followers:'Followers',likes:'Likes',views:'Views'};
let state={session:null,profile:null,orders:[],balance:0,topups:[],customers:[],adminOrders:[],adminTopups:[],walletBalances:{},providerServices:[],view:'home'};
let statusTimer=null;
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
function profileIcon(){
  const name=state.profile?.display_name||state.session?.user?.user_metadata?.display_name||state.session?.user?.email||'User';
  const initials=name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0,2)
    .map(x=>x.charAt(0).toUpperCase())
    .join('')||'U';

  return `<div style="display:flex;align-items:center;gap:9px">
    <div style="width:38px;height:38px;border-radius:50%;background:#155eef;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;border:2px solid #d6a21d">${esc(initials)}</div>
    <button class="pill" onclick="logout()">Sign out</button>
  </div>`;
}

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
        ${state.session
          ? profileIcon()
          : `<button class="pill" onclick="showAuth('login')">Sign in</button>`
        }
      </div>
    </header>

    ${content}

    <a href="https://wa.me/2348120497174?text=Hello%20Beyond%20the%20Binary%20Boost%20Hub%2C%20I%20need%20help%20with%20my%20order."
      target="_blank"
      rel="noopener"
      class="btn"
      style="display:block;text-align:center;margin:18px 0">
      💬 WhatsApp Call Center
    </a>

    <footer>BEYOND THE BINARY MEDIA • BOOST HUB</footer>
  </div>`;
}
function authForm(mode){const login=mode==='login';return shell(`<section class="card auth"><div class="title"><div class="num">${login?'01':'00'}</div><div><h3>${login?'Welcome back':'Create your account'}</h3><p>${login?'Sign in to manage your boost orders.':'Register once to place and track orders.'}</p></div></div><form onsubmit="submitAuth(event,'${mode}')">${!login?'<label>Display name</label><input id="name" required placeholder="Your name">':''}<label>Email</label><input id="email" type="email" required placeholder="you@example.com"><label>Password</label><div class="password-wrap"><input id="password" type="password" minlength="6" required placeholder="At least 6 characters"><button type="button" class="password-toggle" onclick="const p=document.getElementById('password');p.type=p.type==='password'?'text':'password';this.textContent=p.type==='password'?'👁️':'🙈'">👁️</button></div>${login?'<button type="button" class="tab" style="margin:10px 0" onclick="forgotPassword()">Forgot password?</button>':''}<button class="btn" type="submit">${login?'Sign in':'Create account'}</button></form><div id="authmsg"></div><p class="hint" style="margin-top:14px">${login?'New here?':'Already have an account?'} <button class="tab" onclick="showAuth('${login?'register':'login'}')">${login?'Create account':'Sign in'}</button></p></section>`) }
function showAuth(mode){app.innerHTML=authForm(mode)} async function forgotPassword(){const email=document.getElementById('email')?.value?.trim()||'';const msg=document.getElementById('authmsg');if(!email){msg.innerHTML='<p class="error">Enter your email address first, then tap Forgot password.</p>';return}try{const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});if(error)throw error;msg.innerHTML='<p class="status">Password reset email sent. Check your email and follow the link to create a new password.</p>'}catch(x){msg.innerHTML=`<p class="error">${esc(x.message)}</p>`}}
async function submitAuth(e,mode){e.preventDefault();const msg=document.getElementById('authmsg');msg.innerHTML='';try{const emailEl=document.getElementById('email');const passwordEl=document.getElementById('password');const nameEl=document.getElementById('name');const emailValue=emailEl?.value?.trim()||'';const passwordValue=passwordEl?.value||'';const displayName=nameEl?.value?.trim()||'';let r;if(mode==='login')r=await sb.auth.signInWithPassword({email:emailValue,password:passwordValue});else r=await sb.auth.signUp({email:emailValue,password:passwordValue,options:{data:{display_name:displayName}}});if(r.error)throw r.error;if(mode==='register'&&!r.data.session){msg.innerHTML='<p class="status">Account created. Check your email to confirm, then sign in.</p>';return}await refresh();}catch(x){msg.innerHTML=`<p class="error">${esc(x.message)}</p>`}}
async function refresh(){
  const {data:{session}}=await sb.auth.getSession();

  state.session=session;
  state.profile=null;

  // Show the page immediately instead of waiting for all data.
  render();

  if(!session)return;

  // Load the user's profile.
  const p=await sb
    .from('users')
    .select('*')
    .eq('auth_user_id',session.user.id)
    .single();

  if(p.error)console.warn(p.error);

  state.profile=p.data||null;

  // Render immediately after the profile is available.
  render();

  // Load orders and provider services in the background.
  Promise.all([
    loadOrders(),
    loadProviderServices()
  ]).then(()=>{
    render();
  });
}
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
function home(){
  const services=[...new Set(
    state.providerServices
      .map(s=>String(s.name||'').trim())
      .filter(Boolean)
  )].slice(0,30);

  return shell(`
    <section class="hero" style="text-align:center">
      <small>BEYOND THE BINARY</small>
      <h2>BOOST HUB</h2>
      <p>Grow your social media presence with fast and reliable promotion services.</p>

      <button
        class="btn"
        style="background:linear-gradient(135deg,#d6a21d,#f0c75e);color:#14213d;font-size:18px;font-weight:800;padding:16px 30px;margin-top:18px"
        onclick="state.view='boost';render()">
        🚀 BOOST ACCOUNT
      </button>

<button
  class="btn secondary"
  style="margin-top:12px"
  onclick="state.view='foreign';render()">
  🌍 FOREIGN NUMBERS & OTP
</button>

<button
  class="btn secondary"
  style="margin-top:12px"
  onclick="state.view='accounts';render()">
  🛍️ ACCOUNTS FOR SALE
</button>


    </section>

    <section class="card">
      <div class="title">
        <div class="num">01</div>
        <div>
          <h3>Available Services</h3>
          <p>Choose a service when you're ready to boost your account.</p>
        </div>
      </div>

      ${
        services.length
        ? `<div class="service-list">
            ${services.map(s=>`
              <div class="order">
                <b>${esc(s)}</b>
              </div>
            `).join('')}
          </div>`
        : `
          <div class="order">
            <b>Instagram Followers</b>
          </div>
          <div class="order">
            <b>Instagram Likes</b>
          </div>
          <div class="order">
            <b>Instagram Views</b>
          </div>
          <div class="order">
            <b>TikTok Followers</b>
          </div>
          <div class="order">
            <b>Facebook Likes</b>
          </div>
          <div class="order">
            <b>Telegram Members</b>
          </div>
          <div class="order">
            <b>X Followers</b>
          </div>
        `
      }
    </section>

    <section class="card">
      <div class="title">
        <div class="num">02</div>
        <div>
          <h3>Dashboard</h3>
          <p>Manage your wallet, orders and account.</p>
        </div>
      </div>

      ${
        state.session
        ? `
          <button class="btn secondary" onclick="state.view='dashboard';render()">
            📊 Open Dashboard
          </button>
        `
        : `
          <button class="btn" onclick="showAuth('register')">
            Create Account
          </button>
          <button class="btn secondary" onclick="showAuth('login')">
            Sign In
          </button>
        `
      }
    </section>
  `);
}

function boostPage(){
  return shell(`
    <div style="margin-bottom:15px">
      <button class="tab" onclick="state.view='home';render()">← Back Home</button>
    </div>

    <section class="hero">
      <small>BOOST ACCOUNT</small>
      <h2>Choose your service and place your order.</h2>
      <p>Select a platform, service, quantity and social media link.</p>
    </section>

    ${state.session ? orderForm() : `
      <section class="card">
        <h3>Sign in required</h3>
        <p class="hint">Create an account or sign in before placing a boost.</p>
        <button class="btn" onclick="showAuth('login')">Sign In</button>
      </section>
    `}
  `);
}

function dashboardPage(){
  


  return shell(`
    <div style="margin-bottom:15px">
      <button class="tab" onclick="state.view='home';render()">← Back Home</button>
    </div>

    <section class="hero">
  <small>MY DASHBOARD</small>
  <h2>Welcome back, ${esc(state.profile?.display_name||state.session?.user?.user_metadata?.display_name||'User')}! 👋</h2>
  <p>Manage your wallet and boost orders from one place.</p>
</section>
    
      
      
    

    <section class="card">
      <div class="title">
        <div class="num">01</div>
        <div>
          <h3>Wallet Balance</h3>
          <p>Available balance</p>
        </div>
      </div>

      <strong style="font-size:30px">${money(state.balance)}</strong>

      <div style="margin-top:15px">
        <button class="btn" onclick="state.view='boost';render()">
          🚀 Boost Account
        </button>
      </div>
    </section>

    ${walletCard()}

    <section class="card history">
      <div class="title">
        <div class="num">04</div>
        <div>
          <h3>My Orders</h3>
          <p>Track your boost orders.</p>
        </div>
      </div>

      ${ordersHtml(state.orders)}
    </section>
  `);
}

let foreignCatalogData = null;


let foreignSelectedAppId = null;

async function loadForeignCatalog(kind) {




  const output = document.getElementById('foreignCatalogOutput');
  if (!output) return;

  output.innerHTML = '<p class="hint">Loading catalog...</p>';

  try {
    const { data, error } = await sb.functions.invoke('fleexa-catalog', {
      body: { action: kind }
    });

    if (error) throw error;

    if (!data || data.ok !== true) {
      throw new Error(data?.error || 'Catalog could not be loaded.');
    }

    foreignCatalogData = data.data;

    const getRows = value => {
      if (Array.isArray(value)) return value;
      if (!value || typeof value !== 'object') return [];

      for (const key of [
        'data', 'products', 'services',
        'countries', 'apps', 'results'
      ]) {
        if (Array.isArray(value[key])) return value[key];
      }

      return [];
    };

    const rows = getRows(data.data);

    if (!rows.length) {
      output.innerHTML =
        '<p class="hint">No options were returned. Try another catalog.</p>';
      return;
    }

    output.innerHTML = rows.map((item, index) => {
      const name = item.name || item.service ||
        item.product || item.title || item.country ||
        item.id || 'Service option';

      const price = item.price_ngn ??
        item.api_rate_ngn ?? item.price ?? item.api_rate_usd;

      const quantity = item.quantity ?? item.stock;

      return `
        <div class="order" style="margin:10px 0;padding:12px">
          <strong>${esc(name)}</strong>
          <p class="hint">Price: ${
            price == null ? 'Check availability' : esc(price)
          }</p>
          <p class="hint">Available quantity: ${
            quantity == null ? 'Not reported' : esc(quantity)
          }</p>
          <button class="btn secondary foreign-option"
            data-index="${index}" style="margin-top:8px">
            Select ${esc(name)}
          </button>
        </div>
      `;
    }).join('');

    output.querySelectorAll('.foreign-option').forEach(button => {
      button.addEventListener('click', async () => {
        const item = rows[Number(button.dataset.index)];
        const appId = item.appId ?? item.app_id ?? item.id;
        const name = item.name || item.service ||
          item.product || item.title || item.id || 'Selected option';

        if (kind !== 'sms5_products' && kind !== 'sms5_apps') {
          output.insertAdjacentHTML(
            'afterbegin',
            '<p class="hint">This item needs a supported pricing and availability lookup before purchase.</p>'
          );
          return;
        }

        if (!appId) {
          output.insertAdjacentHTML(
            'afterbegin',
            '<p class="error">This item has no app ID. The supplier response must be checked.</p>'
          );
          return;
        }

        foreignSelectedAppId = String(appId);
        output.innerHTML = '<p class="hint">Loading countries...</p>';

        try {
          const result = await sb.functions.invoke('fleexa-catalog', {
            body: {
              action: 'sms5_countries_with_services',
              appId: foreignSelectedAppId
            }
          });

          if (result.error) throw result.error;

          if (!result.data || result.data.ok !== true) {
            throw new Error(
              result.data?.error || 'Could not load countries.'
            );
          }

          const countries = getRows(result.data.data);

          if (!countries.length) {
            output.innerHTML =
              '<p class="hint">No countries were returned for this service.</p>';
            return;
          }

          output.innerHTML =
            '<h3>Choose a country for ' + esc(name) + '</h3>' +
            countries.map((country, index) => `
              <div class="order" style="margin:10px 0;padding:12px">
                <strong>${esc(
                  country.name || country.country ||
                  country.title || country.id || 'Country'
                )}</strong>
                <p class="hint">Check available offers for this country.</p>
                <button class="btn secondary country-option"
                  data-index="${index}">
                  Check this country
                </button>
              </div>
            `).join('');

          output.querySelectorAll('.country-option').forEach(countryButton => {
            countryButton.addEventListener('click', async () => {
              const country = countries[
                Number(countryButton.dataset.index)
              ];

              const countryId = country.countryId ??
                country.country_id ?? country.iso2 ??
                country.code ?? country.id;

              if (!countryId) {
                output.insertAdjacentHTML(
                  'afterbegin',
                  '<p class="error">No country ID was provided by the supplier.</p>'
                );
                return;
              }

              output.innerHTML =
                '<p class="hint">Checking offers...</p>';

              try {
                const offerResult = await sb.functions.invoke(
                  'fleexa-catalog',
                  {
                    body: {
                      action: 'sms5_country_offers',
                      countryId: String(countryId),
                      appId: foreignSelectedAppId
                    }
                  }
                );

                if (offerResult.error) throw offerResult.error;

                if (!offerResult.data || offerResult.data.ok !== true) {
                  throw new Error(
                    offerResult.data?.error || 'Could not load offers.'
                  );
                }

                const offers = getRows(offerResult.data.data);

                
output.innerHTML = offers.length
  ? '<h3>Available offers</h3>' +
    offers.map((offer, index) => `
      <div class="order" style="margin:10px 0;padding:12px">
        <strong>${esc(
          offer.name || offer.title || offer.id || 'Number offer'
        )}</strong>
        <p class="hint">Your selling price: ₦3,500</p>
        <p class="hint">Supplier price: ${esc(
          offer.price_ngn ?? offer.price ?? 'Not provided'
        )}</p>
        <p class="hint">Available quantity: ${esc(
          offer.quantity ?? offer.stock ?? 'Not reported'
        )}</p>
        <button class="btn secondary select-number-offer"
          data-index="${index}">
          Select offer
        </button>
      </div>
    `).join('')
  : '<p class="hint">No offers were returned for this country and service.</p>';

output.querySelectorAll('.select-number-offer').forEach(button => {
  button.textContent = 'Buy number — ₦3,500';

  button.addEventListener('click', async () => {
    const offer = offers[Number(button.dataset.index)];
    const offerName = offer.name || offer.title || offer.id || 'Number offer';

    if (!confirm('Buy ' + offerName + ' SMS verification for ₦3,500? This will charge your Boost Hub wallet.')) return;

    button.disabled = true;
    button.textContent = 'Processing purchase...';

    try {
      const makeKey = () => {
        if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
          return globalThis.crypto.randomUUID();
        }

        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 3 | 8)).toString(16);
        });
      };

      const purchase = await sb.functions.invoke('fleexa-orders', {
        body: {
          action: 'buy_sms5',
          serviceName: String(foreignSelectedAppId),
          country_code: 'US',
          maxPrice: String(offer.price_usd || '0.50'),
          idempotency_key: makeKey()
        }
      });

      if (purchase.error) throw purchase.error;

      if (!purchase.data || purchase.data.ok !== true) {
        throw new Error(
          purchase.data?.error || 'Purchase failed. Check your wallet and try again.'
        );
      }

      const orderId = purchase.data.order_id;
      const phone = purchase.data.number_or_email || 'Number pending';

      output.innerHTML =
        '<h3>SMS OTP 5 Purchase Successful</h3>' +
        '<p><strong>Service:</strong> ' + esc(offerName) + '</p>' +
        '<p><strong>Phone number:</strong> ' + esc(phone) + '</p>' +
        '<p><strong>Amount charged:</strong> ₦' +
        esc(purchase.data.retail_amount_ngn || 3500) + '</p>' +
        '<p><strong>Order ID:</strong> ' + esc(orderId) + '</p>' +
        '<p class="hint">Keep this page open and check for your OTP.</p>' +
        '<button class="btn check-sms5-otp">Check OTP</button>' +
        '<div id="sms5OtpResult" class="hint" style="margin-top:12px"></div>';

      output.querySelector('.check-sms5-otp').addEventListener('click', async event => {
        const checkButton = event.currentTarget;
        const resultBox = document.getElementById('sms5OtpResult');

        checkButton.disabled = true;
        checkButton.textContent = 'Checking...';
        resultBox.textContent = 'Checking for your verification code...';

        try {
          const checked = await sb.functions.invoke('fleexa-orders', {
            body: {
              action: 'check_order',
              order_id: Number(orderId)
            }
          });

          if (checked.error) throw checked.error;

          if (!checked.data || checked.data.ok !== true) {
            throw new Error(checked.data?.error || 'Could not check OTP yet.');
          }

          if (checked.data.otp) {
            resultBox.innerHTML =
              '<p><strong>Your OTP:</strong> ' +
              esc(checked.data.otp) + '</p><p>' +
              esc(checked.data.status || '') + '</p>';
          } else {
            resultBox.textContent =
              'No code received yet. Status: ' +
              (checked.data.status || 'waiting_for_otp') +
              '. Tap Check OTP again shortly.';
          }
        } catch (err) {
          resultBox.textContent = err.message || 'OTP check failed. Please try again.';
        } finally {
          checkButton.disabled = false;
          checkButton.textContent = 'Check OTP';
        }
      });

    } catch (err) {
      output.insertAdjacentHTML(
        'afterbegin',
        '<p class="error">' + esc(err.message || 'Purchase failed.') + '</p>'
      );

      button.disabled = false;
      button.textContent = 'Buy number — ₦3,500';
    }
  });
});

              } catch (err) {
                output.innerHTML = '<p class="error">' +
                  esc(err.message || 'Offer check failed.') +
                  '</p>';
              }
            });
          });

        } catch (err) {
          output.innerHTML = '<p class="error">' +
            esc(err.message || 'Country lookup failed.') +
            '</p>';
        }
      });
    });

  } catch (err) {
    output.innerHTML = '<p class="error">' +
      esc(err.message || 'Catalog request failed.') +
      '</p>';
  }
}



function foreignNumbersPage() {
  globalThis.loadMyForeignOrders = async function () {
    const output = document.getElementById('foreignOrdersOutput');
    if (!output) return;

    output.innerHTML = '<p class="hint">Loading your orders...</p>';

    try {
      const result = await sb.functions.invoke('fleexa-orders', {
        body: { action: 'list_orders' }
      });

      if (result.error) throw result.error;
      if (!result.data || result.data.ok !== true) {
        throw new Error(result.data?.error || 'Could not load your orders.');
      }

      const orders = result.data.orders || [];

      if (!orders.length) {
        output.innerHTML =
          '<p class="hint">No saved number orders were found in your account.</p>';
        return;
      }

      output.innerHTML = orders.map(order => {
        const service = String(order.service_name || 'Number service')
          .replace(/^sms5:/, '');

        return `
          <div class="order" style="margin:12px 0;padding:12px">
            <h4>${esc(service)}</h4>
            <p><strong>Order ID:</strong> ${esc(String(order.id))}</p>
            <p><strong>Number:</strong> ${esc(order.delivery_value || 'Not available')}</p>
            <p><strong>Amount:</strong> ₦${esc(String(order.retail_amount_ngn ?? 'N/A'))}</p>
            <p><strong>Status:</strong> ${esc(order.status || 'Unknown')}</p>
            <p class="hint">${esc(order.created_at || '')}</p>
            <button class="btn check-saved-otp"
              data-order-id="${esc(String(order.id))}">
              Check OTP
            </button>
            <div id="foreignOtpResult-${esc(String(order.id))}"
              class="hint" style="margin-top:10px">
              ${order.last_otp
                ? 'Last OTP: ' + esc(String(order.last_otp))
                : 'Tap Check OTP to look for your code.'}
            </div>
          </div>
        `;
      }).join('');

      output.querySelectorAll('.check-saved-otp').forEach(button => {
        button.addEventListener('click', async () => {
          const orderId = Number(button.dataset.orderId);
          const resultBox = document.getElementById(
            'foreignOtpResult-' + orderId
          );

          button.disabled = true;
          button.textContent = 'Checking...';
          resultBox.textContent = 'Checking for your verification code...';

          try {
            const checked = await sb.functions.invoke('fleexa-orders', {
              body: {
                action: 'check_order',
                order_id: orderId
              }
            });

            if (checked.error) throw checked.error;

            if (!checked.data || checked.data.ok !== true) {
              throw new Error(
                checked.data?.error || 'Could not check this order.'
              );
            }

            if (checked.data.otp) {
              resultBox.innerHTML =
                '<strong>Your OTP:</strong> ' +
                esc(String(checked.data.otp)) +
                '<p>Status: ' +
                esc(String(checked.data.status || 'Received')) +
                '</p>';
            } else {
              resultBox.textContent =
                'No OTP received yet. Status: ' +
                String(checked.data.status || 'waiting_for_otp') +
                '. Try again shortly.';
            }
          } catch (error) {
            resultBox.textContent =
              error.message || 'OTP check failed. Please try again.';
          } finally {
            button.disabled = false;
            button.textContent = 'Check OTP';
          }
        });
      });
    } catch (error) {
      output.textContent =
        error.message || 'Could not load your orders. Please try again.';
    }
  };

  return shell(`
    <div style="margin-bottom:15px">
      <button class="tab" onclick="state.view='home';render()">
        ← Back Home
      </button>
    </div>

    <section class="hero">
      <small>INTERNATIONAL SERVICES</small>
      <h2>Foreign Numbers & OTP</h2>
      <p>Explore supported countries, SMS services, rental options and temporary email.</p>
    </section>

    <section class="card">
      <h3>My Number Orders</h3>
      <p class="hint">Find a previously purchased number and check for its OTP.</p>
      <button class="btn" onclick="loadMyForeignOrders()">
        My Number Orders / Load Orders
      </button>
      <div id="foreignOrdersOutput" style="margin-top:14px">
        Tap My Number Orders to find your saved purchases.
      </div>
    </section>

    <section class="card">
      <h3>Choose a catalog</h3>
      <p class="hint">Load available options from Fleexa.</p>

      <button class="btn" onclick="loadForeignCatalog('countries')">
        🌍 SMS Countries
      </button>

      <button class="btn secondary" onclick="loadForeignCatalog('sms_services')">
        📱 SMS Services
      </button>

      <button class="btn secondary" onclick="loadForeignCatalog('sms5_products')">
        🔢 SMS5 Products
      </button>

      <button class="btn secondary" onclick="loadForeignCatalog('sms5_apps')">
        📲 SMS5 Apps
      </button>

      <button class="btn secondary" onclick="loadForeignCatalog('sms5_countries')">
        🗺️ SMS5 Countries
      </button>

      <button class="btn secondary" onclick="loadForeignCatalog('email_products')">
        ✉️ Temporary Email
      </button>

      <div id="foreignCatalogOutput" class="order" style="margin-top:14px">
        Choose a catalog above to load available options.
      </div>
    </section>
  `);
}

function startDashboardAutoRefresh(){
  if(statusTimer)clearInterval(statusTimer);
  statusTimer=null;

  if(!state.session||state.view!=='dashboard')return;

  statusTimer=setInterval(async()=>{
    if(document.visibilityState!=='visible')return;

    const active=state.orders.filter(o=>
      o.provider_order_id &&
      ['processing','awaiting_verification'].includes(String(o.status))
    );

    if(!active.length)return;

    await Promise.all(
      active.map(o=>
        sb.functions.invoke('smm-provider',{
          body:{
            action:'status',
            order_id:Number(o.id)
          }
        })
      )
    );

    await loadOrders();
    render();
  },30000);
}

function render(){
  if(statusTimer)clearInterval(statusTimer);
  statusTimer=null;

  if(!state.session){
    state.view='home';
    app.innerHTML=home();
    return;
  }

  app.dataset.auth='0';

  if(state.profile?.role==='admin'){
    app.innerHTML=admin();
    return;
  }

  if(state.view==='boost'){
  app.innerHTML=boostPage();
  updateServiceInfo();
  return;
  }

    


  if (state.view === 'foreign') {
  app.innerHTML = foreignNumbersPage();
  return;
  }  
  if(state.view==='dashboard'){
    app.innerHTML=dashboardPage();
    startDashboardAutoRefresh();
    return;
  }

  app.innerHTML=home();
}
  
    
  
    


  

  
  
    
  

  if(state.view==='boost'){
    
    
  

  
    
  


}
function platformLabel(p){
  return p==='x'||p==='twitter'?'X':p.charAt(0).toUpperCase()+p.slice(1);
}

function providerPlatforms(){
  return [...new Set(state.providerServices.map(s=>s.platform))];
}

function platformIcon(p){
  const icons={
    instagram:'◎',
    tiktok:'♪',
    facebook:'f',
    telegram:'➤',
    youtube:'▶',
    twitter:'𝕏',
    x:'𝕏',
    whatsapp:'◉',
    snapchat:'👻',
    linkedin:'in',
    pinterest:'P',
    threads:'@',
    discord:'◉',
    spotify:'♫',
    twitch:'▣',
    reddit:'●'
  };
  return icons[String(p||'').toLowerCase()]||'✦';
}

function choosePlatform(p){
  const select=document.getElementById('platform');
  if(!select)return;
  select.value=p;
  updateProviderServices();

  document.querySelectorAll('.platform-choice').forEach(button=>{
    const active=button.dataset.platform===p;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',active?'true':'false');
  });
}
  


function providerOptionsForPlatform(p){
  return state.providerServices.filter(s=>s.platform===p);
}


function providerServiceSearch(){
  return String(
    document.getElementById('serviceSearch')?.value || ''
  ).trim().toLowerCase();
}

function getServiceCategory(service){
  const text = [
    service.name,
    service.service,
    service.type,
    service.category,
    service.description
  ].filter(Boolean).join(' ').toLowerCase();

  if (/followers?|subscribers?|members?/.test(text)) return 'followers';
  if (/likes?|reactions?/.test(text)) return 'likes';
  if (/views?|watch time|impressions?/.test(text)) return 'views';
  if (/comments?|replies?/.test(text)) return 'comments';
  if (/shares?|reposts?|retweets?/.test(text)) return 'shares';
  if (/saves?|bookmarks?/.test(text)) return 'saves';

  return 'other';
}

function filteredProviderServices(){
  const platform = document.getElementById('platform')?.value || '';
  const search = providerServiceSearch();
  const category = document.getElementById('serviceTypeFilter')?.value || '';

  return providerOptionsForPlatform(platform).filter(s => {
    const text = [
      s.name,
      s.service,
      s.platform,
      s.category,
      s.description,
      s.type
    ].filter(Boolean).join(' ').toLowerCase();

    return (!search || text.includes(search)) &&
      (!category || getServiceCategory(s) === category);
  });
}


function renderProviderServiceOptions(){
  const service=document.getElementById('service');
  if(!service)return;

  const services=filteredProviderServices();

  service.innerHTML=services.map(s=>
    `<option value="${esc(s.service)}">${esc(s.name)} — ₦${Number(s.rate).toLocaleString()} / 1,000</option>`
  ).join('');

  if(services.length){
    service.value=String(services[0].service);
  }

    updateServiceInfo();
  renderQuantityPackages();
}


function updateProviderServices(){
  renderProviderServiceOptions();
  updateServiceInfo();
}

function updateServiceInfo(){
  const el=document.getElementById('serviceInfo');
  const id=Number(document.getElementById('service')?.value||0);
  const s=state.providerServices.find(x=>Number(x.service)===id);

  if(!el||!s)return;

  const details=[];

  if(s.type)details.push(`<div>👤 <strong>Type:</strong> ${esc(s.type)}</div>`);
  if(s.category)details.push(`<div>📂 <strong>Category:</strong> ${esc(s.category)}</div>`);
  if(s.min||s.max){
    details.push(`<div>📦 <strong>Order limit:</strong> ${Number(s.min||0).toLocaleString()} – ${Number(s.max||0).toLocaleString()}</div>`);
  }
  if(s.description)details.push(`<div>📋 <strong>Description:</strong> ${esc(s.description)}</div>`);

  el.innerHTML=`
    <div style="font-weight:800;margin-bottom:8px">📋 Service Information</div>
    <div style="display:grid;gap:7px">
      ${details.join('')||`<div>${esc(s.name||'Service details unavailable.')}</div>`}
    </div>
    <div style="margin-top:10px;font-size:13px">
      Please read the service details carefully before continuing with your order.
    </div>
  `;
}
function orderForm(){
  const platforms=providerPlatforms();
  const firstPlatform=platforms[0]||'instagram';
  const services=providerOptionsForPlatform(firstPlatform);

  return `<div class="grid">
    <section class="card">
      <div class="title">
        <div class="num">01</div>
        <div>
          <h3>Build your order</h3>
          <p>Tell us exactly where and what to deliver.</p>
        </div>
      </div>

      <label>Choose a platform</label>

<div class="platform-grid" role="group" aria-label="Choose social platform">
  ${platforms.map(p=>`
    <button type="button"
      class="platform-choice"
      data-platform="${esc(p)}"
      aria-pressed="${p===firstPlatform?'true':'false'}"
      onclick="choosePlatform('${esc(p)}')">
      <span class="platform-icon platform-${esc(p)}">${esc(platformIcon(p))}</span>
      <span class="platform-name">${esc(platformLabel(p))}</span>
    </button>
  `).join('')}
</div>

<label for="platform">Selected platform</label>

<select id="platform" onchange="choosePlatform(this.value)">
  ${platforms.map(p=>`
    <option value="${esc(p)}">${esc(platformLabel(p))}</option>
  `).join('')}
</select>
      

      <label>Search services</label>

      <input
        id="serviceSearch"
        type="search"
        placeholder="Search followers, likes, views, comments, reactions..."
        oninput="renderProviderServiceOptions()"
      >

      <p class="hint">
        Search for any service available on the selected platform.
      </p>
      
<label>Service type</label>

<select id="serviceTypeFilter" onchange="renderProviderServiceOptions()">
  <option value="">All service types</option>
  <option value="followers">Followers & Members</option>
  <option value="likes">Likes & Reactions</option>
  <option value="views">Views & Watch Time</option>
  <option value="comments">Comments & Replies</option>
  <option value="shares">Shares & Reposts</option>
  <option value="saves">Saves & Bookmarks</option>
  <option value="other">Other Services</option>
</select>

      <label>Service</label>

    <select id="service" onchange="updateServiceInfo();renderQuantityPackages()">
    
${services.map(s=>
  `<option value="${esc(s.service)}">${esc(s.name)}</option>`
).join('')}

    
  
</select>

<div id="serviceInfo" class="notice" style="margin-top:12px">
  Select a service to see its details before continuing.
</div>
      
          
        
      
        
          
        
    

      <label>Social media link *</label>

      <input
        id="link"
        type="url"
        required
        placeholder="https://instagram.com/yourprofile"
      >

            <label>Package *</label>

      <select id="quantity" onchange="calc()">
        <option value="">Choose a package</option>
      </select>

      <p class="hint" style="margin-top:8px">
       Choose from the available packages up to this service's provider-approved maximum.
      </p>

      <p class="hint">
    Select a package from the quantity dropdown above.
  </p>
        
    

      <p class="hint" style="margin-top:8px">
        Enter the exact number you want.
      </p>

      <div class="total">
        <div>
          <small>ORDER TOTAL</small>
          <strong id="total">₦0</strong>
        </div>

        <button class="btn" onclick="placeOrder()">Continue</button>
      </div>

      <div id="orderMsg"></div>
    </section>

    <aside class="card">
      <div class="title">
        <div class="num">02</div>
        <div>
          <h3>Pay with OPay</h3>
          <p>Use your wallet balance for your order.</p>
        </div>
      </div>

      <div class="payment">
        <small>OPAY ACCOUNT</small>
        <strong>9165647651</strong>
        <span>Justice Trust Ugoala</span>
      </div>

      <button
        class="btn secondary"
        onclick="navigator.clipboard?.writeText('9165647651')"
      >
        Copy account number
      </button>

      <div class="notice" style="margin-top:12px">
        Fund your wallet first. Your wallet is charged when the provider accepts the order.
      </div>
    </aside>
  </div>`;
                            }



  
  
  

  

  
    
  





  


  

function packagePrice(service, quantity){
  const type = priceTypeForName(service?.name);
  const fixed = getFixedPrice(type, quantity);
  return fixed !== null
    ? fixed
    : Math.ceil((Number(service?.rate || 0) * quantity / 1000) * 1.5);
}

function renderQuantityPackages(){
  const input = document.getElementById('quantity');
  const serviceId = Number(document.getElementById('service')?.value || 0);
  const selected = state.providerServices.find(
    s => Number(s.service) === serviceId
  );

  if (!input || !selected) return;

  const min = Number(selected.min || 1);
  const max = Number(selected.max || 0);
  const packageSizes = [
  min,
  100, 150, 200, 250, 300, 400, 500, 750,
  1000, 1500, 2000, 2500, 3000, 4000, 5000,
  7500, 10000, 15000, 20000, 25000,
  50000, 75000, 100000
];

const tiers = [...new Set(packageSizes)]
  .filter(q => Number.isFinite(q) && q >= min && (max <= 0 || q <= max))
  .sort((a, b) => a - b);
    


  input.innerHTML = tiers.length
    ? tiers.map(q => {
        const type = priceTypeForName(selected.name);
        const label = type
          ? type.charAt(0).toUpperCase() + type.slice(1)
          : 'Units';

        return `<option value="${q}">${q.toLocaleString()} ${label} — ${money(packagePrice(selected, q))}</option>`;
      }).join('')
    : '<option value="">No standard package available for this service</option>';

  if (tiers.length) input.value = String(tiers[0]);
  calc();
}

function calc(){
  const quantity = Number(document.getElementById('quantity')?.value || 0);
  const serviceId = Number(document.getElementById('service')?.value || 0);
  const selected = state.providerServices.find(
    s => Number(s.service) === serviceId
  );
  const total = document.getElementById('total');

  if (!total) return;

  total.textContent = selected && quantity
    ? money(packagePrice(selected, quantity))
    : '₦0';
}
  
  
  
  

  

  





  
  
    
    
  


async function placeOrder(){
  await loadOrders();

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

  const type=priceTypeForName(selected.name);
const fixed=getFixedPrice(type,quantity);
const total=fixed!==null?fixed:Math.ceil((Number(selected.rate)*quantity/1000)*1.5);

  if(total>state.balance){
    msg.innerHTML=`<p class="error">Insufficient wallet balance. You need ${money(total)} and your balance is ${money(state.balance)}. Fund your wallet first.</p>`;
    return;
  }

  const confirmed = confirm(
  `Confirm your order:\n\n` +
  `Platform: ${platform}\n` +
  `Service: ${selected.name}\n` +
  `Quantity: ${quantity.toLocaleString()}\n` +
  `Total: ${money(total)}\n\n` +
  `Tap OK to place this paid order.`
);

if (!confirmed) {
  msg.innerHTML =
    '<p class="status">Order cancelled. Your wallet has not been charged.</p>';
  return;
}

msg.innerHTML =
  '<p class="status">Submitting your order to the provider...</p>';

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

  const emailResult = await sb.functions.invoke('send-email', {
    body: { action: 'boost_order', order_id: Number(data.order_id) }
  });

  msg.innerHTML=`<div class="status good" style="margin-top:12px">Order #${esc(data.order_id)} submitted successfully. Provider order #${esc(data.provider_order_id)}. ${money(data.total_ngn)} was deducted from your wallet.${emailResult.error || !emailResult.data?.ok ? '<p class="hint">Your order is confirmed, but the email receipt could not be sent. Please check your email settings.</p>' : '<p class="hint">Confirmation email sent.</p>'}</div>`;

  
}
  
  
  
  
  

  
    
    
  

  

  
  
    
  

  
    
    
    
    
  

  
    
    
  

  


  

function orderProgress(o){
  const original=Math.max(0,Number(o.quantity||0));
  const remaining=o.provider_remains!=null?Math.max(0,Number(o.provider_remains)):null;
  const delivered=remaining!=null
    ?Math.min(original,Math.max(0,original-remaining))
    :null;

  return {original,remaining,delivered};
}

function ordersHtml(rows){
  if(!rows.length){
    return '<div class="empty">No orders yet.</div>';
  }

  return rows.map(o=>{
    const p=orderProgress(o);
    const completed=o.status==='completed'||p.remaining===0;

    return `
      <details class="order">
        <summary style="cursor:pointer;list-style:none">
          <div class="orderhead">
            <b>#${esc(o.id)} · ${esc(o.platform)} ${esc(o.service)}</b>
            <b>${money(o.total_amount_ngn)}</b>
          </div>

          <div style="margin-top:8px">
            <small>
              ${p.remaining!=null
                ?`Delivery: ${p.delivered.toLocaleString()} / ${p.original.toLocaleString()} · Remaining: ${p.remaining.toLocaleString()}`
                :`Quantity: ${p.original.toLocaleString()}`
              }
            </small>
          </div>

          <div class="status" style="margin-top:9px">
            ${esc(o.provider_status||o.status||'Pending')}
            ${completed?' · Completed':''}
          </div>
        </summary>

        <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line)">
          <div><b>Order ID:</b> #${esc(o.id)}</div>
          <div><b>Platform:</b> ${esc(o.platform)}</div>
          <div><b>Service:</b> ${esc(o.service)}</div>
          <div><b>Original quantity:</b> ${p.original.toLocaleString()}</div>
          <div><b>Delivered:</b> ${p.delivered!=null?p.delivered.toLocaleString():'Not available yet'}</div>
          <div><b>Remaining:</b> ${p.remaining!=null?p.remaining.toLocaleString():'Not available yet'}</div>
          <div><b>Order status:</b> ${esc(o.status)}</div>
          <div><b>Payment:</b> ${esc(o.payment_status)}</div>
          <div><b>Amount paid:</b> ${money(o.total_amount_ngn)}</div>

          <div>
            <b>Social link:</b>
            <span style="word-break:break-all">${esc(o.social_link)}</span>
          </div>

          <div>
            <b>Created:</b>
            ${o.created_at?esc(new Date(o.created_at).toLocaleString()):'—'}
          </div>

          ${o.provider_order_id?`
            <div><b>Provider order:</b> #${esc(o.provider_order_id)}</div>

            ${o.provider_start_count!=null
              ?`<div><b>Provider start count:</b> ${Number(o.provider_start_count).toLocaleString()}</div>`
              :''
            }

            ${o.provider_charge_ngn!=null
              ?`<div><b>Provider charge:</b> ${money(o.provider_charge_ngn)}</div>`
              :''
            }

            <button
              class="btn secondary"
              style="margin-top:12px"
              onclick="event.preventDefault();event.stopPropagation();refreshProviderStatus(${Number(o.id)})">
              Refresh delivery status
            </button>
          `:''}
        </div>
      </details>
    `;
  }).join('');
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
      <button type="button" class="admin-action" data-action="test-email">Send test email to admin</button>
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
    const emailResult = await sb.functions.invoke('send-email', {
      body: { action: 'wallet_topup', topup_id: Number(id) }
    });
    alert(emailResult.error || !emailResult.data?.ok
      ? 'Wallet funding approved, but the receipt email could not be sent. Check email settings.'
      : 'Wallet funding approved and receipt email sent.');
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
  if(action==='test-email'){
  b.disabled=true;
  b.textContent='Sending test email...';

  try{
    const {data,error}=await sb.functions.invoke('send-email',{
      body:{action:'test_email'}
    });

    if(error || !data?.ok){
      alert(
        'Test email failed: '+
        (data?.error || error?.message || 'Unknown error')+
        (data?.missing?.length
          ? '\nMissing configuration: '+data.missing.join(', ')
          : '')
      );
    }else{
      alert('Test email accepted by Resend. Check the admin email inbox and spam folder.');
    }
  }catch(err){
    alert('Test email failed: '+(err?.message || 'Unexpected error'));
  }finally{
    b.disabled=false;
    b.textContent='Send test email to admin';
  }

  return;
  }

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


sb.auth.onAuthStateChange(()=>setTimeout(refresh,0));refresh();

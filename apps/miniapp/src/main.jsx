import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';

const API=import.meta.env.VITE_API_URL||'http://localhost:3000';
const tg=window.Telegram?.WebApp;
const previewEnabled=import.meta.env.DEV||import.meta.env.VITE_DEMO_BUILD==='true';
const previewRole=previewEnabled?(new URLSearchParams(location.search).get('preview')||(import.meta.env.VITE_DEMO_BUILD==='true'?'client':null)):null;

const STATUS_LABEL={new:'Qabul qilindi',visit:'Dizayner tashrifi',design:'Dizayn bosqichi',tender:'Tender',quote:'Narxni tasdiqlang',production:'Ishlab chiqarish',inspection:'Sifat nazorati',delivery:'Yetkazib berish',completed:'Yakunlandi'};
const STAGES=['new','visit','design','tender','production','delivery'];
const STAGE_IDX={new:0,visit:1,design:2,tender:3,quote:3,production:4,inspection:4,delivery:5,completed:5};
const ROOMS=[{name:'Mehmonxona',pos:'0% 0%'},{name:'Yotoqxona',pos:'100% 0%'},{name:'Oshxona',pos:'0% 100%'},{name:'Boshqa',pos:'100% 100%'}];

const money=v=>`${Number(v||0).toLocaleString('uz-UZ')} so'm`;
const fmtDate=v=>new Date(v).toLocaleString('uz-UZ',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});

// 48-soatlik taymer faqat measurements_submitted_at bo'lganda ko'rinadi (mijoz uchun)
// Dizayner/sex uchun esa har doim due_at bo'yicha
function timerStartedAt(order,userRole){
  if(userRole==='client'){
    return order.measurements_submitted_at||null; // faqat shu vaqtdan keyin ko'rsatiladi
  }
  return order.due_at?order.created_at:null;
}

const mockOrders=[
  {id:'aaa00000-0000-0000-0000-000000000001',room_type:'Mehmonxona',style:'Modern',budget:12000000,quoted_price:13500000,region:'Navoiy',status:'quote',due_at:new Date(Date.now()+14*3600000).toISOString(),measurements_submitted_at:new Date(Date.now()-10*3600000).toISOString(),designer_id:'d1',workshop_id:'w1',design_url:'demo',revision_count:0,created_at:new Date().toISOString()},
  {id:'aaa00000-0000-0000-0000-000000000002',room_type:'Oshxona',style:'Minimal',budget:18000000,region:'Navoiy',status:'production',due_at:new Date(Date.now()+36*3600000).toISOString(),measurements_submitted_at:new Date(Date.now()-12*3600000).toISOString(),designer_id:'d1',workshop_id:'w1',created_at:new Date().toISOString()},
  {id:'aaa00000-0000-0000-0000-000000000003',room_type:'Yotoqxona',style:'Klassik',budget:9000000,region:'Navoiy',status:'visit',design_url:null,due_at:null,measurements_submitted_at:null,designer_id:'d1',created_at:new Date().toISOString()}
];
const mockDetail=o=>({order:o,steps:STAGES.slice(0,Math.max(1,STAGE_IDX[o.status]+1)).map((step_name,i)=>({step_name,occurred_at:new Date(Date.now()-(6-i)*3600000).toISOString()})),payment:null});

// SVG icons — compact, 1.6px stroke, Lucide-compatible paths
function Icon({n,s=20}){
  const P={
    home:<><path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Z"/><path d="M9 21v-8h6v8"/></>,
    list:<><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    user:<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3-7 8-7s8 3 8 7"/></>,
    right:<path d="M9 18l6-6-6-6"/>,
    left:<path d="M15 18l-6-6 6-6"/>,
    clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    ok:<path d="m5 12 5 5L20 7"/>,
    grid:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    up:<><path d="M12 16V4m-5 5 5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></>,
    bell:<><path d="M18 8a6 6 0 0 0-12 0c0 8-3 8-3 10h18c0-2-3-2-3-10ZM10 21h4"/></>,
    layers:<><path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/></>,
    out:<><path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5M16 17l5-5-5-5m5 5H9"/></>,
    img:<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m3 17 5-5 4 4 3-3 6 6"/></>,
    star:<path d="m12 2 3.1 6.3L22 9.3l-5 4.9 1.2 6.9L12 17.8l-6.2 3.3L7 14.2 2 9.3l6.9-1z"/>,
  };
  const p=P[n];if(!p)return null;
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p}</svg>;
}

function RoomThumb({name,className=''}){
  const pos=ROOMS.find(r=>r.name===name)?.pos||'0% 0%';
  return <div className={`rthumb ${className}`} style={{backgroundPosition:pos}} aria-hidden="true"/>;
}

function Badge({status}){
  return <span className={`badge badge-${status}`}><span className="bdot"/>{STATUS_LABEL[status]||status}</span>;
}

function Countdown({order,userRole,now}){
  const role=userRole;
  if(!order.due_at)return null;

  // Mijoz uchun: taymer faqat measurements_submitted_at bo'lganda ko'rinadi
  if(role==='client'&&!order.measurements_submitted_at)return null;
  if(order.status==='completed')return(
    <div className="timer done"><Icon n="ok" s={16}/><span>Buyurtma muvaffaqiyatli yakunlandi</span></div>
  );
  const diff=new Date(order.due_at).getTime()-now;
  const isOver=diff<=0;
  const h=Math.floor(Math.abs(diff)/3600000);
  const m=Math.floor((Math.abs(diff)%3600000)/60000);
  const cls=isOver?'over':diff<3*3600000?'urgent':diff<12*3600000?'warn':'';
  return(
    <div className={`timer ${cls}`}>
      <Icon n="clock" s={16}/>
      <span>{isOver?`${h}s ${m}d kechikmoqda`:`${h} soat ${m} daqiqa qoldi`}</span>
    </div>
  );
}

function BottomNav({tab,onTab,role}){
  const items=role==='workshop'
    ?[['home','Bosh','home'],['orders','Ishlarim','list'],['tenders','Tenderlar','grid'],['profile','Profil','user']]
    :[['home','Bosh','home'],['orders',role==='client'?'Buyurtmalar':'Ishlarim','list'],['profile','Profil','user']];
  return(
    <nav className="bnav" aria-label="Navigatsiya">
      {items.map(([id,label,icon])=>(
        <button key={id} className={tab===id?'active':''} onClick={()=>onTab(id)} aria-current={tab===id?'page':undefined}>
          <Icon n={icon} s={22}/>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function Wordmark({inv=false}){
  return(
    <div className={`wm ${inv?'wm-inv':''}`}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect width="28" height="28" rx="7" fill={inv?'#fff':'#2D5F47'}/>
        <path d="M7 20V10l7-3 7 3v10" stroke={inv?'#2D5F47':'#C8A96E'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M11 20v-5h6v5" stroke={inv?'#2D5F47':'#C8A96E'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span>mebel<strong>48</strong></span>
    </div>
  );
}

function OrderRow({order,onClick}){
  return(
    <button className="orow" onClick={onClick}>
      <RoomThumb name={order.room_type} className="orow-img"/>
      <div className="orow-body">
        <p className="orow-title">{order.room_type} uchun mebel</p>
        <p className="orow-meta">{order.style} &middot; #{order.id.slice(0,6).toUpperCase()}</p>
        <Badge status={order.status}/>
      </div>
      <Icon n="right" s={18}/>
    </button>
  );
}

function Empty({role,onBot}){
  return(
    <div className="empty">
      <div className="empty-icon"><Icon n="list" s={26}/></div>
      <h3>{role==='workshop'?'Faol tender yo\'q':'Buyurtma yo\'q hali'}</h3>
      <p>{role==='client'?'Yangi buyurtma berish uchun Telegram botiga qayting.':'Yangi ish paydo bo\'lganda bu yerda ko\'rinadi.'}</p>
      {role==='client'&&<button className="btn" onClick={onBot}>Botga qaytish <Icon n="right" s={16}/></button>}
    </div>
  );
}

function ErrorBar({text,onClose}){
  if(!text)return null;
  return(
    <div className="errbar" role="alert">
      <span>{text}</span>
      <button onClick={onClose} aria-label="Yopish">&times;</button>
    </div>
  );
}

function OrderActions({order,user,api,action,upload,confirmAction,preview,setError}){
  const r=user?.role;
  return(
    <>
      {/* MIJOZ — dizayn ko'rib chiqish */}
      {r==='client'&&order.status==='design'&&order.design_url&&(
        <div className="card acard">
          <div className="acard-label">Sizning navbatingiz</div>
          <h2>Dizayn tayyor</h2>
          <p>Dizayner yaratgan loyiha tayyor. Ko'rib chiqing va fikringizni bildiring.</p>
          <button className="btn btn-outline" onClick={async()=>{
            try{if(preview)return;const {url}=await api('/uploads/view?key='+encodeURIComponent(order.design_url));tg.openLink(url);}
            catch(e){setError(e.message);}
          }}><Icon n="img" s={16}/> Dizaynni ochish</button>
          <button className="btn" onClick={()=>confirmAction('Dizaynni tasdiqlaysizmi?',()=>action(`/orders/${order.id}/design-decision`,{approved:true}))}>
            Tasdiqlash <Icon n="ok" s={16}/>
          </button>
          <form className="revision-form" onSubmit={e=>{
            e.preventDefault();
            const v=e.currentTarget.elements.namedItem('comment').value.trim();
            if(v)action(`/orders/${order.id}/design-decision`,{approved:false,comment:v});
          }}>
            <label>O'zgartirish kerakmi?</label>
            <textarea name="comment" maxLength={500} placeholder="Nima o'zgartirilsin?" required/>
            <button type="submit" className="btn btn-ghost">O'zgartirish so'rash</button>
          </form>
        </div>
      )}

      {/* MIJOZ — narx tasdiqlash */}
      {r==='client'&&order.status==='quote'&&(
        <div className="card acard">
          <div className="acard-label">Narx taklifi</div>
          <h2>Sex tanlandi</h2>
          <div className="price-cmp">
            <div>
              <span>Byudjetingiz</span>
              <strong>{money(order.budget)}</strong>
            </div>
            <div className={order.quoted_price>order.budget?'over':''}>
              <span>Taklif narxi</span>
              <strong>{money(order.quoted_price)}</strong>
            </div>
          </div>
          {order.quoted_price>order.budget&&<p className="note">Taklif sizning byudjetingizdan yuqori.</p>}
          <p>To'lov platformadan tashqarida kelishiladi. Tasdiqsiz ishlab chiqarish boshlanmaydi.</p>
          <button className="btn" onClick={()=>confirmAction('Shu narxda tasdiqlaysizmi?',()=>action(`/orders/${order.id}/quote-decision`,{approved:true}))}>
            Tasdiqlash <Icon n="ok" s={16}/>
          </button>
          <button className="btn btn-ghost" onClick={()=>confirmAction('Narxni rad etib boshqa taklif kutasizmi?',()=>action(`/orders/${order.id}/quote-decision`,{approved:false}))}>
            Boshqa taklif kutish
          </button>
        </div>
      )}

      {/* MIJOZ — qabul */}
      {r==='client'&&order.status==='delivery'&&(
        <div className="card acard">
          <div className="acard-label">Yakuniy qadam</div>
          <h2>Mebelni qabul qiling</h2>
          <p>Ko'rib chiqing. Qabul tasdig'i buyurtmani yakunlaydi va to'lovni tasdiqlaydi.</p>
          <button className="btn" onClick={()=>confirmAction('Buyurtmani qabul qilasizmi?',()=>action(`/orders/${order.id}/accept`,{}))}>
            Qabulni tasdiqlash <Icon n="ok" s={16}/>
          </button>
        </div>
      )}

      {/* MIJOZ — baholash */}
      {r==='client'&&order.status==='completed'&&(
        <div className="card acard">
          <div className="acard-label">Rahmat</div>
          <h2>Xizmatni baholang</h2>
          <p>Bahongiz boshqa mijozlarga yordam beradi.</p>
          {[['Dizayner',order.designer_id],['Sex',order.workshop_id]].filter(x=>x[1]).map(([label,id])=>(
            <form key={id} className="rate-form" onSubmit={e=>{
              e.preventDefault();
              const f=e.currentTarget;
              action(`/orders/${order.id}/ratings`,{target_id:id,stars:Number(f.elements.namedItem('stars').value),comment:f.elements.namedItem('comment').value});
            }}>
              <label>{label} bahosi</label>
              <select name="stars" required>
                <option value="">Tanlang</option>
                {[1,2,3,4,5].map(n=><option key={n} value={n}>{'★'.repeat(n)} — {n}</option>)}
              </select>
              <textarea name="comment" maxLength={500} placeholder="Izoh (ixtiyoriy)"/>
              <button type="submit" className="btn btn-ghost">Bahoni saqlash</button>
            </form>
          ))}
        </div>
      )}

      {/* DIZAYNER — o'lchovlar */}
      {r==='designer'&&order.status==='visit'&&(
        <div className="card acard">
          <div className="acard-label">Dizayner vazifasi</div>
          <h2>O'lchovlar va foto</h2>
          <p>O'lchamlarni kiritish va xona fotosini yuklash majburiy. Bu bosqichdan keyin 48 soatlik taymer boshlanadi.</p>
          <form onSubmit={async e=>{
            e.preventDefault();
            try{
              const f=e.currentTarget;
              const photoKey=await upload(order.id,f.elements.namedItem('photo').files[0]);
              await action(`/orders/${order.id}/measurements`,{
                width:Number(f.elements.namedItem('w').value),
                height:Number(f.elements.namedItem('h').value),
                depth:Number(f.elements.namedItem('d').value),
                photos:[photoKey]
              });
            }catch(e){setError(e.message);}
          }}>
            <div className="dims">
              <label>Eni (m)<input name="w" type="number" step="0.01" min="0.01" required/></label>
              <label>Bo'yi (m)<input name="h" type="number" step="0.01" min="0.01" required/></label>
              <label>Chuqurligi (m)<input name="d" type="number" step="0.01" min="0.01" required/></label>
            </div>
            <label>Xona fotosi<input name="photo" type="file" accept="image/*" required/></label>
            <button type="submit" className="btn"><Icon n="up" s={16}/> Saqlash va taymer boshlash</button>
          </form>
        </div>
      )}

      {/* DIZAYNER — dizayn yuklash */}
      {r==='designer'&&order.status==='design'&&(
        <div className="card acard">
          <div className="acard-label">Dizayner vazifasi</div>
          <h2>Dizaynni yuboring</h2>
          <p>Mijoz ko'rib chiqishi uchun rasm yoki PDF yuklang.{order.revision_count>0&&` (${order.revision_count} marta tahrir so'raldi)`}</p>
          <label>Dizayn fayli
            <input type="file" accept="image/*,application/pdf" onChange={async e=>{
              try{const k=await upload(order.id,e.target.files[0]);await action(`/orders/${order.id}/design`,{url:k});}
              catch(e){setError(e.message);}
            }}/>
          </label>
        </div>
      )}

      {/* DIZAYNER — sifat nazorati */}
      {r==='designer'&&order.status==='inspection'&&(
        <div className="card acard">
          <div className="acard-label">Sifat nazorati</div>
          <h2>Sexdagi tekshiruv</h2>
          <p>Tayyor mebelni ko'rib, yetkazishga ruxsat bering.</p>
          <button className="btn" onClick={()=>confirmAction('Yetkazishga ruxsat berasizmi?',()=>action(`/orders/${order.id}/inspect`,{approved:true}))}>
            Ruxsat berish <Icon n="ok" s={16}/>
          </button>
          <form onSubmit={e=>{
            e.preventDefault();
            const v=e.currentTarget.elements.namedItem('comment').value.trim();
            if(v)action(`/orders/${order.id}/inspect`,{approved:false,comment:v});
          }}>
            <label>Qayta ishlash sababi</label>
            <textarea name="comment" maxLength={500} required/>
            <button type="submit" className="btn btn-ghost">Sexga qaytarish</button>
          </form>
        </div>
      )}

      {/* SEX — ishlab chiqarish bosqichlari */}
      {r==='workshop'&&order.status==='production'&&(
        <div className="card acard">
          <div className="acard-label">Ish jarayoni</div>
          <h2>Bosqichni saqlang</h2>
          <p>Har bir bosqich uchun rasm yoki hujjat biriktiring. Bu mijozga ko'rinadi.</p>
          <form onSubmit={async e=>{
            e.preventDefault();
            try{
              const f=e.currentTarget;
              const mk=await upload(order.id,f.elements.namedItem('media').files[0]);
              await action(`/orders/${order.id}/progress`,{stage:f.elements.namedItem('stage').value,media:[mk],materials:f.elements.namedItem('materials').value});
              f.reset();
            }catch(e){setError(e.message);}
          }}>
            <label>Bosqich
              <select name="stage">
                <option value="cutting">Kesish</option>
                <option value="assembly">Yig'ish</option>
                <option value="finishing">Yakuniy ishlov</option>
                <option value="ready">Tayyor</option>
              </select>
            </label>
            <label>Material ma'lumotlari<input name="materials" placeholder="MDF, eman rang, ..."/></label>
            <label>Rasm yoki hujjat<input name="media" type="file" accept="image/*,application/pdf" required/></label>
            <button type="submit" className="btn"><Icon n="up" s={16}/> Bosqichni saqlash</button>
          </form>
        </div>
      )}
    </>
  );
}

function App(){
  const [token,setToken]=useState('');
  const [user,setUser]=useState(null);
  const [orders,setOrders]=useState([]);
  const [selected,setSelected]=useState(null);
  const [detail,setDetail]=useState(null);
  const [bids,setBids]=useState([]);
  const [tab,setTab]=useState('home');
  const [filter,setFilter]=useState('Barchasi');
  const [error,setError]=useState('');
  const [now,setNow]=useState(Date.now());
  const [loading,setLoading]=useState(true);
  const preview=!!previewRole;

  const api=async(path,opts={})=>{
    const r=await fetch(API+path,{...opts,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:opts.body?JSON.stringify(opts.body):undefined});
    const data=await r.json();
    if(!r.ok)throw Error(data.error||'So\'rov bajarilmadi');
    return data;
  };

  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);

  useEffect(()=>{
    if(preview){
      setUser({name:previewRole==='client'?'Otabek':previewRole==='designer'?'Aziza':'Usta Jamshid',role:previewRole,region:'Navoiy'});
      setOrders(mockOrders);
      setBids([{id:'bt1',room_type:'Oshxona',style:'Minimal',region:'Navoiy',due_at:new Date(Date.now()+36*3600000).toISOString(),created_at:new Date().toISOString()}]);
      setLoading(false);return;
    }
    if(!tg?.initData){setLoading(false);return;}
    tg.ready();tg.expand();
    fetch(API+'/auth/telegram',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:tg.initData})})
      .then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);setToken(d.token);setUser(d.user);})
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false));
  },[]);

  const refresh=async()=>{
    if(preview||!token)return;
    try{
      const r=await api('/orders');setOrders(r.orders);
      if(selected){const d=await api(`/orders/${selected}`);setDetail(d);}
    }catch(e){setError(e.message);}
  };

  useEffect(()=>{refresh();},[token]);

  useEffect(()=>{
    if(!selected)return;
    if(preview){const o=orders.find(x=>x.id===selected);if(o)setDetail(mockDetail(o));return;}
    if(token)api(`/orders/${selected}`).then(setDetail).catch(e=>setError(e.message));
  },[selected,token]);

  const action=async(path,body)=>{
    if(preview){
      const id=selected;let next=null;
      if(path.includes('quote-decision'))next=body.approved?'production':'tender';
      else if(path.includes('design-decision'))next=body.approved?'tender':'design';
      else if(path.includes('/accept'))next='completed';
      else if(path.includes('/inspect'))next=body.approved?'delivery':'production';
      else if(path.includes('/measurements'))next='design';
      if(next&&id){
        setOrders(os=>os.map(o=>o.id===id?{...o,status:next,measurements_submitted_at:next==='design'?new Date().toISOString():o.measurements_submitted_at}:o));
        setDetail(d=>d?{...d,order:{...d.order,status:next}}:d);
      }
      setError('');return true;
    }
    try{await api(path,{method:'POST',body});setError('');await refresh();if(user?.role==='workshop')setBids((await api('/tenders/active')).tenders);return true;}
    catch(e){setError(e.message);return false;}
  };

  const upload=async(orderId,file)=>{
    if(!file)throw Error('Faylni tanlang');
    if(preview)return 'demo';
    const sign=await api('/uploads/signed-url',{method:'POST',body:{order_id:orderId,content_type:file.type}});
    const r=await fetch(sign.url,{method:'PUT',headers:{'Content-Type':file.type},body:file});
    if(!r.ok)throw Error('Fayl yuklanmadi');
    return sign.key;
  };

  const confirmAction=(text,fn)=>{
    if(preview)return fn();
    if(tg?.showConfirm)tg.showConfirm(text,yes=>{if(yes)fn();});
    else if(window.confirm(text))fn();
  };

  const openOrder=o=>{setDetail(null);setSelected(o.id);setTab('orders');window.scrollTo({top:0,behavior:'smooth'});};
  const goTab=t=>{
    setSelected(null);setDetail(null);setTab(t);setError('');
    window.scrollTo({top:0,behavior:'smooth'});
    if(t==='tenders'&&!preview&&token)api('/tenders/active').then(d=>setBids(d.tenders)).catch(e=>setError(e.message));
  };

  const visible=useMemo(()=>filter==='Barchasi'?orders:orders.filter(o=>o.room_type===filter),[orders,filter]);
  const order=detail?.order;

  // --- Loading ---
  if(loading)return(
    <main className="shell">
      <div className="skel skel-h"/>
      <div className="skel skel-hero"/>
      <div className="skel"/>
      <div className="skel"/>
      <div className="skel skel-sm"/>
    </main>
  );

  // --- Not in Telegram ---
  if(!preview&&!tg?.initData)return(
    <div className="splash">
      <div className="splash-inner">
        <Wordmark inv/>
        <h1>Uyingizga mos mebel — bir joyda.</h1>
        <p>Buyurtma va jarayonni kuzatish uchun Mebel48 ilovasini Telegram orqali oching.</p>
        <span className="splash-hint">Telegram orqali oching</span>
      </div>
    </div>
  );

  if(error&&!user)return(
    <div className="splash">
      <div className="splash-inner">
        <Wordmark inv/>
        <h1>Kirishda xatolik</h1>
        <p>{error}</p>
      </div>
    </div>
  );

  return(
    <main className="shell">

      {/* ---- DETAIL VIEW ---- */}
      {selected&&order?(
        <>
          <div className="topbar">
            <button className="topbar-back" onClick={()=>goTab('orders')} aria-label="Orqaga"><Icon n="left" s={20}/></button>
            <span className="topbar-id">#{order.id.slice(0,6).toUpperCase()}</span>
          </div>

          <RoomThumb name={order.room_type} className="detail-hero"/>

          <div className="detail-head">
            <div>
              <p className="detail-meta">{order.region} &middot; {order.style}</p>
              <h1 className="detail-title">{order.room_type} uchun mebel</h1>
            </div>
            <Badge status={order.status}/>
          </div>

          <Countdown order={order} userRole={user?.role} now={now}/>
          <ErrorBar text={error} onClose={()=>setError('')}/>

          {/* Process card */}
          <div className="card">
            <div className="card-row">
              <h2 className="card-h">Buyurtma holati</h2>
              <span className="step-pill">{Math.min(6,STAGE_IDX[order.status]+1)}/6</span>
            </div>
            <div className="progbar"><div style={{width:`${(STAGE_IDX[order.status]+1)/6*100}%`}}/></div>
            <div className="timeline">
              {STAGES.map((s,i)=>{
                const done=i<=STAGE_IDX[order.status];
                const step=detail.steps.find(x=>x.step_name===s);
                return(
                  <div className={`trow ${done?'done':''}`} key={s}>
                    <div className="tdot">{done?<Icon n="ok" s={11}/>:i+1}</div>
                    <div>
                      <span className="trow-name">{STATUS_LABEL[s]}</span>
                      <span className="trow-time">{step?fmtDate(step.occurred_at):'Kutilmoqda'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <OrderActions {...{order,user,detail,api,action,upload,confirmAction,preview,setError}}/>

          {/* Activity log */}
          <div className="card">
            <div className="card-row">
              <h2 className="card-h">Faoliyat tarixi</h2>
              <Icon n="layers" s={18}/>
            </div>
            {detail.steps.slice().reverse().map((s,i)=>(
              <div className="hrow" key={i}>
                <div className="hmark"/>
                <div>
                  <span className="hrow-name">{STATUS_LABEL[s.step_name]||s.step_name}</span>
                  <span className="hrow-time">{fmtDate(s.occurred_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ):(
        /* ---- MAIN VIEWS ---- */
        <>
          <div className="appbar">
            <Wordmark/>
            <button className="avatar" onClick={()=>goTab('profile')} aria-label="Profil">
              {user?.name?.[0]||'U'}
            </button>
          </div>

          {preview&&(
            <div className="demo-bar">
              Demo:
              {[['client','Mijoz'],['designer','Dizayner'],['workshop','Sex']].map(([role,label])=>(
                <button key={role} className={user.role===role?'act':''} onClick={()=>{location.search='?preview='+role;}}>{label}</button>
              ))}
            </div>
          )}

          <ErrorBar text={error} onClose={()=>setError('')}/>

          {/* HOME TAB */}
          {tab==='home'&&(
            <>
              <div className="hero">
                <div className="hero-txt">
                  <p className="hero-sub">Mebel xizmati &middot; {user?.region}</p>
                  <h1>Yaxshi uy,<br/>yaxshi mebeldan<br/>boshlanadi.</h1>
                  <button className="btn" onClick={()=>goTab('orders')}>Buyurtmalarni ko'rish <Icon n="right" s={16}/></button>
                </div>
              </div>

              <div className="sec-head">
                <h2>Xonalar bo'yicha</h2>
                <button className="txt-btn" onClick={()=>{setFilter('Barchasi');goTab('orders');}}>Barchasi <Icon n="right" s={14}/></button>
              </div>
              <div className="rooms">
                {ROOMS.map(r=>(
                  <button className="room-btn" key={r.name} onClick={()=>{setFilter(r.name);goTab('orders');}}>
                    <div className="room-img" style={{backgroundPosition:r.pos}}/>
                    <strong>{r.name}</strong>
                  </button>
                ))}
              </div>

              <div className="sec-head">
                <h2>{user?.role==='client'?'So\'nggi buyurtmalar':'Joriy ishlar'}</h2>
                <button className="txt-btn" onClick={()=>{setFilter('Barchasi');goTab('orders');}}>Hammasi <Icon n="right" s={14}/></button>
              </div>
              {orders.slice(0,2).map(o=><OrderRow key={o.id} order={o} onClick={()=>openOrder(o)}/>)}
              {!orders.length&&<Empty role={user?.role} onBot={()=>tg?.close()}/>}
            </>
          )}

          {/* ORDERS TAB */}
          {tab==='orders'&&(
            <>
              <div className="ph">
                <h1>{user?.role==='client'?'Buyurtmalarim':'Ishlarim'}</h1>
                <p>Har bir qadam shu yerda ko'rinadi.</p>
              </div>
              <div className="chips">
                {['Barchasi',...ROOMS.map(r=>r.name)].map(t=>(
                  <button key={t} className={filter===t?'chip act':'chip'} onClick={()=>setFilter(t)}>{t}</button>
                ))}
              </div>
              {visible.map(o=><OrderRow key={o.id} order={o} onClick={()=>openOrder(o)}/>)}
              {!visible.length&&<Empty role={user?.role} onBot={()=>tg?.close()}/>}
            </>
          )}

          {/* TENDERS TAB (workshop only) */}
          {tab==='tenders'&&user?.role==='workshop'&&(
            <>
              <div className="ph">
                <h1>Faol tenderlar</h1>
                <p>Hududingizdagi tasdiqlangan dizaynlarga narx va muddat taklif qiling.</p>
              </div>
              {bids.length?bids.map(t=>(
                <div className="card tender-card" key={t.id}>
                  <div className="tender-top">
                    <div className="room-img sm" style={{backgroundPosition:ROOMS.find(r=>r.name===t.room_type)?.pos||'0% 0%'}}/>
                    <div>
                      <p className="detail-meta">{t.region}</p>
                      <h2 className="card-h">{t.room_type} uchun mebel</h2>
                      <p className="tender-style">{t.style} uslubi</p>
                    </div>
                  </div>
                  <form onSubmit={e=>{
                    e.preventDefault();
                    const f=e.currentTarget;
                    action(`/tenders/${t.id}/bid`,{price:Number(f.elements.namedItem('price').value),deadline:new Date(f.elements.namedItem('deadline').value).toISOString()});
                  }}>
                    <label>Narx (so'm)<input name="price" type="number" min="1" step="1" placeholder="Masalan: 12 000 000" required/></label>
                    <label>Tayyor bo'lish sanasi<input name="deadline" type="date" min={new Date(Date.now()+86400000).toISOString().slice(0,10)} required/></label>
                    <button type="submit" className="btn">Taklif yuborish <Icon n="right" s={16}/></button>
                  </form>
                </div>
              )):<Empty role="workshop"/>}
            </>
          )}

          {/* PROFILE TAB */}
          {tab==='profile'&&(
            <>
              <div className="ph">
                <h1>Profil</h1>
              </div>
              <div className="card pcard">
                <div className="pavatarL">{user?.name?.[0]||'U'}</div>
                <div>
                  <strong className="pname">{user?.name}</strong>
                  <span className="pmeta">{user?.role==='client'?'Mijoz':user?.role==='designer'?'Dizayner':'Mebel sexi'} &middot; {user?.region}</span>
                </div>
              </div>
              <div className="card plist">
                <button onClick={()=>goTab('orders')}>
                  <Icon n="list" s={18}/> {user?.role==='client'?'Buyurtmalarim':'Ishlarim'} <Icon n="right" s={16}/>
                </button>
                {user?.role==='workshop'&&(
                  <button onClick={()=>goTab('tenders')}>
                    <Icon n="grid" s={18}/> Tenderlar <Icon n="right" s={16}/>
                  </button>
                )}
                <div className="pinfo"><Icon n="bell" s={16}/> Bildirishnomalar Telegram bot orqali keladi</div>
                <div className="pinfo"><Icon n="ok" s={16}/> To'lov platformadan tashqarida kelishiladi</div>
              </div>
              <button className="btn btn-outline" style={{marginTop:8}} onClick={()=>tg?.close()}>
                <Icon n="out" s={16}/> Telegramga qaytish
              </button>
            </>
          )}
        </>
      )}

      <BottomNav tab={selected?'orders':tab} onTab={goTab} role={user?.role}/>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App/>);

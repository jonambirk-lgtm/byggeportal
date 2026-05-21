import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabase";

const DEFAULT_SETTINGS = {
  companyName: "ABA Teknik ApS",
  accentColor: "#fcd209",
  logo: null,
};

// ─────────────────────────────────────────────
// ROLLE PERMISSIONS — granulær matrix
// ─────────────────────────────────────────────
const ROLE_PERMISSIONS = {
  lærling: {
    viewDashboard:true, editWidgets:false,
    readNews:true, createNews:false, deleteNews:false,
    sendMessages:true, receiveMessages:true,
    viewEvents:true, joinEvents:true, createEvents:false, viewAttendees:false,
    viewDocs:true, createDocs:false, deleteDocs:false,
    createAbsence:true, viewOwnAbsence:true, viewTeamAbsence:false, approveAbsence:false,
    createRequest:true, viewOwnRequests:true, approveRequests:false,
    viewFollowup:false, viewFollowupAll:false,
    viewAllUsers:false, createUsers:false, deleteUsers:false, changeRoles:false, changeManager:false,
    viewProfile:true, editProfile:true,
  },
  montør: {
    viewDashboard:true, editWidgets:false,
    readNews:true, createNews:false, deleteNews:false,
    sendMessages:true, receiveMessages:true,
    viewEvents:true, joinEvents:true, createEvents:false, viewAttendees:false,
    viewDocs:true, createDocs:false, deleteDocs:false,
    createAbsence:true, viewOwnAbsence:true, viewTeamAbsence:false, approveAbsence:false,
    createRequest:true, viewOwnRequests:true, approveRequests:false,
    viewFollowup:false, viewFollowupAll:false,
    viewAllUsers:false, createUsers:false, deleteUsers:false, changeRoles:false, changeManager:false,
    viewProfile:true, editProfile:true,
  },
  leder: {
    viewDashboard:true, editWidgets:true,
    readNews:true, createNews:true, deleteNews:false,
    sendMessages:true, receiveMessages:true,
    viewEvents:true, joinEvents:true, createEvents:true, viewAttendees:true,
    viewDocs:true, createDocs:true, deleteDocs:false,
    createAbsence:true, viewOwnAbsence:true, viewTeamAbsence:true, approveAbsence:true,
    createRequest:true, viewOwnRequests:true, approveRequests:true,
    viewFollowup:true, viewFollowupAll:false,
    viewAllUsers:false, createUsers:false, deleteUsers:false, changeRoles:false, changeManager:false,
    viewProfile:true, editProfile:true,
  },
  chef: {
    viewDashboard:true, editWidgets:true,
    readNews:true, createNews:true, deleteNews:true,
    sendMessages:true, receiveMessages:true,
    viewEvents:true, joinEvents:true, createEvents:true, viewAttendees:true,
    viewDocs:true, createDocs:true, deleteDocs:true,
    createAbsence:true, viewOwnAbsence:true, viewTeamAbsence:true, approveAbsence:true,
    createRequest:true, viewOwnRequests:true, approveRequests:true,
    viewFollowup:true, viewFollowupAll:true,
    viewAllUsers:true, createUsers:true, deleteUsers:true, changeRoles:false, changeManager:true,
    viewProfile:true, editProfile:true,
  },
  direktør: {
    viewDashboard:true, editWidgets:true,
    readNews:true, createNews:true, deleteNews:true,
    sendMessages:true, receiveMessages:true,
    viewEvents:true, joinEvents:true, createEvents:true, viewAttendees:true,
    viewDocs:true, createDocs:true, deleteDocs:true,
    createAbsence:true, viewOwnAbsence:true, viewTeamAbsence:true, approveAbsence:true,
    createRequest:true, viewOwnRequests:true, approveRequests:true,
    viewFollowup:true, viewFollowupAll:true,
    viewAllUsers:true, createUsers:true, deleteUsers:true, changeRoles:false, changeManager:true,
    viewProfile:true, editProfile:true,
  },
  it_admin: {
    viewDashboard:false, editWidgets:false,
    readNews:false, createNews:false, deleteNews:false,
    sendMessages:false, receiveMessages:false,
    viewEvents:false, joinEvents:false, createEvents:false, viewAttendees:false,
    viewDocs:false, createDocs:false, deleteDocs:false,
    createAbsence:false, viewOwnAbsence:false, viewTeamAbsence:false, approveAbsence:false,
    createRequest:false, viewOwnRequests:false, approveRequests:false,
    viewFollowup:false, viewFollowupAll:false,
    viewAllUsers:true, createUsers:true, deleteUsers:true, changeRoles:true, changeManager:true,
    viewProfile:false, editProfile:false,
  },
};
const can = (user, action) => ROLE_PERMISSIONS[user?.role]?.[action] === true;

const ABSENCE_TYPES = ["Ferie","Sygdom","Barn syg","Omsorgsdage","Afspadsering","Kursus","Andet"];
const DOC_CATEGORIES = ["Håndbøger","Sikkerhedsprocedurer","Onboarding","Kvalitet","Andet"];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const catColor    = c => ({Sikkerhed:"#fcd209",Personale:"#2e9e5b",Socialt:"#1a6be8","Nyt fra kontoret":"#7c3aed","Salg & Tilbud":"#e8521a",Andet:"#888"}[c]||"#777");
const docCatColor = c => ({Håndbøger:"#1a6be8","Sikkerhedsprocedurer":"#dc2626",Onboarding:"#2e9e5b",Kvalitet:"#7c3aed",Andet:"#888"}[c]||"#888");
const docCatIcon  = c => ({Håndbøger:"📘","Sikkerhedsprocedurer":"🦺",Onboarding:"👋",Kvalitet:"✅",Andet:"📄"}[c]||"📄");
const statColor   = s => ({Godkendt:"#2e9e5b",Afventer:"#d97706",Afvist:"#dc2626"}[s]||"#777");
const priColor    = p => ({Høj:"#dc2626",Normal:"#d97706",Lav:"#2e9e5b"}[p]||"#777");
const roleLabel   = r => ({lærling:"Lærling",montør:"Montør",leder:"Leder",chef:"Afdelingschef",direktør:"Direktør",it_admin:"IT-admin"}[r]||r);
const fmt         = d => { try { return new Date(d).toLocaleDateString("da-DK",{day:"numeric",month:"short",year:"numeric"}); } catch(e) { return d||""; }};
const fmtShort    = d => { try { return new Date(d).toLocaleDateString("da-DK",{day:"numeric",month:"short"}); } catch(e) { return d||""; }};
const fmtTime     = d => { try { return new Date(d).toLocaleTimeString("da-DK",{hour:"2-digit",minute:"2-digit"}); } catch(e) { return ""; }};
const daysBetween = (a,b) => Math.max(1,Math.round((new Date(b)-new Date(a))/86400000)+1);
const periodFilter = (dateStr,p) => {
  const d=new Date(dateStr),now=new Date();
  if(p==="12md"){const y=new Date(now);y.setMonth(y.getMonth()-12);return d>=y;}
  if(p==="ytd") return d.getFullYear()===now.getFullYear();
  if(p==="q")   {const q=new Date(now);q.setMonth(q.getMonth()-3);return d>=q;}
  if(p==="1md") {const m=new Date(now);m.setMonth(m.getMonth()-1);return d>=m;}
  return true;
};

// Mærkedage — fødselsdage, jubilæum, udlært
const getMilestones = (users) => {
  const now = new Date();
  const results = [];
  users.filter(u=>u.role!=="it_admin").forEach(u => {
    // Fødselsdage inden for 7 dage
    if(u.birthdate) {
      const bd = new Date(u.birthdate);
      const thisYear = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
      const diff = Math.round((thisYear - now) / 86400000);
      if(diff >= 0 && diff <= 7) {
        const age = now.getFullYear() - bd.getFullYear();
        results.push({type:"birthday", name:u.name, avatar:u.avatar, photo_url:u.photo_url, days:diff,
          label: diff===0 ? `🎂 ${u.name} har fødselsdag i dag! (${age} år)` : `🎂 ${u.name} fylder ${age} om ${diff} dag${diff!==1?"e":""}`,
          color:"#e8521a"});
      }
    }
    // Jubilæum 5/10/15/20/25/30 år
    if(u.hire_date) {
      const hd = new Date(u.hire_date);
      const yearsWorked = now.getFullYear() - hd.getFullYear();
      [5,10,15,20,25,30].forEach(m => {
        if(yearsWorked === m) {
          const anniversary = new Date(now.getFullYear(), hd.getMonth(), hd.getDate());
          const diff = Math.round((anniversary - now) / 86400000);
          if(diff >= 0 && diff <= 7) {
            results.push({type:"jubilee", name:u.name, avatar:u.avatar, photo_url:u.photo_url, days:diff,
              label: diff===0 ? `🏆 ${u.name} har ${m}-års jubilæum i dag!` : `🏆 ${u.name} fejrer ${m} år om ${diff} dag${diff!==1?"e":""}`,
              color:"#d97706"});
          }
        }
      });
    }
    // Lærling udlært inden for 14 dage
    if(u.role==="lærling" && u.apprentice_end_date) {
      const ed = new Date(u.apprentice_end_date);
      const diff = Math.round((ed - now) / 86400000);
      if(diff >= 0 && diff <= 14) {
        results.push({type:"apprentice", name:u.name, avatar:u.avatar, photo_url:u.photo_url, days:diff,
          label: diff===0 ? `🎓 ${u.name} er udlært i dag!` : `🎓 ${u.name} er udlært om ${diff} dag${diff!==1?"e":""}`,
          color:"#2e9e5b"});
      }
    }
  });
  return results.sort((a,b) => a.days - b.days);
};

// ─────────────────────────────────────────────
// UI PRIMITIVES
// ─────────────────────────────────────────────
const Av = ({src, initials, size=38, bg="#fcd209"}) => (
  src
    ? <img src={src} alt={initials||"?"} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
    : <div style={{width:size,height:size,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",color:"#000",fontWeight:700,fontSize:size*.34,flexShrink:0}}>{initials||"?"}</div>
);
const Badge = ({label,color}) => (
  <span style={{background:color+"18",color,border:`1px solid ${color}40`,borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{label}</span>
);
const Btn = ({children,onClick,variant="primary",small,accent="#fcd209",style:sx={}}) => (
  <button onClick={onClick} style={{background:variant==="primary"?accent:"transparent",color:variant==="primary"?"#000":accent,border:variant==="primary"?"none":`1.5px solid ${accent}`,borderRadius:8,padding:small?"7px 14px":"10px 20px",fontWeight:600,fontSize:small?12:14,cursor:"pointer",fontFamily:"'Urbanist',sans-serif",...sx}}>{children}</button>
);
const Inp = ({label,...props}) => (
  <div style={{marginBottom:14}}>
    {label&&<label style={{fontSize:11,fontWeight:600,color:"#666",textTransform:"uppercase",letterSpacing:"0.04em",display:"block",marginBottom:5}}>{label}</label>}
    <input {...props} style={{width:"100%",background:"#f8f7f5",border:"1px solid #e0ddd8",borderRadius:8,padding:"10px 14px",fontSize:14,boxSizing:"border-box",outline:"none",fontFamily:"'Urbanist',sans-serif",...props.style}}/>
  </div>
);
const Sel = ({label,children,...props}) => (
  <div style={{marginBottom:14}}>
    {label&&<label style={{fontSize:11,fontWeight:600,color:"#666",textTransform:"uppercase",letterSpacing:"0.04em",display:"block",marginBottom:5}}>{label}</label>}
    <select {...props} style={{width:"100%",background:"#f8f7f5",border:"1px solid #e0ddd8",borderRadius:8,padding:"10px 14px",fontSize:14,boxSizing:"border-box",outline:"none",fontFamily:"'Urbanist',sans-serif"}}>{children}</select>
  </div>
);
const Card = ({children,style:sx={}}) => (
  <div style={{background:"#fff",borderRadius:12,border:"1px solid #ede9e2",padding:22,...sx}}>{children}</div>
);
const STitle = ({children}) => <div style={{fontWeight:700,fontSize:15,color:"#1a1a1a",marginBottom:14}}>{children}</div>;
const Modal = ({title,onClose,children,width=480}) => (
  <div style={{position:"fixed",inset:0,background:"#00000060",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}>
    <div style={{background:"#fff",borderRadius:16,padding:32,width,maxWidth:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px #00000030"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <div style={{fontWeight:700,fontSize:18}}>{title}</div>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#aaa"}}>×</button>
      </div>
      {children}
    </div>
  </div>
);

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
function LoginScreen({settings}) {
  const acc = settings.accentColor;
  return (
    <div style={{minHeight:"100vh",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Urbanist',sans-serif"}}>
      <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse 60% 50% at 50% 0%,${acc}22,transparent)`,pointerEvents:"none"}}/>
      <div style={{width:400,background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:16,padding:40,position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:32}}>
          {settings.logo
            ? <img src={settings.logo} alt="logo" style={{height:44,maxWidth:120,objectFit:"contain",borderRadius:8}}/>
            : <div style={{width:44,height:44,background:acc,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="9,22 9,12 15,12 15,22" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>}
          <div>
            <div style={{color:"#fff",fontWeight:700,fontSize:18}}>{settings.companyName}</div>
            <div style={{color:"#555",fontSize:12}}>ABA Teknik · Intern portal</div>
          </div>
        </div>
        <div style={{color:"#fff",fontWeight:700,fontSize:22,marginBottom:6}}>Log ind</div>
        <div style={{color:"#777",fontSize:13,marginBottom:24}}>Brug din @abateknik.dk konto</div>
        <button onClick={async()=>{ const {error}=await supabase.auth.signInWithOAuth({provider:'azure',options:{scopes:'email profile',redirectTo:window.location.origin}}); if(error) console.error(error); }}
          style={{width:"100%",background:"#fff",color:"#111",border:"none",borderRadius:8,padding:"13px 0",fontWeight:600,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          <svg width="18" height="18" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
          Log ind med Microsoft
        </button>
        <div style={{marginTop:20,color:"#2a2a2a",fontSize:11,textAlign:"center"}}>GDPR-compliant · EU-servere · Krypteret forbindelse</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// IT ADMIN PANEL
// ─────────────────────────────────────────────
function ITAdminPanel({users,setUsers,settings,setSettings,auditLog,setAuditLog,onLogout}) {
  const [tab,setTab]=useState("users");
  const [userModal,setUserModal]=useState(false);
  const [newUser,setNewUser]=useState({name:"",email:"",role:"montør",dept:"",phone:"",title:"",birthdate:"",hire_date:"",apprentice_end_date:""});
  const acc="#1a6be8";

  const addAudit = async (action,detail) => {
    await supabase.from('audit_log').insert({action,detail,performed_by:"it-admin"});
    setAuditLog(l=>[{id:Date.now(),time:new Date().toISOString(),action,detail,by:"it-admin"},...l]);
  };

  return (
    <div style={{minHeight:"100vh",background:"#f0f4ff",fontFamily:"'Urbanist',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <div style={{background:"#1a1a2e",padding:"0 28px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,background:acc,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🛠</div>
          <div><div style={{color:"#fff",fontWeight:700,fontSize:15}}>{settings.companyName} — IT-administration</div><div style={{color:"#555",fontSize:11}}>Kun teknisk adgang · Ingen forretningsdata</div></div>
        </div>
        <button onClick={onLogout} style={{background:"none",border:"1px solid #333",color:"#666",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:13,fontFamily:"'Urbanist',sans-serif"}}>Log ud</button>
      </div>
      <div style={{padding:28,maxWidth:960,margin:"0 auto"}}>
        <div style={{background:"#e8f0fe",border:"1px solid #c0d0f0",borderRadius:10,padding:"12px 16px",marginBottom:24,fontSize:13,color:"#1a4acc",display:"flex",gap:10}}>
          <span>🔒</span><span>IT-admin har adgang til brugeradministration og systemindstillinger. Ingen adgang til forretningsdata — jf. GDPR.</span>
        </div>
        <div style={{display:"flex",gap:4,marginBottom:24,background:"#fff",borderRadius:10,padding:4,border:"1px solid #e0ddd8",width:"fit-content"}}>
          {[{id:"users",label:"👥 Brugere"},{id:"settings",label:"⚙️ Indstillinger"},{id:"audit",label:"📋 Log"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 18px",borderRadius:8,border:"none",background:tab===t.id?acc:"transparent",color:tab===t.id?"#fff":"#666",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Urbanist',sans-serif"}}>{t.label}</button>
          ))}
        </div>

        {tab==="users"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
              <div style={{fontSize:13,color:"#888"}}>{users.length} brugere</div>
              <Btn accent={acc} onClick={()=>setUserModal(true)}>+ Opret bruger</Btn>
            </div>
            <Card>
              {users.map(u=>(
                <div key={u.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:"1px solid #f0ece5",flexWrap:"wrap"}}>
                  <Av src={u.photo_url} initials={u.avatar||"?"} size={36} bg={u.role==="it_admin"?acc:"#aaa"}/>
                  <div style={{flex:1,minWidth:160}}>
                    <div style={{fontWeight:600,fontSize:14}}>{u.name}</div>
                    <div style={{fontSize:12,color:"#888"}}>{u.email} · {u.dept||"—"}{u.phone&&` · 📞 ${u.phone}`}</div>
                    {u.title&&<div style={{fontSize:11,color:"#aaa"}}>{u.title}</div>}
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                    <Badge label={roleLabel(u.role)} color={u.role==="it_admin"?acc:"#888"}/>
                    {u.role!=="it_admin"&&(<>
                      <select value={u.role} onChange={async e=>{ const nr=e.target.value; await supabase.from('users').update({role:nr}).eq('id',u.id); setUsers(us=>us.map(x=>x.id===u.id?{...x,role:nr}:x)); addAudit("Rolle ændret",`${u.email} → ${nr}`); }} style={{fontSize:12,border:"1px solid #e0ddd8",borderRadius:6,padding:"4px 8px",background:"#f8f7f5",cursor:"pointer",fontFamily:"'Urbanist',sans-serif"}}>
                        {Object.keys(ROLE_PERMISSIONS).filter(r=>r!=="it_admin").map(r=><option key={r} value={r}>{roleLabel(r)}</option>)}
                      </select>
                      <select value={u.manager_id||""} onChange={async e=>{ const mgr=e.target.value||null; await supabase.from('users').update({manager_id:mgr}).eq('id',u.id); setUsers(us=>us.map(x=>x.id===u.id?{...x,manager_id:mgr}:x)); addAudit("Leder ændret",`${u.email}`); }} style={{fontSize:12,border:"1px solid #e0ddd8",borderRadius:6,padding:"4px 8px",background:"#f8f7f5",cursor:"pointer",fontFamily:"'Urbanist',sans-serif",maxWidth:140}}>
                        <option value="">— Ingen leder —</option>
                        {users.filter(x=>x.id!==u.id&&x.role!=="it_admin"&&(x.role==="leder"||x.role==="chef"||x.role==="direktør")).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                    </>)}
                    <button onClick={async()=>{ if(window.confirm(`Slet ${u.name}?`)){ await supabase.from('users').delete().eq('id',u.id); setUsers(us=>us.filter(x=>x.id!==u.id)); addAudit("Bruger slettet",u.email); }}} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12,fontFamily:"'Urbanist',sans-serif"}}>Slet</button>
                  </div>
                </div>
              ))}
            </Card>
            {userModal&&(
              <Modal title="Opret ny bruger" onClose={()=>setUserModal(false)} width={560}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <Inp label="Fulde navn" value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})} placeholder="Fornavn Efternavn"/>
                  <Inp label="E-mail" type="email" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} placeholder="navn@abateknik.dk"/>
                  <Inp label="Telefon" type="tel" value={newUser.phone} onChange={e=>setNewUser({...newUser,phone:e.target.value})} placeholder="+45 xx xx xx xx"/>
                  <Inp label="Titel / Stilling" value={newUser.title} onChange={e=>setNewUser({...newUser,title:e.target.value})} placeholder="Fx Elektriker"/>
                  <Inp label="Afdeling" value={newUser.dept} onChange={e=>setNewUser({...newUser,dept:e.target.value})} placeholder="Fx El-afdelingen"/>
                  <Sel label="Rolle" value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})}>
                    {Object.keys(ROLE_PERMISSIONS).map(r=><option key={r} value={r}>{roleLabel(r)}</option>)}
                  </Sel>
                  <Inp label="Fødselsdato" type="date" value={newUser.birthdate} onChange={e=>setNewUser({...newUser,birthdate:e.target.value})}/>
                  <Inp label="Ansættelsesdato" type="date" value={newUser.hire_date} onChange={e=>setNewUser({...newUser,hire_date:e.target.value})}/>
                  {newUser.role==="lærling"&&<Inp label="Udlært dato" type="date" value={newUser.apprentice_end_date} onChange={e=>setNewUser({...newUser,apprentice_end_date:e.target.value})}/>}
                </div>
                <div style={{background:"#e8f0fe",border:"1px solid #c0d0f0",borderRadius:8,padding:10,marginBottom:16,fontSize:12,color:"#1a4acc"}}>ℹ️ Logger ind med @abateknik.dk Microsoft-konto</div>
                <div style={{display:"flex",gap:10}}>
                  <Btn variant="outline" accent="#999" onClick={()=>setUserModal(false)} style={{flex:1}}>Annuller</Btn>
                  <Btn accent={acc} style={{flex:2}} onClick={async()=>{
                    if(!newUser.name||!newUser.email)return;
                    const initials=newUser.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
                    const {data}=await supabase.from('users').insert({
                      name:newUser.name, role:newUser.role, dept:newUser.dept, email:newUser.email,
                      phone:newUser.phone, title:newUser.title, avatar:initials,
                      birthdate:newUser.birthdate||null, hire_date:newUser.hire_date||null,
                      apprentice_end_date:newUser.apprentice_end_date||null
                    }).select().single();
                    if(data) setUsers(u=>[...u,data]);
                    addAudit("Bruger oprettet",newUser.email);
                    setUserModal(false);
                    setNewUser({name:"",email:"",role:"montør",dept:"",phone:"",title:"",birthdate:"",hire_date:"",apprentice_end_date:""});
                  }}>Opret bruger</Btn>
                </div>
              </Modal>
            )}
          </div>
        )}

        {tab==="settings"&&(
          <Card style={{maxWidth:520}}>
            <STitle>Systemindstillinger</STitle>
            <Inp label="Firmanavn" value={settings.companyName} onChange={e=>setSettings({...settings,companyName:e.target.value})}/>
            <div style={{marginBottom:20}}>
              <label style={{fontSize:11,fontWeight:600,color:"#666",textTransform:"uppercase",letterSpacing:"0.04em",display:"block",marginBottom:8}}>Firmalogo</label>
              {settings.logo&&<div style={{marginBottom:10,padding:12,background:"#f8f7f5",borderRadius:8,display:"inline-flex",alignItems:"center",gap:12}}><img src={settings.logo} alt="logo" style={{height:40,maxWidth:120,objectFit:"contain"}}/><button onClick={()=>setSettings({...settings,logo:null})} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12,fontFamily:"'Urbanist',sans-serif"}}>Fjern</button></div>}
              <label style={{background:acc,color:"#000",borderRadius:8,padding:"9px 16px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Urbanist',sans-serif",display:"inline-block"}}>📁 Upload logo<input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{ const file=e.target.files[0]; if(!file)return; const reader=new FileReader(); reader.onload=ev=>setSettings({...settings,logo:ev.target.result}); reader.readAsDataURL(file); }}/></label>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{fontSize:11,fontWeight:600,color:"#666",textTransform:"uppercase",letterSpacing:"0.04em",display:"block",marginBottom:8}}>Accent-farve</label>
              <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                <input type="color" value={settings.accentColor} onChange={e=>setSettings({...settings,accentColor:e.target.value})} style={{width:44,height:36,border:"1px solid #e0ddd8",borderRadius:8,cursor:"pointer",padding:2}}/>
                <div style={{display:"flex",gap:6}}>{["#fcd209","#e8521a","#1a6be8","#2e9e5b","#7c3aed","#111111"].map(c=><button key={c} onClick={()=>setSettings({...settings,accentColor:c})} style={{width:26,height:26,borderRadius:"50%",background:c,border:settings.accentColor===c?"3px solid #333":"2px solid transparent",cursor:"pointer"}}/>)}</div>
              </div>
            </div>
            <Btn accent={acc} style={{width:"100%"}} onClick={async()=>{ await supabase.from('settings').update({company_name:settings.companyName,accent_color:settings.accentColor,logo_url:settings.logo}).eq('id',1); alert("✓ Gemt"); }}>💾 Gem indstillinger</Btn>
          </Card>
        )}

        {tab==="audit"&&(
          <Card><STitle>Adgangslog</STitle>
            {auditLog.map(l=>(
              <div key={l.id} style={{display:"flex",gap:14,padding:"10px 0",borderBottom:"1px solid #f0ece5"}}>
                <div style={{fontSize:11,color:"#aaa",minWidth:130}}>{fmt(l.time||l.created_at)}</div>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{l.action}</div><div style={{fontSize:12,color:"#888"}}>{l.detail}</div></div>
                <div style={{fontSize:11,color:"#aaa"}}>{l.by||l.performed_by}</div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BESKEDER — iMessage chat-stil
// ─────────────────────────────────────────────
function MessagesPage({user, users, messages, setMessages, acc, pushNotif, showToast, initialRecipient, onClearRecipient}) {
  const [selectedThread, setSelectedThread] = useState(null);
  const [newMsg, setNewMsg] = useState("");
  const [newMsgModal, setNewMsgModal] = useState(!!initialRecipient);
  const [newRecipient, setNewRecipient] = useState(initialRecipient?.id||"");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const bottomRef = useRef(null);

  useEffect(()=>{ if(initialRecipient){setNewMsgModal(true);setNewRecipient(initialRecipient.id);} },[initialRecipient]);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[selectedThread, messages]);

  const getThreadKey = (m) => [m.from_id, m.to_id].sort().join("|") + "|" + (m.subject||"");

  const threadMap = {};
  messages.forEach(m => {
    const key = getThreadKey(m);
    if(!threadMap[key]) threadMap[key]=[];
    threadMap[key].push(m);
  });

  const threads = Object.values(threadMap).map(msgs => {
    const sorted = [...msgs].sort((a,b)=>new Date(a.created_at||a.time)-new Date(b.created_at||b.time));
    const last = sorted[sorted.length-1];
    const otherUserId = last.from_id===user.id ? last.to_id : last.from_id;
    const otherUser = users.find(u=>u.id===otherUserId);
    const unread = msgs.filter(m=>m.to_id===user.id&&!m.read).length;
    return {key:getThreadKey(last), msgs:sorted, last, otherUser, unread, subject:last.subject};
  }).sort((a,b)=>new Date(b.last.created_at||b.last.time)-new Date(a.last.created_at||a.last.time));

  const activeThread = selectedThread ? threads.find(t=>t.key===selectedThread) : null;

  const sendMessage = async (toId, subject, body) => {
    if(!toId||!body.trim()) return;
    const {data}=await supabase.from('messages').insert({from_id:user.id,to_id:toId,subject:subject||"Besked",body:body.trim(),read:false}).select().single();
    if(data){
      setMessages(m=>[{...data,fromId:data.from_id,toId:data.to_id,time:data.created_at},...m]);
      await pushNotif(toId,`Ny besked fra ${user.name}: ${subject||"Besked"}`,"info");
      showToast("✓ Besked sendt");
    }
  };

  const sendReply = async () => {
    if(!activeThread||!newMsg.trim()) return;
    await sendMessage(activeThread.otherUser?.id, activeThread.subject, newMsg);
    setNewMsg("");
  };

  const markRead = async (msgs) => {
    const ids=msgs.filter(m=>m.to_id===user.id&&!m.read).map(m=>m.id);
    if(!ids.length) return;
    await supabase.from('messages').update({read:true}).in('id',ids);
    setMessages(ms=>ms.map(x=>ids.includes(x.id)?{...x,read:true}:x));
  };

  return (
    <div style={{display:"flex",height:"calc(100vh - 56px)",fontFamily:"'Urbanist',sans-serif"}}>
      {/* Tråd-liste */}
      <div style={{width:300,borderRight:"1px solid #ede9e2",display:"flex",flexDirection:"column",background:"#fff",flexShrink:0}}>
        <div style={{padding:"14px 16px",borderBottom:"1px solid #ede9e2",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:700,fontSize:15}}>Beskeder</div>
          <button onClick={()=>{setNewMsgModal(true);setNewRecipient("");setNewSubject("");setNewBody("");onClearRecipient?.();}} style={{background:acc,color:"#000",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"'Urbanist',sans-serif"}}>✉ Ny</button>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {threads.length===0&&<div style={{padding:24,textAlign:"center",color:"#aaa",fontSize:13}}>Ingen beskeder endnu</div>}
          {threads.map(t=>(
            <div key={t.key} onClick={async()=>{setSelectedThread(t.key);await markRead(t.msgs);}}
              style={{padding:"12px 16px",borderBottom:"1px solid #f5f2ed",cursor:"pointer",background:selectedThread===t.key?acc+"14":"#fff",display:"flex",gap:12,alignItems:"center"}}>
              <Av src={t.otherUser?.photo_url} initials={t.otherUser?.avatar||"?"} size={42} bg={t.unread>0?acc:"#aaa"}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{fontSize:14,fontWeight:t.unread>0?700:500}}>{t.otherUser?.name||"Ukendt"}</span>
                  <span style={{fontSize:11,color:"#aaa"}}>{fmtShort(t.last.created_at||t.last.time)}</span>
                </div>
                <div style={{fontSize:12,color:"#888",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontWeight:t.unread>0?600:400}}>{t.subject}</div>
                <div style={{fontSize:11,color:"#aaa",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.last.body}</div>
              </div>
              {t.unread>0&&<div style={{width:18,height:18,borderRadius:"50%",background:acc,color:"#000",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{t.unread}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Chat-visning */}
      <div style={{flex:1,display:"flex",flexDirection:"column",background:"#f5f2ed"}}>
        {activeThread ? (<>
          <div style={{background:"#fff",borderBottom:"1px solid #ede9e2",padding:"12px 20px",display:"flex",alignItems:"center",gap:12}}>
            <Av src={activeThread.otherUser?.photo_url} initials={activeThread.otherUser?.avatar||"?"} size={38}/>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>{activeThread.otherUser?.name}</div>
              <div style={{fontSize:12,color:"#888"}}>{roleLabel(activeThread.otherUser?.role)} · {activeThread.subject}</div>
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:10}}>
            {activeThread.msgs.map((m,i)=>{
              const isMine = m.from_id===user.id;
              return(
                <div key={m.id||i} style={{display:"flex",flexDirection:"column",alignItems:isMine?"flex-end":"flex-start"}}>
                  <div style={{maxWidth:"68%",background:isMine?acc:"#fff",color:"#000",borderRadius:isMine?"18px 18px 4px 18px":"18px 18px 18px 4px",padding:"10px 14px",boxShadow:"0 1px 4px #00000012",fontSize:14,lineHeight:1.5}}>{m.body}</div>
                  <div style={{fontSize:10,color:"#aaa",marginTop:3,padding:"0 4px"}}>{fmtTime(m.created_at||m.time)}</div>
                </div>
              );
            })}
            <div ref={bottomRef}/>
          </div>
          <div style={{background:"#fff",borderTop:"1px solid #ede9e2",padding:"12px 20px",display:"flex",gap:10,alignItems:"flex-end"}}>
            <textarea value={newMsg} onChange={e=>setNewMsg(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendReply();}}}
              placeholder="Skriv en besked..." rows={2}
              style={{flex:1,background:"#f8f7f5",border:"1px solid #e0ddd8",borderRadius:12,padding:"10px 14px",fontSize:14,outline:"none",fontFamily:"'Urbanist',sans-serif",resize:"none"}}/>
            <button onClick={sendReply} style={{background:acc,color:"#000",border:"none",borderRadius:12,padding:"10px 18px",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"'Urbanist',sans-serif"}}>Send ↑</button>
          </div>
        </>) : (
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:"#aaa"}}>
            <div style={{fontSize:48}}>💬</div>
            <div style={{fontSize:14}}>Vælg en samtale eller start en ny</div>
            <button onClick={()=>setNewMsgModal(true)} style={{background:acc,color:"#000",border:"none",borderRadius:10,padding:"10px 20px",cursor:"pointer",fontWeight:600,fontSize:14,fontFamily:"'Urbanist',sans-serif",marginTop:8}}>✉ Ny besked</button>
          </div>
        )}
      </div>

      {newMsgModal&&(
        <Modal title="Ny besked" onClose={()=>{setNewMsgModal(false);onClearRecipient?.();}}>
          <Sel label="Til" value={newRecipient} onChange={e=>setNewRecipient(e.target.value)}>
            <option value="">— Vælg modtager —</option>
            {users.filter(u=>u.id!==user.id&&u.role!=="it_admin").map(u=><option key={u.id} value={u.id}>{u.name} ({roleLabel(u.role)})</option>)}
          </Sel>
          <Inp label="Emne" value={newSubject} onChange={e=>setNewSubject(e.target.value)} placeholder="Hvad handler det om?"/>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:600,color:"#666",textTransform:"uppercase",letterSpacing:"0.04em",display:"block",marginBottom:5}}>Besked</label>
            <textarea value={newBody} onChange={e=>setNewBody(e.target.value)} rows={5} placeholder="Skriv din besked her..." style={{width:"100%",background:"#f8f7f5",border:"1px solid #e0ddd8",borderRadius:8,padding:"10px 14px",fontSize:14,boxSizing:"border-box",outline:"none",fontFamily:"'Urbanist',sans-serif",resize:"vertical"}}/>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn variant="outline" accent="#999" onClick={()=>{setNewMsgModal(false);onClearRecipient?.();}} style={{flex:1}}>Annuller</Btn>
            <Btn accent={acc} style={{flex:2}} onClick={async()=>{
              if(!newRecipient||!newBody.trim()) return;
              await sendMessage(newRecipient, newSubject||"Besked", newBody);
              setNewMsgModal(false); setNewRecipient(""); setNewSubject(""); setNewBody(""); onClearRecipient?.();
            }}>Send besked ↑</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// KOLLEGAER — telefonbog for alle + hierarki for chef/direktør
// ─────────────────────────────────────────────
function ColleaguesPage({users, user, acc, setUsers, showToast, onCompose}) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list");
  const [editingManager, setEditingManager] = useState(null);
  const [newUserModal, setNewUserModal] = useState(false);
  const [newUser, setNewUser] = useState({name:"",email:"",role:"montør",dept:"",phone:"",title:"",birthdate:"",hire_date:"",apprentice_end_date:""});

  const allStaff = users.filter(u=>u.role!=="it_admin");
  const filtered = search ? allStaff.filter(u=>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.dept?.toLowerCase().includes(search.toLowerCase()) ||
    u.title?.toLowerCase().includes(search.toLowerCase())
  ) : allStaff;

  const canManage = can(user,"createUsers");
  const roleColors = {lærling:"#f59e0b",montør:"#888",leder:acc,chef:"#7c3aed",direktør:"#dc2626"};
  const topLevel = allStaff.filter(u=>!u.manager_id);
  const getChildren = (pid) => allStaff.filter(u=>u.manager_id===pid);

  const updateManager = async (empId, managerId) => {
    await supabase.from('users').update({manager_id:managerId||null}).eq('id',empId);
    setUsers(us=>us.map(u=>u.id===empId?{...u,manager_id:managerId||null}:u));
    setEditingManager(null); showToast("✓ Leder opdateret");
  };

  const deleteUser = async (u) => {
    if(!window.confirm(`Slet ${u.name}?`)) return;
    await supabase.from('users').delete().eq('id',u.id);
    setUsers(us=>us.filter(x=>x.id!==u.id)); showToast("Bruger slettet");
  };

  const createUser = async () => {
    if(!newUser.name||!newUser.email) return;
    const initials=newUser.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
    const {data}=await supabase.from('users').insert({
      name:newUser.name, role:newUser.role, dept:newUser.dept, email:newUser.email,
      phone:newUser.phone, title:newUser.title, avatar:initials,
      birthdate:newUser.birthdate||null, hire_date:newUser.hire_date||null,
      apprentice_end_date:newUser.apprentice_end_date||null
    }).select().single();
    if(data) setUsers(u=>[...u,data]);
    setNewUserModal(false);
    setNewUser({name:"",email:"",role:"montør",dept:"",phone:"",title:"",birthdate:"",hire_date:"",apprentice_end_date:""});
    showToast("✓ Bruger oprettet");
  };

  const printAll = () => {
    const w=window.open('','_blank');
    w.document.write(`<html><head><title>Kontaktliste – ABA Teknik ApS</title>
    <style>body{font-family:Arial,sans-serif;padding:24px}h2{font-size:16px;margin-bottom:4px}p{color:#888;font-size:11px;margin-bottom:20px}.row{display:flex;gap:14px;padding:10px 0;border-bottom:1px solid #eee}.av{width:40px;height:40px;border-radius:50%;background:#fcd209;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0}.name{font-weight:700;font-size:13px}.sub{color:#888;font-size:11px;margin-top:2px}</style>
    </head><body>
    <h2>Kontaktliste – ABA Teknik ApS</h2>
    <p>Udskrevet ${new Date().toLocaleDateString("da-DK")} · ${allStaff.length} medarbejdere</p>
    ${allStaff.sort((a,b)=>a.name.localeCompare(b.name)).map(u=>`
      <div class="row"><div class="av">${u.avatar||"?"}</div><div>
        <div class="name">${u.name}${u.title?` · ${u.title}`:""}</div>
        <div class="sub">${roleLabel(u.role)} · ${u.dept||"—"}</div>
        <div class="sub">✉ ${u.email}${u.phone?` · 📞 ${u.phone}`:""}</div>
      </div></div>`).join("")}
    <script>window.print();</script></body></html>`);
    w.document.close();
  };

  const HierarchyNode = ({emp, depth=0}) => {
    const children = getChildren(emp.id);
    const isMe = emp.id===user.id;
    return(
      <div style={{marginLeft:depth*24}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",background:isMe?acc+"14":"#fff",border:`1px solid ${isMe?acc:"#ede9e2"}`,borderRadius:10,marginBottom:6,flexWrap:"wrap"}}>
          {depth>0&&<div style={{width:16,height:2,background:"#e0ddd8",flexShrink:0}}/>}
          <Av src={emp.photo_url} initials={emp.avatar||"?"} size={36} bg={roleColors[emp.role]||"#888"}/>
          <div style={{flex:1,minWidth:150}}>
            <div style={{fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:6}}>{emp.name}{isMe&&<span style={{fontSize:10,background:acc,color:"#000",borderRadius:4,padding:"1px 6px",fontWeight:700}}>DIG</span>}</div>
            <div style={{fontSize:11,color:"#888"}}>{emp.title||roleLabel(emp.role)} · {emp.dept||"—"}</div>
            {emp.phone&&<div style={{fontSize:11,color:"#2e9e5b"}}>📞 {emp.phone}</div>}
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <a href={`mailto:${emp.email}`} style={{fontSize:11,color:"#1a6be8",textDecoration:"none"}}>{emp.email}</a>
            {emp.id!==user.id&&<button onClick={()=>onCompose(emp)} style={{background:acc+"18",color:"#333",border:`1px solid ${acc}40`,borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11,fontFamily:"'Urbanist',sans-serif"}}>✉</button>}
            {canManage&&!isMe&&(emp.role==="montør"||emp.role==="leder"||emp.role==="lærling")&&(
              editingManager===emp.id ? (
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <select defaultValue={emp.manager_id||""} id={`mgr-${emp.id}`} style={{fontSize:11,border:"1px solid #e0ddd8",borderRadius:6,padding:"3px 8px",background:"#f8f7f5",fontFamily:"'Urbanist',sans-serif"}}>
                    <option value="">— Ingen leder —</option>
                    {allStaff.filter(u=>u.id!==emp.id&&(u.role==="leder"||u.role==="chef"||u.role==="direktør")).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <button onClick={()=>{const sel=document.getElementById(`mgr-${emp.id}`);updateManager(emp.id,sel.value||null);}} style={{background:"#2e9e5b",color:"#fff",border:"none",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11,fontFamily:"'Urbanist',sans-serif"}}>Gem</button>
                  <button onClick={()=>setEditingManager(null)} style={{background:"#f0ece5",color:"#888",border:"none",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11,fontFamily:"'Urbanist',sans-serif"}}>✕</button>
                </div>
              ) : <button onClick={()=>setEditingManager(emp.id)} style={{background:"#f8f7f5",color:"#666",border:"1px solid #e0ddd8",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11,fontFamily:"'Urbanist',sans-serif"}}>✏</button>
            )}
            {canManage&&!isMe&&<button onClick={()=>deleteUser(emp)} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11,fontFamily:"'Urbanist',sans-serif"}}>🗑</button>}
          </div>
        </div>
        {children.map(child=><HierarchyNode key={child.id} emp={child} depth={depth+1}/>)}
      </div>
    );
  };

  return(
    <div style={{padding:24}}>
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",gap:4,background:"#fff",borderRadius:10,padding:4,border:"1px solid #e0ddd8"}}>
          {[{id:"list",label:"👥 Liste"},{id:"hierarchy",label:"🏗 Hierarki"}].map(t=>(
            <button key={t.id} onClick={()=>setView(t.id)} style={{padding:"8px 18px",borderRadius:8,border:"none",background:view===t.id?acc:"transparent",color:view===t.id?"#000":"#666",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Urbanist',sans-serif"}}>{t.label}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {canManage&&<Btn small accent={acc} onClick={()=>setNewUserModal(true)}>+ Opret</Btn>}
          <Btn small accent={acc} variant="outline" onClick={printAll}>🖨 Print kontaktliste</Btn>
        </div>
      </div>

      <div style={{marginBottom:16,maxWidth:380}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Søg navn, afdeling eller stilling..." style={{width:"100%",background:"#fff",border:"1px solid #e0ddd8",borderRadius:8,padding:"10px 14px",fontSize:14,boxSizing:"border-box",outline:"none",fontFamily:"'Urbanist',sans-serif"}}/>
      </div>

      {view==="hierarchy"&&!search&&(
        <div>
          {topLevel.map(emp=><HierarchyNode key={emp.id} emp={emp} depth={0}/>)}
          {allStaff.filter(u=>u.manager_id&&!allStaff.find(x=>x.id===u.manager_id)).map(emp=>(
            <div key={emp.id}><div style={{fontSize:11,color:"#aaa",marginBottom:4}}>⚠️ Mangler leder</div><HierarchyNode emp={emp} depth={0}/></div>
          ))}
        </div>
      )}

      {(view==="list"||search)&&(
        <div style={{display:"grid",gap:10}}>
          {filtered.length===0&&<Card><div style={{textAlign:"center",color:"#aaa",fontSize:13,padding:16}}>Ingen resultater</div></Card>}
          {filtered.map((u,i)=>{
            const mgr=allStaff.find(x=>x.id===u.manager_id);
            const isMe=u.id===user.id;
            const bdDisplay = u.birthdate&&!isMe ? new Date(u.birthdate).toLocaleDateString("da-DK",{day:"numeric",month:"long"}) : null;
            return(
              <div key={u.id||i} style={{background:"#fff",border:"1px solid #ede9e2",borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <Av src={u.photo_url} initials={u.avatar||"?"} size={46} bg={roleColors[u.role]||"#888"}/>
                <div style={{flex:1,minWidth:180}}>
                  <div style={{fontWeight:700,fontSize:14,display:"flex",gap:6,alignItems:"center"}}>{u.name}{isMe&&<span style={{fontSize:10,background:acc,color:"#000",borderRadius:4,padding:"1px 6px",fontWeight:700}}>DIG</span>}</div>
                  <div style={{fontSize:12,color:"#888"}}>{u.title||roleLabel(u.role)} · {u.dept||"—"}</div>
                  <div style={{fontSize:11,color:"#aaa"}}>Leder: {mgr?.name||"—"}</div>
                  {bdDisplay&&<div style={{fontSize:11,color:"#e8521a"}}>🎂 {bdDisplay}</div>}
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <a href={`mailto:${u.email}`} style={{fontSize:12,color:"#1a6be8",textDecoration:"none",background:"#e8f0fe",borderRadius:6,padding:"4px 10px"}}>{u.email}</a>
                  {u.phone&&<a href={`tel:${u.phone}`} style={{fontSize:12,color:"#2e9e5b",textDecoration:"none",background:"#e8f5ee",borderRadius:6,padding:"4px 10px"}}>📞 {u.phone}</a>}
                  {!isMe&&<button onClick={()=>onCompose(u)} style={{background:acc+"18",color:"#333",border:`1px solid ${acc}40`,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12,fontFamily:"'Urbanist',sans-serif"}}>✉ Besked</button>}
                  {canManage&&!isMe&&<button onClick={()=>deleteUser(u)} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12,fontFamily:"'Urbanist',sans-serif"}}>Slet</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {newUserModal&&(
        <Modal title="Opret ny bruger" onClose={()=>setNewUserModal(false)} width={560}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Fulde navn" value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})} placeholder="Fornavn Efternavn"/>
            <Inp label="E-mail" type="email" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} placeholder="navn@abateknik.dk"/>
            <Inp label="Telefon" type="tel" value={newUser.phone} onChange={e=>setNewUser({...newUser,phone:e.target.value})} placeholder="+45 xx xx xx xx"/>
            <Inp label="Titel / Stilling" value={newUser.title} onChange={e=>setNewUser({...newUser,title:e.target.value})} placeholder="Fx Elektriker"/>
            <Inp label="Afdeling" value={newUser.dept} onChange={e=>setNewUser({...newUser,dept:e.target.value})} placeholder="Fx El-afdelingen"/>
            <Sel label="Rolle" value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})}>{["lærling","montør","leder"].map(r=><option key={r} value={r}>{roleLabel(r)}</option>)}</Sel>
            <Inp label="Fødselsdato" type="date" value={newUser.birthdate} onChange={e=>setNewUser({...newUser,birthdate:e.target.value})}/>
            <Inp label="Ansættelsesdato" type="date" value={newUser.hire_date} onChange={e=>setNewUser({...newUser,hire_date:e.target.value})}/>
            {newUser.role==="lærling"&&<Inp label="Udlært dato" type="date" value={newUser.apprentice_end_date} onChange={e=>setNewUser({...newUser,apprentice_end_date:e.target.value})}/>}
          </div>
          <div style={{display:"flex",gap:10,marginTop:4}}>
            <Btn variant="outline" accent="#999" onClick={()=>setNewUserModal(false)} style={{flex:1}}>Annuller</Btn>
            <Btn accent={acc} style={{flex:2}} onClick={createUser}>Opret bruger</Btn>
          </div>
        </Modal>
      )}
      <div style={{marginTop:16,background:"#e8f0fe",border:"1px solid #c0d0f0",borderRadius:10,padding:"12px 16px",fontSize:12,color:"#1a4acc"}}>
        ℹ️ Roller ændres af IT-admin{canManage?" · Chef/Direktør kan oprette og slette brugere":""}
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────
// DOKUMENTER
// ─────────────────────────────────────────────
function DocsPage({user, acc, users, pushNotif, showToast}) {
  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Alle");
  const [docModal, setDocModal] = useState(false);
  const [newDoc, setNewDoc] = useState({title:"",description:"",url:"",category:"Håndbøger"});
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    supabase.from('documents').select('*').order('created_at',{ascending:false}).then(({data})=>{ if(data) setDocs(data); setLoading(false); });
  },[]);

  const filtered = docs.filter(d=>{
    const matchCat = filterCat==="Alle" || d.category===filterCat;
    const matchSearch = !search || d.title?.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const grouped = DOC_CATEGORIES.reduce((a,cat)=>{ a[cat]=filtered.filter(d=>d.category===cat); return a; },{});

  const createDoc = async () => {
    if(!newDoc.title||!newDoc.url) return;
    const {data}=await supabase.from('documents').insert({
      title:newDoc.title, description:newDoc.description, url:newDoc.url,
      category:newDoc.category, created_by:user.id
    }).select().single();
    if(data){
      setDocs(d=>[data,...d]);
      for(const u of users){ if(u.id!==user.id) await pushNotif(u.id,"Nyt dokument: "+newDoc.title,"info"); }
      showToast("✓ Dokument tilføjet");
    }
    setDocModal(false); setNewDoc({title:"",description:"",url:"",category:"Håndbøger"});
  };

  const deleteDoc = async (doc) => {
    if(!window.confirm(`Slet "${doc.title}"?`)) return;
    await supabase.from('documents').delete().eq('id',doc.id);
    setDocs(d=>d.filter(x=>x.id!==doc.id)); showToast("Dokument slettet");
  };

  return(
    <div style={{padding:24}}>
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {["Alle",...DOC_CATEGORIES].map(c=>(
            <button key={c} onClick={()=>setFilterCat(c)} style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${filterCat===c?docCatColor(c):"#e0ddd8"}`,background:filterCat===c?docCatColor(c)+"18":"#fff",color:filterCat===c?docCatColor(c):"#666",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Urbanist',sans-serif"}}>
              {c==="Alle"?"📋 Alle":docCatIcon(c)+" "+c}
            </button>
          ))}
        </div>
        {can(user,"createDocs")&&<Btn accent={acc} onClick={()=>setDocModal(true)}>+ Tilføj dokument</Btn>}
      </div>

      <div style={{marginBottom:20,maxWidth:400}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Søg i dokumenter..." style={{width:"100%",background:"#fff",border:"1px solid #e0ddd8",borderRadius:8,padding:"10px 14px",fontSize:14,boxSizing:"border-box",outline:"none",fontFamily:"'Urbanist',sans-serif"}}/>
      </div>

      {loading&&<div style={{textAlign:"center",color:"#aaa",padding:32}}>Henter dokumenter...</div>}
      {!loading&&filtered.length===0&&<Card><div style={{textAlign:"center",color:"#aaa",padding:32}}>{docs.length===0?"Ingen dokumenter endnu — tilføj det første!":"Ingen resultater"}</div></Card>}

      {!loading&&DOC_CATEGORIES.map(cat=>{
        const catDocs = grouped[cat];
        if(!catDocs||catDocs.length===0) return null;
        return(
          <div key={cat} style={{marginBottom:28}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{width:32,height:32,borderRadius:8,background:docCatColor(cat)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{docCatIcon(cat)}</div>
              <div style={{fontWeight:700,fontSize:16}}>{cat}</div>
              <div style={{fontSize:12,color:"#aaa",background:"#f8f7f5",borderRadius:10,padding:"2px 8px"}}>{catDocs.length}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
              {catDocs.map((doc,i)=>{
                const creator = users.find(u=>u.id===doc.created_by);
                return(
                  <div key={doc.id||i} style={{background:"#fff",border:`1.5px solid ${docCatColor(cat)}30`,borderRadius:12,padding:18,display:"flex",flexDirection:"column",gap:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                      <div style={{fontWeight:700,fontSize:14,flex:1}}>{doc.title}</div>
                      <Badge label={cat} color={docCatColor(cat)}/>
                    </div>
                    {doc.description&&<div style={{fontSize:13,color:"#666",lineHeight:1.5}}>{doc.description}</div>}
                    <div style={{fontSize:11,color:"#aaa"}}>{creator?.name||"—"} · {fmt(doc.created_at)}</div>
                    <div style={{display:"flex",gap:8,marginTop:4}}>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer"
                        style={{flex:1,background:docCatColor(cat)+"18",color:docCatColor(cat),border:`1px solid ${docCatColor(cat)}40`,borderRadius:8,padding:"8px 14px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Urbanist',sans-serif",textDecoration:"none",textAlign:"center",display:"block"}}>
                        🔗 Åbn i SharePoint
                      </a>
                      {can(user,"deleteDocs")&&<button onClick={()=>deleteDoc(doc)} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:8,padding:"8px 12px",cursor:"pointer",fontSize:13,fontFamily:"'Urbanist',sans-serif"}}>🗑</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {docModal&&(
        <Modal title="Tilføj dokument" onClose={()=>setDocModal(false)}>
          <Inp label="Titel" value={newDoc.title} onChange={e=>setNewDoc({...newDoc,title:e.target.value})} placeholder="Fx Brandprocedure 2024"/>
          <Sel label="Kategori" value={newDoc.category} onChange={e=>setNewDoc({...newDoc,category:e.target.value})}>{DOC_CATEGORIES.map(c=><option key={c}>{c}</option>)}</Sel>
          <Inp label="SharePoint / OneDrive URL" value={newDoc.url} onChange={e=>setNewDoc({...newDoc,url:e.target.value})} placeholder="https://abateknik.sharepoint.com/..."/>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:600,color:"#666",textTransform:"uppercase",letterSpacing:"0.04em",display:"block",marginBottom:5}}>Beskrivelse (valgfri)</label>
            <textarea value={newDoc.description} onChange={e=>setNewDoc({...newDoc,description:e.target.value})} rows={3} placeholder="Kort beskrivelse..." style={{width:"100%",background:"#f8f7f5",border:"1px solid #e0ddd8",borderRadius:8,padding:"10px 14px",fontSize:14,boxSizing:"border-box",outline:"none",fontFamily:"'Urbanist',sans-serif",resize:"vertical"}}/>
          </div>
          <div style={{background:"#f0f7ff",border:"1px solid #c0d8f0",borderRadius:8,padding:10,marginBottom:16,fontSize:12,color:"#1a6be8"}}>🔗 Gemmes som link til SharePoint/OneDrive · Alle notificeres</div>
          <div style={{display:"flex",gap:10}}>
            <Btn variant="outline" accent="#999" onClick={()=>setDocModal(false)} style={{flex:1}}>Annuller</Btn>
            <Btn accent={acc} style={{flex:2}} onClick={createDoc}>Tilføj & notificer alle</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// OPFØLGNING
// ─────────────────────────────────────────────
function FollowupPage({users, absence, user, acc}) {
  const [filterType, setFilterType] = useState("Sygdom");
  const [sortBy, setSortBy] = useState("dage");
  const [period, setPeriod] = useState("ytd");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personFilter, setPersonFilter] = useState("Alle");

  const FILTER_TYPES = [
    {id:"Sygdom",label:"🤒 Sygdom",color:"#dc2626"},
    {id:"Barn syg",label:"👶 Barn syg",color:"#d97706"},
    {id:"Ferie",label:"🌴 Ferie",color:"#2e9e5b"},
    {id:"Kursus",label:"📚 Kursus",color:"#7c3aed"},
    {id:"Afspadsering",label:"⏰ Afspadsering",color:"#1a6be8"},
    {id:"Alle",label:"📋 Alt fravær",color:"#555"},
  ];
  const typeColors = {"Sygdom":"#dc2626","Barn syg":"#d97706","Ferie":"#2e9e5b","Kursus":"#7c3aed","Afspadsering":"#1a6be8","Andet":"#888"};
  const pf = (dateStr,p) => {
    const d=new Date(dateStr),now=new Date();
    if(p==="12md"){const y=new Date(now);y.setMonth(y.getMonth()-12);return d>=y;}
    if(p==="ytd") return d.getFullYear()===now.getFullYear();
    if(p==="q")   {const q=new Date(now);q.setMonth(q.getMonth()-3);return d>=q;}
    if(p==="1md") {const m=new Date(now);m.setMonth(m.getMonth()-1);return d>=m;}
    return true;
  };

  const myTeam = users.filter(u=>u.role!=="it_admin"&&(can(user,"viewFollowupAll")?true:u.manager_id===user.id));
  const stats = myTeam.map(emp=>{
    const ea = absence.filter(a=>a.user_id===emp.id&&pf(a.from_date||a.from,period)&&(filterType==="Alle"||a.type===filterType));
    const totalDays = ea.reduce((s,a)=>s+a.days,0);
    const occurrences = ea.length;
    const lastDate = ea.length>0 ? [...ea].sort((a,b)=>new Date(b.from_date||b.from)-new Date(a.from_date||a.from))[0].from_date||ea[0].from : null;
    const byType = ["Sygdom","Barn syg","Ferie","Kursus","Afspadsering","Andet"].map(t=>({
      type:t, days:absence.filter(a=>a.user_id===emp.id&&a.type===t&&pf(a.from_date||a.from,period)).reduce((s,a)=>s+a.days,0)
    })).filter(x=>x.days>0);
    return {...emp, totalDays, occurrences, lastDate, byType, absenceList:ea};
  });

  const sorted = [...stats].sort((a,b)=>sortBy==="dage"?b.totalDays-a.totalDays:sortBy==="antal"?b.occurrences-a.occurrences:a.name.localeCompare(b.name));
  const totalDaysAll = sorted.reduce((s,e)=>s+e.totalDays,0);
  const periodOptions = [{id:"1md",label:"Seneste mdr"},{id:"q",label:"Kvartal"},{id:"ytd",label:"ÅTD"},{id:"12md",label:"12 mdr"}];

  return(
    <div style={{padding:24}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20,alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{FILTER_TYPES.map(f=><button key={f.id} onClick={()=>setFilterType(f.id)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${filterType===f.id?f.color:"#e0ddd8"}`,background:filterType===f.id?f.color+"18":"#fff",color:filterType===f.id?f.color:"#666",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Urbanist',sans-serif"}}>{f.label}</button>)}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{periodOptions.map(p=><button key={p.id} onClick={()=>setPeriod(p.id)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${period===p.id?acc:"#e0ddd8"}`,background:period===p.id?acc+"14":"#fff",color:period===p.id?acc:"#666",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Urbanist',sans-serif"}}>{p.label}</button>)}</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12,marginBottom:24}}>
        {[{label:"Medarbejdere",val:myTeam.length,icon:"👥"},{label:`${filterType==="Alle"?"Total":filterType} dage`,val:totalDaysAll,icon:"📅"},{label:"Med fravær",val:sorted.filter(e=>e.totalDays>0).length,icon:"⚠️"},{label:"Snit/person",val:myTeam.length>0?Math.round(totalDaysAll/myTeam.length*10)/10:0,icon:"📊"}].map((s,i)=>(
          <div key={i} style={{background:"#fff",border:"1px solid #ede9e2",borderRadius:10,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontSize:22}}>{s.icon}</div>
            <div><div style={{fontSize:22,fontWeight:800}}>{s.val}</div><div style={{fontSize:11,color:"#999"}}>{s.label}</div></div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:16}}>
        <span style={{fontSize:13,color:"#888"}}>Sortér:</span>
        {[{id:"dage",label:"Flest dage"},{id:"antal",label:"Flest tilfælde"},{id:"navn",label:"Navn A-Z"}].map(s=><button key={s.id} onClick={()=>setSortBy(s.id)} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${sortBy===s.id?acc:"#e0ddd8"}`,background:sortBy===s.id?acc+"14":"#fff",color:sortBy===s.id?acc:"#666",fontSize:12,cursor:"pointer",fontFamily:"'Urbanist',sans-serif"}}>{s.label}</button>)}
      </div>

      {selectedPerson&&(()=>{
        const emp = sorted.find(e=>e.id===selectedPerson);
        if(!emp) return null;
        const allPA = absence.filter(a=>a.user_id===emp.id&&pf(a.from_date||a.from,period));
        const filtPA = personFilter==="Alle" ? allPA : allPA.filter(a=>a.type===personFilter);
        return(
          <div style={{background:"#fff",border:`2px solid ${acc}`,borderRadius:12,marginBottom:20,overflow:"hidden"}}>
            <div style={{background:acc+"18",padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <Av src={emp.photo_url} initials={emp.avatar||"?"} size={44} bg={acc}/>
                <div><div style={{fontWeight:700,fontSize:16}}>{emp.name}</div><div style={{fontSize:12,color:"#666"}}>{emp.dept||"—"} · {emp.email}</div></div>
              </div>
              <button onClick={()=>setSelectedPerson(null)} style={{background:"none",border:"1px solid #ccc",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:13,fontFamily:"'Urbanist',sans-serif"}}>✕ Luk</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,padding:"16px 20px",borderBottom:"1px solid #f0ece5"}}>
              {emp.byType.map((t,j)=><div key={j} style={{background:typeColors[t.type]+"12",border:`1px solid ${typeColors[t.type]}30`,borderRadius:8,padding:"10px 14px"}}><div style={{fontSize:18,fontWeight:800,color:typeColors[t.type]}}>{t.days}</div><div style={{fontSize:11,color:"#666"}}>{t.type} dage</div></div>)}
              {emp.byType.length===0&&<div style={{color:"#aaa",fontSize:13}}>Ingen fravær</div>}
            </div>
            <div style={{padding:"12px 20px",borderBottom:"1px solid #f0ece5",display:"flex",gap:6,flexWrap:"wrap"}}>
              {["Alle","Sygdom","Barn syg","Ferie","Kursus","Afspadsering","Andet"].map(t=><button key={t} onClick={()=>setPersonFilter(t)} style={{padding:"5px 12px",borderRadius:16,border:`1px solid ${personFilter===t?(typeColors[t]||acc):"#e0ddd8"}`,background:personFilter===t?(typeColors[t]||acc)+"18":"#fff",color:personFilter===t?(typeColors[t]||acc):"#666",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Urbanist',sans-serif"}}>{t}</button>)}
            </div>
            <div style={{padding:"12px 20px"}}>
              {filtPA.length===0&&<div style={{color:"#aaa",fontSize:13,padding:"8px 0"}}>Ingen poster</div>}
              {[...filtPA].sort((a,b)=>new Date(b.from_date||b.from)-new Date(a.from_date||a.from)).map((a,j)=>(
                <div key={j} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #f8f5f0"}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:typeColors[a.type]||"#888",flexShrink:0}}/>
                  <div style={{flex:1}}><span style={{fontWeight:600,fontSize:13,color:typeColors[a.type]||"#333"}}>{a.type}</span>{a.note&&<span style={{fontSize:12,color:"#aaa",marginLeft:8}}>{a.note}</span>}</div>
                  <div style={{fontSize:12,color:"#888"}}>{fmtShort(a.from_date||a.from)} – {fmtShort(a.to_date||a.to)}</div>
                  <div style={{fontWeight:700,fontSize:13,minWidth:50,textAlign:"right"}}>{a.days} dag{a.days!==1?"e":""}</div>
                  <Badge label={a.status} color={statColor(a.status)}/>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div style={{background:"#fff",border:"1px solid #ede9e2",borderRadius:12,overflow:"hidden"}}>
        {sorted.length===0&&<div style={{padding:32,textAlign:"center",color:"#aaa",fontSize:14}}>Ingen medarbejdere</div>}
        {sorted.map((emp,i)=>{
          const isSel = selectedPerson===emp.id;
          return(
            <div key={emp.id||i} style={{borderBottom:"1px solid #f0ece5",background:isSel?acc+"08":"#fff"}}>
              <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px",cursor:"pointer"}} onClick={()=>setSelectedPerson(isSel?null:emp.id)}>
                <Av src={emp.photo_url} initials={emp.avatar||"?"} size={40} bg={acc+"18"}/>
                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{emp.name}</div><div style={{fontSize:11,color:"#aaa"}}>{emp.dept||"—"} · {roleLabel(emp.role)}</div></div>
                <div style={{display:"flex",gap:20,alignItems:"center"}}>
                  <div style={{textAlign:"center"}}><div style={{fontSize:20,fontWeight:800,color:emp.totalDays>10?"#dc2626":emp.totalDays>5?"#d97706":"#1a1a1a"}}>{emp.totalDays}</div><div style={{fontSize:10,color:"#aaa"}}>dage</div></div>
                  <div style={{textAlign:"center"}}><div style={{fontSize:20,fontWeight:800}}>{emp.occurrences}</div><div style={{fontSize:10,color:"#aaa"}}>tilfælde</div></div>
                  <div style={{textAlign:"right",minWidth:80}}><div style={{fontSize:11,color:"#aaa"}}>Senest</div><div style={{fontSize:12,fontWeight:500}}>{emp.lastDate?fmtShort(emp.lastDate):"—"}</div></div>
                </div>
                {emp.totalDays>0&&<div style={{width:120,display:"flex",gap:2,alignItems:"flex-end",height:28,flexShrink:0}}>{emp.byType.map((t,j)=>{const pct=Math.max(4,Math.round(t.days/emp.totalDays*100));return<div key={j} title={`${t.type}: ${t.days}`} style={{flex:pct,background:typeColors[t.type]||"#888",borderRadius:3,minWidth:4,height:"100%"}}/>;})}</div>}
                <div style={{fontSize:16,color:"#aaa"}}>{isSel?"▲":"▼"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PROFIL TELEFON EDITOR
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// FRAVÆR & FERIE SIDE
// ─────────────────────────────────────────────
function AbsencePage({user, users, acc, visibleAbsence, can, approveItem, rejectItem, setAbsenceModal, fmt}) {
  const [tab, setTab] = useState("afventer");
  const tabs = [
    {id:"afventer", label:"⏳ Afventer",  color:"#d97706"},
    {id:"godkendt", label:"✅ Godkendt",  color:"#2e9e5b"},
    {id:"afvist",   label:"❌ Afvist",    color:"#dc2626"},
    {id:"alle",     label:"📋 Alle",      color:"#888"},
  ];
  const filtered = tab==="alle" ? visibleAbsence : visibleAbsence.filter(a=>a.status?.toLowerCase()===tab);
  const pending = visibleAbsence.filter(a=>a.status==="Afventer"&&a.user_id!==user.id).length;

  return(
    <div style={{padding:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontWeight:700,fontSize:18}}>{can(user,"approveAbsence")?"Fravær & Ferie — Godkendelse":"Mine fraværsanmodninger"}</div>
          {can(user,"approveAbsence")&&pending>0&&<div style={{fontSize:13,color:"#d97706",marginTop:3}}>⏳ {pending} afventer din godkendelse</div>}
        </div>
        <Btn onClick={()=>setAbsenceModal(true)} accent={acc}>+ Ny anmodning</Btn>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:20,background:"#fff",borderRadius:10,padding:4,border:"1px solid #e0ddd8",width:"fit-content"}}>
        {tabs.map(t=>{
          const count = t.id==="alle" ? visibleAbsence.length : visibleAbsence.filter(a=>a.status?.toLowerCase()===t.id).length;
          return(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:"8px 16px",borderRadius:8,border:"none",background:tab===t.id?t.color:"transparent",color:tab===t.id?"#fff":"#666",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Urbanist',sans-serif",display:"flex",alignItems:"center",gap:6}}>
              {t.label}
              {count>0&&<span style={{background:tab===t.id?"rgba(255,255,255,0.3)":t.color+"20",color:tab===t.id?"#fff":t.color,borderRadius:10,padding:"0 7px",fontSize:11,fontWeight:700}}>{count}</span>}
            </button>
          );
        })}
      </div>

      {filtered.length===0&&(
        <Card><div style={{textAlign:"center",color:"#aaa",fontSize:14,padding:32}}>Ingen anmodninger i denne kategori</div></Card>
      )}

      <div style={{display:"grid",gap:12}}>
        {filtered.map((a,i)=>{
          const person = users.find(u=>u.id===a.user_id);
          const isOwn = a.user_id===user.id;
          const canApprove = can(user,"approveAbsence")&&a.status==="Afventer"&&!isOwn;
          return(
            <div key={a.id||i} style={{background:"#fff",border:`1.5px solid ${a.status==="Afventer"?"#fcd20940":a.status==="Godkendt"?"#2e9e5b30":"#dc262630"}`,borderRadius:12,padding:"16px 20px",display:"flex",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
              {can(user,"approveAbsence")&&<Av src={person?.photo_url} initials={person?.avatar||"?"} size={42} bg={acc}/>}
              <div style={{flex:1,minWidth:200}}>
                {can(user,"approveAbsence")&&<div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{person?.name||"Ukendt"}<span style={{fontSize:11,color:"#aaa",fontWeight:400,marginLeft:8}}>{person?.dept||"—"}</span></div>}
                <div style={{fontWeight:isOwn?700:600,fontSize:isOwn?16:14,color:"#1a1a1a"}}>{a.type}</div>
                <div style={{fontSize:13,color:"#666",marginTop:3}}>📅 {fmt(a.from_date||a.from)} → {fmt(a.to_date||a.to)}</div>
                <div style={{fontSize:12,color:"#888",marginTop:2}}>🗓 {a.days} dag{a.days!==1?"e":""}</div>
                {a.note&&<div style={{fontSize:12,color:"#777",marginTop:6,background:"#f8f7f5",borderRadius:6,padding:"6px 10px"}}>💬 {a.note}</div>}
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,flexShrink:0}}>
                <Badge label={a.status} color={a.status==="Godkendt"?"#2e9e5b":a.status==="Afvist"?"#dc2626":"#d97706"}/>
                {canApprove&&(
                  <div style={{display:"flex",gap:8,marginTop:4}}>
                    <button onClick={()=>approveItem(a,"absence")}
                      style={{background:"#2e9e5b",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Urbanist',sans-serif",display:"flex",alignItems:"center",gap:6}}>
                      ✓ Godkend
                    </button>
                    <button onClick={()=>rejectItem(a,"absence")}
                      style={{background:"#fff",color:"#dc2626",border:"1.5px solid #dc2626",borderRadius:8,padding:"8px 18px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Urbanist',sans-serif",display:"flex",alignItems:"center",gap:6}}>
                      ✗ Afvis
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ANMODNINGER SIDE
// ─────────────────────────────────────────────
function RequestsPage({user, users, acc, visibleRequests, can, approveItem, rejectItem, setRequestModal, fmt}) {
  const [tab, setTab] = useState("afventer");
  const tabs = [
    {id:"afventer", label:"⏳ Afventer",  color:"#d97706"},
    {id:"godkendt", label:"✅ Godkendt",  color:"#2e9e5b"},
    {id:"afvist",   label:"❌ Afvist",    color:"#dc2626"},
    {id:"alle",     label:"📋 Alle",      color:"#888"},
  ];
  const filtered = tab==="alle" ? visibleRequests : visibleRequests.filter(r=>r.status?.toLowerCase()===tab);
  const pending = visibleRequests.filter(r=>r.status==="Afventer"&&r.user_id!==user.id).length;
  return(
    <div style={{padding:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontWeight:700,fontSize:18}}>{can(user,"approveRequests")?"Anmodninger — Godkendelse":"Mine anmodninger"}</div>
          {can(user,"approveRequests")&&pending>0&&<div style={{fontSize:13,color:"#d97706",marginTop:3}}>⏳ {pending} afventer din godkendelse</div>}
        </div>
        <Btn onClick={()=>setRequestModal(true)} accent={acc}>+ Ny anmodning</Btn>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:20,background:"#fff",borderRadius:10,padding:4,border:"1px solid #e0ddd8",width:"fit-content"}}>
        {tabs.map(t=>{
          const count = t.id==="alle" ? visibleRequests.length : visibleRequests.filter(r=>r.status?.toLowerCase()===t.id).length;
          return(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:"8px 16px",borderRadius:8,border:"none",background:tab===t.id?t.color:"transparent",color:tab===t.id?"#fff":"#666",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Urbanist',sans-serif",display:"flex",alignItems:"center",gap:6}}>
              {t.label}
              {count>0&&<span style={{background:tab===t.id?"rgba(255,255,255,0.3)":t.color+"20",color:tab===t.id?"#fff":t.color,borderRadius:10,padding:"0 7px",fontSize:11,fontWeight:700}}>{count}</span>}
            </button>
          );
        })}
      </div>

      {filtered.length===0&&(
        <Card><div style={{textAlign:"center",color:"#aaa",fontSize:14,padding:32}}>Ingen anmodninger i denne kategori</div></Card>
      )}

      <div style={{display:"grid",gap:12}}>
        {filtered.map((r,i)=>{
          const person = users.find(u=>u.id===r.user_id);
          const isOwn = r.user_id===user.id;
          const canApprove = can(user,"approveRequests")&&r.status==="Afventer"&&!isOwn;
          return(
            <div key={r.id||i} style={{background:"#fff",border:`1.5px solid ${r.status==="Afventer"?"#fcd20940":r.status==="Godkendt"?"#2e9e5b30":"#dc262630"}`,borderRadius:12,padding:"16px 20px",display:"flex",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
              {can(user,"approveRequests")&&<Av src={person?.photo_url} initials={person?.avatar||"?"} size={42} bg={acc}/>}
              <div style={{flex:1,minWidth:200}}>
                {can(user,"approveRequests")&&<div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{person?.name||"Ukendt"}<span style={{fontSize:11,color:"#aaa",fontWeight:400,marginLeft:8}}>{person?.dept||"—"}</span></div>}
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                  <span style={{fontWeight:700,fontSize:14}}>{r.type}</span>
                  <Badge label={r.priority||"Normal"} color={priColor(r.priority)}/>
                </div>
                {(r.desc||r.description)&&<div style={{fontSize:13,color:"#555",lineHeight:1.5,background:"#f8f7f5",borderRadius:6,padding:"8px 12px",marginTop:4}}>{r.desc||r.description}</div>}
                <div style={{fontSize:11,color:"#aaa",marginTop:6}}>📅 {fmt(r.date||r.created_at)}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,flexShrink:0}}>
                <Badge label={r.status} color={r.status==="Godkendt"?"#2e9e5b":r.status==="Afvist"?"#dc2626":"#d97706"}/>
                {canApprove&&(
                  <div style={{display:"flex",gap:8,marginTop:4}}>
                    <button onClick={()=>approveItem(r,"request")}
                      style={{background:"#2e9e5b",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Urbanist',sans-serif"}}>
                      ✓ Godkend
                    </button>
                    <button onClick={()=>rejectItem(r,"request")}
                      style={{background:"#fff",color:"#dc2626",border:"1.5px solid #dc2626",borderRadius:8,padding:"8px 18px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Urbanist',sans-serif"}}>
                      ✗ Afvis
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhoneEditor({user, setUser, setUsers, acc, showToast}) {
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(user.phone||"");
  if(!editing) return(
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
      <span style={{fontSize:13,color:"#555"}}>📞 {user.phone||"Intet telefonnummer registreret"}</span>
      <button onClick={()=>setEditing(true)} style={{background:"#f8f7f5",color:"#666",border:"1px solid #e0ddd8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12,fontFamily:"'Urbanist',sans-serif"}}>✏ Rediger</button>
    </div>
  );
  return(
    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
      <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+45 xx xx xx xx" style={{flex:1,background:"#f8f7f5",border:`1.5px solid ${acc}`,borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",fontFamily:"'Urbanist',sans-serif"}}/>
      <button onClick={async()=>{ await supabase.from('users').update({phone}).eq('id',user.id); setUser(u=>({...u,phone})); setUsers(us=>us.map(x=>x.id===user.id?{...x,phone}:x)); setEditing(false); showToast("✓ Telefon gemt"); }} style={{background:acc,color:"#000",border:"none",borderRadius:8,padding:"8px 14px",fontWeight:600,cursor:"pointer",fontFamily:"'Urbanist',sans-serif",fontSize:13}}>Gem</button>
      <button onClick={()=>setEditing(false)} style={{background:"#f0ece5",color:"#888",border:"none",borderRadius:8,padding:"8px 10px",cursor:"pointer",fontSize:13}}>✕</button>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function App() {
  const [settings,  setSettings]  = useState(DEFAULT_SETTINGS);
  const [users,     setUsers]     = useState([]);
  const [absence,   setAbsence]   = useState([]);
  const [requests,  setRequests]  = useState([]);
  const [events,    setEvents]    = useState([]);
  const [news,      setNews]      = useState([]);
  const [messages,  setMessages]  = useState([]);
  const [notifs,    setNotifs]    = useState([]);
  const [auditLog,  setAuditLog]  = useState([]);

  const [user,         setUser]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [page,         setPage]         = useState("dashboard");
  const [sideOpen,     setSideOpen]     = useState(true);
  const [toast,        setToast]        = useState(null);
  const [showNotifs,   setShowNotifs]   = useState(false);
  const [dashPeriod,   setDashPeriod]   = useState("ytd");
  const [widgetEditor, setWidgetEditor] = useState(false);
  const [absenceModal, setAbsenceModal] = useState(false);
  const [requestModal, setRequestModal] = useState(false);
  const [eventModal,   setEventModal]   = useState(false);
  const [newsModal,    setNewsModal]    = useState(false);
  const [msgRecipient, setMsgRecipient] = useState(null);

  const defaultWidgets = role => {
    const base = ["milestones","stats","absence_quick","events_upcoming","news_latest"];
    if(["leder","chef","direktør"].includes(role)) return [...base,"pending_approvals","team_absence","team_stats"];
    return base;
  };
  const [activeWidgets, setActiveWidgets] = useState(null);
  const widgets = activeWidgets || (user ? defaultWidgets(user.role) : []);

  // AUTH
  useEffect(()=>{
    const handleSession = async (session) => {
  if(!session){ setUser(null); setLoading(false); return; }
  const email = session.user.email;
  if(!email.endsWith('@abateknik.dk')){
    await supabase.auth.signOut(); 
    alert('Kun @abateknik.dk konti');
    setLoading(false); return;
  }
  try {
    let {data} = await supabase.from('users').select('*').eq('email',email).single();
    if(!data){
      const name = session.user.user_metadata?.name||session.user.user_metadata?.full_name||email.split('@')[0];
      const initials = name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
      const {data:nu} = await supabase.from('users').insert({
        name,email,role:'montør',dept:'Ikke tildelt',avatar:initials
      }).select().single();
      data = nu;
    }
    if(data){ setUser(data); setPage('dashboard'); setActiveWidgets(defaultWidgets(data.role)); }
  } catch(err) {
    console.error('Auth fejl:', err);
  } finally {
    setLoading(false);
  }
};
    
    supabase.auth.getSession().then(({data:{session}})=>handleSession(session)).catch(()=>setLoading(false));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e,session)=>handleSession(session));
    return ()=>subscription.unsubscribe();
  },[]);

  // DATA FETCH — kører når user er klar
  useEffect(()=>{
    if(!user) return;
    supabase.from('settings').select('*').single().then(({data})=>{ if(data) setSettings({companyName:data.company_name,accentColor:data.accent_color,logo:data.logo_url}); });
    supabase.from('users').select('*').then(({data})=>{ if(data) setUsers(data); });
    supabase.from('news').select('*').order('created_at',{ascending:false}).then(({data})=>{ if(data) setNews(data.map(n=>({...n,date:n.created_at?.slice(0,10),pinned:n.pinned||false}))); });
    supabase.from('events').select('*, event_attendees(user_id)').order('created_at',{ascending:true}).then(({data})=>{ if(data) setEvents(data.map(e=>({...e,desc:e.description,type:e.type||'Andet',attendees:(e.event_attendees||[]).map(a=>a.user_id)}))); });
    supabase.from('absence').select('*').order('created_at',{ascending:false}).then(({data})=>{ if(data) setAbsence(data.map(a=>({...a,from:a.from_date,to:a.to_date}))); });
    supabase.from('requests').select('*').order('created_at',{ascending:false}).then(({data})=>{ if(data) setRequests(data.map(r=>({...r,desc:r.description,date:r.created_at?.slice(0,10)}))); });
    supabase.from('audit_log').select('*').order('created_at',{ascending:false}).limit(50).then(({data})=>{ if(data) setAuditLog(data); });
    supabase.from('messages').select('*').or(`to_id.eq.${user.id},from_id.eq.${user.id}`).order('created_at',{ascending:false}).then(({data})=>{ if(data) setMessages(data.map(m=>({...m,fromId:m.from_id,toId:m.to_id,time:m.created_at}))); });
    supabase.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).then(({data})=>{ if(data) setNotifs(data.map(n=>({...n,time:n.created_at}))); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[user?.id]);

  const acc = settings.accentColor;
  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  // ─── REALTIME — master channel for alle tabeller ───
  useEffect(()=>{
    if(!user) return;

    const loadNews     = () => supabase.from('news').select('*').order('created_at',{ascending:false}).then(({data})=>{ if(data) setNews(data.map(n=>({...n,date:n.created_at?.slice(0,10),pinned:n.pinned||false}))); });
    const loadEvents   = () => supabase.from('events').select('*, event_attendees(user_id)').order('created_at',{ascending:true}).then(({data})=>{ if(data) setEvents(data.map(e=>({...e,desc:e.description,type:e.type||'Andet',attendees:(e.event_attendees||[]).map(a=>a.user_id)}))); });
    const loadMessages = () => supabase.from('messages').select('*').or(`to_id.eq.${user.id},from_id.eq.${user.id}`).order('created_at',{ascending:false}).then(({data})=>{ if(data) setMessages(data.map(m=>({...m,fromId:m.from_id,toId:m.to_id,time:m.created_at}))); });
    const loadAbsence  = () => supabase.from('absence').select('*').order('created_at',{ascending:false}).then(({data})=>{ if(data) setAbsence(data.map(a=>({...a,from:a.from_date,to:a.to_date}))); });
    const loadRequests = () => supabase.from('requests').select('*').order('created_at',{ascending:false}).then(({data})=>{ if(data) setRequests(data.map(r=>({...r,desc:r.description,date:r.created_at?.slice(0,10)}))); });

    const channel = supabase.channel('realtime-all-'+user.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'news'},           ()=>loadNews())
      .on('postgres_changes',{event:'*',schema:'public',table:'events'},         ()=>loadEvents())
      .on('postgres_changes',{event:'*',schema:'public',table:'event_attendees'},()=>loadEvents())
      .on('postgres_changes',{event:'*',schema:'public',table:'messages'},       ()=>loadMessages())
      .on('postgres_changes',{event:'*',schema:'public',table:'absence'},        ()=>loadAbsence())
      .on('postgres_changes',{event:'*',schema:'public',table:'requests'},       ()=>loadRequests())
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${user.id}`},payload=>{
        const n=payload.new;
        setNotifs(prev=>[{...n,time:n.created_at},...prev]);
        showToast(n.text, n.type==="success"?"success":"info");
      })
      .subscribe();

    return ()=>supabase.removeChannel(channel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[user]);
  const pushNotif = async (user_id,text,type="info") => {
    await supabase.from('notifications').insert({user_id,text,type});
    setNotifs(n=>[{id:Date.now(),user_id,text,read:false,time:new Date().toISOString(),type},...n]);
  };

  const myNotifs  = user ? notifs.filter(n=>n.user_id===user.id) : [];
  const unreadN   = myNotifs.filter(n=>!n.read).length;
  const unreadMsg = user ? messages.filter(m=>m.to_id===user.id&&!m.read).length : 0;
  const myTeam    = user ? users.filter(u=>u.manager_id===user.id) : [];
  const milestones = user ? getMilestones(users) : [];

  // chef/direktør ser alle — leder ser kun sit direkte team
  const canSeeAll = user && (user.role==="chef"||user.role==="direktør"||user.role==="it_admin");
  const visibleAbsence  = user ? (can(user,"approveAbsence") ? (canSeeAll ? absence : absence.filter(a=>myTeam.map(u=>u.id).includes(a.user_id)||a.user_id===user.id)) : absence.filter(a=>a.user_id===user.id)) : [];
  const visibleRequests = user ? (can(user,"approveRequests") ? (canSeeAll ? requests : requests.filter(r=>myTeam.map(u=>u.id).includes(r.user_id)||r.user_id===user.id)) : requests.filter(r=>r.user_id===user.id)) : [];

  const approveItem = async (item,type) => {
    if(type==="absence"){
      await supabase.from('absence').update({status:"Godkendt"}).eq('id',item.id);
      setAbsence(a=>a.map(x=>x.id===item.id?{...x,status:"Godkendt"}:x));
      await pushNotif(item.user_id,"Din "+item.type+"-anmodning er godkendt","success");
    } else {
      await supabase.from('requests').update({status:"Godkendt"}).eq('id',item.id);
      setRequests(r=>r.map(x=>x.id===item.id?{...x,status:"Godkendt"}:x));
      await pushNotif(item.user_id,"Din anmodning er godkendt","success");
    }
    showToast("Godkendt ✓");
  };
  const rejectItem = async (item,type) => {
    if(type==="absence"){
      await supabase.from('absence').update({status:"Afvist"}).eq('id',item.id);
      setAbsence(a=>a.map(x=>x.id===item.id?{...x,status:"Afvist"}:x));
      await pushNotif(item.user_id,"Din "+item.type+"-anmodning er afvist","warning");
    } else {
      await supabase.from('requests').update({status:"Afvist"}).eq('id',item.id);
      setRequests(r=>r.map(x=>x.id===item.id?{...x,status:"Afvist"}:x));
      await pushNotif(item.user_id,"Din anmodning er afvist","warning");
    }
    showToast("Afvist","warning");
  };

  if(loading) return(
    <div style={{minHeight:"100vh",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Urbanist',sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:48,height:48,border:`3px solid #fcd209`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 16px"}}/>
        <div style={{color:"#555",fontSize:14}}>Logger ind...</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if(!user) return <LoginScreen settings={settings}/>;
  if(user.role==="it_admin") return <ITAdminPanel users={users} setUsers={setUsers} settings={settings} setSettings={setSettings} auditLog={auditLog} setAuditLog={setAuditLog} onLogout={async()=>{await supabase.auth.signOut();setUser(null);}}/>;

  const navItems = [
    {id:"dashboard", icon:"⊞", label:"Overblik"},
    {id:"news",      icon:"📋", label:"Nyheder"},
    ...(can(user,"receiveMessages") ? [{id:"messages",icon:"✉",label:"Beskeder",badge:unreadMsg}] : []),
    ...(can(user,"viewEvents")      ? [{id:"events",  icon:"📅",label:"Events & Kurser"}] : []),
    ...(can(user,"viewDocs")        ? [{id:"docs",    icon:"📚",label:"Dokumenter"}] : []),
    ...(can(user,"createAbsence")   ? [{id:"absence", icon:"🌴",label:"Fravær & Ferie"}] : []),
    ...(can(user,"createRequest")   ? [{id:"requests",icon:"📝",label:"Anmodninger"}] : []),
    ...(can(user,"viewFollowup")    ? [{id:"followup",icon:"📊",label:"Opfølgning"}] : []),
    {id:"colleagues", icon:"👥", label:"Kollegaer"},
    {id:"profile",    icon:"👤", label:"Min profil"},
  ];
  // ─── SIDEBAR ───
  const Sidebar = () => (
    <div style={{width:sideOpen?224:60,background:"#111",height:"100vh",display:"flex",flexDirection:"column",transition:"width .2s",flexShrink:0}}>
      <div style={{padding:sideOpen?"20px 16px 16px":"20px 10px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #222",minHeight:72}}>
        {settings.logo
          ? <img src={settings.logo} alt="logo" style={{height:sideOpen?36:28,maxWidth:sideOpen?120:36,objectFit:"contain",borderRadius:4,flexShrink:0}}/>
          : <div style={{width:34,height:34,background:acc,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="9,22 9,12 15,12 15,22" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
        {sideOpen&&!settings.logo&&<div style={{overflow:"hidden"}}><div style={{color:"#fff",fontWeight:700,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{settings.companyName}</div><div style={{color:"#555",fontSize:11}}>Intern portal</div></div>}
      </div>
      <nav style={{flex:1,padding:"10px 6px",overflowY:"auto"}}>
        {navItems.map(n=>(
          <button key={n.id} onClick={()=>setPage(n.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:8,border:"none",background:page===n.id?acc+"22":"transparent",color:page===n.id?acc:"#777",cursor:"pointer",marginBottom:2,position:"relative",justifyContent:sideOpen?"flex-start":"center"}}>
            <span style={{fontSize:16,flexShrink:0}}>{n.icon}</span>
            {sideOpen&&<span style={{fontSize:13,fontWeight:page===n.id?600:400,fontFamily:"'Urbanist',sans-serif",whiteSpace:"nowrap"}}>{n.label}</span>}
            {n.badge>0&&<span style={{background:acc,color:"#000",borderRadius:10,padding:"1px 6px",fontSize:10,fontWeight:700,marginLeft:sideOpen?"auto":0,position:sideOpen?"static":"absolute",top:3,right:3}}>{n.badge}</span>}
          </button>
        ))}
      </nav>
      <div style={{padding:"10px 6px",borderTop:"1px solid #222"}}>
        {/* Avatar nede til venstre — klikbar til profil */}
        <button onClick={()=>setPage("profile")} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"6px 10px",marginBottom:4,border:"none",background:"transparent",cursor:"pointer",borderRadius:8}}>
          <Av src={user.photo_url} initials={user.avatar||"?"} size={30} bg={acc}/>
          {sideOpen&&<div style={{overflow:"hidden",textAlign:"left"}}><div style={{color:"#ccc",fontSize:12,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.name}</div><div style={{color:"#555",fontSize:10}}>{roleLabel(user.role)}</div></div>}
        </button>
        <button onClick={async()=>{await supabase.auth.signOut();setUser(null);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,border:"none",background:"transparent",color:"#555",cursor:"pointer",justifyContent:sideOpen?"flex-start":"center",fontFamily:"'Urbanist',sans-serif",fontSize:13}}>🚪{sideOpen&&" Log ud"}</button>
        <button onClick={()=>setSideOpen(!sideOpen)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",padding:6,border:"none",background:"transparent",color:"#444",cursor:"pointer",fontSize:14}}>{sideOpen?"◀":"▶"}</button>
      </div>
    </div>
  );

  const pageTitles = {dashboard:"Overblik",news:"Nyheder & Opslagstavle",messages:"Beskeder",events:"Events & Kurser",docs:"Dokumenter",absence:"Fravær & Ferie",requests:"Anmodninger",followup:"Opfølgning",colleagues:"Kollegaer",profile:"Min profil"};

  // ─── TOPBAR ───
  const Topbar = () => (
    <div style={{background:"#fff",borderBottom:"1px solid #ede9e2",padding:"0 24px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
      <div style={{fontWeight:700,fontSize:18,color:"#1a1a1a"}}>{pageTitles[page]||page}</div>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{fontSize:12,color:"#aaa"}}>{new Date().toLocaleDateString("da-DK",{weekday:"long",day:"numeric",month:"long"})}</div>
        <div style={{position:"relative"}}>
          <button onClick={e=>{e.stopPropagation();setShowNotifs(!showNotifs);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,position:"relative",padding:4}}>
            🔔{unreadN>0&&<span style={{position:"absolute",top:0,right:0,background:acc,color:"#000",borderRadius:8,padding:"0 4px",fontSize:9,fontWeight:700}}>{unreadN}</span>}
          </button>
          {showNotifs&&(
            <div style={{position:"absolute",right:0,top:44,width:300,background:"#fff",border:"1px solid #ede9e2",borderRadius:12,boxShadow:"0 8px 32px #00000018",zIndex:150}} onClick={e=>e.stopPropagation()}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #f0ece5",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontWeight:700,fontSize:14}}>Notifikationer</span>
                <button onClick={async()=>{await supabase.from('notifications').update({read:true}).eq('user_id',user.id);setNotifs(n=>n.map(x=>({...x,read:true})));setShowNotifs(false);}} style={{fontSize:11,color:acc,background:"none",border:"none",cursor:"pointer",fontFamily:"'Urbanist',sans-serif"}}>Marker alle læst</button>
              </div>
              {myNotifs.length===0&&<div style={{padding:16,color:"#aaa",fontSize:13}}>Ingen notifikationer</div>}
              {myNotifs.slice(0,6).map((n,i)=>(
                <div key={n.id||i} style={{padding:"12px 16px",borderBottom:"1px solid #f8f5f0",background:n.read?"#fff":"#fffef0",display:"flex",gap:10}}>
                  <span>{n.type==="success"?"✅":n.type==="warning"?"⚠️":"ℹ️"}</span>
                  <div style={{flex:1}}><div style={{fontSize:13,color:"#333",fontWeight:n.read?400:600}}>{n.text}</div><div style={{fontSize:11,color:"#aaa",marginTop:2}}>{fmt(n.time||n.created_at)}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Avatar øverst højre — klikbar til profil */}
        <button onClick={()=>setPage("profile")} style={{background:"none",border:"none",cursor:"pointer",padding:0,borderRadius:"50%"}}>
          <Av src={user.photo_url} initials={user.avatar||"?"} size={34} bg={acc}/>
        </button>
      </div>
    </div>
  );

  // ─── WIDGETS ───
  const allWidgetDefs = [
    {id:"milestones",       label:"🎂 Mærkedage",          roles:["lærling","montør","leder","chef","direktør"]},
    {id:"stats",            label:"Nøgletal",              roles:["lærling","montør","leder","chef","direktør"]},
    {id:"absence_quick",    label:"Mit fravær",            roles:["lærling","montør","leder","chef","direktør"]},
    {id:"events_upcoming",  label:"Kommende events",       roles:["lærling","montør","leder","chef","direktør"]},
    {id:"news_latest",      label:"Seneste nyheder",       roles:["lærling","montør","leder","chef","direktør"]},
    {id:"pending_approvals",label:"Afventer godkendelse",  roles:["leder","chef","direktør"]},
    {id:"team_absence",     label:"Hold – fravær",         roles:["leder","chef","direktør"]},
    {id:"team_stats",       label:"Hold – statistik",      roles:["leder","chef","direktør"]},
  ];
  const widgetTitle = {milestones:"🎂 Mærkedage & Jubilæer",stats:"Nøgletal",absence_quick:"Mit fravær",events_upcoming:"Kommende events",news_latest:"Seneste nyheder",pending_approvals:"Afventer godkendelse",team_absence:"Hold – fravær",team_stats:"Hold – statistik"};
  const filteredAbsence = absence.filter(a=>periodFilter(a.from_date||a.from,dashPeriod));

  const renderWidget = wid => {
    const myAbsence = absence.filter(a=>a.user_id===user.id);
    switch(wid){
      case "milestones": return(
        <div>
          {milestones.length===0&&<div style={{color:"#aaa",fontSize:13}}>Ingen mærkedage inden for de næste dage 🎉</div>}
          {milestones.map((m,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #f0ece5"}}>
              <Av src={m.photo_url} initials={m.avatar||"?"} size={36} bg={m.color}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>{m.label}</div>
                {m.days===0&&<div style={{fontSize:11,color:m.color,fontWeight:600}}>🎉 I DAG!</div>}
                {m.days>0&&<div style={{fontSize:11,color:"#aaa"}}>om {m.days} dag{m.days!==1?"e":""}</div>}
              </div>
            </div>
          ))}
        </div>
      );
      case "stats": return(
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
          {[{label:"Ulæste beskeder",val:unreadMsg,icon:"✉",color:acc},{label:"Mine anmodninger",val:myAbsence.length,icon:"📅",color:"#2e9e5b"},{label:"Afventer svar",val:myAbsence.filter(a=>a.status==="Afventer").length,icon:"⏳",color:"#d97706"},{label:"Kommende events",val:events.filter(e=>new Date(e.date||e.event_date)>=new Date()).length,icon:"🎉",color:"#7c3aed"}].map((s,i)=>(
            <div key={i} style={{background:"#f8f7f5",borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:38,height:38,borderRadius:10,background:s.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>{s.icon}</div>
              <div><div style={{fontSize:20,fontWeight:800}}>{s.val}</div><div style={{fontSize:11,color:"#999"}}>{s.label}</div></div>
            </div>
          ))}
        </div>
      );
      case "absence_quick": return(
        <div>
          {myAbsence.slice(0,4).map((a,i)=>(
            <div key={a.id||i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #f0ece5"}}>
              <div><div style={{fontSize:13,fontWeight:600}}>{a.type}</div><div style={{fontSize:11,color:"#aaa"}}>{fmt(a.from_date||a.from)} – {fmt(a.to_date||a.to)} · {a.days} dag{a.days!==1?"e":""}</div></div>
              <Badge label={a.status} color={statColor(a.status)}/>
            </div>
          ))}
          {myAbsence.length===0&&<div style={{color:"#aaa",fontSize:13,marginBottom:12}}>Ingen anmodninger endnu</div>}
          <div style={{marginTop:12}}><Btn small onClick={()=>setAbsenceModal(true)} accent={acc}>+ Ny anmodning</Btn></div>
        </div>
      );
      case "events_upcoming": return(
        <div>
          {events.filter(e=>new Date(e.date||e.event_date)>=new Date()).slice(0,3).map((e,i)=>(
            <div key={e.id||i} style={{padding:"9px 0",borderBottom:"1px solid #f0ece5"}}>
              <div style={{fontWeight:600,fontSize:13}}>{e.title}</div>
              <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{fmt(e.date||e.event_date)} kl. {e.time||e.event_time} · {e.location}</div>
              <div style={{fontSize:11,color:(e.attendees||[]).includes(user.id)?acc:"#aaa",marginTop:2}}>{(e.attendees||[]).includes(user.id)?"✓ Tilmeldt":"Ikke tilmeldt"}</div>
            </div>
          ))}
          {events.filter(e=>new Date(e.date||e.event_date)>=new Date()).length===0&&<div style={{color:"#aaa",fontSize:13}}>Ingen kommende events</div>}
        </div>
      );
      case "news_latest": return(
        <div>
          {news.slice(0,3).map((n,i)=>(
            <div key={n.id||i} style={{padding:"9px 0",borderBottom:"1px solid #f0ece5",display:"flex",gap:8}}>
              {n.pinned&&<span>📌</span>}
              <div><div style={{fontSize:13,fontWeight:600}}>{n.title}</div><div style={{marginTop:4}}><Badge label={n.category} color={catColor(n.category)}/></div></div>
            </div>
          ))}
          {news.length===0&&<div style={{color:"#aaa",fontSize:13}}>Ingen nyheder endnu</div>}
        </div>
      );
      case "pending_approvals": {
        const pendingAbsence = canSeeAll ? absence.filter(a=>a.status==="Afventer"&&a.user_id!==user.id) : absence.filter(a=>myTeam.map(u=>u.id).includes(a.user_id)&&a.status==="Afventer");
        const pendingRequests = canSeeAll ? requests.filter(r=>r.status==="Afventer"&&r.user_id!==user.id) : requests.filter(r=>myTeam.map(u=>u.id).includes(r.user_id)&&r.status==="Afventer");
        const pending=[...pendingAbsence.map(x=>({...x,_type:"absence"})),...pendingRequests.map(x=>({...x,_type:"request"}))];
        return(<div>
          {pending.length===0&&<div style={{color:"#aaa",fontSize:13}}>Ingen afventende 🎉</div>}
          {pending.slice(0,5).map((item,i)=>{ const person=users.find(u=>u.id===item.user_id); return(
            <div key={item.id||i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #f0ece5"}}>
              <Av src={person?.photo_url} initials={person?.avatar||"?"} size={28} bg={acc}/>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{item.type}</div><div style={{fontSize:11,color:"#aaa"}}>{person?.name}</div></div>
              <Btn small accent="#2e9e5b" onClick={()=>approveItem(item,item._type)}>✓</Btn>
              <Btn small accent="#dc2626" variant="outline" onClick={()=>rejectItem(item,item._type)}>✗</Btn>
            </div>
          );})}
        </div>);
      }
      case "team_absence": {
        const filtered=filteredAbsence.filter(a=>myTeam.map(u=>u.id).includes(a.user_id));
        return(<div>
          {filtered.length===0&&<div style={{color:"#aaa",fontSize:13}}>Ingen fravær i perioden</div>}
          {filtered.map((a,i)=>{ const p=users.find(u=>u.id===a.user_id); return(
            <div key={a.id||i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #f0ece5"}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}><Av src={p?.photo_url} initials={p?.avatar||"?"} size={26} bg={acc}/><div><div style={{fontSize:12,fontWeight:600}}>{p?.name}</div><div style={{fontSize:11,color:"#aaa"}}>{a.type} · {a.days} dage</div></div></div>
              <Badge label={a.status} color={statColor(a.status)}/>
            </div>
          );})}
        </div>);
      }
      case "team_stats": {
        const byType=ABSENCE_TYPES.map(t=>({t,count:filteredAbsence.filter(a=>a.type===t&&myTeam.map(u=>u.id).includes(a.user_id)).reduce((s,a)=>s+a.days,0)})).filter(x=>x.count>0);
        const total=byType.reduce((s,x)=>s+x.count,0)||1;
        return(<div>
          {byType.length===0&&<div style={{color:"#aaa",fontSize:13}}>Ingen data i perioden</div>}
          {byType.map(x=>(<div key={x.t} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}><span style={{fontWeight:500}}>{x.t}</span><span style={{color:"#888"}}>{x.count} dage</span></div><div style={{background:"#f0ece5",borderRadius:4,height:6}}><div style={{width:`${Math.round(x.count/total*100)}%`,background:acc,borderRadius:4,height:6}}/></div></div>))}
        </div>);
      }
      default: return null;
    }
  };

  const periodOptions = [{id:"1md",label:"Seneste mdr"},{id:"q",label:"Kvartal"},{id:"ytd",label:"ÅTD"},{id:"12md",label:"12 mdr"}];

  // ─── RENDER PAGE ───
  const renderPage = () => {
    switch(page){
      case "dashboard": return(
        <div style={{padding:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20,flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{fontSize:20,fontWeight:700}}>God {new Date().getHours()<12?"morgen":"eftermiddag"}, {user.name?.split(" ")[0]} 👋</div>
              <div style={{color:"#888",fontSize:13,marginTop:3}}>{user.title||roleLabel(user.role)} · {user.dept}</div>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              {can(user,"editWidgets")&&periodOptions.map(p=><button key={p.id} onClick={()=>setDashPeriod(p.id)} style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${dashPeriod===p.id?acc:"#e0ddd8"}`,background:dashPeriod===p.id?acc+"14":"#fff",color:dashPeriod===p.id?acc:"#666",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Urbanist',sans-serif"}}>{p.label}</button>)}
              <Btn small onClick={()=>setWidgetEditor(true)} accent={acc} variant="outline">⚙ Tilpas</Btn>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:16}}>
            {widgets.map(wid=>(
              <Card key={wid}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <STitle>{widgetTitle[wid]}</STitle>
                  <button onClick={()=>setActiveWidgets(widgets.filter(w=>w!==wid))} style={{background:"none",border:"none",color:"#ddd",cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
                </div>
                {renderWidget(wid)}
              </Card>
            ))}
          </div>
        </div>
      );

      case "news": return(
        <div style={{padding:24}}>
          {can(user,"createNews")&&<div style={{marginBottom:16,display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>setNewsModal(true)} accent={acc}>+ Nyt opslag</Btn></div>}
          {news.length===0&&<Card><div style={{color:"#aaa",fontSize:14,textAlign:"center",padding:24}}>Ingen nyheder endnu</div></Card>}
          <div style={{display:"grid",gap:14}}>
            {news.map((n,i)=>(
              <Card key={n.id||i} style={{borderLeft:`4px solid ${catColor(n.category)}`,display:"flex",gap:16}}>
                {n.pinned&&<div style={{color:acc,fontSize:18,marginTop:2}}>📌</div>}
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}><Badge label={n.category} color={catColor(n.category)}/><span style={{fontSize:12,color:"#aaa"}}>{fmt(n.date||n.created_at)}</span></div>
                  <div style={{fontSize:16,fontWeight:700,marginBottom:6}}>{n.title}</div>
                  <div style={{fontSize:14,color:"#555",lineHeight:1.6}}>{n.body}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );

      case "messages": return(
        <MessagesPage user={user} users={users} messages={messages} setMessages={setMessages} acc={acc} pushNotif={pushNotif} showToast={showToast}
          initialRecipient={msgRecipient} onClearRecipient={()=>setMsgRecipient(null)}/>
      );

      case "docs": return <DocsPage user={user} acc={acc} users={users} pushNotif={pushNotif} showToast={showToast}/>;

      case "events": return(
        <div style={{padding:24}}>
          {can(user,"createEvents")&&<div style={{marginBottom:16,display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>setEventModal(true)} accent={acc}>+ Nyt event</Btn></div>}
          {events.filter(e=>(e.attendees||[]).includes(user.id)&&new Date(e.date||e.event_date)>=new Date()).length>0&&(
            <div style={{marginBottom:24}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>✅ Mine tilmeldinger</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
                {events.filter(e=>(e.attendees||[]).includes(user.id)&&new Date(e.date||e.event_date)>=new Date()).map((e,i)=>{
                  const daysLeft=Math.ceil((new Date(e.date||e.event_date)-new Date())/(1000*60*60*24));
                  return<div key={e.id||i} style={{background:acc+"18",border:`1.5px solid ${acc}`,borderRadius:10,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:700,fontSize:13}}>{e.title}</div><div style={{fontSize:11,color:"#666",marginTop:2}}>{fmt(e.date||e.event_date)} kl. {e.time||e.event_time}</div><div style={{fontSize:11,color:"#666"}}>📍 {e.location}</div></div><div style={{textAlign:"center",flexShrink:0,marginLeft:12}}><div style={{fontSize:22,fontWeight:800,color:acc,lineHeight:1}}>{daysLeft}</div><div style={{fontSize:10,color:"#888"}}>dage</div></div></div>;
                })}
              </div>
            </div>
          )}
          <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>📅 Kommende events</div>
          {events.filter(e=>new Date(e.date||e.event_date)>=new Date()).length===0&&<Card><div style={{color:"#aaa",fontSize:14,textAlign:"center",padding:24}}>Ingen kommende events</div></Card>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
            {events.filter(e=>new Date(e.date||e.event_date)>=new Date()).sort((a,b)=>new Date(a.date||a.event_date)-new Date(b.date||b.event_date)).map((e,i)=>{
              const attending=(e.attendees||[]).includes(user.id);
              const daysLeft=Math.ceil((new Date(e.date||e.event_date)-new Date())/(1000*60*60*24));
              const typeColor=({Socialt:"#1a6be8",Kursus:"#7c3aed",Andet:"#888"}[e.type]||"#888");
              return(
                <Card key={e.id||i}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <div><div style={{fontWeight:700,fontSize:15}}>{e.title}</div>{e.type&&<Badge label={e.type} color={typeColor}/>}</div>
                    <div style={{textAlign:"center",marginLeft:8,flexShrink:0}}><div style={{fontSize:20,fontWeight:800,color:acc,lineHeight:1}}>{daysLeft}</div><div style={{fontSize:10,color:"#aaa"}}>dage</div></div>
                  </div>
                  <div style={{fontSize:13,color:"#666",marginBottom:3}}>📅 {fmt(e.date||e.event_date)} kl. {e.time||e.event_time}</div>
                  <div style={{fontSize:13,color:"#666",marginBottom:10}}>📍 {e.location}</div>
                  <div style={{fontSize:13,color:"#555",marginBottom:14,lineHeight:1.5}}>{e.desc||e.description}</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11,color:"#aaa"}}>{(e.attendees||[]).length} tilmeldt</span>
                    <Btn small accent={acc} variant={attending?"outline":"primary"} onClick={async()=>{
                      if(attending){await supabase.from('event_attendees').delete().eq('event_id',e.id).eq('user_id',user.id);}
                      else{await supabase.from('event_attendees').insert({event_id:e.id,user_id:user.id});}
                      setEvents(ev=>ev.map(x=>x.id===e.id?{...x,attendees:attending?(x.attendees||[]).filter(a=>a!==user.id):[...(x.attendees||[]),user.id]}:x));
                    }}>{attending?"Afmeld":"Tilmeld"}</Btn>
                  </div>
                  {can(user,"viewAttendees")&&(e.attendees||[]).length>0&&(
                    <div style={{marginTop:12,padding:"10px 12px",background:"#f8f7f5",borderRadius:8}}>
                      <div style={{fontSize:11,fontWeight:600,color:"#666",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:6}}>Tilmeldte ({(e.attendees||[]).length})</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{(e.attendees||[]).map(id=>{const p=users.find(u=>u.id===id);return p?<div key={id} style={{display:"flex",alignItems:"center",gap:4,background:"#fff",border:"1px solid #e0ddd8",borderRadius:20,padding:"3px 10px 3px 4px"}}><Av src={p.photo_url} initials={p.avatar||"?"} size={20} bg={acc}/><span style={{fontSize:11,fontWeight:500}}>{p.name}</span></div>:null;})}</div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      );

      case "absence": return(
        <AbsencePage
          user={user} users={users} acc={acc}
          visibleAbsence={visibleAbsence}
          can={can} approveItem={approveItem} rejectItem={rejectItem}
          setAbsenceModal={setAbsenceModal} fmt={fmt}
        />
      );

      case "requests": return(
        <RequestsPage
          user={user} users={users} acc={acc}
          visibleRequests={visibleRequests}
          can={can} approveItem={approveItem} rejectItem={rejectItem}
          setRequestModal={setRequestModal} fmt={fmt}
        />
      );

      case "followup": return <FollowupPage users={users} absence={absence} user={user} acc={acc}/>;

      case "colleagues": return(
        <ColleaguesPage users={users} user={user} acc={acc} setUsers={setUsers} showToast={showToast}
          onCompose={(u)=>{ setMsgRecipient(u); setPage("messages"); }}/>
      );

      case "profile": return(
        <div style={{padding:24,maxWidth:560}}>
          <Card style={{marginBottom:16}}>
            <div style={{display:"flex",gap:18,alignItems:"center",marginBottom:20}}>
              <div style={{position:"relative"}}>
                {user.photo_url
                  ? <img src={user.photo_url} alt="" style={{width:72,height:72,borderRadius:"50%",objectFit:"cover"}}/>
                  : <div style={{width:72,height:72,borderRadius:"50%",background:acc,display:"flex",alignItems:"center",justifyContent:"center",color:"#000",fontWeight:800,fontSize:24}}>{user.avatar||"?"}</div>}
                <label style={{position:"absolute",bottom:0,right:0,background:"#fff",border:"1px solid #e0ddd8",borderRadius:"50%",width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:13,boxShadow:"0 2px 6px #00000020"}}>
                  📷<input type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{
                    const file=e.target.files[0]; if(!file)return;
                    const ext=file.name.split('.').pop();
                    const path=`${user.id}.${ext}`;
                    const {error}=await supabase.storage.from('avatars').upload(path,file,{upsert:true});
                    if(!error){
                      const {data:{publicUrl}}=supabase.storage.from('avatars').getPublicUrl(path);
                      await supabase.from('users').update({photo_url:publicUrl}).eq('id',user.id);
                      setUser(u=>({...u,photo_url:publicUrl}));
                      setUsers(us=>us.map(x=>x.id===user.id?{...x,photo_url:publicUrl}:x));
                      showToast("✓ Profilbillede opdateret");
                    }
                  }}/>
                </label>
              </div>
              <div>
                <div style={{fontSize:20,fontWeight:700}}>{user.name}</div>
                <div style={{color:"#888",fontSize:13}}>{user.title||roleLabel(user.role)} · {user.dept}</div>
                <div style={{color:"#aaa",fontSize:12,marginTop:3}}>{user.email}</div>
              </div>
            </div>
            <PhoneEditor user={user} setUser={setUser} setUsers={setUsers} acc={acc} showToast={showToast}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}}>
              {[
                {label:"Leder",          val:users.find(u=>u.id===user.manager_id)?.name||"—"},
                {label:"Afdeling",       val:user.dept||"—"},
                {label:"Stilling",       val:user.title||roleLabel(user.role)},
                {label:"Ansættelsesdato",val:user.hire_date?fmt(user.hire_date):"—"},
                {label:"Fødselsdato",    val:user.birthdate?fmt(user.birthdate):"—"},
                ...(user.role==="lærling"&&user.apprentice_end_date?[{label:"Udlært dato",val:fmt(user.apprentice_end_date)}]:[]),
              ].map((f,i)=>(
                <div key={i} style={{background:"#f8f7f5",borderRadius:8,padding:"12px 14px"}}>
                  <div style={{fontSize:10,color:"#aaa",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:4}}>{f.label}</div>
                  <div style={{fontSize:13,fontWeight:500,color:"#333"}}>{f.val}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card style={{background:"#f8f7f5"}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>🔒 GDPR & Datasikkerhed</div>
            <div style={{fontSize:13,color:"#666",lineHeight:1.7}}>Dine personoplysninger behandles iht. GDPR og opbevares på EU-baserede servere. ABA Teknik ApS, Naverland 1C, 2600 Glostrup er dataansvarlig. Du har ret til indsigt, rettelse og sletning — kontakt ledelsen.</div>
          </Card>
        </div>
      );

      default: return null;
    }
  };

  // ─── FORMS ───
  const AbsenceForm = () => {
    const [f,setF]=useState({type:"Ferie",from:"",to:"",note:""});
    return(<Modal title="Ny fraværsanmodning" onClose={()=>setAbsenceModal(false)}>
      <Sel label="Type" value={f.type} onChange={e=>setF({...f,type:e.target.value})}>{ABSENCE_TYPES.map(t=><option key={t}>{t}</option>)}</Sel>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Inp label="Fra dato" type="date" value={f.from} onChange={e=>setF({...f,from:e.target.value})}/><Inp label="Til dato" type="date" value={f.to} onChange={e=>setF({...f,to:e.target.value})}/></div>
      <div style={{marginBottom:14}}><label style={{fontSize:11,fontWeight:600,color:"#666",textTransform:"uppercase",letterSpacing:"0.04em",display:"block",marginBottom:5}}>Note (valgfri)</label><textarea value={f.note} onChange={e=>setF({...f,note:e.target.value})} rows={3} style={{width:"100%",background:"#f8f7f5",border:"1px solid #e0ddd8",borderRadius:8,padding:"10px 14px",fontSize:14,boxSizing:"border-box",outline:"none",fontFamily:"'Urbanist',sans-serif",resize:"vertical"}}/></div>
      <div style={{background:"#fff8f5",border:"1px solid #fdddd0",borderRadius:8,padding:10,marginBottom:16,fontSize:12,color:"#c0461a"}}>📧 Sendes til din leder og afdelingschef</div>
      <div style={{display:"flex",gap:10}}>
        <Btn variant="outline" accent="#999" onClick={()=>setAbsenceModal(false)} style={{flex:1}}>Annuller</Btn>
        <Btn accent={acc} style={{flex:2}} onClick={async()=>{
          if(!f.from||!f.to)return;
          const days=daysBetween(f.from,f.to);
          const {data}=await supabase.from('absence').insert({user_id:user.id,type:f.type,from_date:f.from,to_date:f.to,days,status:'Afventer',note:f.note}).select().single();
          if(data) setAbsence(a=>[{...data,from:data.from_date,to:data.to_date},...a]);
          const mgr=users.find(u=>u.id===user.manager_id);
          if(mgr) await pushNotif(mgr.id,"Ny "+f.type+"-anmodning fra "+user.name,"warning");
          setAbsenceModal(false); showToast("✓ Anmodning sendt");
        }}>Send anmodning</Btn>
      </div>
    </Modal>);
  };

  const RequestForm = () => {
    const [f,setF]=useState({type:"Materialebestilling",desc:"",priority:"Normal"});
    return(<Modal title="Ny anmodning" onClose={()=>setRequestModal(false)}>
      <Sel label="Type" value={f.type} onChange={e=>setF({...f,type:e.target.value})}>{"Materialebestilling,Værktøjsudlån,Overtidsgodkendelse,Udgiftsgodtgørelse,Andet".split(",").map(t=><option key={t}>{t}</option>)}</Sel>
      <Sel label="Prioritet" value={f.priority} onChange={e=>setF({...f,priority:e.target.value})}>{["Lav","Normal","Høj"].map(p=><option key={p}>{p}</option>)}</Sel>
      <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:600,color:"#666",textTransform:"uppercase",letterSpacing:"0.04em",display:"block",marginBottom:5}}>Beskrivelse</label><textarea value={f.desc} onChange={e=>setF({...f,desc:e.target.value})} rows={4} style={{width:"100%",background:"#f8f7f5",border:"1px solid #e0ddd8",borderRadius:8,padding:"10px 14px",fontSize:14,boxSizing:"border-box",outline:"none",fontFamily:"'Urbanist',sans-serif",resize:"vertical"}}/></div>
      <div style={{display:"flex",gap:10}}>
        <Btn variant="outline" accent="#999" onClick={()=>setRequestModal(false)} style={{flex:1}}>Annuller</Btn>
        <Btn accent={acc} style={{flex:2}} onClick={async()=>{
          if(!f.desc)return;
          const {data}=await supabase.from('requests').insert({user_id:user.id,type:f.type,description:f.desc,priority:f.priority,status:'Afventer'}).select().single();
          if(data) setRequests(r=>[{...data,desc:data.description,date:data.created_at?.slice(0,10)},...r]);
          const mgr=users.find(u=>u.id===user.manager_id);
          if(mgr) await pushNotif(mgr.id,"Ny anmodning fra "+user.name,"warning");
          setRequestModal(false); showToast("✓ Anmodning sendt");
        }}>Send til leder</Btn>
      </div>
    </Modal>);
  };

  const EventForm = () => {
    const [f,setF]=useState({title:"",date:"",time:"08:00",location:"",desc:"",type:"Socialt"});
    const [notifTarget, setNotifTarget] = useState("alle");
    const [selectedPersons, setSelectedPersons] = useState([]);

    const roleTargets = [
      {id:"alle",      label:"👥 Alle medarbejdere"},
      {id:"lærling",   label:"🎓 Lærlinge"},
      {id:"montør",    label:"🔧 Montører"},
      {id:"leder",     label:"👷 Ledere"},
      {id:"chef",      label:"🏢 Chefer"},
      {id:"direktør",  label:"🎖 Direktører"},
      {id:"personer",  label:"☑️ Vælg specifikke personer"},
    ];

    const getRecipients = () => {
      if(notifTarget === "alle") return users.filter(u=>u.role!=="it_admin");
      if(notifTarget === "personer") return users.filter(u=>selectedPersons.includes(u.id));
      return users.filter(u=>u.role===notifTarget);
    };

    const togglePerson = (id) => {
      setSelectedPersons(prev =>
        prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]
      );
    };

    return(
      <Modal title="Nyt event / kursus" onClose={()=>setEventModal(false)} width={540}>
        <Inp label="Titel" value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="Fx Sommerfest"/>
        <Sel label="Type" value={f.type} onChange={e=>setF({...f,type:e.target.value})}>
          {"Socialt,Kursus,Andet".split(",").map(t=><option key={t}>{t}</option>)}
        </Sel>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="Dato" type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/>
          <Inp label="Tidspunkt" type="time" value={f.time} onChange={e=>setF({...f,time:e.target.value})}/>
        </div>
        <Inp label="Sted" value={f.location} onChange={e=>setF({...f,location:e.target.value})} placeholder="Fx Kontoret"/>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,fontWeight:600,color:"#666",textTransform:"uppercase",letterSpacing:"0.04em",display:"block",marginBottom:5}}>Beskrivelse</label>
          <textarea value={f.desc} onChange={e=>setF({...f,desc:e.target.value})} rows={3}
            style={{width:"100%",background:"#f8f7f5",border:"1px solid #e0ddd8",borderRadius:8,padding:"10px 14px",fontSize:14,boxSizing:"border-box",outline:"none",fontFamily:"'Urbanist',sans-serif",resize:"vertical"}}/>
        </div>

        {/* Notifikations-målgruppe */}
        <div style={{marginBottom:16}}>
          <label style={{fontSize:11,fontWeight:600,color:"#666",textTransform:"uppercase",letterSpacing:"0.04em",display:"block",marginBottom:8}}>🔔 Send notifikation til</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {roleTargets.map(t=>(
              <button key={t.id} onClick={()=>{ setNotifTarget(t.id); if(t.id!=="personer") setSelectedPersons([]); }}
                style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${notifTarget===t.id?acc:"#e0ddd8"}`,background:notifTarget===t.id?acc:"#fff",color:notifTarget===t.id?"#000":"#666",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Urbanist',sans-serif"}}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Persons multi-select */}
          {notifTarget==="personer"&&(
            <div style={{marginTop:10,background:"#f8f7f5",borderRadius:10,padding:12,maxHeight:200,overflowY:"auto"}}>
              {users.filter(u=>u.role!=="it_admin").map(u=>(
                <label key={u.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid #f0ece5",cursor:"pointer"}}>
                  <input type="checkbox" checked={selectedPersons.includes(u.id)} onChange={()=>togglePerson(u.id)}
                    style={{width:15,height:15,accentColor:acc}}/>
                  <Av src={u.photo_url} initials={u.avatar||"?"} size={26} bg={acc}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:500}}>{u.name}</div>
                    <div style={{fontSize:11,color:"#aaa"}}>{roleLabel(u.role)} · {u.dept||"—"}</div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Preview af modtagere */}
          <div style={{marginTop:8,fontSize:12,color:"#888"}}>
            {notifTarget==="personer"
              ? selectedPersons.length===0
                ? "Ingen valgt endnu"
                : `${selectedPersons.length} person${selectedPersons.length!==1?"er":""} valgt`
              : `${getRecipients().length} modtager${getRecipients().length!==1?"e":""}`
            }
          </div>
        </div>

        <div style={{display:"flex",gap:10}}>
          <Btn variant="outline" accent="#999" onClick={()=>setEventModal(false)} style={{flex:1}}>Annuller</Btn>
          <Btn accent={acc} style={{flex:2}} onClick={async()=>{
            if(!f.title||!f.date) return;
            const {data,error}=await supabase.from('events').insert({
              title:f.title, date:f.date, time:f.time,
              location:f.location, description:f.desc, created_by:user.id, type:f.type
            }).select().single();
            if(error){ console.error("Event insert fejl:",error); showToast("Fejl: "+error.message,"warning"); return; }
            if(data) setEvents(e=>[{...data,date:data.date,time:data.time,desc:data.description,type:data.type||'Andet',attendees:[]},...e]);
            const recipients = getRecipients();
            for(const u of recipients){ await pushNotif(u.id,"Nyt event: "+f.title,"info"); }
            setEventModal(false);
            showToast(`✓ Event oprettet · ${recipients.length} notificeret`);
          }}>Opret & notificer</Btn>
        </div>
      </Modal>
    );
  };


  const NewsForm = () => {
    const [f,setF]=useState({title:"",body:"",category:"Personale",pinned:false});
    return(<Modal title="Nyt opslag" onClose={()=>setNewsModal(false)}>
      <Inp label="Overskrift" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/>
      <Sel label="Kategori" value={f.category} onChange={e=>setF({...f,category:e.target.value})}>{"Socialt,Personale,Sikkerhed,Nyt fra kontoret,Salg & Tilbud,Andet".split(",").map(c=><option key={c}>{c}</option>)}</Sel>
      <div style={{marginBottom:14}}><label style={{fontSize:11,fontWeight:600,color:"#666",textTransform:"uppercase",letterSpacing:"0.04em",display:"block",marginBottom:5}}>Indhold</label><textarea value={f.body} onChange={e=>setF({...f,body:e.target.value})} rows={4} style={{width:"100%",background:"#f8f7f5",border:"1px solid #e0ddd8",borderRadius:8,padding:"10px 14px",fontSize:14,boxSizing:"border-box",outline:"none",fontFamily:"'Urbanist',sans-serif",resize:"vertical"}}/></div>
      <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,marginBottom:16,cursor:"pointer"}}><input type="checkbox" checked={f.pinned} onChange={e=>setF({...f,pinned:e.target.checked})}/> Fastgør opslag (📌)</label>
      <div style={{display:"flex",gap:10}}>
        <Btn variant="outline" accent="#999" onClick={()=>setNewsModal(false)} style={{flex:1}}>Annuller</Btn>
        <Btn accent={acc} style={{flex:2}} onClick={async()=>{
          if(!f.title)return;
          const {data, error}=await supabase.from('news').insert({title:f.title,body:f.body,category:f.category,pinned:f.pinned,created_by:user.id}).select().single();
          if(error){ console.error("News insert fejl:",error); showToast("Fejl: "+error.message,"warning"); return; }
          if(data) setNews(n=>[{...data,date:data.created_at?.slice(0,10)},...n]);
          for(const u of users){ await pushNotif(u.id,"Nyt opslag: "+f.title,"info"); }
          setNewsModal(false); showToast("✓ Opslag publiceret");
        }}>Publicer & notificer</Btn>
      </div>
    </Modal>);
  };

  const WidgetEditor = () => (
    <Modal title="Tilpas dashboard" onClose={()=>setWidgetEditor(false)}>
      <div style={{fontSize:13,color:"#888",marginBottom:16}}>Vælg hvilke widgets der vises på dit overblik</div>
      {allWidgetDefs.filter(w=>w.roles.includes(user.role)).map(w=>(
        <label key={w.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #f0ece5",cursor:"pointer"}}>
          <input type="checkbox" checked={widgets.includes(w.id)} onChange={e=>setActiveWidgets(e.target.checked?[...widgets,w.id]:widgets.filter(x=>x!==w.id))} style={{width:16,height:16,accentColor:acc}}/>
          <span style={{fontSize:14,fontWeight:500}}>{w.label}</span>
        </label>
      ))}
      <div style={{marginTop:16}}><Btn accent={acc} onClick={()=>setWidgetEditor(false)} style={{width:"100%"}}>Gem layout</Btn></div>
    </Modal>
  );

  return(
    <div style={{display:"flex",height:"100vh",fontFamily:"'Urbanist',sans-serif",background:"#f5f2ed"}} onClick={()=>showNotifs&&setShowNotifs(false)}>
      <link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <Sidebar/>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <Topbar/>
        <div style={{flex:1,overflowY:"auto"}}>{renderPage()}</div>
      </div>
      {absenceModal&&<AbsenceForm/>}
      {requestModal&&<RequestForm/>}
      {eventModal&&<EventForm/>}
      {newsModal&&<NewsForm/>}
      {widgetEditor&&<WidgetEditor/>}
      {toast&&<div style={{position:"fixed",bottom:24,right:24,background:toast.type==="warning"?"#d97706":"#1a1a1a",color:"#fff",borderRadius:10,padding:"13px 20px",fontSize:14,fontWeight:500,boxShadow:"0 8px 30px #00000040",zIndex:300,maxWidth:340}}>{toast.msg}</div>}
    </div>
  );
}
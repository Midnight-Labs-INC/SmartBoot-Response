const $=s=>document.querySelector(s);
const pages={
 overview:["Overview","Monitor your SmartBoot system from one place."],
 incidents:["Incidents","Review, acknowledge, and resolve SmartBoot alerts."],
 sites:["Sites & locations","Manage organizations, sites, and protected locations."],
 panels:["Panels","View connected SmartBoot panels and their connection status."],
 contacts:["Contacts","Manage notification contacts and escalation order."],
 members:["Members","Manage workspace access and organization roles."],
 settings:["Settings","Configure your SmartBoot Response workspace."]
};
async function loadAccount(){
 try{
  const r=await fetch("/api/v1/me",{credentials:"same-origin"});
  if(r.status===401){location.href="/login";return}
  if(!r.ok)throw new Error("Account request failed");
  const d=await r.json(),u=d.user||d;
  const name=u.globalName||u.username||u.email||"Account";
  $("#profileName").textContent=name;
  $("#avatar").textContent=(name[0]||"S").toUpperCase();
  if(u.avatar&&u.discordId)$("#avatar").style.backgroundImage="url(https://cdn.discordapp.com/avatars/"+u.discordId+"/"+u.avatar+".png)";
 }catch(e){$("#profileName").textContent="Account unavailable"}
}
async function loadHealth(){
 try{
  const r=await fetch("/health",{credentials:"same-origin"});
  if(!r.ok)throw new Error();
  const d=await r.json();
  $("#serviceState").textContent="Operational";
  $("#apiBadge").textContent="Operational";
  $("#apiStatus").innerHTML='<i class="status-dot"></i> Operational';
  $("#dbStatus").textContent=d.database==="connected"?"Connected":"Unknown";
 }catch(e){
  $("#serviceState").textContent="Degraded";
  $("#apiBadge").textContent="Unavailable";
  $("#apiBadge").className="status-tag";
  $("#apiStatus").textContent="Unavailable";
  $("#dbStatus").textContent="Unknown";
 }
}
function showPage(key){
 const p=pages[key]||pages.overview;
 $("#pageTitle").textContent=p[0];$("#crumb").textContent=p[0];$("#pageDesc").textContent=p[1];
 document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===key));
 if(key==="overview"){
  $("#pageContent").innerHTML=overviewMarkup;
 }else{
  $("#pageContent").innerHTML='<div class="page-placeholder"><div class="empty-icon">'+({incidents:"◎",sites:"⌂",panels:"▦",contacts:"♧",members:"♙",settings:"⚙"}[key]||"◫")+'</div><h2>'+p[0]+'</h2><p>This section is part of the SmartBoot Response workspace. Its management API and workflows are not implemented yet, so no sample records are shown.</p></div>';
 }
 $("#sidebar").classList.remove("open");
}
const overviewMarkup=$("#pageContent").innerHTML;
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.go)));
$("#refreshBtn").addEventListener("click",()=>{loadAccount();loadHealth()});
$("#statsRefresh").addEventListener("click",()=>{loadAccount();loadHealth()});
$("#menuBtn").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#profileBtn").addEventListener("click",()=>$("#profileMenu").classList.toggle("hidden"));
$("#logoutBtn").addEventListener("click",async()=>{await fetch("/auth/logout",{method:"POST",credentials:"same-origin"});location.href="/login"});
$("#today").textContent=new Intl.DateTimeFormat("en-US",{weekday:"long",month:"long",day:"numeric"}).format(new Date()).toUpperCase();
loadAccount();loadHealth();

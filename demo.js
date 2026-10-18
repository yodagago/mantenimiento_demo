"use strict";
const $=id=>document.getElementById(id);
const seed=[
{ott:"OTT-DEMO-001",equipo:"Bomba de riego 1",actividad:"Inspección y lubricación",fecha:"2026-10-19",tecnicos:["Técnico A","Técnico B"]},
{ott:"OTT-DEMO-002",equipo:"Motor de ventilación",actividad:"Revisión eléctrica",fecha:"2026-10-20",tecnicos:["Técnico C"]},
{ott:"OTT-DEMO-003",equipo:"Sistema de fertirriego",actividad:"Calibración preventiva",fecha:"2026-10-21",tecnicos:["Técnico A","Técnico C"]},
{ott:"OTT-DEMO-004",equipo:"Banda transportadora",actividad:"Inspección mecánica",fecha:"2026-10-22",tecnicos:["Técnico B"]}
];
const KEY="mantenimiento-cv-demo-v2";
const catalogo=["Ana Martínez","Andrés Gómez","Carlos Rodríguez","Juan Pérez","Laura Sánchez","María López","Pedro Ramírez","Técnico A","Técnico B","Técnico C"];
let state;let stream=null;let scanning=false;
function initial(){return {ordenes:seed.map(x=>({...x,estado:"Pendiente",observaciones:"",horas:{},ejecutadaEn:null})),eventos:[]};}
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(!(x&&Array.isArray(x.ordenes)&&Array.isArray(x.eventos)))return initial();for(const o of x.ordenes){if(o.estado==="Cerrada")o.estado="Ejecutada";}x.eventos=x.eventos.filter(e=>!e.accion.includes("aprobación")&&!e.accion.includes("Aprobación"));return x;}catch{return initial();}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));render();}
function event(ott,accion){state.eventos.unshift({ott,accion,fecha:new Date().toLocaleString("es-CO")});}
function node(tag,text){const x=document.createElement(tag);if(text!==undefined)x.textContent=String(text);return x;}
function btn(label,fn,alt=false){const x=node("button",label);if(alt)x.className="alt";x.onclick=fn;return x;}
function show(tab){document.querySelectorAll("main section").forEach(x=>x.classList.toggle("hidden",x.id!==tab));document.querySelectorAll("nav button").forEach(x=>x.classList.toggle("alt",x.dataset.tab!==tab));if(tab!=="ordenes")stopCamera();render();}
document.querySelectorAll("nav button").forEach(x=>x.onclick=()=>show(x.dataset.tab));
function render(){const all=state.ordenes;const count=s=>all.filter(o=>o.estado===s).length;$("total").textContent=all.length;$("pendientes").textContent=count("Pendiente");$("ejecutadas").textContent=count("Ejecutada");renderDashboard();renderList();renderHistory();}
let filtroEstado="Todas",filtroSemana="Todas";
function semanaISO(fecha){const d=new Date(fecha+"T12:00:00");if(Number.isNaN(d.getTime()))return "Sin fecha";d.setDate(d.getDate()+4-(d.getDay()||7));const inicio=new Date(d.getFullYear(),0,1);return "Sem "+Math.ceil((((d-inicio)/86400000)+1)/7);}
function fmt(n){return Number(n).toLocaleString("es-CO",{maximumFractionDigits:2});}
function fechaCorta(v){if(!v)return "—";const d=new Date(v);return Number.isNaN(d.getTime())?"—":d.toLocaleDateString("es-CO");}
function renderDashboard(){
 const root=$("analitica");if(!root)return;root.replaceChildren();
 const all=state.ordenes;const done=all.filter(o=>o.estado==="Ejecutada");const pending=all.filter(o=>o.estado!=="Ejecutada");
 const hours=done.reduce((n,o)=>n+Object.values(o.horas||{}).reduce((a,v)=>a+Number(v||0),0),0);
 const workers=done.reduce((n,o)=>n+Object.keys(o.horas||{}).length,0);
 const pct=all.length?100*done.length/all.length:0;
 const kpis=node("div");kpis.className="grid";[
 ["Cumplimiento",fmt(pct)+" %","Órdenes ejecutadas / total"],
 ["Horas trabajadas",fmt(hours)+" h","Suma de horas registradas"],
 ["Participaciones",fmt(workers),"Técnicos registrados por orden"]
 ].forEach(([label,val,sub])=>{const c=node("div");c.className="card";const l=node("div",label);l.className="kpi-label";const v=node("div",val);v.className="kpi-value";const b=node("div",sub);b.className="kpi-sub";c.append(l,v,b);kpis.append(c);});root.append(kpis);
 const grid=node("div");grid.className="dashboard-grid";
 function panel(title){const card=node("div");card.className="card";card.append(node("h2",title));grid.append(card);return card;}
 const status=panel("Cumplimiento de mantenimiento");status.append(node("p",fmt(done.length)+" ejecutadas de "+fmt(all.length)+" órdenes"));
 const track=node("div");track.className="bar-track";const fill=node("div");fill.className="bar-fill";fill.style.width=pct+"%";track.append(fill);status.append(track,node("p",fmt(pct)+" % de cumplimiento · "+pending.length+" pendientes"));
 const weekly=panel("Órdenes por semana programada");const grouped=new Map();for(const o of all){const w=semanaISO(o.fecha);if(!grouped.has(w))grouped.set(w,{total:0,done:0});const g=grouped.get(w);g.total++;if(o.estado==="Ejecutada")g.done++;}
 for(const [week,g] of [...grouped].sort((a,b)=>a[0].localeCompare(b[0]))){weekly.append(node("p",week+" · "+g.done+"/"+g.total+" ejecutadas"));const t=node("div");t.className="bar-track";const b=node("div");b.className="bar-fill";b.style.width=(100*g.done/g.total)+"%";t.append(b);weekly.append(t);}
 const tech=panel("Horas por técnico");const techHours=new Map();for(const o of done)for(const [name,h] of Object.entries(o.horas||{}))techHours.set(name,(techHours.get(name)||0)+Number(h||0));
 if(!techHours.size)tech.append(node("p","No hay horas registradas."));
 for(const [name,h] of [...techHours].sort((a,b)=>b[1]-a[1]))tech.append(node("p",name+" · "+fmt(h)+" h"));
 const recent=panel("Últimas ejecuciones");if(!done.length)recent.append(node("p","Todavía no hay órdenes ejecutadas."));
 for(const o of [...done].sort((a,b)=>String(b.ejecutadaEn||"").localeCompare(String(a.ejecutadaEn||""))).slice(0,5)){const p=node("div");p.className="entry";p.append(node("strong",o.ott),node("p",o.equipo+" · "+fechaCorta(o.ejecutadaEn)));p.append(btn("Ver detalle",()=>openFromDashboard(o.ott),true));recent.append(p);}
 root.append(grid);
 const listing=node("div");listing.className="card";listing.append(node("h2","Consulta de órdenes"));
 const filters=node("div");filters.className="filter-row";const sel=document.createElement("select");["Todas","Pendiente","Ejecutada"].forEach(x=>{const op=node("option",x);op.value=x;sel.append(op);});sel.value=filtroEstado;sel.onchange=()=>{filtroEstado=sel.value;renderDashboard();};
 const weeks=document.createElement("select");["Todas",...[...grouped.keys()].sort()].forEach(x=>{const op=node("option",x==="Todas"?"Todas las semanas":x);op.value=x;weeks.append(op);});weeks.value=filtroSemana;weeks.onchange=()=>{filtroSemana=weeks.value;renderDashboard();};filters.append(node("label","Estado"),sel,node("label","Semana"),weeks);listing.append(filters);
 const matches=all.filter(o=>(filtroEstado==="Todas"||o.estado===filtroEstado)&&(filtroSemana==="Todas"||semanaISO(o.fecha)===filtroSemana));listing.append(node("p",matches.length+" órdenes encontradas"));
 const scroll=node("div");scroll.className="dash-scroll";const table=document.createElement("table");table.className="dash-table";const head=document.createElement("thead");const tr=document.createElement("tr");["OTT","Equipo / actividad","Estado","Ejecución","Técnicos","Horas","Detalle"].forEach(t=>tr.append(node("th",t)));head.append(tr);table.append(head);const body=document.createElement("tbody");
 for(const o of matches.slice(0,200)){const tr=document.createElement("tr");const totalH=Object.values(o.horas||{}).reduce((a,v)=>a+Number(v||0),0);[o.ott,o.equipo+" · "+o.actividad,o.estado,fechaCorta(o.ejecutadaEn),Object.keys(o.horas||{}).join(", ")||"—",fmt(totalH)+" h"].forEach(v=>tr.append(node("td",v)));const cell=node("td");cell.append(btn("Abrir",()=>openFromDashboard(o.ott),true));tr.append(cell);body.append(tr);}
 table.append(body);scroll.append(table);listing.append(scroll);if(matches.length>200)listing.append(node("p","Se muestran las primeras 200 órdenes. Utiliza los filtros para acotar la consulta."));root.append(listing);
}
function openFromDashboard(ott){$("buscar").value=ott;show("ordenes");detail(ott);}
function renderList(){const q=$("buscar").value.trim().toLocaleLowerCase("es");const list=$("lista");list.replaceChildren();for(const o of state.ordenes.filter(x=>(x.ott+" "+x.equipo+" "+x.actividad).toLocaleLowerCase("es").includes(q))){const p=node("div");p.className="entry";p.append(node("strong",o.ott+" · "+o.equipo),node("p",o.actividad+" · "+o.estado+" · "+o.fecha),btn("Ver orden",()=>detail(o.ott),true));list.append(p);}if(!list.childNodes.length)list.append(node("p","No hay órdenes que coincidan."));}
function detail(ott){
const o=state.ordenes.find(x=>x.ott===ott);if(!o)return;
const d=$("detalle");d.classList.remove("hidden");d.replaceChildren(node("h2",o.ott),node("p",o.equipo+" · "+o.actividad),node("p","Fecha programada: "+o.fecha),node("p","Estado: "+o.estado));
const title=node("h3","Técnicos participantes");d.append(title);
const help=node("p","Busca el nombre y selecciónalo de la lista. Agrega tantos técnicos como participaron.");help.className="muted";d.append(help);
const rows=node("div");d.append(rows);
const selected=Object.entries(o.horas||{}).map(([nombre,horas])=>({nombre,horas:String(horas)}));
function addRow(nombre="",horas=""){
 const wrap=node("div");wrap.className="tech-row";
 const nameLabel=node("label","Técnico");const nameInput=document.createElement("input");nameInput.type="text";nameInput.setAttribute("list","catalogo-tecnicos");nameInput.placeholder="Escribe para buscar técnico";nameInput.value=nombre;nameInput.autocomplete="off";
 const hoursLabel=node("label","Horas trabajadas");const hours=document.createElement("input");hours.type="text";hours.inputMode="decimal";hours.placeholder="Ej. 2,5";hours.value=horas;
 const remove=btn("Quitar técnico",()=>{wrap.remove();updateTotals();},true);
 nameInput.addEventListener("input",updateTotals);hours.addEventListener("input",updateTotals);
 wrap.append(nameLabel,nameInput,hoursLabel,hours,remove);rows.append(wrap);updateTotals();
}
const data=document.createElement("datalist");data.id="catalogo-tecnicos";catalogo.forEach(t=>{const opt=document.createElement("option");opt.value=t;data.append(opt);});d.append(data);
const total=node("p");total.className="muted";
function updateTotals(){const items=[...rows.querySelectorAll(".tech-row")];const sum=items.reduce((n,r)=>{const v=r.querySelectorAll("input")[1].value.trim().replace(",",".");return n+(v!==""&&Number.isFinite(Number(v))?Number(v):0);},0);total.textContent="Operarios: "+items.length+" · Total horas: "+sum.toLocaleString("es-CO",{maximumFractionDigits:2});}
d.append(btn("Agregar técnico",()=>addRow(),true),total);
if(selected.length)selected.forEach(x=>addRow(x.nombre,x.horas));else addRow();
const label=node("label","Trabajo realizado / observaciones");const obs=document.createElement("textarea");obs.maxLength=4000;obs.value=o.observaciones||"";d.append(label,obs);
const saveLabel=o.estado==="Ejecutada"?"Guardar correcciones":"Guardar ejecución y cerrar OTT";
d.append(btn(saveLabel,()=>{
 const horas={};const seen=new Set();const inputs=[...rows.querySelectorAll(".tech-row")];
 if(!inputs.length){alert("Agrega al menos un técnico.");return;}
 for(const row of inputs){
 const [nameInput,hoursInput]=row.querySelectorAll("input");const nombre=nameInput.value.trim();const raw=hoursInput.value.trim().replace(",",".");const valor=Number(raw);
 if(!nombre||!catalogo.some(t=>t.toLocaleLowerCase("es")===nombre.toLocaleLowerCase("es"))){alert("Selecciona un técnico válido de la lista.");nameInput.focus();return;}
 if(seen.has(nombre.toLocaleLowerCase("es"))){alert("El técnico "+nombre+" está repetido.");return;}seen.add(nombre.toLocaleLowerCase("es"));
 if(raw===""||!Number.isFinite(valor)||valor<=0||valor>24){alert("Indica horas mayores que 0 y hasta 24 para "+nombre+".");hoursInput.focus();return;}
 horas[nombre]=valor;
 }
 if(!obs.value.trim()){alert("Describe el trabajo realizado.");obs.focus();return;}
 const wasExecuted=o.estado==="Ejecutada";o.horas=horas;o.tecnicos=Object.keys(horas);o.observaciones=obs.value.trim();o.estado="Ejecutada";if(!o.ejecutadaEn)o.ejecutadaEn=new Date().toISOString();event(ott,wasExecuted?"Ejecución corregida":"Ejecución registrada");save();detail(ott);
}));
if(o.estado==="Ejecutada")d.append(node("p","Esta orden ya está ejecutada. Puedes corregir sus datos y guardar de nuevo."));
d.scrollIntoView({behavior:"smooth",block:"start"});
}
function renderHistory(){const x=$("eventos");x.replaceChildren();if(!state.eventos.length)x.append(node("p","Todavía no hay registros."));for(const e of state.eventos){const d=node("div");d.className="entry";d.append(node("strong",e.ott),node("p",e.accion+" · "+e.fecha));x.append(d);}}
$("buscar").addEventListener("input",renderList);$("buscarBtn").onclick=renderList;
$("reiniciar").onclick=()=>{if(confirm("¿Eliminar todos los registros ficticios de esta demostración?")){state=initial();save();$("detalle").classList.add("hidden");}};
function stopCamera(){scanning=false;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;$("video").srcObject=null;$("scanner").classList.add("hidden");}
$("detener").onclick=stopCamera;
$("qrBtn").onclick=async()=>{if(!("BarcodeDetector" in window)){ $("scanMsg").textContent="Este navegador no admite el escaneo QR integrado. Puedes buscar la OTT manualmente.";return;}try{const detector=new BarcodeDetector({formats:["qr_code"]});stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});$("video").srcObject=stream;$("scanner").classList.remove("hidden");$("scanMsg").textContent="Apunta a un QR que contenga una OTT de demostración.";scanning=true;while(scanning){if($("video").readyState>=2){const found=await detector.detect($("video"));if(found.length){let value=found[0].rawValue.trim();try{value=new URL(value).searchParams.get("ott")||value;}catch{}$("buscar").value=value;stopCamera();renderList();const o=state.ordenes.find(x=>x.ott===value);if(o)detail(o.ott);else $("scanMsg").textContent="La OTT no existe en los datos de demostración.";break;}}await new Promise(r=>setTimeout(r,350));}}catch(e){$("scanMsg").textContent="No fue posible iniciar la cámara: "+e.message;stopCamera();}};
state=load();render();
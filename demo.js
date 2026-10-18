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
function render(){const all=state.ordenes;const count=s=>all.filter(o=>o.estado===s).length;$("total").textContent=all.length;$("pendientes").textContent=count("Pendiente");$("ejecutadas").textContent=count("Ejecutada");$("resumen").textContent="Pendientes: "+count("Pendiente")+" · Ejecutadas: "+count("Ejecutada");renderList();renderHistory();}
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
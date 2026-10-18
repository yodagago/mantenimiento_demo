"use strict";
const $=id=>document.getElementById(id);
const seed=[
{ott:"OTT-DEMO-001",equipo:"Bomba de riego 1",actividad:"Inspección y lubricación",fecha:"2026-10-19",tecnicos:["Técnico A","Técnico B"]},
{ott:"OTT-DEMO-002",equipo:"Motor de ventilación",actividad:"Revisión eléctrica",fecha:"2026-10-20",tecnicos:["Técnico C"]},
{ott:"OTT-DEMO-003",equipo:"Sistema de fertirriego",actividad:"Calibración preventiva",fecha:"2026-10-21",tecnicos:["Técnico A","Técnico C"]},
{ott:"OTT-DEMO-004",equipo:"Banda transportadora",actividad:"Inspección mecánica",fecha:"2026-10-22",tecnicos:["Técnico B"]}
];
const KEY="mantenimiento-cv-demo-v1";
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
function detail(ott){const o=state.ordenes.find(x=>x.ott===ott);if(!o)return;const d=$("detalle");d.classList.remove("hidden");d.replaceChildren(node("h2",o.ott),node("p",o.equipo+" · "+o.actividad),node("p","Fecha programada: "+o.fecha),node("p","Estado: "+o.estado));
const tech=node("div");tech.append(node("h3","Horas por técnico"));const inputs=[];for(const t of o.tecnicos){const label=node("label",t);const input=document.createElement("input");input.type="number";input.min="0";input.max="24";input.step="0.25";input.value=o.horas[t]??"";input.disabled=o.estado!=="Pendiente";tech.append(label,input);inputs.push({t,input});}d.append(tech);
const label=node("label","Trabajo realizado / observaciones");const obs=document.createElement("textarea");obs.maxLength=4000;obs.value=o.observaciones;obs.disabled=o.estado!=="Pendiente";d.append(label,obs);
if(o.estado==="Pendiente")d.append(btn("Registrar ejecución",()=>{const horas={};for(const {t,input} of inputs){if(input.value.trim()===""||!Number.isFinite(Number(input.value))||Number(input.value)<0||Number(input.value)>24){alert("Completa las horas válidas de cada técnico (0 a 24).");return;}horas[t]=Number(input.value);}if(!obs.value.trim()){alert("Escribe el trabajo realizado.");return;}o.horas=horas;o.observaciones=obs.value.trim();o.estado="Ejecutada";o.ejecutadaEn=new Date().toISOString();event(ott,"Ejecución registrada");save();detail(ott);}));
if(o.estado==="Ejecutada")d.append(node("p","Ejecución registrada correctamente."));
d.scrollIntoView({behavior:"smooth",block:"start"});}
function renderHistory(){const x=$("eventos");x.replaceChildren();if(!state.eventos.length)x.append(node("p","Todavía no hay registros."));for(const e of state.eventos){const d=node("div");d.className="entry";d.append(node("strong",e.ott),node("p",e.accion+" · "+e.fecha));x.append(d);}}
$("buscar").addEventListener("input",renderList);$("buscarBtn").onclick=renderList;
$("reiniciar").onclick=()=>{if(confirm("¿Eliminar todos los registros ficticios de esta demostración?")){state=initial();save();$("detalle").classList.add("hidden");}};
function stopCamera(){scanning=false;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;$("video").srcObject=null;$("scanner").classList.add("hidden");}
$("detener").onclick=stopCamera;
$("qrBtn").onclick=async()=>{if(!("BarcodeDetector" in window)){ $("scanMsg").textContent="Este navegador no admite el escaneo QR integrado. Puedes buscar la OTT manualmente.";return;}try{const detector=new BarcodeDetector({formats:["qr_code"]});stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});$("video").srcObject=stream;$("scanner").classList.remove("hidden");$("scanMsg").textContent="Apunta a un QR que contenga una OTT de demostración.";scanning=true;while(scanning){if($("video").readyState>=2){const found=await detector.detect($("video"));if(found.length){let value=found[0].rawValue.trim();try{value=new URL(value).searchParams.get("ott")||value;}catch{}$("buscar").value=value;stopCamera();renderList();const o=state.ordenes.find(x=>x.ott===value);if(o)detail(o.ott);else $("scanMsg").textContent="La OTT no existe en los datos de demostración.";break;}}await new Promise(r=>setTimeout(r,350));}}catch(e){$("scanMsg").textContent="No fue posible iniciar la cámara: "+e.message;stopCamera();}};
state=load();render();
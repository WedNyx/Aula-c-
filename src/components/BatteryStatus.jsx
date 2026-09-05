import { useEffect, useState } from "react";

export function batteryAppearance(level, charging) {
  const percent = Math.max(0, Math.min(100, Math.round(Number(level || 0) * 100)));
  return { percent, color:charging?"#34d399":percent<=20?"#f87171":percent<=40?"#fbbf24":"#a5f3fc", icon:charging?"⚡":percent<=20?"🪫":"🔋" };
}

export function BatteryStatus() {
  const [battery,setBattery]=useState(null);
  useEffect(()=>{
    let active=true,manager=null;
    const update=()=>{if(active&&manager)setBattery({level:manager.level,charging:manager.charging});};
    if(typeof navigator==="undefined"||typeof navigator.getBattery!=="function") return undefined;
    navigator.getBattery().then(value=>{if(!active)return;manager=value;update();manager.addEventListener("levelchange",update);manager.addEventListener("chargingchange",update);}).catch(()=>{});
    return()=>{active=false;if(manager){manager.removeEventListener("levelchange",update);manager.removeEventListener("chargingchange",update);}};
  },[]);
  if(!battery)return null;
  const view=batteryAppearance(battery.level,battery.charging);
  return <span data-tour="bateria" role="status" aria-label={`Bateria em ${view.percent} por cento${battery.charging?", carregando":""}`} title={battery.charging?`Bateria: ${view.percent}% · carregando`:`Bateria: ${view.percent}%`} style={{display:"inline-flex",alignItems:"center",gap:5,color:view.color,fontSize:11.5,fontWeight:800,whiteSpace:"nowrap"}}><span aria-hidden="true">{view.icon}</span>{view.percent}%</span>;
}

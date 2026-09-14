import { useEffect, useMemo, useState } from "react";
import { publicApis } from "../lib/publicApis.js";

const WEATHER_LABELS = {
  0:"Céu limpo",1:"Predomínio de sol",2:"Parcialmente nublado",3:"Nublado",
  45:"Neblina",48:"Neblina",51:"Garoa",53:"Garoa",55:"Garoa forte",
  61:"Chuva fraca",63:"Chuva",65:"Chuva forte",80:"Pancadas",81:"Pancadas",82:"Pancadas fortes",95:"Trovoadas",
};

function useNotebookBattery() {
  const [battery,setBattery]=useState(null);
  useEffect(()=>{
    let active=true,manager;
    const update=()=>active&&manager&&setBattery({level:Math.round(manager.level*100),charging:manager.charging});
    if(typeof navigator==="undefined"||typeof navigator.getBattery!=="function") return;
    navigator.getBattery().then(value=>{if(!active)return;manager=value;update();manager.addEventListener("levelchange",update);manager.addEventListener("chargingchange",update);}).catch(()=>{});
    return()=>{active=false;manager?.removeEventListener("levelchange",update);manager?.removeEventListener("chargingchange",update);};
  },[]);
  return battery;
}

export function PlatformStatusBar() {
  const battery=useNotebookBattery();
  const [weather,setWeather]=useState(null);
  const [timeBase,setTimeBase]=useState(null);
  const [tick,setTick]=useState(Date.now());

  useEffect(()=>{
    let active=true;
    const loadWeather=()=>publicApis.weather(-15.7939,-47.8828,1).then(r=>{if(active)setWeather(r.data?.current||null);}).catch(()=>{});
    const loadTime=()=>publicApis.time().then(r=>{
      if(!active)return;
      const data=r.data||{};
      const parsed=Date.parse(data.dateTime||data.date_time||data.datetime||"");
      setTimeBase({epoch:Number.isFinite(parsed)?parsed:Date.now(),receivedAt:Date.now(),source:"api"});
    }).catch(()=>{if(active)setTimeBase(base=>base||{epoch:Date.now(),receivedAt:Date.now(),source:"local"});});
    loadWeather(); loadTime();
    const weatherTimer=setInterval(loadWeather,15*60*1000);
    const timeTimer=setInterval(loadTime,10*60*1000);
    const tickTimer=setInterval(()=>setTick(Date.now()),1000);
    return()=>{active=false;clearInterval(weatherTimer);clearInterval(timeTimer);clearInterval(tickTimer);};
  },[]);

  const brasiliaTime=useMemo(()=>{
    const date=timeBase?new Date(timeBase.epoch+(tick-timeBase.receivedAt)):new Date(tick);
    return date.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"America/Sao_Paulo"});
  },[tick,timeBase]);

  const weatherText=weather?`${Math.round(weather.temperature_2m)}°C · ${WEATHER_LABELS[weather.weather_code]||"Clima atualizado"}`:"Clima carregando";
  const batteryText=battery?`${battery.level}%${battery.charging?" · carregando":""}`:"não disponível";
  const low=battery&&battery.level<=20&&!battery.charging;

  return <aside className="platform-status-bar" aria-label="Informações do notebook e de Brasília">
    <span title="Horário de Brasília sincronizado pela TimeAPI.io"><i aria-hidden="true">🕒</i><b>{brasiliaTime}</b><small>Brasília</small></span>
    <span title="Clima de Brasília fornecido pelo Open-Meteo"><i aria-hidden="true">{weather?.is_day===0?"🌙":"🌤️"}</i><b>{weatherText}</b><small>Clima de Brasília</small></span>
    <span className={low?"battery-low":""} title={battery?"Bateria informada pelo navegador":"Este navegador não permite consultar a bateria"}><i aria-hidden="true">{battery?.charging?"⚡":low?"🪫":"🔋"}</i><b>{batteryText}</b><small>Bateria do notebook</small></span>
  </aside>;
}

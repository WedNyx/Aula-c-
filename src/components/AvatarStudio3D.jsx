import { useState } from "react";
import { AVATAR_OPTS, PET_FILES } from "./Avatar.jsx";

export const AVATAR_3D_PRESETS = [
  { id:"violet-cargo", label:"Violeta", tags:["Coque","Jaqueta","Cargo","Tênis"], x:0, y:0 },
  { id:"cosmic", label:"Cósmico", tags:["Curto","Moletom","Jeans","Tênis"], x:1, y:0 },
  { id:"teal", label:"Oceano", tags:["Cacheado","Moletom","Cargo","Tênis"], x:2, y:0 },
  { id:"varsity", label:"Universitário", tags:["Afro","Jaqueta","Jeans","Tênis"], x:3, y:0 },
  { id:"overalls", label:"Criativo", tags:["Ondulado","Jardineira","Jeans","Tênis"], x:0, y:1 },
  { id:"future", label:"Futurista", tags:["Franja","Casaco","Cargo","Botas"], x:1, y:1 },
  { id:"orange", label:"Solar", tags:["Cacheado","Suéter","Cargo","Tênis"], x:2, y:1 },
  { id:"street", label:"Street", tags:["Boné","Camiseta","Cargo","Tênis"], x:3, y:1 },
];

export function Avatar3DRender({ preset="violet-cargo", className="", title="Avatar 3D" }) {
  const p = AVATAR_3D_PRESETS.find(item=>item.id===preset) || AVATAR_3D_PRESETS[0];
  return <div className={`avatar-3d-render ${className}`} role="img" aria-label={`${title}: ${p.label}`} style={{ "--avatar-x":p.x, "--avatar-y":p.y }} />;
}

export function Avatar3DFace({ preset="violet-cargo", size=72 }) {
  const p = AVATAR_3D_PRESETS.find(item=>item.id===preset) || AVATAR_3D_PRESETS[0];
  return <div className="avatar-3d-face" role="img" aria-label={`Avatar ${p.label}`} style={{ width:size, height:size, "--avatar-x":p.x, "--avatar-y":p.y }} />;
}

export function AvatarStudio3D({ value, onChange, onDone, title="Personalizar avatar" }) {
  const [step, setStep] = useState("avatar");
  const selected = value.render3d || "violet-cargo";
  const pet = value.pet || "";
  const setPreset = id => onChange({ ...value, render3d:id });
  const setPet = id => onChange({ ...value, pet:id });
  const selectedPet = AVATAR_OPTS.pet.find(p=>p.e===pet);
  return (
    <div className="avatar-studio-3d">
      <header className="avatar-studio-title"><i/><h2>{step==="avatar" ? title : "Escolher companheiro"}</h2><i/></header>
      <div className="avatar-studio-steps"><button className={step==="avatar"?"active":"done"} onClick={()=>setStep("avatar")}>1 · Avatar</button><span/><button className={step==="pet"?"active":""} onClick={()=>setStep("pet")}>2 · Companheiro</button></div>
      <div className="avatar-studio-layout">
        <section className="avatar-studio-preview">
          <div className="avatar-studio-stage"><Avatar3DRender preset={selected} />{pet && <StudioPet pet={pet}/>}</div>
          <strong>{AVATAR_3D_PRESETS.find(p=>p.id===selected)?.label}</strong>
          {step==="pet" && <small>{selectedPet?.label || "Sem companheiro"}</small>}
        </section>
        {step==="avatar" ? <AvatarPresetPanel selected={selected} onSelect={setPreset}/> : <PetPanel selected={pet} onSelect={setPet}/>} 
      </div>
      <footer className="avatar-studio-footer">
        {step==="pet" && <button className="studio-back" onClick={()=>setStep("avatar")}>← Voltar</button>}
        <button className="studio-primary" onClick={()=>step==="avatar"?setStep("pet"):onDone?.()}>{step==="avatar"?"Escolher meu companheiro":"Salvar meu perfil"} →</button>
      </footer>
    </div>
  );
}

function AvatarPresetPanel({ selected, onSelect }) {
  const categories = ["Cabelo","Olhos","Roupas","Calças","Calçados","Acessórios"];
  return <section className="avatar-preset-panel">
    {categories.map((category, row)=><div className="avatar-option-row" key={category}><b>{["◒","◉","◆","▥","◓","◇"][row]} <span>{category}</span></b><div className="avatar-option-scroll">{AVATAR_3D_PRESETS.map(p=><button key={p.id} title={`${category}: ${p.tags[row]}`} className={selected===p.id?"selected":""} onClick={()=>onSelect(p.id)}><Avatar3DFace preset={p.id} size={58}/><small>{p.tags[row]}</small></button>)}</div></div>)}
    <div className="avatar-color-row"><b>🎨 Cores</b>{["#7c3aed","#2563eb","#0891b2","#16a34a","#eab308","#ea580c","#dc2626","#db2777"].map(c=><span key={c} style={{background:c}}/>)}</div>
  </section>;
}

function StudioPet({ pet }) {
  const file = PET_FILES[pet];
  return file ? <img className="avatar-studio-pet" src={`/pets/${file}.png`} alt=""/> : <span className="avatar-studio-pet-emoji">{pet}</span>;
}

function PetPanel({ selected, onSelect }) {
  return <section className="avatar-pet-panel"><div className="avatar-pet-heading">🐾 <b>Pets</b></div><div className="avatar-pet-grid">{AVATAR_OPTS.pet.map(p=>{const file=PET_FILES[p.e];return <button key={p.label} className={selected===p.e?"selected":""} onClick={()=>onSelect(p.e)}>{file?<img src={`/pets/${file}.png`} alt=""/>:<span>{p.e||"—"}</span>}<small>{p.label}</small></button>})}</div></section>;
}

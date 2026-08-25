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
  return <img className={`avatar-3d-render ${className}`} src={`/avatar3d/presets/${p.id}.webp`} alt={`${title}: ${p.label}`} draggable={false} />;
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
  return <section className="avatar-preset-panel">
    <div className="avatar-preset-heading"><span>✨</span><div><b>Estilos 3D</b><small>Escolha um personagem completo. Nenhuma peça muda outra escolha escondida.</small></div></div>
    <div className="avatar-preset-grid">{AVATAR_3D_PRESETS.map(p=><button key={p.id} className={selected===p.id?"selected":""} onClick={()=>onSelect(p.id)}><Avatar3DRender preset={p.id}/><strong>{p.label}</strong><small>{p.tags.join(" · ")}</small></button>)}</div>
  </section>;
}

function StudioPet({ pet }) {
  const file = PET_FILES[pet];
  return file ? <img className="avatar-studio-pet" src={`/pets/${file}.png`} alt=""/> : <span className="avatar-studio-pet-emoji">{pet}</span>;
}

function PetPanel({ selected, onSelect }) {
  return <section className="avatar-pet-panel"><div className="avatar-pet-heading">🐾 <b>Pets</b></div><div className="avatar-pet-grid">{AVATAR_OPTS.pet.map(p=>{const file=PET_FILES[p.e];return <button key={p.label} className={selected===p.e?"selected":""} onClick={()=>onSelect(p.e)}>{file?<img src={`/pets/${file}.png`} alt=""/>:<span>{p.e||"—"}</span>}<small>{p.label}</small></button>})}</div></section>;
}

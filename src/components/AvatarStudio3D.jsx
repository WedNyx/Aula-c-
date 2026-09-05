import { useState } from "react";
import { AVATAR_OPTS, PET_FILES, avatarPresetSrc } from "./Avatar.jsx";
import { normalizePetName, petNameFor, PET_NAME_LIMIT } from "../lib/classroomUpdates.js";

export const AVATAR_3D_PRESETS = [
  ...Array.from({ length:8 }, (_,i)=>({ id:`masculino-${String(i+1).padStart(2,"0")}`, label:`Masculino ${i+1}`, group:"masculino" })),
  ...Array.from({ length:8 }, (_,i)=>({ id:`feminino-${String(i+1).padStart(2,"0")}`, label:`Feminino ${i+1}`, group:"feminino" })),
];

export function Avatar3DRender({ preset="violet-cargo", className="", title="Avatar 3D" }) {
  const p = AVATAR_3D_PRESETS.find(item=>item.id===preset);
  const id = p?.id || preset || AVATAR_3D_PRESETS[0].id;
  const label = p?.label || "Avatar anterior";
  return <img className={`avatar-3d-render ${className}`} src={avatarPresetSrc(id)} alt={`${title}: ${label}`} draggable={false} />;
}

export function AvatarStudio3D({ value, onChange, onDone, title="Personalizar avatar", saving=false, saveError="" }) {
  const [step, setStep] = useState("avatar");
  const selected = value.render3d || "masculino-01";
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
          <strong>{AVATAR_3D_PRESETS.find(p=>p.id===selected)?.label || "Avatar anterior"}</strong>
          {step==="pet" && <small>{petNameFor(value) || selectedPet?.label || "Sem companheiro"}</small>}
        </section>
        {step==="avatar" ? <AvatarPresetPanel selected={selected} onSelect={setPreset}/> : <PetPanel selected={pet} onSelect={setPet}/>} 
      </div>
      {step === "pet" && pet && <label className="pet-name-editor" style={{display:"grid",gap:6,margin:"14px 0",color:"#eee"}}>
        Nome do seu pet (até {PET_NAME_LIMIT} caracteres)
        <input aria-label="Nome do pet" maxLength={PET_NAME_LIMIT * 2} value={value.petNames?.[pet] || ""} placeholder={selectedPet?.label || "Nome do pet"}
          onChange={e => onChange({...value, petNames:{...value.petNames, [pet]: Array.from(e.target.value.replace(/[\u0000-\u001f\u007f]/g," ")).slice(0,PET_NAME_LIMIT).join("")}})}
          onBlur={e => onChange({...value, petNames:{...value.petNames, [pet]:normalizePetName(e.target.value)}})} />
        <small>Deixe vazio para usar o nome da espécie. Cada pet guarda seu próprio nome.</small>
      </label>}
      <footer className="avatar-studio-footer">
        {step==="pet" && <button className="studio-back" disabled={saving} onClick={()=>setStep("avatar")}>← Voltar</button>}
        <button className="studio-primary" disabled={saving} aria-busy={saving} onClick={()=>step==="avatar"?setStep("pet"):onDone?.()}>
          {step==="avatar" ? "Escolher meu companheiro" : saving ? "Salvando…" : "Salvar meu perfil"} {!saving && "→"}
        </button>
      </footer>
      {saveError && <div className="avatar-save-error" role="alert">{saveError}</div>}
    </div>
  );
}

function AvatarPresetPanel({ selected, onSelect }) {
  const selectedPreset = AVATAR_3D_PRESETS.find(p=>p.id===selected);
  const [group, setGroup] = useState(selectedPreset?.group || "masculino");
  const visible = AVATAR_3D_PRESETS.filter(p=>p.group===group);
  return <section className="avatar-preset-panel">
    <div className="avatar-preset-heading"><span>✨</span><div><b>Avatares 2.5D</b><small>Escolha uma aparência completa para seu perfil.</small></div></div>
    <div className="avatar-group-tabs" role="tablist" aria-label="Categorias de avatar">
      <button type="button" role="tab" aria-selected={group==="masculino"} className={group==="masculino"?"active":""} onClick={()=>setGroup("masculino")}>Masculinos</button>
      <button type="button" role="tab" aria-selected={group==="feminino"} className={group==="feminino"?"active":""} onClick={()=>setGroup("feminino")}>Femininos</button>
    </div>
    <div className="avatar-preset-grid">{visible.map(p=><button type="button" key={p.id} aria-pressed={selected===p.id} className={selected===p.id?"selected":""} onClick={()=>onSelect(p.id)}><Avatar3DRender preset={p.id}/><strong>{p.label}</strong><small>{selected===p.id?"Selecionado":"Escolher"}</small></button>)}</div>
  </section>;
}

function StudioPet({ pet }) {
  const file = PET_FILES[pet];
  return file ? <img className="avatar-studio-pet" src={`/pets/${file}.webp`} alt=""/> : <span className="avatar-studio-pet-emoji">{pet}</span>;
}

function PetPanel({ selected, onSelect }) {
  return <section className="avatar-pet-panel"><div className="avatar-pet-heading">🐾 <b>Pets</b></div><div className="avatar-pet-grid">{AVATAR_OPTS.pet.map(p=>{const file=PET_FILES[p.e];return <button key={p.label} className={selected===p.e?"selected":""} onClick={()=>onSelect(p.e)}>{file?<img src={`/pets/${file}.webp`} alt=""/>:<span>{p.e||"—"}</span>}<small>{p.label}</small></button>})}</div></section>;
}

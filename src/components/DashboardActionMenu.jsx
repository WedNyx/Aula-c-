import { useEffect, useRef, useState } from "react";

export function DashboardActionMenu({label="Mais",icon="•••",ariaLabel="Abrir menu",align="right",children}) {
  const [open,setOpen]=useState(false);
  const rootRef=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const close=event=>{if(event.key==="Escape"||!rootRef.current?.contains(event.target))setOpen(false);};
    document.addEventListener("keydown",close);document.addEventListener("pointerdown",close);
    return()=>{document.removeEventListener("keydown",close);document.removeEventListener("pointerdown",close);};
  },[open]);
  return <div ref={rootRef} className="dashboard-action-menu">
    <button type="button" className="dashboard-action-menu-trigger" aria-expanded={open} aria-haspopup="menu" aria-label={ariaLabel} onClick={()=>setOpen(value=>!value)}><span aria-hidden="true">{icon}</span><span>{label}</span></button>
    {open&&<div role="menu" className={`dashboard-action-menu-panel dashboard-action-menu-panel--${align}`} onClick={event=>{if(event.target.closest("button"))setOpen(false);}}>{children}</div>}
  </div>;
}

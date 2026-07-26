// ════════════════════════════════════════════════════════════════════════════
//  TECLAS + ROBÔ
// ════════════════════════════════════════════════════════════════════════════
export const KEY_IMAGES = {
  "{": { label:"Shift + [", desc:"Segure SHIFT e aperte [" },
  "}": { label:"Shift + ]", desc:"Segure SHIFT e aperte ]" },
  "(": { label:"Shift + 9", desc:"Segure SHIFT e aperte 9" },
  ")": { label:"Shift + 0", desc:"Segure SHIFT e aperte 0" },
  ";": { label:";", desc:"Aperte ; (ponto e vírgula)" },
  ":": { label:"Shift + ;", desc:"Segure SHIFT e aperte ;" },
  '"': { label:'"', desc:"Segure SHIFT e aperte '" },
  "=": { label:"=", desc:"Aperte = (igual)" },
  ".": { label:".", desc:"Aperte . (ponto)" },
  ",": { label:",", desc:"Aperte , (vírgula)" },
  "[": { label:"[", desc:"Aperte [ (colchete)" },
  "]": { label:"]", desc:"Aperte ] (colchete)" },
};
export function KeyVisual({ char }) {
  const info = KEY_IMAGES[char] || { label: char, desc: `Aperte ${char}` };
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, margin:"6px 0" }}>
      <div style={{ background:"linear-gradient(180deg,#f5f5f5,#d0d0d0)", border:"2px solid #888", borderRadius:6, boxShadow:"0 3px 0 #555", padding:"4px 10px", fontFamily:"monospace", fontWeight:700, fontSize:15, color:"#222", minWidth:40, textAlign:"center", userSelect:"none" }}>{info.label}</div>
      <span style={{ color:"#a99ac9", fontSize:13 }}>{info.desc}</span>
    </div>
  );
}

import { useMemo } from "react";

// chuva de confete + banner quando a turma sobe de nível na meta coletiva
export function ConfettiParty({ level }) {
  const pieces = useMemo(() => Array.from({ length: 70 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 1.6,
    dur: 2.4 + Math.random() * 2,
    size: 6 + Math.random() * 7,
    color: ["#c084fc","#22d3ee","#34d399","#fbbf24","#ec4899","#f87171"][i % 6],
    rot: Math.random() * 360,
  })), []);
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1400, pointerEvents:"none", overflow:"hidden" }}>
      <style>{`@keyframes confete-cai { 0% { transform: translateY(-4vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(106vh) rotate(720deg); opacity: 0.8; } }`}</style>
      {pieces.map((p, i) => (
        <div key={i} style={{ position:"absolute", top:0, left:`${p.left}%`, width:p.size, height:p.size*0.6, background:p.color, borderRadius:2, transform:`rotate(${p.rot}deg)`, animation:`confete-cai ${p.dur}s linear ${p.delay}s both` }} />
      ))}
      <div style={{ position:"absolute", top:"18%", left:"50%", transform:"translateX(-50%)", background:"linear-gradient(135deg,#c084fc,#22d3ee)", color:"#fff", fontWeight:900, padding:"14px 28px", borderRadius:20, boxShadow:"0 14px 44px rgba(0,0,0,.5)", fontSize:17, textAlign:"center", animation:"rise .4s ease both" }}>
        🎉 A TURMA SUBIU DE NÍVEL! 🎉<br/>
        <span style={{ fontSize:13.5, fontWeight:700, opacity:0.95 }}>Meta coletiva: nível {level} alcançado — parabéns a todos!</span>
      </div>
    </div>
  );
}

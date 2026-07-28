import { useState, useEffect } from "react";
import { gradeInfo } from "../lib/utils.js";
import { shade } from "../lib/colors.js";

// gráfico de "notas ao longo do tempo" — carrega o Recharts sob demanda (chunk separado, só baixa
// quando esta tela abre) e mostra o gráfico de barras simples como fallback enquanto ele não chega
export function PerformanceChart({ entries }) {
  const [RC, setRC] = useState(null);
  useEffect(() => {
    let alive = true;
    import("recharts").then(mod => { if (alive) setRC(mod); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const fmt = (d) => { const [, m, dd] = d.split("-"); return `${dd}/${m}`; };
  const data = entries.slice(-14).map(([d, n]) => ({ date: fmt(d), nota: n }));

  if (!RC) {
    return (
      <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:120, overflowX:"auto", paddingBottom:4, borderBottom:"1px solid #3b2a58" }}>
        {data.map(({ date, nota }) => {
          const g = gradeInfo(nota);
          return (
            <div key={date} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, minWidth:38 }}>
              <span style={{ color:g.color, fontSize:11, fontWeight:800 }}>{nota}</span>
              <div style={{ width:24, height:Math.max(4, Math.round(nota * 0.9)), background:`linear-gradient(180deg, ${g.color}, ${shade(g.color, -0.3)})`, borderRadius:"5px 5px 2px 2px" }} title={`${date}: ${nota} pts`} />
            </div>
          );
        })}
      </div>
    );
  }

  const { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } = RC;
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const n = payload[0].value;
    const g = gradeInfo(n);
    return (
      <div style={{ background:"#1e1430", border:`1px solid ${g.color}`, borderRadius:10, padding:"6px 10px", fontSize:12, boxShadow:"0 6px 18px rgba(0,0,0,.4)" }}>
        <div style={{ color:"#a99ac9" }}>{label}</div>
        <div style={{ color:g.color, fontWeight:900 }}>{n} pts</div>
      </div>
    );
  };
  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top:8, right:8, left:-20, bottom:0 }}>
        <defs>
          <linearGradient id="perfDesempGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c084fc" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#c084fc" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#3b2a58" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" stroke="#776798" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} stroke="#776798" fontSize={10} tickLine={false} axisLine={false} width={26} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="nota" stroke="#c084fc" strokeWidth={2.5} fill="url(#perfDesempGrad)" dot={{ r:3, fill:"#c084fc", strokeWidth:0 }} activeDot={{ r:5 }} animationDuration={700} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

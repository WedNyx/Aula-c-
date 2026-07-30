import { useState, useEffect } from "react";
import { shade } from "../lib/colors.ts";
import { gradeInfo } from "../lib/utils.js";

// mesmo visual do PerformanceChart (gradiente, Recharts), mas pra média/taxa da TURMA por dia
// (em vez da nota de um aluno só) — usado em "Evolução da turma" (nota) e "Evolução da presença".
// gradId precisa ser único quando os dois gráficos aparecem juntos na mesma tela (ids de <svg>
// duplicados fazem o navegador aplicar sempre o PRIMEIRO gradiente a todas as cópias)
export function ClassTrendChart({ trend, unit = "pts", gradId = "classTrendGrad", color = "#c084fc" }) {
  const [RC, setRC] = useState(null);
  useEffect(() => {
    let alive = true;
    import("recharts").then(mod => { if (alive) setRC(mod); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const data = trend.map(({ date, avg, count }) => {
    const [, m, dd] = date.split("-");
    return { date: `${dd}/${m}`, avg, count };
  });
  const fmtVal = (n) => unit === "%" ? `${n}%` : `${n} ${unit}`;

  if (!RC) {
    return (
      <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:110, overflowX:"auto", paddingBottom:4 }}>
        {data.map(({ date, avg }) => {
          const g = gradeInfo(avg);
          return (
            <div key={date} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, minWidth:38 }}>
              <span style={{ color:g.color, fontSize:11, fontWeight:800 }}>{avg}</span>
              <div style={{ width:24, height:Math.max(4, Math.round(avg*0.7)), background:`linear-gradient(180deg, ${g.color}, ${shade(g.color,-0.3)})`, borderRadius:"5px 5px 2px 2px" }} title={`${date}: média ${fmtVal(avg)}`} />
              <span style={{ color:"#776798", fontSize:10 }}>{date}</span>
            </div>
          );
        })}
      </div>
    );
  }

  const { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } = RC;
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const { avg, count } = payload[0].payload;
    const g = gradeInfo(avg);
    return (
      <div style={{ background:"#1e1430", border:`1px solid ${g.color}`, borderRadius:10, padding:"6px 10px", fontSize:12, boxShadow:"0 6px 18px rgba(0,0,0,.4)" }}>
        <div style={{ color:"#a99ac9" }}>{label}</div>
        <div style={{ color:g.color, fontWeight:900 }}>{fmtVal(avg)}</div>
        <div style={{ color:"#776798", fontSize:11 }}>{count} aluno{count>1?"s":""}</div>
      </div>
    );
  };
  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top:8, right:8, left:-20, bottom:0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#3b2a58" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" stroke="#776798" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} stroke="#776798" fontSize={10} tickLine={false} axisLine={false} width={26} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="avg" stroke={color} strokeWidth={2.5} fill={`url(#${gradId})`} dot={{ r:3, fill:color, strokeWidth:0 }} activeDot={{ r:5 }} animationDuration={700} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

import { useMemo, useState } from 'react';
import './TeacherControls.css';
import { todayKey, dateKeyOf } from '../lib/schedule.ts';
import { attendanceOnDay, entryOnDay } from '../lib/classroomUpdates.js';
import { ClassTrendChart } from './ClassTrendChart.jsx';

const shortDate = day => {
  const [, month, date] = day.split('-');
  return `${date}/${month}`;
};

export function AttendancePanel({ students, shiftFilter, shiftLabel, classDaysByShift = {}, onSet }) {
  const [day, setDay] = useState(todayKey());
  const [period, setPeriod] = useState(14);
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState('');
  const shown = students.filter(s => shiftFilter === 'all' || s.shift === shiftFilter).sort((a,b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));
  const days = useMemo(() => {
    const scheduled = shown.flatMap(s => classDaysByShift[s.shift] || []);
    const recorded = shown.flatMap(s => [
      ...Object.keys(s.attendance || {}),
      ...Object.keys(s.attendanceOverrides || {}),
      ...Object.keys(s.attendanceFirst || {}),
    ]);
    const all = [...new Set([...scheduled, ...recorded])].filter(d => d <= todayKey()).sort();
    return period === 0 ? all : all.slice(-period);
  }, [shown, classDaysByShift, period]);
  const eligibleOn = (s, date) => {
    const enrolled = s.createdAt ? dateKeyOf(s.createdAt) : null;
    const scheduled = classDaysByShift[s.shift];
    return (!enrolled || date >= enrolled) && (!scheduled?.length || scheduled.includes(date));
  };
  const trend = days.map(date => {
    const eligible = shown.filter(s => eligibleOn(s, date));
    const present = eligible.filter(s => attendanceOnDay(s, date, dateKeyOf) === 'present').length;
    return { date, avg: eligible.length ? Math.round((present / eligible.length) * 100) : 0, count: eligible.length };
  }).filter(item => item.count > 0);
  const totalEligible = trend.reduce((sum, item) => sum + item.count, 0);
  const totalPresent = days.reduce((sum, date) => sum + shown.filter(s => eligibleOn(s, date) && attendanceOnDay(s, date, dateKeyOf) === 'present').length, 0);
  const average = totalEligible ? Math.round((totalPresent / totalEligible) * 100) : 0;
  const save = async (s, status) => {
    const id = `${s.shift}:${s.name}`;
    setBusy(id); setMessage('');
    try {
      const ok = await onSet(s, day, status);
      setMessage(ok ? `Chamada de ${s.name} atualizada.` : 'Não foi possível salvar. Tente novamente.');
    } catch { setMessage('Falha ao salvar. A chamada não foi confirmada.'); }
    finally { setBusy(null); }
  };
  return <section className="attendance-panel" data-tour-prof="attendance-body" style={{maxWidth:1180, margin:'18px auto', padding:20, color:'#eee', background:'#171026', borderRadius:16}}>
    <div className="attendance-heading"><div><h2>📋 Lista de chamada</h2><p>Consulte e ajuste a frequência sem sair da plataforma.</p></div><label className="teacher-control-label attendance-period">Período <select className="teacher-select" value={period} onChange={e => setPeriod(Number(e.target.value))}><option value={7}>7 aulas</option><option value={14}>14 aulas</option><option value={30}>30 aulas</option><option value={0}>Todo o histórico</option></select></label></div>
    <p>O acesso ao perfil é um sinal automático, não uma confirmação de identidade. Sua correção manual prevalece mesmo se o perfil entrar novamente.</p>
    <div className="attendance-summary" aria-label="Resumo de frequência"><div><strong>{shown.length}</strong><span>Alunos</span></div><div><strong>{days.length}</strong><span>Dias exibidos</span></div><div><strong>{average}%</strong><span>Presença média</span></div></div>
    <div className="attendance-chart-card"><div><h3>📈 Frequência da turma</h3><p>Percentual de alunos presentes em cada dia de aula do período.</p></div>{trend.length ? <ClassTrendChart trend={trend} unit="%" gradId="attendancePanelTrend" color="#34d399" /> : <p className="attendance-empty">Ainda não há dias de aula registrados para este período.</p>}</div>

    <div className="attendance-sheet-block">
      <div className="attendance-sheet-title"><h3>🧾 Planilha de presenças</h3><span>✓ presente · − ausente · • ainda não matriculado</span></div>
      <div className="attendance-sheet-scroll" tabIndex="0" aria-label="Planilha de frequência com rolagem horizontal">
        <table className="attendance-sheet"><thead><tr><th>Aluno</th>{days.map(date => <th key={date} title={date}>{shortDate(date)}</th>)}<th>Frequência</th></tr></thead>
          <tbody>{shown.map(s => {
            const eligibleDays = days.filter(date => eligibleOn(s, date));
            const presentDays = eligibleDays.filter(date => attendanceOnDay(s, date, dateKeyOf) === 'present').length;
            const rate = eligibleDays.length ? Math.round((presentDays / eligibleDays.length) * 100) : 0;
            return <tr key={`${s.shift}:${s.name}`}><th><span>{s.name}</span><small>{shiftLabel(s.shift)}</small></th>{days.map(date => {
              if (!eligibleOn(s, date)) return <td key={date} className="attendance-cell attendance-cell--na" title="Ainda não matriculado">•</td>;
              const present = attendanceOnDay(s, date, dateKeyOf) === 'present';
              const manual = s.attendanceOverrides?.[date];
              return <td key={date} className={`attendance-cell attendance-cell--${present ? 'present' : 'absent'}${manual ? ' attendance-cell--manual' : ''}`} title={`${present ? 'Presente' : 'Ausente'}${manual ? ' · ajuste manual' : ''}`}>{present ? '✓' : '−'}</td>;
            })}<td className="attendance-rate">{rate}%</td></tr>;
          })}</tbody>
        </table>
      </div>
      {!shown.length && <p className="attendance-empty">Nenhum aluno neste turno.</p>}
    </div>

    <div className="attendance-day-editor"><h3>✏️ Ajustar um dia</h3>
    <label className="teacher-control-label">Dia da chamada <input className="attendance-date" aria-label="Dia da chamada" type="date" value={day} max={todayKey()} onChange={e => e.target.value && setDay(e.target.value)} disabled={!!busy}/></label>
    <p role="status">{message || `${shown.filter(s => attendanceOnDay(s, day, dateKeyOf) === 'present').length} presentes de ${shown.length} alunos`}</p>
    <div style={{overflowX:'auto'}}><table style={{width:'100%', textAlign:'left', borderSpacing:'0 12px'}}>
      <thead><tr><th>Aluno / turno</th><th>Acesso no dia</th><th>Presença</th><th>Ajustar</th></tr></thead>
      <tbody>{shown.map(s => {
        const manual = s.attendanceOverrides?.[day];
        const status = attendanceOnDay(s, day, dateKeyOf);
        const first = s.attendanceFirst?.[day];
        return <tr key={`${s.shift}:${s.name}`}>
          <td>{s.name}<br/><small>{shiftLabel(s.shift)}</small></td>
          <td>{entryOnDay(s, day, dateKeyOf) ? `Entrou${first ? ` às ${new Date(first).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})}` : ''}` : 'Sem acesso registrado'}</td>
          <td><span className={`attendance-status attendance-status--${status === 'present' ? 'present' : 'absent'}`}>{status === 'present' ? '✓ Presente' : '− Ausente'}</span><br/><small>{manual ? 'Ajuste do professor' : 'Automático'}</small></td>
          <td><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {status === 'present'
              ? <button className="attendance-action attendance-action--absent" type="button" disabled={!!busy} aria-busy={busy === `${s.shift}:${s.name}`} aria-label={`Tirar presença de ${s.name}`} onClick={() => save(s, 'absent')}><span aria-hidden="true">−</span> Tirar presença</button>
              : <button className="attendance-action attendance-action--present" type="button" disabled={!!busy} aria-busy={busy === `${s.shift}:${s.name}`} aria-label={`Dar presença a ${s.name}`} onClick={() => save(s, 'present')}><span aria-hidden="true">✓</span> Dar presença</button>}
            {manual && <button className="attendance-action" type="button" disabled={!!busy} onClick={() => save(s, 'auto')}>↩ Voltar ao automático</button>}
          </div></td>
        </tr>;
      })}</tbody>
    </table></div>
    {!shown.length && <p>Nenhum aluno neste turno.</p>}
    </div>
  </section>;
}

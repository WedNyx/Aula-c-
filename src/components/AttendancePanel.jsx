import { useState } from 'react';
import './TeacherControls.css';
import { todayKey, dateKeyOf } from '../lib/schedule.ts';
import { attendanceOnDay, entryOnDay } from '../lib/classroomUpdates.js';

export function AttendancePanel({ students, shiftFilter, shiftLabel, onSet }) {
  const [day, setDay] = useState(todayKey());
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState('');
  const shown = students.filter(s => shiftFilter === 'all' || s.shift === shiftFilter).sort((a,b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));
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
    <h2>📋 Lista de chamada</h2>
    <p>O acesso ao perfil é um sinal automático, não uma confirmação de identidade. Sua correção manual prevalece mesmo se o perfil entrar novamente.</p>
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
          <td>{status === 'present' ? '✅ Presente' : '❌ Ausente'}<br/><small>{manual ? 'Ajuste do professor' : 'Automático'}</small></td>
          <td><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <button className="attendance-action attendance-action--present" type="button" disabled={!!busy} aria-label={`Dar presença a ${s.name}`} onClick={() => save(s, 'present')}><span aria-hidden="true">✓</span> Dar presença</button>
            <button className="attendance-action attendance-action--absent" type="button" disabled={!!busy} aria-label={`Tirar presença de ${s.name}`} onClick={() => save(s, 'absent')}><span aria-hidden="true">−</span> Tirar presença</button>
            {manual && <button className="attendance-action" type="button" disabled={!!busy} onClick={() => save(s, 'auto')}>↩ Voltar ao automático</button>}
          </div></td>
        </tr>;
      })}</tbody>
    </table></div>
    {!shown.length && <p>Nenhum aluno neste turno.</p>}
  </section>;
}

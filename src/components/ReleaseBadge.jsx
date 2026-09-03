import { useRef } from 'react';
import { PLATFORM_VERSION, RELEASES } from '../releases.js';

export function ReleaseHistory() {
  return <div>{RELEASES.map(release => <article key={release.version} style={{marginBottom:22}}>
    <h3>v{release.version} · {release.title}</h3>
    {release.date && <small>{release.date.split('-').reverse().join('/')}</small>}
    <ul>{release.changes.map(change => <li key={change} style={{margin:'8px 0'}}>{change}</li>)}</ul>
  </article>)}</div>;
}
export function ReleaseBadge() {
  const dialog = useRef(null);
  return <>
    <button data-tour="versao" type="button" onClick={() => dialog.current?.showModal()} title="Versão e histórico de atualizações"
      style={{position:'fixed',bottom:6,left:8,zIndex:800,border:'1px solid #594077',borderRadius:12,background:'#150d25',color:'#cbbce8',fontSize:10,padding:'4px 9px'}}>v{PLATFORM_VERSION} · Novidades</button>
    <dialog ref={dialog} aria-label="Histórico de versões" style={{maxWidth:560,width:'calc(100% - 40px)',maxHeight:'80vh',overflowY:'auto',background:'#171026',color:'#eee',border:'1px solid #695087',borderRadius:16,padding:24}}>
      <form method="dialog"><button style={{float:'right'}} aria-label="Fechar histórico">Fechar</button></form>
      <h2>Versões da plataforma</h2><ReleaseHistory/>
    </dialog>
  </>;
}

import { useEffect, useState } from 'react';
import { CURRENT_RELEASE, PLATFORM_VERSION } from '../releases.js';
import './TeacherControls.css';

export function ReleaseBadge() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const close = event => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  const highlights = CURRENT_RELEASE.highlights || CURRENT_RELEASE.changes;
  return <>
    <button type="button" data-tour="versao" className="platform-version" aria-label={`Ver novidades da versão ${PLATFORM_VERSION}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>v{PLATFORM_VERSION}</button>
    {open && <div className="release-dialog-backdrop" onClick={() => setOpen(false)}>
      <section role="dialog" aria-modal="true" aria-labelledby="release-dialog-title" className="release-dialog" onClick={event => event.stopPropagation()}>
        <div className="release-dialog-heading">
          <div><small>VERSÃO {PLATFORM_VERSION}</small><h2 id="release-dialog-title">✨ Principais novidades</h2></div>
          <button type="button" aria-label="Fechar novidades" onClick={() => setOpen(false)}>✕</button>
        </div>
        <ul>{highlights.map(item => <li key={item}>{item}</li>)}</ul>
      </section>
    </div>}
  </>;
}

import { PLATFORM_VERSION } from '../releases.js';
import './TeacherControls.css';

export function ReleaseBadge() {
  return <span data-tour="versao" className="platform-version" aria-label={`Versão ${PLATFORM_VERSION}`}>v{PLATFORM_VERSION}</span>;
}

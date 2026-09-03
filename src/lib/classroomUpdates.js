export const PET_NAME_LIMIT = 24;
export function normalizePetName(value) {
  return Array.from(String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()).slice(0, PET_NAME_LIMIT).join('');
}
export function petNameFor(avatar, pet = avatar?.pet) {
  return normalizePetName(avatar?.petNames?.[pet] || '');
}
export function lessonsForShift(lessons, shift) {
  return (Array.isArray(lessons) ? lessons : []).filter(lesson => shift === 'all' || (shift === 'unassigned' ? !lesson.shift : lesson.shift === shift));
}

// Correções do professor são persistentes e têm prioridade sobre qualquer autosave.
export function applyAttendanceOverrides(attendance, overrides) {
  const result = { ...(attendance || {}) };
  for (const [day, correction] of Object.entries(overrides || {})) {
    if (correction?.status === 'present' || correction?.status === 'absent') result[day] = correction.status;
  }
  return result;
}
export function entryOnDay(student, day, dateKeyOf) {
  return !!student.attendanceFirst?.[day] || !!(student.lastSeen && dateKeyOf(student.lastSeen) === day) || (!student.attendanceOverrides?.[day] && ['present', 'idle'].includes(student.attendance?.[day]));
}
export function attendanceOnDay(student, day, dateKeyOf) {
  const manual = student.attendanceOverrides?.[day]?.status;
  if (manual === 'present' || manual === 'absent') return manual;
  if (student.attendance?.[day] === 'present') return 'present';
  return entryOnDay(student, day, dateKeyOf) ? 'present' : 'absent';
}

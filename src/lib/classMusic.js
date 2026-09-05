export const MUSIC_SURFACES = ["student", "teacher"];
export const MAX_CLASS_TRACKS = 30;

export function normalizeMusicSettings(value) {
  const surface = MUSIC_SURFACES.includes(value?.surface) ? value.surface : "student";
  const tracks = Array.isArray(value?.tracks) ? value.tracks.map(sanitizeTrack).filter(Boolean).slice(0, MAX_CLASS_TRACKS) : [];
  return { enabled:value?.enabled === true, surface, studentsCanAdd:value?.studentsCanAdd === true, tracks };
}

export function sanitizeTrack(track) {
  const title=String(track?.title||"").trim().slice(0,100);
  const artist=String(track?.artist||"").trim().slice(0,80);
  let url;
  try { url=new URL(String(track?.url||"").trim()); } catch { return null; }
  if(url.protocol!=="https:"||!title)return null;
  url.username="";url.password="";
  return {id:String(track?.id||`${Date.now()}-${Math.random().toString(36).slice(2)}`),title,artist,url:url.href,addedBy:String(track?.addedBy||"professor").slice(0,80)};
}

export function musicForTurma(allSettings,turmaId){return normalizeMusicSettings(allSettings?.[turmaId]);}

export function updateMusicSettings(allSettings,turmaId,patch){
  return {...(allSettings||{}),[turmaId]:normalizeMusicSettings({...musicForTurma(allSettings,turmaId),...(patch||{})})};
}

export function addTrack(allSettings,turmaId,track){
  const current=musicForTurma(allSettings,turmaId),clean=sanitizeTrack(track);
  if(!clean)return {ok:false,error:"Informe o nome e um link HTTPS válido."};
  if(current.tracks.length>=MAX_CLASS_TRACKS)return {ok:false,error:`A playlist pode ter até ${MAX_CLASS_TRACKS} músicas.`};
  if(current.tracks.some(item=>item.url===clean.url))return {ok:false,error:"Essa música já está na playlist."};
  return {ok:true,settings:updateMusicSettings(allSettings,turmaId,{tracks:[...current.tracks,clean]})};
}

export function removeTrack(allSettings,turmaId,trackId){
  const current=musicForTurma(allSettings,turmaId);
  return updateMusicSettings(allSettings,turmaId,{tracks:current.tracks.filter(track=>track.id!==trackId)});
}

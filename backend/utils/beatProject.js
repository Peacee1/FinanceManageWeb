const isNumber = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
function validateProject(project) {
  if (!project || typeof project !== 'object' || Array.isArray(project)) return false;
  if (Object.keys(project).some(key => !['name','bpm','swing','master','tracks','melody'].includes(key))) return false;
  if (typeof project.name !== 'string' || !project.name.trim() || project.name.length > 80) return false;
  if (!isNumber(project.bpm,40,240) || !isNumber(project.swing,0,50) || !isNumber(project.master,0,100)) return false;
  if (!Array.isArray(project.tracks) || project.tracks.length !== 6) return false;
  if (project.tracks.some(track => !track || !Array.isArray(track.steps) || track.steps.length !== 16 || track.steps.some(step => typeof step !== 'boolean') || typeof track.mute !== 'boolean' || !isNumber(track.volume,0,1))) return false;
  const melody = project.melody;
  if (!melody || !['sine','triangle','sawtooth'].includes(melody.voice) || typeof melody.mute !== 'boolean' || !isNumber(melody.volume,0,1) || !Array.isArray(melody.notes) || melody.notes.length > 208) return false;
  const keys = new Set();
  for (const note of melody.notes) {
    if (!note || !Number.isInteger(note.pitch) || note.pitch < 60 || note.pitch > 72 || !Number.isInteger(note.start) || note.start < 0 || note.start > 15 || !Number.isInteger(note.length) || note.length < 1 || note.start + note.length > 16) return false;
    for(let step=note.start;step<note.start+note.length;step++){const key=note.pitch+':'+step;if(keys.has(key))return false;keys.add(key);}
  }
  return true;
}
module.exports = { validateProject };

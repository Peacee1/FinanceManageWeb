export type TaskNoteSnapshot = {signedIn: boolean; items: {title: string; done: boolean}[]; total: number; updatedAt: string};
export function noteSnapshot(items: unknown, date = new Date()): TaskNoteSnapshot {
  if (!Array.isArray(items)) throw new Error('Invalid task data');
  const rows = items.filter(task => task && typeof task.title === 'string' && ['TODO', 'DOING', 'DONE'].includes(task.status));
  const rank: Record<string, number> = {HIGH: 0, NORMAL: 1, LOW: 2};
  rows.sort((a, b) => Number(a.status === 'DONE') - Number(b.status === 'DONE')
    || (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1)
    || String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')));
  return {signedIn: true, items: rows.slice(0, 7).map(task => ({title: task.title.slice(0, 200), done: task.status === 'DONE'})), total: rows.length, updatedAt: date.toISOString()};
}
export const emptyNote: TaskNoteSnapshot = {signedIn: false, items: [], total: 0, updatedAt: ''};

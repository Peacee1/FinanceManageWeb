export const tasksUrl = 'https://tasks.peacee1.io.vn/';

export function isInternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      ['tasks.peacee1.io.vn', 'peacee1.io.vn', 'www.peacee1.io.vn'].includes(url.host);
  } catch {
    return false;
  }
}

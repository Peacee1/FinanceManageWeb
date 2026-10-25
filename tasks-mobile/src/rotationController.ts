export function createRotationController(apply: (focus: boolean) => Promise<void>) {
  let desired = false;
  let applied: boolean | null = null;
  let queue = Promise.resolve();
  const setFocus = (focus: boolean) => {
    desired = focus;
    queue = queue.catch(() => undefined).then(async () => {
      const next = desired;
      if (applied === next) return;
      await apply(next);
      applied = next;
    });
    return queue;
  };
  return {setFocus};
}

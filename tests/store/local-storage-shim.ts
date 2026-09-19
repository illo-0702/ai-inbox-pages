// Vitest는 node 환경이라 localStorage가 없다. 테스트에서 쓸 최소 in-memory 구현.
export function installLocalStorageShim(): void {
  const mem = new Map<string, string>();
  const shim: Storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k, v) => void mem.set(k, String(v)),
    removeItem: (k) => void mem.delete(k),
    clear: () => mem.clear(),
    key: (i) => Array.from(mem.keys())[i] ?? null,
    get length() {
      return mem.size;
    },
  };
  // @ts-expect-error 테스트 환경에 window가 없으므로 최소 형태로 만든다
  globalThis.window = { localStorage: shim };
}

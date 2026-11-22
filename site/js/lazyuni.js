// Lazy WebGL universe: same API as createUniverse(), but universe.js is only fetched and the GL context
// only created the first time the universe is actually started (= first time 银河 is shown).
// Calls made before that (setScene, setBright, pointer) are remembered and replayed.
export function lazyUniverse(canvas, opts) {
  let real = null, loading = null, failed = false, wantRun = false;
  const mem = { scene: null, bright: null, pointer: null };
  const load = () => loading || (loading = import('./universe.js').then(({ createUniverse }) => {
    try { real = createUniverse(canvas, opts); } catch (e) { console.warn('universe', e); }
    if (!real) { failed = true; return; }
    if (mem.scene) real.setScene(mem.scene[0], true);
    if (mem.bright != null) real.setBright(mem.bright);
    if (mem.pointer) real.pointer(...mem.pointer);
    if (wantRun) real.start();
  }).catch(e => { failed = true; console.warn('universe', e); }));
  if (document.documentElement.dataset.mode === 'galaxy') load(); // galaxy visitors: fetch early
  return {
    start() { wantRun = true; if (real) real.start(); else if (!failed) load(); },
    stop() { wantRun = false; real?.stop(); },
    setScene(k, instant = false) { mem.scene = [k]; real?.setScene(k, instant); },
    pointer(x, y) { mem.pointer = [x, y]; real?.pointer(x, y); },
    setBright(b) { mem.bright = b; real?.setBright(b); },
    resize() { real?.resize(); },
  };
}

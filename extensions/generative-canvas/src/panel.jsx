import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { connectHost } from '@openchamber/sdk';
import { applyHostReady } from '@openchamber/sdk/ui';
import { parseArtifact, snapshot, artifactPath, MAX_BYTES, errorMessage } from './catalog.js';
import { Canvas, initialMonths } from './renderer.jsx';
import { costExplorer } from './examples.js';

// Recovered from Agent Browser 1.0.4: official SDK connection/theme bridge,
// min-size-safe panel layout, explicit teardown. No browser service restored.
const host = connectHost();
function App() {
  const [directory, setDirectory] = useState(null);
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState('');
  const [artifact, setArtifact] = useState(null);
  const [months, setMonths] = useState(12);
  const [status, setStatus] = useState('Waiting for OpenChamber…');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState(false);
  const [draft, setDraft] = useState('');
  const epoch = useRef(0);
  const currentDirectory = useRef(undefined);
  const ticket = useRef(0);
  const importInput = useRef(null);
  const accept = (value, message) => {
    const parsed = parseArtifact(value);
    setArtifact(parsed); setMonths(initialMonths(parsed)); setError(''); setStatus(message); setSource(false);
  };
  useEffect(() => {
    const ready = host.onReady(context => applyHostReady(context, document.documentElement));
    const changed = host.onDirectory(value => {
      if (currentDirectory.current === value) return;
      currentDirectory.current = value;
      epoch.current++; ticket.current++;
      setDirectory(value); setFiles([]); setSelected(''); setArtifact(null); setDraft(''); setSource(false); setBusy(false); setError('');
      setStatus(value ? 'Refresh to list project canvases, or try the example.' : 'Open a project to load or save files. Examples and import still work.');
    });
    return () => { epoch.current++; ticket.current++; ready(); changed(); };
  }, []);
  async function run(operation) {
    const context = epoch.current, request = ++ticket.current;
    setBusy(true); setError('');
    const current = () => context === epoch.current && request === ticket.current;
    try { await operation(current); }
    catch (failure) { if (current()) { setError(errorMessage(failure)); setStatus('Action failed; previous canvas preserved.'); } }
    finally { if (current()) setBusy(false); }
  }
  function refresh() {
    run(async current => {
      try {
        const { entries } = await host.listDir('visualizations');
        if (!current()) return;
        const names = entries.filter(entry => entry.kind === 'file' && entry.name.endsWith('.canvas.json')).map(entry => entry.name).filter(name => { try { artifactPath(name); return true; } catch { return false; } });
        setFiles(names); setSelected(old => names.includes(old) ? old : names[0] ?? ''); setStatus(names.length ? `${names.length} project canvases. Select one and load.` : 'No canvas files yet. Agents can write visualizations/*.canvas.json.');
      } catch (failure) {
        if (failure.code !== 'NOT_FOUND') throw failure;
        if (current()) { setFiles([]); setSelected(''); setStatus('No visualizations folder yet. Save an example to create it.'); }
      }
    });
  }
  function load() {
    const path = artifactPath(selected);
    run(async current => {
      const metadata = await host.stat(path);
      if (!current()) return;
      if (metadata.size > MAX_BYTES) throw new Error('Canvas exceeds 256 KiB');
      const { content } = await host.readFile(path);
      if (current()) accept(content, `Loaded ${path}`);
    });
  }
  function save() {
    const value = snapshot(artifact, months);
    // New file only: never overwrite the agent's source or an edited artifact.
    const name = `snapshot-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.canvas.json`;
    const path = artifactPath(name);
    run(async current => {
      await host.writeFile(path, JSON.stringify(value, null, 2) + '\n');
      if (current()) { setFiles(old => [...old, name].sort()); setSelected(name); setStatus(`Saved ${path}`); }
    });
  }
  function download() {
    const blob = new Blob([JSON.stringify(snapshot(artifact, months), null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'canvas.canvas.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Exported canvas JSON with the current horizon.');
  }
  function local(operation) {
    try { operation(); setError(''); } catch (failure) { setError(errorMessage(failure)); }
  }
  return <main>
    <header><div><strong>Canvas</strong><span className="context" title={directory ?? 'No project'}>{directory ?? 'No project'}</span></div><button onClick={() => local(() => accept(costExplorer, 'Example loaded — illustrative inputs.'))} disabled={busy}>Try example</button></header>
    <nav aria-label="Canvas files" className="toolbar">
      <button onClick={refresh} disabled={!directory || busy}>Refresh files</button>
      <label className="file-picker">Project canvas <select value={selected} onChange={event => setSelected(event.target.value)} disabled={busy || !files.length}><option value="">Select a canvas…</option>{files.map(name => <option key={name}>{name}</option>)}</select></label>
      <button onClick={load} disabled={!selected || busy}>Load</button>
      <button onClick={() => importInput.current.click()} disabled={busy}>Import JSON</button>
      <input ref={importInput} type="file" accept=".json,application/json" hidden onChange={event => {
        const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
        run(async current => { if (file.size > MAX_BYTES) throw new Error('Canvas exceeds 256 KiB'); const text = await file.text(); if (current()) accept(text, `Imported ${file.name} (not saved)`); });
      }} />
      <button onClick={() => { setDraft(artifact ? JSON.stringify(snapshot(artifact, months), null, 2) : ''); setSource(value => !value); }} disabled={busy} aria-expanded={source}>JSON source</button>
    </nav>
    <div className="notice" role="status" aria-live="polite">{busy ? 'Working…' : status}</div>
    {error && <div className="error" role="alert">{error}</div>}
    <div className="workspace">
      {source && <section className="source"><label htmlFor="json-source">Canvas JSON · catalog 1</label><textarea id="json-source" value={draft} maxLength={MAX_BYTES} onChange={event => setDraft(event.target.value)} spellCheck="false" /><button onClick={() => local(() => accept(draft, 'Validated draft applied (not saved)'))}>Validate and apply</button></section>}
      <article className="canvas" aria-label="Canvas preview">{artifact ? <><div className="canvas-heading"><div><p className="eyebrow">CATALOG 1 · LOCAL INTERACTIONS</p><h1>{artifact.title}</h1></div><div className="actions"><button onClick={() => setMonths(initialMonths(artifact))}>Reset controls</button><button onClick={download}>Export JSON</button><button onClick={save} disabled={!directory || busy}>Save snapshot</button></div></div><Canvas key={JSON.stringify(artifact)} artifact={artifact} months={months} setMonths={setMonths} /></> : <div className="empty"><h1>A workspace for generated tools</h1><p>Charts, data tables and quick interactive comparisons — rendered from validated JSON, not generated scripts.</p><button onClick={() => local(() => accept(costExplorer, 'Example loaded — illustrative inputs.'))}>Explore the cost example</button><p className="muted">Agents write <code>visualizations/*.canvas.json</code>. Refresh and load to see their work.</p></div>}</article>
    </div>
  </main>;
}
const root = createRoot(document.getElementById('root'));
root.render(<App />);
window.addEventListener('pagehide', () => { root.unmount(); host.dispose(); }, { once: true });

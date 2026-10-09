import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { connectHost } from '@openchamber/sdk';
import { applyHostReady } from '@openchamber/sdk/ui';
import { parseArtifact, snapshot, MAX_BYTES, errorMessage } from './catalog.js';
import { Canvas, initialMonths } from './renderer.jsx';
import { costExplorer, revenueDashboard } from './examples.js';

const host = connectHost();
const paths = { eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12m10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6', code: 'm8 6-6 6 6 6m8-12 6 6-6 6', more: 'M5 12h.01M12 12h.01M19 12h.01' };
const Icon = ({ name }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
async function api(method, path = '/artifacts', value, revision) {
  const result = await host.serviceRequest({ method, path, ...(revision ? { query: { revision } } : {}), ...(value !== undefined ? { body: JSON.stringify(value) } : {}) });
  const body = JSON.parse(result.body);
  if (result.status >= 400) { const failure = new Error(body.error ?? 'Canvas request failed'); failure.status = result.status; throw failure; }
  return body;
}
function App() {
  const [items, setItems] = useState([]), [record, setRecord] = useState(null);
  const [months, setMonths] = useState(12), [view, setView] = useState('preview');
  const [draft, setDraft] = useState(''), [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [status, setStatus] = useState('Connecting…');
  const [dialog, setDialog] = useState(null), [name, setName] = useState('');
  const selected = useRef(''), active = useRef(null), editing = useRef(false), working = useRef(false), generation = useRef(0);
  const picker = useRef(null), menu = useRef(null), alive = useRef(true);
  const modal = useRef(false);
  function accept(value) {
    const next = { ...value, artifact: parseArtifact(value.artifact) };
    active.current = next; selected.current = next.id; editing.current = false;
    setRecord(next); setMonths(initialMonths(next.artifact)); setDraft(JSON.stringify(next.artifact, null, 2)); setDirty(false); setError(''); setStatus('Saved');
    void host.storage.set('selected', next.id).catch(() => {});
  }
  async function refresh() {
    if (working.current || editing.current || modal.current || document.hidden) return;
    const request = ++generation.current;
    try {
      const { items: found } = await api('GET');
      if (!alive.current || request !== generation.current || editing.current) return;
      setItems(found);
      const chosen = found.find(item => item.id === selected.current) ?? found[0];
      if (!chosen) { active.current = null; selected.current = ''; setRecord(null); setDraft(''); setStatus('No artifacts yet'); return; }
      if (active.current?.id !== chosen.id || active.current?.revision !== chosen.revision) {
        const next = await api('GET', `/artifacts/${encodeURIComponent(chosen.id)}`);
        if (alive.current && request === generation.current && !editing.current) accept(next);
      }
    } catch (failure) { if (alive.current && request === generation.current) { setError(errorMessage(failure)); setStatus('Could not load Canvas'); } }
  }
  useEffect(() => {
    alive.current = true;
    let started = false;
    const remove = host.onReady(context => {
      applyHostReady(context, document.documentElement);
      if (!started) {
        started = true;
        void host.storage.get('selected').catch(() => '').then(id => { if (typeof id === 'string' && !selected.current) selected.current = id; return refresh(); });
      }
    });
    const timer = setInterval(() => { if (started) void refresh(); }, 3000);
    const focus = () => { if (started) void refresh(); };
    window.addEventListener('focus', focus);
    return () => { alive.current = false; generation.current++; remove(); clearInterval(timer); window.removeEventListener('focus', focus); };
  }, []);
  async function run(operation) {
    if (working.current) return;
    working.current = true; const request = ++generation.current; setBusy(true); setError('');
    try { await operation(() => alive.current && request === generation.current); }
    catch (failure) { if (alive.current && request === generation.current) { setError(errorMessage(failure)); setStatus('Changes were not saved'); } }
    finally { working.current = false; if (alive.current) setBusy(false); }
  }
  function choose(id, discard = false) {
    if (editing.current && !discard) { setError('Save or discard changes before switching artifacts.'); return; }
    run(async current => {
      try { const value = await api('GET', `/artifacts/${encodeURIComponent(id)}`); if (current()) { accept(value); setView('preview'); } }
      catch (failure) {
        if (!discard || failure.status !== 404) throw failure;
        if (current()) { active.current = null; selected.current = ''; editing.current = false; setRecord(null); setDraft(''); setDirty(false); setStatus('Artifact was deleted; discovering remaining canvases…'); }
      }
    });
  }
  function closeMenu() { if (menu.current) menu.current.open = false; }
  function changeMonths(value) {
    if (working.current) return;
    generation.current++; editing.current = true; setDirty(true); setMonths(value);
  }
  function switchView(next) {
    if (working.current) return;
    try {
      if (next === 'source' && record && view !== 'source') setDraft(JSON.stringify(snapshot(record.artifact, months), null, 2));
      if (next === 'preview' && record && dirty && view === 'source') {
        const artifact = parseArtifact(draft); setRecord({ ...record, artifact }); setMonths(initialMonths(artifact));
      }
      setView(next); setError('');
    } catch (failure) { setError(errorMessage(failure)); }
  }
  function openDialog(action) { closeMenu(); generation.current++; modal.current = true; setError(''); setName(record?.artifact.title ?? 'Untitled canvas'); setDialog(action); }
  function closeDialog() { modal.current = false; setDialog(null); menu.current?.querySelector('summary')?.focus(); }
  function create(example, source = false) {
    if (editing.current) { setError('Save or discard changes before adding an artifact.'); return; }
    closeMenu(); run(async current => { const value = await api('POST', '/artifacts', example); if (current()) { accept(value); setItems(old => [...old, { id: value.id, title: value.artifact.title, revision: value.revision }]); setView(source ? 'source' : 'preview'); } });
  }
  function save() {
    run(async current => {
      const artifact = view === 'source' && dirty ? parseArtifact(draft) : snapshot(record.artifact, months);
      const value = await api('PUT', `/artifacts/${encodeURIComponent(record.id)}`, artifact, record.revision);
      if (current()) { accept(value); setItems(old => old.map(item => item.id === value.id ? { id: value.id, title: value.artifact.title, revision: value.revision } : item)); }
    });
  }
  function exportJson() {
    closeMenu(); let value;
    try { value = view === 'source' && dirty ? parseArtifact(draft) : snapshot(record.artifact, months); }
    catch (failure) { setError(errorMessage(failure)); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(value) + '\n'], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = record.id; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function confirmAction(event) {
    event.preventDefault();
    run(async current => {
      const path = `/artifacts/${encodeURIComponent(record.id)}`;
      if (dialog === 'delete') { await api('DELETE', path, undefined, record.revision); if (current()) { active.current = null; selected.current = ''; setRecord(null); setItems(old => old.filter(item => item.id !== record.id)); editing.current = false; setDirty(false); } }
      else { const value = await api('PATCH', path, { title: name }, record.revision); if (current()) { accept(value); setItems(old => old.map(item => item.id === value.id ? { ...item, title: value.artifact.title, revision: value.revision } : item)); } }
      if (current()) closeDialog();
    });
  }
  return <main>
    <div className="artifact-bar">
      <label className="sr-only" htmlFor="artifact">Artifact</label><select id="artifact" value={record?.id ?? ''} onChange={event => choose(event.target.value)} disabled={busy || dirty || !items.length}><option value="" disabled>{items.length ? 'Select artifact' : 'No artifacts yet'}</option>{items.map(item => <option value={item.id} key={item.id}>{item.title}{item.error ? ' · Invalid' : ''}</option>)}</select>
      <div className="view-switch" role="group" aria-label="Canvas view"><button disabled={busy} aria-label="Preview" aria-pressed={view === 'preview'} onClick={() => switchView('preview')}><Icon name="eye" /></button><button disabled={busy} aria-label="JSON source" aria-pressed={view === 'source'} onClick={() => switchView('source')}><Icon name="code" /></button></div>
      <details className="artifact-menu" ref={menu}><summary aria-label="Artifact actions"><Icon name="more" /></summary><div className="menu-popover">
        <button onClick={() => create({ catalog_version: '1', title: 'Untitled canvas', spec: { root: 'root', elements: { root: { type: 'Stack', props: {}, children: [] } } } }, true)} disabled={busy || dirty}>Add artifact…</button>
        <button onClick={() => create(costExplorer)} disabled={busy || dirty}>Add cost explorer</button><button onClick={() => create(revenueDashboard)} disabled={busy || dirty}>Add dashboard</button>
        <button onClick={() => { closeMenu(); picker.current.click(); }} disabled={busy || dirty}>Import JSON…</button><hr />
        <button onClick={() => openDialog('rename')} disabled={!record || busy || dirty}>Rename…</button><button onClick={exportJson} disabled={!record}>Export JSON</button><button onClick={() => { closeMenu(); setMonths(initialMonths(record.artifact)); }} disabled={!record || dirty}>Reset controls</button><hr />
        <button className="danger" onClick={() => openDialog('delete')} disabled={!record || busy || dirty}>Delete…</button>
      </div></details>
      <input ref={picker} type="file" hidden accept=".json,application/json" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; run(async current => { if (file.size > MAX_BYTES) throw new Error('Canvas exceeds 60,000 bytes'); const parsed = parseArtifact(await file.text()); const value = await api('POST', '/artifacts', parsed); if (current()) { accept(value); setItems(old => [...old, { id: value.id, title: value.artifact.title, revision: value.revision }]); setView('preview'); } }); }} />
    </div>
    {error && <div className="error" role="alert">{error}</div>}
    <div className="workspace">
      {view === 'source' ? <section className="source"><div className="source-heading"><span>JSON · catalog 1</span>{dirty && <span className="unsaved">Unsaved changes</span>}</div><label className="sr-only" htmlFor="json-source">Artifact JSON</label><textarea id="json-source" value={draft} disabled={!record || busy} onChange={event => { generation.current++; editing.current = true; setDirty(true); setDraft(event.target.value); }} spellCheck="false" /><div className="source-actions"><button onClick={() => choose(record.id, true)} disabled={!dirty || busy}>Discard changes</button><button className="primary" onClick={save} disabled={!record || busy}>Validate and save</button></div></section> : <article className="canvas" aria-label="Canvas preview">{record ? <Canvas key={record.id + record.revision} artifact={record.artifact} months={months} setMonths={changeMonths} /> : <div className="empty"><span className="empty-mark"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="m12 3 9 9-9 9-9-9 9-9Z" /></svg></span><h1>Your tools, in one place</h1><p>Add a dashboard or cost explorer from the artifact menu, or import an agent-generated JSON file.</p><p className="muted">Canvases live here permanently, independent of your project.</p></div>}</article>}
    </div>
    <footer><span role="status" aria-live="polite">{busy ? 'Saving / loading…' : dirty ? 'Unsaved changes' : status}</span>{dirty && view === 'preview' && <><button onClick={() => choose(record.id, true)} disabled={busy}>Discard</button><button onClick={save} disabled={busy}>Save controls</button></>}<span className="storage-label" title="/data/.db/openchamber/canvas">Canvas store</span></footer>
    {dialog && <div className="dialog-backdrop"><form role="dialog" aria-modal="true" aria-labelledby="dialog-title" onSubmit={confirmAction} onKeyDown={event => {
      if (event.key === 'Escape' && !busy) closeDialog();
      if (event.key === 'Tab') { const controls = [...event.currentTarget.querySelectorAll('input,button')].filter(element => !element.disabled); const first = controls[0], last = controls.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
    }}><h2 id="dialog-title">{dialog === 'delete' ? 'Delete artifact?' : 'Rename artifact'}</h2>{dialog === 'delete' ? <p>This permanently deletes “{record.artifact.title}” from the Canvas store.</p> : <label>Name<input autoFocus value={name} maxLength={240} required onChange={event => setName(event.target.value)} /></label>}{error && <p role="alert" className="danger">{error}</p>}<div className="dialog-actions"><button autoFocus={dialog === 'delete'} type="button" onClick={closeDialog} disabled={busy}>Cancel</button><button className={dialog === 'delete' ? 'danger' : 'primary'} type="submit" disabled={busy}>{dialog === 'delete' ? 'Delete artifact' : 'Save name'}</button></div></form></div>}
  </main>;
}
const root = createRoot(document.getElementById('root')); root.render(<App />);
window.addEventListener('pagehide', () => { root.unmount(); host.dispose(); }, { once: true });

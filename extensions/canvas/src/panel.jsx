import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { connectHost } from '@openchamber/sdk';
import { applyHostReady, mountBanner, mountEmpty, mountMenu } from '@openchamber/sdk/ui';
import { parseArtifact, snapshot, errorMessage } from './catalog.js';
import { sessionFile } from './session.js';
import { Canvas, initialMonths } from './renderer.jsx';

const host = connectHost();
const paths = {
  eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12m10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  code: 'm8 6-6 6 6 6m8-12 6 6-6 6',
};
const Icon = ({ name }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;

function isNotFound(failure) {
  return failure?.code === 'NOT_FOUND' || /NOT_FOUND/.test(failure?.message ?? '');
}

function KitEmpty({ title, body }) {
  const root = useRef(null), handle = useRef(null);
  useEffect(() => {
    handle.current = mountEmpty(root.current, { title, body });
    return () => { handle.current?.dispose(); handle.current = null; };
  }, []);
  useEffect(() => { handle.current?.update({ title, body }); }, [title, body]);
  return <div ref={root} className="kit-mount" />;
}

function KitBanner({ tone, title, body }) {
  const root = useRef(null), handle = useRef(null);
  useEffect(() => {
    handle.current = mountBanner(root.current, { title, tone, ...(body ? { body } : {}) });
    return () => { handle.current?.dispose(); handle.current = null; };
  }, []);
  useEffect(() => { handle.current?.update({ title, tone, body }); }, [title, tone, body]);
  return <div ref={root} className="kit-mount banner-mount" />;
}

function CanvasMenu({ artifact, sessionId }) {
  const root = useRef(null), handle = useRef(null);
  useEffect(() => {
    handle.current = mountMenu(root.current, {
      label: '···', variant: 'outline', items: [], onSelect: id => actions.current[id]?.(),
    });
    return () => { handle.current?.dispose(); handle.current = null; };
  }, []);
  useEffect(() => {
    handle.current?.update({ items: [
      { id: 'exportJson', label: 'Export JSON', disabled: !artifact },
      { id: 'copyJson', label: 'Copy JSON', disabled: !artifact },
      { id: 'copyPath', label: 'Copy file path', disabled: !sessionId },
    ] });
  }, [artifact, sessionId]);
  return <div ref={root} className="kit-mount menu-mount" />;
}

const actions = { current: {} };

function App() {
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [artifact, setArtifact] = useState(null);
  const [months, setMonths] = useState(12);
  const [view, setView] = useState('preview');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const session = useRef(null), generation = useRef(0), alive = useRef(true);
  const noticeTimer = useRef(null);

  function flash(message) {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => { if (alive.current) setNotice(''); }, 2500);
  }

  function sourceText() {
    if (!artifact) return '';
    try {
      return JSON.stringify(snapshot(artifact, months), null, 2);
    } catch {
      return JSON.stringify(artifact, null, 2);
    }
  }

  async function refresh() {
    const id = session.current;
    if (!id || document.hidden) return;
    const request = ++generation.current;
    let path;
    try {
      path = sessionFile(id);
    } catch (failure) {
      if (alive.current && request === generation.current && session.current === id) setError(errorMessage(failure));
      return;
    }
    let text;
    try {
      text = (await host.readFile(path)).content;
    } catch (failure) {
      if (!alive.current || request !== generation.current || session.current !== id) return;
      if (isNotFound(failure)) {
        setArtifact(null); setError('');
      } else {
        setError(`Could not read this conversation’s canvas: ${errorMessage(failure)}`);
      }
      return;
    }
    try {
      const parsed = parseArtifact(text);
      if (!alive.current || request !== generation.current || session.current !== id) return;
      setArtifact(parsed); setMonths(initialMonths(parsed)); setError('');
    } catch (failure) {
      if (!alive.current || request !== generation.current || session.current !== id) return;
      setError(`This conversation’s canvas is invalid and was left as-is: ${errorMessage(failure)}`);
    }
  }

  function select(next) {
    const id = next?.id ?? null;
    if (session.current === id) return;
    generation.current++;
    session.current = id;
    setSessionId(id); setArtifact(null); setMonths(12); setError(''); setNotice('');
    if (id) void refresh();
  }

  actions.current.exportJson = () => {
    const url = URL.createObjectURL(new Blob([sourceText() + '\n'], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'canvas.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash('Exported the current view as canvas.json');
  };
  actions.current.copyJson = async () => {
    try {
      await host.writeClipboard(sourceText() + '\n');
      flash('Copied the canvas JSON to the clipboard');
    } catch (failure) {
      setError(`Could not copy the canvas JSON: ${errorMessage(failure)}`);
    }
  };
  actions.current.copyPath = async () => {
    try {
      await host.writeClipboard(sessionFile(session.current));
      flash('Copied the canvas file path');
    } catch (failure) {
      setError(`Could not copy the file path: ${errorMessage(failure)}`);
    }
  };

  useEffect(() => {
    alive.current = true;
    const ready = host.onReady(context => {
      applyHostReady(context, document.documentElement);
      setConnected(true);
      select(context.session);
    });
    const followed = host.onSession(next => select(next));
    const timer = setInterval(() => { void refresh(); }, 3000);
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    return () => {
      alive.current = false; generation.current++;
      clearTimeout(noticeTimer.current); ready(); followed();
      clearInterval(timer); window.removeEventListener('focus', focus);
    };
  }, []);

  const empty = !connected
    ? { title: 'Connecting…', body: 'Waiting for the host.' }
    : !sessionId
      ? { title: 'No conversation', body: 'Open a conversation to see its canvas.' }
      : { title: 'Empty canvas', body: 'Ask the agent to visualize or present data in this conversation.' };

  return <main>
    {artifact && <div className="controls">
      <div className="view-switch" role="group" aria-label="Canvas view">
        <button aria-label="Preview" title="Preview" aria-pressed={view === 'preview'} onClick={() => setView('preview')}><Icon name="eye" /></button>
        <button aria-label="JSON source" title="JSON source" aria-pressed={view === 'source'} onClick={() => setView('source')}><Icon name="code" /></button>
      </div>
      <CanvasMenu artifact={artifact} sessionId={sessionId} />
    </div>}
    {error && <KitBanner tone="error" title="Could not show this canvas" body={error} />}
    {notice && !error && <KitBanner tone="success" title={notice} />}
    <div className="workspace">
      {view === 'source' ? (
        artifact ? <pre className="source" aria-label="Canvas JSON source">{sourceText()}</pre> : <KitEmpty title={empty.title} body={empty.body} />
      ) : (
        artifact ? <article className="canvas" aria-label="Canvas preview"><Canvas artifact={artifact} months={months} setMonths={setMonths} /></article> : <KitEmpty title={empty.title} body={empty.body} />
      )}
    </div>
    <span className="sr-only" role="status" aria-live="polite">{artifact ? 'Canvas for this conversation is shown.' : error ? `Canvas unavailable: ${error}` : 'Empty canvas.'}</span>
  </main>;
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
window.addEventListener('pagehide', () => { root.unmount(); host.dispose(); }, { once: true });

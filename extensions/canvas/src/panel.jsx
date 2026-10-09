import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { connectHost } from '@openchamber/sdk';
import { applyHostReady, mountBanner, mountEmpty, mountMenu } from '@openchamber/sdk/ui';
import { parseArtifact, errorMessage } from './catalog.js';
import { sessionFile } from './session.js';
import { Canvas, initialMonths } from './renderer.jsx';

const host = connectHost();
const actions = { current: {} };

function isNotFound(failure) {
  return failure?.code === 'NOT_FOUND' || /NOT_FOUND/.test(failure?.message ?? '');
}

function agentPrompt(path) {
  return [
    'Create a Canvas for this conversation — an in-app visualization the user can see, not a chat message.',
    '',
    `Write one JSON file here (atomic replace): ${path}`,
    '',
    'Format: { "catalog_version": "1", "title": "...", "spec": { "root": "id", "elements": { ... } } }',
    'Each element: { "type": "...", "props": { ... }, "children": ["id", ...] }.',
    'Components: Stack, Grid (columns 1-4), Card, Heading, Text, Metric (label/value/change/detail/tone), BarChart, LineChart, DonutChart (title + data:[{label,value}]), Table (columns + rows), HorizonControl (initialMonths + options), CostChart (currency + providers:[{label,monthly,upfront}]).',
    'Stack/Grid/Card may have children; all other components are leaves.',
    'Use trusted component JSON only — never HTML, scripts, events or expressions.',
  ].join('\n');
}

function KitEmpty({ title, body, action }) {
  const root = useRef(null), handle = useRef(null);
  const run = useRef(null);
  run.current = action?.onClick ?? null;
  useEffect(() => {
    handle.current = mountEmpty(root.current, {
      title, body,
      ...(action ? { action: { label: action.label, onClick: () => run.current?.() } } : {}),
    });
    return () => { handle.current?.dispose(); handle.current = null; };
  }, []);
  useEffect(() => {
    handle.current?.update({
      title, body,
      ...(action ? { action: { label: action.label, onClick: () => run.current?.() } } : {}),
    });
  }, [title, body, action?.label]);
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

function CanvasMenu({ sessionId }) {
  const root = useRef(null), handle = useRef(null);
  useEffect(() => {
    handle.current = mountMenu(root.current, {
      label: '···', variant: 'outline', items: [], onSelect: id => actions.current[id]?.(),
    });
    return () => { handle.current?.dispose(); handle.current = null; };
  }, []);
  useEffect(() => {
    handle.current?.update({ items: [{ id: 'copyPath', label: 'Copy file path', disabled: !sessionId }] });
  }, [sessionId]);
  return <div ref={root} className="kit-mount menu-mount" />;
}

function App() {
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [artifact, setArtifact] = useState(null);
  const [months, setMonths] = useState(12);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const session = useRef(null), generation = useRef(0), alive = useRef(true);
  const noticeTimer = useRef(null);

  function flash(message) {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => { if (alive.current) setNotice(''); }, 2500);
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

  actions.current.copyPath = async () => {
    try {
      await host.writeClipboard(sessionFile(session.current));
      flash('Copied the canvas file path');
    } catch (failure) {
      setError(`Could not copy the file path: ${errorMessage(failure)}`);
    }
  };
  actions.current.prompt = async () => {
    try {
      await host.compose({ text: agentPrompt(sessionFile(session.current)), mode: 'append' });
      flash('Drafted a Canvas request in the composer');
    } catch (failure) {
      setError(`Could not draft the request: ${errorMessage(failure)}`);
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
      : { title: 'Empty canvas', body: 'Ask the agent to visualize or present data in this conversation.', action: { label: 'Draft a request for the agent', onClick: () => actions.current.prompt() } };

  return <main>
    {artifact && <div className="controls">
      <CanvasMenu sessionId={sessionId} />
    </div>}
    {error && <KitBanner tone="error" title="Could not show this canvas" body={error} />}
    {notice && !error && <KitBanner tone="success" title={notice} />}
    <div className="workspace">
      {artifact ? <article className="canvas" aria-label="Canvas preview"><Canvas artifact={artifact} months={months} setMonths={setMonths} /></article> : <KitEmpty title={empty.title} body={empty.body} action={empty.action} />}
    </div>
    <span className="sr-only" role="status" aria-live="polite">{artifact ? 'Canvas for this conversation is shown.' : error ? `Canvas unavailable: ${error}` : 'Empty canvas.'}</span>
  </main>;
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
window.addEventListener('pagehide', () => { root.unmount(); host.dispose(); }, { once: true });

import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { connectHost } from '@openchamber/sdk';
import { applyHostReady } from '@openchamber/sdk/ui';
import { parseArtifact, errorMessage } from './catalog.js';
import { sessionFile } from './session.js';
import { Canvas, initialMonths } from './renderer.jsx';

const host = connectHost();

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
    'Components: Stack, Grid (columns 1-4), Card, Heading, Text, Metric (label/value/change/detail/tone), BarChart, LineChart, DonutChart (title + data:[{label,value}]), Diagram (title + Mermaid code), Table (columns + rows), HorizonControl (initialMonths + options), CostChart (currency + providers:[{label,monthly,upfront}]).',
    'Stack/Grid/Card may have children; all other components are leaves.',
    'Use trusted component JSON only — never HTML, scripts, events or expressions.',
  ].join('\n');
}

const CopyIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>;

function AgentPrompt({ text, onInsert, onCopy, copied }) {
  const [expanded, setExpanded] = useState(false);
  return <div className="prompt">
    <div className={`prompt-field${expanded ? ' expanded' : ''}`} role="group" aria-label="Request for the agent">
      <pre className="prompt-text">{text}</pre>
      {!expanded && <div className="prompt-fade" aria-hidden="true" />}
      <button type="button" className="prompt-copy" aria-label="Copy request" title="Copy request" onClick={onCopy}><CopyIcon /></button>
    </div>
    <div className="prompt-actions">
      <button type="button" className="prompt-toggle" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Show less' : 'Show more'}</button>
      <button type="button" className="prompt-insert" onClick={onInsert}>{copied ? 'Copied' : 'Insert into composer'}</button>
    </div>
  </div>;
}

function App() {
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [artifact, setArtifact] = useState(null);
  const [months, setMonths] = useState(12);
  const [theme, setTheme] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const session = useRef(null), generation = useRef(0), alive = useRef(true);
  const canvasSession = useRef(null), directory = useRef(null);
  const copyTimer = useRef(null);

  async function refresh() {
    const sessionAtRequest = session.current;
    const id = canvasSession.current;
    if (!id || !sessionAtRequest || document.hidden) return;
    const request = ++generation.current;
    const current = () => alive.current && request === generation.current && session.current === sessionAtRequest;
    let path;
    try {
      path = sessionFile(id);
    } catch (failure) {
      if (current()) setError(errorMessage(failure));
      return;
    }
    let text;
    try {
      text = (await host.readFile(path)).content;
    } catch (failure) {
      if (!current()) return;
      if (isNotFound(failure)) {
        setArtifact(null); setError('');
      } else {
        setError(`Could not read this conversation’s canvas: ${errorMessage(failure)}`);
      }
      return;
    }
    try {
      const parsed = parseArtifact(text);
      if (!current()) return;
      setArtifact(parsed); setMonths(initialMonths(parsed)); setError('');
    } catch (failure) {
      if (!current()) return;
      setError(`This conversation’s canvas is invalid and was left as-is: ${errorMessage(failure)}`);
    }
  }

  async function resolveCanvasSession(id) {
    // A subagent runs in a child session; show the top-level conversation's canvas.
    try {
      const projects = await host.listProjects();
      const project = projects.projects.find(candidate => candidate.directory === directory.current) ?? projects.projects[0];
      if (!project) return id;
      const snapshot = await host.listSessions(project.id);
      const byId = new Map(snapshot.sessions.map(record => [record.id, record]));
      let currentId = id;
      for (let hops = 0; hops < 8; hops++) {
        const parentId = byId.get(currentId)?.parentId;
        if (!parentId) break;
        currentId = parentId;
      }
      return currentId;
    } catch {
      return id;
    }
  }

  function select(next) {
    const id = next?.id ?? null;
    if (session.current === id) return;
    generation.current++;
    session.current = id;
    canvasSession.current = null;
    setSessionId(id); setArtifact(null); setMonths(12); setError('');
    if (!id) return;
    void (async () => {
      const resolved = await resolveCanvasSession(id);
      if (!alive.current || session.current !== id) return;
      canvasSession.current = resolved;
      void refresh();
    })();
  }

  const promptPath = () => sessionFile(canvasSession.current ?? session.current);
  async function copyPrompt() {
    try {
      await host.writeClipboard(agentPrompt(promptPath()));
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => { if (alive.current) setCopied(false); }, 2000);
    } catch (failure) {
      setError(`Could not copy the request: ${errorMessage(failure)}`);
    }
  }
  async function insertPrompt() {
    try {
      await host.compose({ text: agentPrompt(promptPath()), mode: 'append' });
    } catch (failure) {
      setError(`Could not insert the request: ${errorMessage(failure)}`);
    }
  }

  useEffect(() => {
    alive.current = true;
    const ready = host.onReady(context => {
      applyHostReady(context, document.documentElement);
      directory.current = context.directory ?? null;
      setTheme(`${context.theme?.mode ?? ''}|${context.theme?.tokens?.primary ?? ''}|${context.theme?.tokens?.elevated ?? ''}|${context.theme?.tokens?.foreground ?? ''}`);
      setConnected(true);
      select(context.session);
    });
    const followed = host.onSession(next => select(next));
    const timer = setInterval(() => { void refresh(); }, 3000);
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    return () => {
      alive.current = false; generation.current++;
      clearTimeout(copyTimer.current); ready(); followed();
      clearInterval(timer); window.removeEventListener('focus', focus);
    };
  }, []);

  const empty = !connected
    ? { title: 'Connecting…', body: 'Waiting for the host.' }
    : !sessionId
      ? { title: 'No conversation', body: 'Open a conversation to see its canvas.' }
      : { title: 'Empty canvas', body: 'Ask the agent to visualize or present data in this conversation.' };

  return <main>
    {error && <div className="error-overlay" role="alert"><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError('')}>×</button></div>}
    <div className="workspace">
      {artifact
        ? <article className="canvas" aria-label="Canvas preview"><Canvas artifact={artifact} months={months} setMonths={setMonths} theme={theme} /></article>
        : <div className="empty">
            <h1 className="empty-title">{empty.title}</h1>
            <p className="empty-body">{empty.body}</p>
            {sessionId && error === '' && <AgentPrompt text={agentPrompt(promptPath())} onCopy={copyPrompt} onInsert={insertPrompt} copied={copied} />}
          </div>}
    </div>
    <span className="sr-only" role="status" aria-live="polite">{artifact ? 'Canvas for this conversation is shown.' : error ? `Canvas unavailable: ${error}` : 'Empty canvas.'}</span>
  </main>;
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
window.addEventListener('pagehide', () => { root.unmount(); host.dispose(); }, { once: true });

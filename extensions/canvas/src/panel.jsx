import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { connectHost } from '@openchamber/sdk';
import { applyHostReady } from '@openchamber/sdk/ui';
import { parseArtifact, errorMessage, componentsSummary, CONTAINERS, initialMonths } from './catalog.js';
import { sessionFile } from './session.js';
import { Canvas } from './renderer.jsx';

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
    'Components (? marks an optional prop):',
    ...componentsSummary().map(line => `  ${line}`),
    `${CONTAINERS.join(', ')} may have children; every other component is a leaf.`,
    'Use trusted component JSON only — never HTML, scripts, events or expressions.',
  ].join('\n');
}

// Remix Icon file-copy-line, drawn inline: the panel is an iframe and cannot
// use the app's own icon sprite.
const CopyIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.9998 6V3C6.9998 2.44772 7.44752 2 7.9998 2H19.9998C20.5521 2 20.9998 2.44772 20.9998 3V17C20.9998 17.5523 20.5521 18 19.9998 18H16.9998V20.9991C16.9998 21.5519 16.5499 22 15.993 22H4.00666C3.45059 22 3 21.5554 3 20.9991L3.0026 7.00087C3.0027 6.44811 3.45264 6 4.00942 6H6.9998ZM5.00242 8L5.00019 20H14.9998V8H5.00242ZM8.9998 6H16.9998V16H18.9998V4H8.9998V6Z" /></svg>;
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>;
// Remix Icon sparkling-2-line, drawn inline: the panel is an iframe and cannot
// use the app's own icon sprite.
const SparkleIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.0007 1.20825 18.3195 3.68108 20.7923 4.99992 18.3195 6.31876 17.0007 8.79159 15.6818 6.31876 13.209 4.99992 15.6818 3.68108 17.0007 1.20825ZM10.6673 9.33325 15.6673 11.9999 10.6673 14.6666 8.00065 19.6666 5.33398 14.6666.333984 11.9999 5.33398 9.33325 8.00065 4.33325 10.6673 9.33325ZM11.4173 11.9999 9.18905 10.8115 8.00065 8.58325 6.81224 10.8115 4.58398 11.9999 6.81224 13.1883 8.00065 15.4166 9.18905 13.1883 11.4173 11.9999ZM19.6673 16.3333 18.0007 13.2083 16.334 16.3333 13.209 17.9999 16.334 19.6666 18.0007 22.7916 19.6673 19.6666 22.7923 17.9999 19.6673 16.3333Z" /></svg>;

function AgentPrompt({ text, onInsert, onCopy, copied }) {
  const [expanded, setExpanded] = useState(false);
  const textRef = useRef(null);
  const toggle = () => {
    const next = !expanded;
    // Collapsing must not keep the scrolled position, or the short field opens
    // on the middle of the request.
    if (!next && textRef.current) textRef.current.scrollTop = 0;
    setExpanded(next);
  };
  return <div className="prompt">
    <div className={`prompt-field${expanded ? ' expanded' : ''}`} role="group" aria-label="Request for the agent">
      <pre className="prompt-text" ref={textRef}>{text}</pre>
      {!expanded && <div className="prompt-fade" aria-hidden="true" />}
      <button type="button" className="prompt-copy" data-copied={copied || undefined} aria-label={copied ? 'Copied' : 'Copy request'} title={copied ? 'Copied' : 'Copy request'} onClick={onCopy}>{copied ? <><CheckIcon /><span>Copied</span></> : <CopyIcon />}</button>
    </div>
    <div className="prompt-actions">
      <button type="button" className="prompt-toggle" aria-expanded={expanded} onClick={toggle}>{expanded ? 'Show less' : 'Show more'}</button>
      <button type="button" className="prompt-insert" onClick={onInsert}>Insert into composer</button>
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
  const sourceText = useRef(null);

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
        sourceText.current = null; setArtifact(null); setError('');
      } else {
        setError(`Could not read this conversation’s canvas: ${errorMessage(failure)}`);
      }
      return;
    }
    try {
      if (text === sourceText.current) { if (current()) setError(''); return; }
      const parsed = parseArtifact(text);
      if (!current()) return;
      const first = sourceText.current === null;
      sourceText.current = text;
      setArtifact(parsed);
      setMonths(previous => {
        const control = Object.values(parsed.spec.elements).find(element => element.type === 'HorizonControl');
        return first || (control && !control.props.options.includes(previous)) ? initialMonths(parsed) : previous;
      });
      setError('');
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
    sourceText.current = null;
    setSessionId(id); setArtifact(null); setMonths(12); setError('');
    if (!id) return;
    const selectedGeneration = generation.current;
    void (async () => {
      const resolved = await resolveCanvasSession(id);
      if (!alive.current || session.current !== id || generation.current !== selectedGeneration) return;
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
      setTheme(`${context.theme?.mode ?? ''}|${JSON.stringify(context.theme?.tokens ?? {})}`);
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
            {sessionId && <span className="empty-icon"><SparkleIcon /></span>}
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

// Development preview: renders the real Canvas against host-like tokens so a
// reviewer can inspect every component and propose changes. Not shipped in the
// extension package.
import React, { useLayoutEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '../src/renderer.jsx';
import { parseArtifact, componentsSummary } from '../src/catalog.js';
import { gallery, costExplorer } from '../src/examples.js';
import { applyHostTheme } from '@openchamber/sdk/ui';
import { boundaries, diagramThemes, reviewTheme } from './fixtures.js';

const EXAMPLES = { Gallery: gallery, 'Cost explorer': costExplorer, Boundaries: boundaries, 'Diagram themes': diagramThemes };

function Preview() {
  const [name, setName] = useState('Gallery');
  const [dark, setDark] = useState(false);
  useLayoutEffect(() => { applyHostTheme(reviewTheme(dark), document.documentElement); }, [dark]);
  const source = EXAMPLES[name];
  const artifact = useMemo(() => parseArtifact(source), [source]);
  const [months, setMonths] = useState(() => Object.values(artifact.spec.elements).find(element => element.type === 'HorizonControl')?.props.initialMonths ?? 12);
  const inventory = useMemo(() => componentsSummary(), []);
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
  };
  return <>
    <aside className="nav">
      <h1>Canvas catalog</h1>
      <select value={name} aria-label="Example" onChange={event => { setName(event.target.value); setMonths(12); }}>{Object.keys(EXAMPLES).map(key => <option key={key}>{key}</option>)}</select>
      <button type="button" onClick={toggleTheme}>{dark ? 'Light' : 'Dark'} theme</button>
      <p className="nav-count">{inventory.length} components</p>
      <ol className="nav-list">{inventory.map(line => <li key={line}>{line.split('(')[0]}</li>)}</ol>
    </aside>
    <main>
      <article className="canvas"><Canvas artifact={artifact} months={months} setMonths={setMonths} theme={dark ? 'dark|' : 'light|'} /></article>
    </main>
  </>;
}

createRoot(document.getElementById('app')).render(<Preview />);

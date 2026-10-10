import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { defineRegistry, JSONUIProvider, Renderer } from '@json-render/react';
import { catalog, initialMonths, totalCost, errorMessage } from './catalog.js';
import { diagramThemeVariables, createColorResolver } from './mermaid-theme.js';

const Controls = createContext(null);
const Theme = createContext('');
const colors = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)'];

let mermaidPromise = null;
function loadMermaid() {
  if (!mermaidPromise) mermaidPromise = import('mermaid').then(module => module.default);
  return mermaidPromise;
}
// Mermaid is a singleton: one global config and one temporary DOM node per
// render. Two diagrams drawing at once can make one measure a detached node
// ("svg element not in render tree"), so initialize and render are serialized.
let renderQueue = Promise.resolve();
function renderDiagram(id, code, dark) {
  const task = renderQueue.then(async () => {
    const mermaid = await loadMermaid();
    const resolve = createColorResolver();
    try {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        themeVariables: diagramThemeVariables(resolve, dark),
      });
      return await mermaid.render(id, code);
    } finally {
      resolve.dispose?.();
    }
  });
  renderQueue = task.then(() => undefined, () => undefined);
  return task;
}
function isDarkTheme(themeKey) {
  const mode = String(themeKey).split('|')[0];
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
}
// Mermaid's own accTitle/accDescr, so the diagram is named and described for
// assistive technology rather than only visually.
const ACC_TITLE = /^[ \t]*accTitle[ \t]*:[ \t]*(.+)$/im;
const ACC_DESCR = /^[ \t]*accDescr[ \t]*:[ \t]*(.+)$/im;
function diagramAccessibility(code, fallback) {
  return { title: code.match(ACC_TITLE)?.[1]?.trim() || fallback, description: code.match(ACC_DESCR)?.[1]?.trim() || '' };
}
function Diagram({ props }) {
  // Mermaid is loaded and rendered asynchronously. The host stays empty in the
  // React tree (Mermaid writes into it), so the loading and error messages are
  // siblings rather than children React could reconcile away.
  const host = useRef(null);
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState('');
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const themeKey = useContext(Theme);
  const { title: label, description } = diagramAccessibility(props.code, props.title);
  const descrId = `diagram-desc-${uid}`;
  useEffect(() => {
    let alive = true;
    setStatus('pending'); setError('');
    renderDiagram(`canvas-diagram-${uid}`, props.code, isDarkTheme(themeKey)).then(({ svg }) => {
      if (!alive || !host.current) return;
      host.current.innerHTML = svg;
      setStatus('ready');
    }).catch(failure => {
      if (!alive) return;
      setError(`Diagram could not be rendered: ${errorMessage(failure)}`);
      setStatus('error');
    });
    return () => { alive = false; };
  }, [props.code, uid, themeKey]);
  return <section className="card diagram-card"><h2>{props.title}</h2>{error
    ? <p className="muted">{error}</p>
    : status !== 'ready' && <p className="muted diagram-status">Rendering diagram…</p>}<div className="diagram-host" ref={host} role={error ? undefined : 'img'} aria-label={error ? undefined : label} aria-describedby={!error && description ? descrId : undefined} aria-busy={status === 'pending'} hidden={status !== 'ready'} />{description && <span className="sr-only" id={descrId}>{description}</span>}{props.caption && <p className="muted diagram-caption">{props.caption}</p>}</section>;
}
function LineChart({ props }) {
  const maximum = Math.max(1, ...props.data.map(item => item.value));
  const points = props.data.map((item, index) => [24 + index / Math.max(1, props.data.length - 1) * 552, 160 - item.value / maximum * 136]);
  const line = points.map(point => point.join(',')).join(' ');
  return <section className="card chart-card"><div className="section-heading"><h2>{props.title}</h2><span className="chart-label">{props.unit ?? 'TREND'}</span></div><svg className="line-chart" viewBox="0 0 600 180" role="img" aria-label={props.title}><desc>{props.data.map(item => `${item.label}: ${item.value}`).join(', ')}</desc>
    {[24, 69, 114, 160].map(y => <line key={y} x1="24" x2="576" y1={y} y2={y} className="chart-grid" />)}
    <polygon points={`24,160 ${line} 576,160`} fill={colors[0]} fillOpacity=".12" />
    <polyline points={line} fill="none" stroke={colors[0]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    {points.map(([x, y], index) => <circle key={index} cx={x} cy={y} r="4" fill={colors[0]}><title>{`${props.data[index].label}: ${props.data[index].value.toLocaleString()}${props.unit ? ` ${props.unit}` : ''}`}</title></circle>)}
  </svg><div className="axis-labels"><span>{props.data[0].label}</span><span>{props.data.at(-1).label}</span></div></section>;
}
function DonutChart({ props }) {
  const total = props.data.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;
  const gradient = props.data.map((item, index) => { const start = offset; offset += total ? item.value / total * 100 : 0; return `${colors[index % colors.length]} ${start}% ${offset}%`; }).join(', ');
  return <section className="card chart-card"><h2>{props.title}</h2><div className="distribution"><div className="donut" aria-hidden="true" style={{ background: total ? `conic-gradient(${gradient})` : 'var(--line)' }}><div><strong>{total.toLocaleString()}</strong><span>Total</span></div></div><dl className="legend">{props.data.map((item, index) => <div key={index}><dt><i style={{ background: colors[index % colors.length] }} />{item.label}</dt><dd>{total ? Math.round(item.value / total * 100) : 0}% <span>{item.value.toLocaleString()}</span></dd></div>)}</dl></div></section>;
}
function Bars({ title, data, format }) {
  const maximum = Math.max(1, ...data.map(item => item.value));
  return <section className="card"><h2>{title}</h2><dl className="bars">{data.map((item, index) => <div className="bar-row" key={index}>
    <dt><i className="series-dot" style={{ background: colors[index % colors.length] }} />{item.label}</dt><dd><span className="bar-track" aria-hidden="true"><span style={{ width: `${item.value / maximum * 100}%`, background: colors[index % colors.length] }} /></span><strong>{format(item.value)}</strong></dd>
  </div>)}</dl></section>;
}
function Table({ props }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(null);
  const rows = props.rows.filter(row => row.some(cell => String(cell ?? '').toLowerCase().includes(query.toLowerCase())));
  if (sort) rows.sort((a, b) => {
    const left = a[sort.index], right = b[sort.index];
    return (typeof left === 'number' && typeof right === 'number' ? left - right : String(left ?? '').localeCompare(String(right ?? ''))) * sort.direction;
  });
  return <section className="card"><div className="section-heading"><h2>{props.title}</h2><div className="search-field"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg><input value={query} onChange={event => setQuery(event.target.value)} type="search" aria-label="Filter rows" placeholder="Filter rows" /></div></div><div className="table-scroll"><table>
    <thead><tr>{props.columns.map((column, index) => <th key={index} aria-sort={sort?.index === index ? sort.direction === 1 ? 'ascending' : 'descending' : 'none'}><button onClick={() => setSort({ index, direction: sort?.index === index ? -sort.direction : 1 })}>{column}<span className="sort-arrow" aria-hidden="true">{sort?.index === index ? (sort.direction === 1 ? '↑' : '↓') : ''}</span></button></th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{String(cell ?? '—')}</td>)}</tr>)}</tbody>
  </table></div><p className="muted table-count">{rows.length} of {props.rows.length} rows{rows.length === 0 ? ' · No matching rows' : ''}</p></section>;
}
// Display helpers shared by the read-only components.
const TONE_COLORS = { neutral: 'var(--muted)', blue: 'var(--series-1)', green: 'var(--series-2)', amber: 'var(--series-3)', red: 'var(--oc-error, var(--series-5))' };
const toneColor = (value, index) => TONE_COLORS[value] ?? colors[index % colors.length];
const toneClass = value => `tone-${value ?? 'neutral'}`;
const Title = ({ children }) => children ? <h2>{children}</h2> : null;

function Divider({ props }) {
  return <div className="divider" data-labeled={Boolean(props.label)} role="separator">{props.label && <span>{props.label}</span>}</div>;
}
function List({ props }) {
  const Tag = props.ordered ? 'ol' : 'ul';
  return <section className="card"><Title>{props.title}</Title><Tag className="list">{props.items.map((item, index) => <li key={index}>{item}</li>)}</Tag></section>;
}
function KeyValue({ props }) {
  return <section className="card"><Title>{props.title}</Title><dl className="kv">{props.items.map((item, index) => <div key={index} className={toneClass(item.tone)}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></section>;
}
function Badge({ props }) {
  return <span className={`badge ${toneClass(props.tone)}`}>{props.label}</span>;
}
function Callout({ props }) {
  return <section className={`callout ${toneClass(props.tone ?? 'blue')}`} role="note">{props.title && <strong>{props.title}</strong>}<p>{props.text}</p></section>;
}
function CodeBlock({ props }) {
  return <section className="card"><Title>{props.title}</Title>{props.language && <span className="chart-label">{props.language}</span>}<pre className="code-block">{props.code}</pre></section>;
}
function Progress({ props }) {
  const percent = props.max ? Math.min(100, Math.round(props.value / props.max * 100)) : 0;
  return <section className={`card progress-card ${toneClass(props.tone ?? 'blue')}`}><div className="progress-head"><span>{props.title ?? 'Progress'}</span><strong>{props.value.toLocaleString()}{props.unit ? ` ${props.unit}` : ''} · {percent}%</strong></div><div className="progress-track" role="progressbar" aria-valuenow={props.value} aria-valuemin="0" aria-valuemax={props.max} aria-label={props.title ?? 'Progress'}><span style={{ width: `${percent}%` }} /></div></section>;
}
function StackedBar({ props }) {
  const total = props.segments.reduce((sum, segment) => sum + segment.value, 0);
  let offset = 0;
  const stops = props.segments.map((segment, index) => { const start = offset; offset += total ? segment.value / total * 100 : 0; return `${toneColor(segment.tone, index)} ${start}% ${offset}%`; }).join(', ');
  return <section className="card"><div className="section-heading"><h2>{props.title ?? 'Composition'}</h2><span className="chart-label">{props.unit ?? 'SHARE'}</span></div><div className="stacked-bar" style={{ background: total ? `linear-gradient(90deg, ${stops})` : 'var(--line)' }} aria-hidden="true" /><dl className="legend">{props.segments.map((segment, index) => <div key={index}><dt><i style={{ background: toneColor(segment.tone, index) }} />{segment.label}</dt><dd>{total ? Math.round(segment.value / total * 100) : 0}% <span>{segment.value.toLocaleString()}</span></dd></div>)}</dl></section>;
}
function Gauge({ props }) {
  const ratio = props.max ? Math.max(0, Math.min(1, props.value / props.max)) : 0;
  const radius = 44, circumference = 2 * Math.PI * radius;
  return <section className={`card gauge-card ${toneClass(props.tone ?? 'blue')}`}><Title>{props.title}</Title><div className="gauge"><svg viewBox="0 0 120 120" role="img" aria-label={`${props.title ?? 'Gauge'}: ${props.value} of ${props.max}`}><circle className="gauge-track" cx="60" cy="60" r={radius} /><circle className="gauge-ring" cx="60" cy="60" r={radius} strokeDasharray={`${(circumference * ratio).toFixed(1)} ${circumference.toFixed(1)}`} transform="rotate(-90 60 60)" /></svg><div className="gauge-center"><strong>{props.value.toLocaleString()}</strong>{props.unit && <span>{props.unit}</span>}</div></div></section>;
}
function Sparkline({ props }) {
  const maximum = Math.max(1, ...props.data.map(item => item.value));
  const line = props.data.map((item, index) => `${(index / Math.max(1, props.data.length - 1) * 100).toFixed(2)},${(30 - item.value / maximum * 26).toFixed(2)}`).join(' ');
  return <section className={`card ${toneClass(props.tone ?? 'blue')}`}><Title>{props.title}</Title><svg className="sparkline" viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label={props.title ?? 'Trend'}><polyline points={line} vectorEffect="non-scaling-stroke" /></svg><div className="spark-meta"><span>{props.data[0].label}</span><span>{props.data.at(-1).label}</span></div></section>;
}
function Heatmap({ props }) {
  const maximum = Math.max(1, ...props.rows.flatMap(row => row.values));
  return <section className="card"><Title>{props.title}</Title><div className="heat" style={{ gridTemplateColumns: `auto repeat(${props.columns.length}, minmax(0, 1fr))` }}><span />{props.columns.map((column, index) => <span className="heat-col" key={index}>{column}</span>)}{props.rows.map((row, rowIndex) => <React.Fragment key={rowIndex}><span className="heat-label">{row.label}</span>{row.values.map((value, cellIndex) => <span className="heat-cell" key={cellIndex} title={`${row.label} · ${props.columns[cellIndex]}: ${value}`} style={{ opacity: 0.15 + 0.85 * (value / maximum) }} />)}</React.Fragment>)}</div></section>;
}
function StackedBarChart({ props }) {
  const totals = props.categories.map((_, index) => props.series.reduce((sum, entry) => sum + (entry.data[index] ?? 0), 0));
  const maximum = Math.max(1, ...totals);
  return <section className="card"><div className="section-heading"><h2>{props.title}</h2>{props.unit && <span className="chart-label">{props.unit}</span>}</div><div className="stack-chart">{props.categories.map((category, index) => <div className="stack-col" key={index}><div className="stack-col-bars">{props.series.map((entry, seriesIndex) => <span key={seriesIndex} style={{ height: `${(entry.data[index] ?? 0) / maximum * 100}%`, background: colors[seriesIndex % colors.length] }} title={`${entry.label}: ${entry.data[index]}`} />)}</div><span className="axis-x">{category}</span></div>)}</div><dl className="legend">{props.series.map((entry, index) => <div key={index}><dt><i style={{ background: colors[index % colors.length] }} />{entry.label}</dt><dd>{entry.data.reduce((sum, value) => sum + value, 0).toLocaleString()}</dd></div>)}</dl></section>;
}
function ScatterChart({ props }) {
  const xs = props.points.map(point => point.x), ys = props.points.map(point => point.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(...ys), yMax = Math.max(...ys);
  const px = value => 30 + (xMax === xMin ? 0.5 : (value - xMin) / (xMax - xMin)) * 520;
  const py = value => 160 - (yMax === yMin ? 0.5 : (value - yMin) / (yMax - yMin)) * 130;
  return <section className="card chart-card"><div className="section-heading"><h2>{props.title}</h2><span className="chart-label">{props.yUnit ?? 'SCATTER'}</span></div><svg className="scatter" viewBox="0 0 580 180" role="img" aria-label={props.title}><desc>{props.points.map(point => `${point.label ? `${point.label}: ` : ''}${point.x}, ${point.y}`).join('; ')}</desc>{[24, 69, 114, 160].map(y => <line key={y} x1="30" x2="560" y1={y} y2={y} className="chart-grid" />)}{props.points.map((point, index) => <circle key={index} cx={px(point.x)} cy={py(point.y)} r="4" fill={colors[0]}><title>{`${point.label ? `${point.label}: ` : ''}${point.x}, ${point.y}`}</title></circle>)}</svg><div className="axis-labels"><span>{`${props.xUnit ? `${props.xUnit} ` : ''}${xMin}`}</span><span>{xMax}</span></div></section>;
}
function Checklist({ props }) {
  return <section className="card"><Title>{props.title}</Title><ul className="checklist">{props.items.map((item, index) => <li key={index} data-done={item.done || undefined}><span className="check-box" aria-hidden="true">{item.done ? '✓' : ''}</span><span>{item.label}</span><span className="sr-only">{item.done ? ' (done)' : ' (pending)'}</span></li>)}</ul></section>;
}
function Timeline({ props }) {
  return <section className="card"><Title>{props.title}</Title><ol className="timeline">{props.items.map((item, index) => <li key={index} className={toneClass(item.tone)}><span className="tl-dot" aria-hidden="true" /><div className="tl-body">{item.time && <span className="tl-time">{item.time}</span>}<strong>{item.title}</strong>{item.detail && <p className="muted">{item.detail}</p>}</div></li>)}</ol></section>;
}
function Steps({ props }) {
  return <section className="card"><Title>{props.title}</Title><ol className="steps">{props.items.map((item, index) => <li key={index} data-state={item.state}><span className="step-index" aria-hidden="true">{item.state === 'done' ? '✓' : index + 1}</span><div><strong>{item.label}</strong>{item.detail && <p className="muted">{item.detail}</p>}</div></li>)}</ol></section>;
}

const { registry } = defineRegistry(catalog, { components: {
  Stack: ({ children }) => <div className="stack">{children}</div>,
  Grid: ({ props, children }) => <div className={`dashboard-grid cols-${props.columns ?? 2}`} style={{ '--columns': props.columns ?? 2 }}>{children}</div>,
  Heading: ({ props }) => <div className="dashboard-heading">{props.eyebrow && <p className="eyebrow">{props.eyebrow}</p>}<h1>{props.title}</h1>{props.subtitle && <p className="muted">{props.subtitle}</p>}</div>,
  Card: ({ props, children }) => <section className="card"><h2>{props.title}</h2>{props.description && <p className="muted">{props.description}</p>}{children}</section>,
  Text: ({ props }) => <p className="plain-text">{props.text}</p>,
  Metric: ({ props }) => <section className={`card metric-card tone-${props.tone ?? 'blue'}`}><p className="metric-label">{props.label}</p><div className="metric-line"><strong className="metric">{props.value}</strong>{props.change && <span className="trend-badge">{props.change}</span>}</div>{props.detail && <p className="muted">{props.detail}</p>}</section>,
  BarChart: ({ props }) => <Bars {...props} format={value => `${value.toLocaleString()}${props.unit ? ` ${props.unit}` : ''}`} />,
  LineChart, DonutChart, Diagram,
  Table,
  Divider, List, KeyValue, Badge, Callout, CodeBlock,
  Progress, StackedBar, Gauge, Sparkline, Heatmap,
  StackedBarChart, ScatterChart, Checklist, Timeline, Steps,
  HorizonControl: ({ props }) => {
    const { months, setMonths } = useContext(Controls);
    return <fieldset className="horizon"><legend>{props.label}</legend>{props.options.map(option => <label key={option}><input name="horizon" type="radio" checked={months === option} onChange={() => setMonths(option)} />{option} months</label>)}</fieldset>;
  },
  CostChart: ({ props }) => {
    const { months } = useContext(Controls);
    const format = value => new Intl.NumberFormat(undefined, { style: 'currency', currency: props.currency, maximumFractionDigits: 2 }).format(value);
    const data = props.providers.map(provider => ({ label: provider.label, value: totalCost(provider, months) }));
    const cheapest = [...data].sort((a, b) => a.value - b.value)[0];
    return <div className="cost-comparison"><Bars title={`${props.title} · ${months} months`} data={data} format={format} /><div className="cost-insight"><span className="insight-dot" /><div><strong>{cheapest.label} has the lowest total</strong><p>{format(cheapest.value)} across {months} months · upfront + monthly costs</p></div></div></div>;
  },
} });

export function Canvas({ artifact, months, setMonths, theme = '' }) {
  return <Theme.Provider value={theme}><Controls.Provider value={{ months, setMonths }}><JSONUIProvider registry={registry}><Renderer spec={artifact.spec} registry={registry} /></JSONUIProvider></Controls.Provider></Theme.Provider>;
}
export { initialMonths };

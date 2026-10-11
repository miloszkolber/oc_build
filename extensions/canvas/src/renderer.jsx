import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { defineRegistry, JSONUIProvider, Renderer } from '@json-render/react';
import { catalog, totalCost, errorMessage } from './catalog.js';
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
// Mermaid appends a temporary node to the document and measures it. While the
// guest document is not rendered (collapsed panel, hidden tab, conversation
// switch) that node has no layout box and Mermaid rejects with "svg element not
// in render tree". Render attempts therefore wait for a rendered document, and a
// measurement failure is retried once instead of being stored as terminal state.
function documentIsRendered() {
  if (typeof document === 'undefined') return true;
  if (document.visibilityState === 'hidden') return false;
  return Boolean(document.body?.getClientRects().length);
}
function whenDocumentRendered(callback) {
  if (documentIsRendered()) { callback(); return () => {}; }
  let frame = 0;
  let done = false;
  const stop = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', check);
    window.removeEventListener('resize', check);
  };
  const check = () => { if (!documentIsRendered()) return; stop(); callback(); };
  document.addEventListener('visibilitychange', check);
  window.addEventListener('resize', check);
  const poll = () => { if (done) return; frame = requestAnimationFrame(poll); check(); };
  frame = requestAnimationFrame(poll);
  return stop;
}
const TRANSIENT_DIAGRAM_ERROR = /not in render tree/i;
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
    let cancelWait = null;
    setStatus('pending'); setError('');
    const run = retries => {
      if (!alive || !host.current) return;
      cancelWait = whenDocumentRendered(() => {
        cancelWait = null;
        renderDiagram(`canvas-diagram-${uid}`, props.code, isDarkTheme(themeKey)).then(({ svg }) => {
          if (!alive || !host.current) return;
          host.current.innerHTML = svg;
          setStatus('ready');
        }).catch(failure => {
          if (!alive) return;
          if (retries < 1 && TRANSIENT_DIAGRAM_ERROR.test(errorMessage(failure))) { run(retries + 1); return; }
          setError(`Diagram could not be rendered. ${errorMessage(failure)}`);
          setStatus('error');
        });
      });
    };
    run(0);
    return () => { alive = false; cancelWait?.(); };
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
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  // A 2px gap between slices separates neighbours without another color.
  let offset = 0;
  const slices = props.data.map((item, index) => {
    const length = Math.max(0, (total ? item.value / total * circumference : 0) - 2);
    const slice = { index, length, start: offset };
    offset += length + 2;
    return slice;
  });
  const share = item => (total ? Math.round(item.value / total * 100) : 0);
  return <section className="card"><h2>{props.title}</h2><div className="distribution">
    <svg className="donut" viewBox="0 0 120 120" role="img" aria-label={`${props.title}: ${props.data.map(item => `${item.label} ${share(item)}%`).join(', ')}`}>
      <defs><PatternDefs id={`donut-${uid}`} /></defs>
      <circle className="donut-track" cx="60" cy="60" r={radius} />
      <g transform="rotate(-90 60 60)">
        {slices.map(slice => <circle key={slice.index} className="donut-seg" cx="60" cy="60" r={radius} style={{ stroke: colors[slice.index % colors.length] }} strokeDasharray={`${slice.length} ${circumference - slice.length}`} strokeDashoffset={-slice.start} />)}
        {slices.filter(slice => patternOf(slice.index) > 1).map(slice => <circle key={`pattern-${slice.index}`} className="donut-seg" cx="60" cy="60" r={radius} stroke={`url(#donut-${uid}-p${patternOf(slice.index)})`} strokeDasharray={`${slice.length} ${circumference - slice.length}`} strokeDashoffset={-slice.start} />)}
      </g>
      <text className="donut-total" x="60" y="57">{total.toLocaleString()}</text>
      <text className="donut-label" x="60" y="72">Total</text>
    </svg>
    <dl className="legend">{props.data.map((item, index) => <div key={index}><dt><i className={`pat-${patternOf(index)}`} style={{ backgroundColor: colors[index % colors.length] }} />{item.label}</dt><dd>{share(item)}% <span>{item.value.toLocaleString()}</span></dd></div>)}</dl>
  </div></section>;
}
function Bars({ title, data, format }) {
  const maximum = Math.max(1, ...data.map(item => item.value));
  return <section className="card"><h2>{title}</h2><dl className="bars">{data.map((item, index) => <div className="bar-row" key={index}>
    <dt><i className={`series-dot pat-${patternOf(index)}`} style={{ backgroundColor: colors[index % colors.length] }} />{item.label}</dt><dd><span className="bar-track" aria-hidden="true"><span className={`bar-fill pat-${patternOf(index)}`} style={{ width: `${item.value / maximum * 100}%`, backgroundColor: colors[index % colors.length] }} /></span><strong>{format(item.value)}</strong></dd>
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
  const align = index => props.align?.[index] === 'right' ? 'right' : 'left';
  return <section className="card"><div className="section-heading"><h2>{props.title}</h2><div className="search-field"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg><input value={query} onChange={event => setQuery(event.target.value)} type="search" aria-label="Filter rows" placeholder="Filter rows" /></div></div><div className="table-scroll"><table>
    <thead><tr>{props.columns.map((column, index) => <th key={index} style={{ textAlign: align(index) }} aria-sort={sort?.index === index ? sort.direction === 1 ? 'ascending' : 'descending' : 'none'}><button onClick={() => setSort({ index, direction: sort?.index === index ? -sort.direction : 1 })}>{column}<span className="sort-arrow" aria-hidden="true">{sort?.index === index ? (sort.direction === 1 ? '↑' : '↓') : ''}</span></button></th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column} style={{ textAlign: align(column) }}>{String(cell ?? '—')}</td>)}</tr>)}</tbody>
    {props.footer && <tfoot><tr>{props.columns.map((_, index) => <td key={index} style={{ textAlign: align(index) }}>{String(props.footer[index] ?? '—')}</td>)}</tr></tfoot>}
  </table></div><p className="muted table-count">{rows.length} of {props.rows.length} rows{rows.length === 0 ? ' · No matching rows' : ''}</p></section>;
}
// Display helpers shared by the read-only components.
const TONE_COLORS = { neutral: 'var(--muted)', blue: 'var(--series-1)', green: 'var(--series-2)', amber: 'var(--series-3)', red: 'var(--oc-error, var(--series-5))' };
const toneColor = (value, index) => TONE_COLORS[value] ?? colors[index % colors.length];
const toneClass = value => `tone-${value ?? 'neutral'}`;
// Series carry a pattern as well as a fill, so adjacent steps of the single-hue
// ramp stay separable without relying on color alone. Pattern 1 stays solid.
const patternOf = index => (index % 5) + 1;
const PATTERNS = [
  null,
  <path key="diagonal" d="M-1 5L5-1M0 8L8 0" />,
  <g key="dots"><circle cx="2" cy="2" r="1.05" /><circle cx="6" cy="6" r="1.05" /></g>,
  <g key="cross"><path d="M-1 5L5-1M0 8L8 0" /><path d="M-1 3L5 9M0 0L8 8" /></g>,
  <g key="grid"><path d="M0 3.5H8M3.5 0V8" /></g>,
];
function PatternDefs({ id }) {
  return <>{PATTERNS.map((shape, index) => shape && <pattern key={index} id={`${id}-p${index + 1}`} className="series-pattern" width="8" height="8" patternUnits="userSpaceOnUse">{shape}</pattern>)}</>;
}
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
  const share = segment => (total ? Math.round(segment.value / total * 100) : 0);
  return <section className="card"><div className="section-heading"><h2>{props.title ?? 'Composition'}</h2><span className="chart-label">{props.unit ?? 'SHARE'}</span></div>
    <div className="stacked-bar" role="img" aria-label={`${props.title ?? 'Composition'}: ${props.segments.map(segment => `${segment.label} ${share(segment)}%`).join(', ')}`}>
      {props.segments.map((segment, index) => <span key={index} className={`stacked-seg pat-${patternOf(index)}`} style={{ width: total ? `${segment.value / total * 100}%` : '0%', backgroundColor: toneColor(segment.tone, index) }} />)}
    </div>
    <dl className="legend">{props.segments.map((segment, index) => <div key={index}><dt><i className={`pat-${patternOf(index)}`} style={{ backgroundColor: toneColor(segment.tone, index) }} />{segment.label}</dt><dd>{share(segment)}% <span>{segment.value.toLocaleString()}</span></dd></div>)}</dl></section>;
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
  return <section className="card"><div className="section-heading"><h2>{props.title}</h2>{props.unit && <span className="chart-label">{props.unit}</span>}</div><div className="stack-chart">{props.categories.map((category, index) => <div className="stack-col" key={index}><div className="stack-col-bars">{props.series.map((entry, seriesIndex) => <span key={seriesIndex} className={`stack-seg pat-${patternOf(seriesIndex)}`} style={{ height: `${(entry.data[index] ?? 0) / maximum * 100}%`, backgroundColor: colors[seriesIndex % colors.length] }} title={`${entry.label}: ${entry.data[index]}`} />)}</div><span className="axis-x">{category}</span></div>)}</div><dl className="legend">{props.series.map((entry, index) => <div key={index}><dt><i className={`pat-${patternOf(index)}`} style={{ backgroundColor: colors[index % colors.length] }} />{entry.label}</dt><dd>{entry.data.reduce((sum, value) => sum + value, 0).toLocaleString()}</dd></div>)}</dl></section>;
}
function ScatterChart({ props }) {
  const xs = props.points.map(point => point.x), ys = props.points.map(point => point.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(...ys), yMax = Math.max(...ys);
  const px = value => 30 + (xMax === xMin ? 0.5 : (value - xMin) / (xMax - xMin)) * 520;
  const py = value => 160 - (yMax === yMin ? 0.5 : (value - yMin) / (yMax - yMin)) * 130;
  return <section className="card chart-card"><div className="section-heading"><h2>{props.title}</h2><span className="chart-label">{props.yUnit ?? 'SCATTER'}</span></div><svg className="scatter" viewBox="0 0 580 180" role="img" aria-label={props.title}><desc>{props.points.map(point => `${point.label ? `${point.label}: ` : ''}${point.x}, ${point.y}`).join('; ')}</desc>{[24, 69, 114, 160].map(y => <line key={y} x1="30" x2="560" y1={y} y2={y} className="chart-grid" />)}{props.points.map((point, index) => <circle key={index} cx={px(point.x)} cy={py(point.y)} r="4" fill={colors[0]}><title>{`${point.label ? `${point.label}: ` : ''}${point.x}, ${point.y}`}</title></circle>)}</svg><div className="axis-labels"><span>{`${props.xUnit ? `${props.xUnit} ` : ''}${xMin}`}</span><span>{xMax}</span></div></section>;
}
function Checklist({ props }) {
  return <section className="card"><Title>{props.title}</Title><ul className="checklist">{props.items.map((item, index) => <li key={index} data-done={item.done || undefined}><span className="check-box" aria-hidden="true">{item.done && <Glyph name="check" size={12} />}</span><span>{item.label}</span><span className="sr-only">{item.done ? ' (done)' : ' (pending)'}</span></li>)}</ul></section>;
}
function Timeline({ props }) {
  return <section className="card"><Title>{props.title}</Title><ol className="timeline">{props.items.map((item, index) => <li key={index} className={toneClass(item.tone)}><span className="tl-dot" aria-hidden="true" /><div className="tl-body">{item.time && <span className="tl-time">{item.time}</span>}<strong>{item.title}</strong>{item.detail && <p className="muted">{item.detail}</p>}</div></li>)}</ol></section>;
}
function Steps({ props }) {
  return <section className="card"><Title>{props.title}</Title><ol className="steps">{props.items.map((item, index) => <li key={index} data-state={item.state}><span className="step-index" aria-hidden="true">{item.state === 'done' ? <Glyph name="check" size={12} /> : index + 1}</span><div><strong>{item.label}</strong>{item.detail && <p className="muted">{item.detail}</p>}</div></li>)}</ol></section>;
}

// Remix Icon outlines, inlined so the guest iframe needs no icon font.
const ICON_PATHS = {
  check: 'M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2212L9.9997 15.1709Z',
  close: 'M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z',
  info: 'M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 7H13V9H11V7ZM11 11H13V17H11V11Z',
  warning: 'M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 15H13V17H11V15ZM11 7H13V13H11V7Z',
  clock: 'M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM13 12H17V14H11V7H13V12Z',
  search: 'M18.031 16.6168L22.3137 20.8995L20.8995 22.3137L16.6168 18.031C15.0769 19.263 13.124 20 11 20C6.032 20 2 15.968 2 11C2 6.032 6.032 2 11 2C15.968 2 20 6.032 20 11C20 13.124 19.263 15.0769 18.031 16.6168ZM16.0247 15.8748C17.2475 14.6146 18 12.8956 18 11C18 7.1325 14.8675 4 11 4C7.1325 4 4 7.1325 4 11C4 14.8675 7.1325 18 11 18C12.8956 18 14.6146 17.2475 15.8748 16.0247L16.0247 15.8748Z',
  star: 'M12.0006 18.26L4.94715 22.2082L6.52248 14.2799L0.587891 8.7918L8.61493 7.84006L12.0006 0.5L15.3862 7.84006L23.4132 8.7918L17.4787 14.2799L19.054 22.2082L12.0006 18.26ZM12.0006 15.968L16.2473 18.3451L15.2988 13.5717L18.8719 10.2674L14.039 9.69434L12.0006 5.27502L9.96214 9.69434L5.12921 10.2674L8.70231 13.5717L7.75383 18.3451L12.0006 15.968Z',
  sparkle: 'M17.0007 1.20825 18.3195 3.68108 20.7923 4.99992 18.3195 6.31876 17.0007 8.79159 15.6818 6.31876 13.209 4.99992 15.6818 3.68108 17.0007 1.20825ZM10.6673 9.33325 15.6673 11.9999 10.6673 14.6666 8.00065 19.6666 5.33398 14.6666.333984 11.9999 5.33398 9.33325 8.00065 4.33325 10.6673 9.33325ZM11.4173 11.9999 9.18905 10.8115 8.00065 8.58325 6.81224 10.8115 4.58398 11.9999 6.81224 13.1883 8.00065 15.4166 9.18905 13.1883 11.4173 11.9999ZM19.6673 16.3333 18.0007 13.2083 16.334 16.3333 13.209 17.9999 16.334 19.6666 18.0007 22.7916 19.6673 19.6666 22.7923 17.9999 19.6673 16.3333Z',
  starFill: 'M12.0006 18.26L4.94715 22.2082L6.52248 14.2799L0.587891 8.7918L8.61493 7.84006L12.0006 0.5L15.3862 7.84006L23.4132 8.7918L17.4787 14.2799L19.054 22.2082L12.0006 18.26Z',
};
function Glyph({ name, size = 16 }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true"><path d={ICON_PATHS[name]} /></svg>;
}

function Row({ props, children }) {
  return <div className={`row${props.wrap === false ? '' : ' wrap'}`}>{children}</div>;
}
function Disclosure({ props, children }) {
  return <details className="disclosure" open={props.open}><summary>{props.summary}</summary><div className="disclosure-body">{children}</div></details>;
}
function Tabs({ props }) {
  const [active, setActive] = useState(0);
  const index = Math.min(active, props.tabs.length - 1);
  return <section className="card"><div className="segmented" role="group" aria-label="Tabs">{props.tabs.map((tab, item) => <button key={item} type="button" aria-pressed={item === index} className={item === index ? 'active' : ''} onClick={() => setActive(item)}>{tab.label}</button>)}</div><p className="tab-body">{props.tabs[index].body}</p></section>;
}
function Icon({ props }) {
  return <span className={`icon${props.tone ? ` ${toneClass(props.tone)}` : ''}`}><Glyph name={props.name} size={props.size ?? 18} /></span>;
}
function RichText({ props }) {
  return <p className="rich-text">{props.runs.map((run, index) => {
    const style = run.style ?? 'plain';
    if (style === 'code') return <code key={index}>{run.text}</code>;
    if (style === 'bold') return <strong key={index}>{run.text}</strong>;
    if (style === 'italic') return <em key={index}>{run.text}</em>;
    if (style === 'muted') return <span className="muted" key={index}>{run.text}</span>;
    return <React.Fragment key={index}>{run.text}</React.Fragment>;
  })}</p>;
}
function Choice({ props }) {
  return <section className="card"><Title>{props.label}</Title><div className="choice" data-mode={props.mode ?? 'single'}>{props.options.map((option, index) => <span key={index} className={`choice-option${option.selected ? ' selected' : ''}`}>{option.label}{option.selected && <span className="sr-only"> (selected)</span>}</span>)}</div></section>;
}
function Person({ props }) {
  const initials = props.initials ?? props.name.split(/\s+/).map(word => word[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();
  return <span className={`person ${toneClass(props.tone)}`}><span className="person-avatar" aria-hidden="true">{initials}</span><span className="person-body"><strong>{props.name}</strong>{props.role && <span className="muted">{props.role}</span>}</span></span>;
}
function Diff({ props }) {
  const count = Math.max(props.before.length, props.after.length);
  return <section className="card"><Title>{props.title}</Title><div className="diff">{Array.from({ length: count }, (_, index) => <div className="diff-row" key={index}><span className="diff-before">{props.before[index] ?? ''}</span><span className="diff-after">{props.after[index] ?? ''}</span></div>)}</div></section>;
}
function Rating({ props }) {
  const value = Math.max(0, Math.min(props.max, props.value));
  return <section className="card"><Title>{props.label}</Title><div className="rating" role="img" aria-label={`${props.label ?? 'Rating'}: ${value} of ${props.max}`}>{Array.from({ length: props.max }, (_, index) => index < Math.round(value) ? <span className="star on" key={index}><Glyph name="starFill" size={16} /></span> : <span className="star" key={index}><Glyph name="star" size={16} /></span>)}<span className="rating-value">{value}/{props.max}</span></div></section>;
}
function Tree({ props }) {
  const branch = nodes => <ul className="tree">{nodes.map((node, index) => <li key={index}><div className="tree-node"><span className="tree-label">{node.label}</span>{node.detail && <span className="muted">{node.detail}</span>}</div>{node.children?.length ? branch(node.children) : null}</li>)}</ul>;
  return <section className="card"><Title>{props.title}</Title>{branch(props.nodes)}</section>;
}

const { registry } = defineRegistry(catalog, { components: {
  Stack: ({ children }) => <div className="stack">{children}</div>,
  Grid: ({ props, children }) => <div className={`dashboard-grid cols-${props.columns ?? 2}`} style={{ '--columns': props.columns ?? 2 }}>{children}</div>,
  Heading: ({ props }) => <div className="dashboard-heading">{props.eyebrow && <p className="eyebrow">{props.eyebrow}</p>}<h1>{props.title}</h1>{props.subtitle && <p className="muted">{props.subtitle}</p>}</div>,
  Card: ({ props, children }) => <section className="card"><h2>{props.title}</h2>{props.description && <p className="muted">{props.description}</p>}{children}</section>,
  Text: ({ props }) => <p className={`plain-text${props.variant ? ` text-${props.variant}` : ''}`} style={props.align ? { textAlign: props.align } : undefined}>{props.text}</p>,
  Metric: ({ props }) => <section className={`card metric-card ${toneClass(props.tone ?? 'blue')}`}><p className="metric-label">{props.label}</p><div className="metric-line"><strong className="metric">{props.value}</strong>{props.change && <span className="trend-badge">{props.change}</span>}</div>{props.detail && <p className="muted">{props.detail}</p>}</section>,
  BarChart: ({ props }) => <Bars {...props} format={value => `${value.toLocaleString()}${props.unit ? ` ${props.unit}` : ''}`} />,
  LineChart, DonutChart, Diagram,
  Table,
  Divider, List, KeyValue, Badge, Callout, CodeBlock,
  Progress, StackedBar, Gauge, Sparkline, Heatmap,
  StackedBarChart, ScatterChart, Checklist, Timeline, Steps,
  Row, Disclosure, Tabs, Icon, RichText, Choice, Person, Diff, Rating, Tree,
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

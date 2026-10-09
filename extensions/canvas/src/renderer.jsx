import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { defineRegistry, JSONUIProvider, Renderer } from '@json-render/react';
import { catalog, initialMonths, totalCost, errorMessage } from './catalog.js';

const Controls = createContext(null);
const Theme = createContext('');
const colors = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)'];

let mermaidPromise = null;
function loadMermaid() {
  if (!mermaidPromise) mermaidPromise = import('mermaid').then(module => module.default);
  return mermaidPromise;
}
function token(name, fallback) {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  // A host that omits a token can leave the literal string "undefined" in place.
  return !value || value === 'undefined' || value === 'null' ? fallback : value;
}
function Diagram({ props }) {
  const host = useRef(null);
  const [error, setError] = useState('');
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const themeKey = useContext(Theme);
  useEffect(() => {
    let alive = true;
    setError('');
    loadMermaid().then(async mermaid => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        fontFamily: token('--oc-font', 'sans-serif'),
        themeVariables: {
          background: token('--oc-elevated', '#ffffff'),
          primaryColor: token('--oc-elevated', '#ffffff'),
          primaryTextColor: token('--oc-fg', '#1f2430'),
          primaryBorderColor: token('--oc-border', '#d9dde5'),
          secondaryColor: token('--oc-muted-surface', '#f1f3f7'),
          tertiaryColor: token('--oc-bg', '#ffffff'),
          lineColor: token('--oc-muted', '#6b7280'),
          textColor: token('--oc-fg', '#1f2430'),
          mainBkg: token('--oc-elevated', '#ffffff'),
          nodeBorder: token('--oc-border', '#d9dde5'),
          clusterBkg: token('--oc-bg', '#ffffff'),
          clusterBorder: token('--oc-border', '#d9dde5'),
          edgeLabelBackground: token('--oc-elevated', '#ffffff'),
          labelBackground: token('--oc-elevated', '#ffffff'),
          fontSize: '13px',
        },
      });
      const { svg } = await mermaid.render(`canvas-diagram-${uid}`, props.code);
      if (!alive || !host.current) return;
      host.current.innerHTML = svg;
    }).catch(failure => { if (alive) setError(`Diagram could not be rendered: ${errorMessage(failure)}`); });
    return () => { alive = false; };
  }, [props.code, uid, themeKey]);
  return <section className="card diagram-card"><h2>{props.title}</h2>{error ? <p className="muted">{error}</p> : <div className="diagram-host" ref={host} role="img" aria-label={props.title} />}{props.caption && <p className="muted diagram-caption">{props.caption}</p>}</section>;
}
function LineChart({ props }) {
  const maximum = Math.max(1, ...props.data.map(item => item.value));
  const points = props.data.map((item, index) => [24 + index / Math.max(1, props.data.length - 1) * 552, 160 - item.value / maximum * 136]);
  const line = points.map(point => point.join(',')).join(' ');
  return <section className="card chart-card"><div className="section-heading"><h2>{props.title}</h2><span className="chart-label">{props.unit ?? 'TREND'}</span></div><svg className="line-chart" viewBox="0 0 600 180" preserveAspectRatio="none" role="img" aria-label={props.title}><desc>{props.data.map(item => `${item.label}: ${item.value}`).join(', ')}</desc>
    {[24, 69, 114, 160].map(y => <line key={y} x1="24" x2="576" y1={y} y2={y} className="chart-grid" />)}
    <polygon points={`24,160 ${line} 576,160`} fill={colors[0]} fillOpacity=".12" />
    <polyline points={line} fill="none" stroke={colors[0]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    {points.map(([x, y], index) => <circle key={index} cx={x} cy={y} r="4" fill={colors[0]}><title>{props.data[index].label}: {props.data[index].value.toLocaleString()} {props.unit}</title></circle>)}
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
    <thead><tr>{props.columns.map((column, index) => <th key={index} aria-sort={sort?.index === index ? sort.direction === 1 ? 'ascending' : 'descending' : 'none'}><button onClick={() => setSort({ index, direction: sort?.index === index ? -sort.direction : 1 })}>{column}{sort?.index === index ? sort.direction === 1 ? ' ↑' : ' ↓' : ''}</button></th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{String(cell ?? '—')}</td>)}</tr>)}</tbody>
  </table></div><p className="muted">{rows.length} of {props.rows.length} rows{rows.length === 0 ? ' · No matching rows' : ''}</p></section>;
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

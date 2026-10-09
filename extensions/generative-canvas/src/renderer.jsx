import React, { createContext, useContext, useState } from 'react';
import { defineRegistry, JSONUIProvider, Renderer } from '@json-render/react';
import { catalog, initialMonths, totalCost } from './catalog.js';

const Controls = createContext(null);
function Bars({ title, data, format }) {
  const maximum = Math.max(1, ...data.map(item => item.value));
  return <section className="card"><h2>{title}</h2><dl className="bars">{data.map((item, index) => <div className="bar-row" key={index}>
    <dt>{item.label}</dt><dd><span className="bar-track" aria-hidden="true"><span style={{ width: `${item.value / maximum * 100}%` }} /></span><strong>{format(item.value)}</strong></dd>
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
  return <section className="card"><div className="section-heading"><h2>{props.title}</h2><label>Filter rows <input value={query} onChange={event => setQuery(event.target.value)} type="search" /></label></div><div className="table-scroll"><table>
    <thead><tr>{props.columns.map((column, index) => <th key={index} aria-sort={sort?.index === index ? sort.direction === 1 ? 'ascending' : 'descending' : 'none'}><button onClick={() => setSort({ index, direction: sort?.index === index ? -sort.direction : 1 })}>{column}{sort?.index === index ? sort.direction === 1 ? ' ↑' : ' ↓' : ''}</button></th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{String(cell ?? '—')}</td>)}</tr>)}</tbody>
  </table></div><p className="muted">{rows.length} of {props.rows.length} rows{rows.length === 0 ? ' · No matching rows' : ''}</p></section>;
}
const { registry } = defineRegistry(catalog, { components: {
  Stack: ({ children }) => <div className="stack">{children}</div>,
  Card: ({ props, children }) => <section className="card"><h2>{props.title}</h2>{props.description && <p className="muted">{props.description}</p>}{children}</section>,
  Text: ({ props }) => <p className="plain-text">{props.text}</p>,
  Metric: ({ props }) => <section className="card"><p className="muted">{props.label}</p><strong className="metric">{props.value}</strong>{props.detail && <p>{props.detail}</p>}</section>,
  BarChart: ({ props }) => <Bars {...props} format={value => `${value.toLocaleString()}${props.unit ? ` ${props.unit}` : ''}`} />,
  Table,
  HorizonControl: ({ props }) => {
    const { months, setMonths } = useContext(Controls);
    return <fieldset className="horizon"><legend>{props.label}</legend>{props.options.map(option => <label key={option}><input name="horizon" type="radio" checked={months === option} onChange={() => setMonths(option)} />{option} months</label>)}</fieldset>;
  },
  CostChart: ({ props }) => {
    const { months } = useContext(Controls);
    const format = value => new Intl.NumberFormat(undefined, { style: 'currency', currency: props.currency, maximumFractionDigits: 2 }).format(value);
    return <Bars title={`${props.title} · ${months} months`} data={props.providers.map(provider => ({ label: provider.label, value: totalCost(provider, months) }))} format={format} />;
  },
} });

export function Canvas({ artifact, months, setMonths }) {
  return <Controls.Provider value={{ months, setMonths }}><JSONUIProvider registry={registry}><Renderer spec={artifact.spec} registry={registry} /></JSONUIProvider></Controls.Provider>;
}
export { initialMonths };

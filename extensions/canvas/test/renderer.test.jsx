import { test, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Canvas } from '../src/renderer.jsx';
import { parseArtifact } from '../src/catalog.js';
import { costExplorer } from '../src/examples.js';
test('real registry renders deterministic 36-month chart and controls', () => {
  const html = renderToStaticMarkup(<Canvas artifact={parseArtifact(costExplorer)} months={36} setMonths={() => {}} />);
  expect(html).toContain('36 months');
  expect(html).toContain('432.00');
  expect(html).toContain('372.00');
  expect(html).toContain('Filter rows');
});
test('diagram accessible name prefers mermaid accTitle and exposes accDescr', () => {
  const artifact = parseArtifact({ catalog_version: '1', title: 'a11y', spec: { root: 'd', elements: { d: { type: 'Diagram', props: { title: 'Fallback title', code: 'accTitle: Named by DSL\naccDescr: Explained in DSL\nflowchart LR\n A-->B' } } } } });
  const html = renderToStaticMarkup(<Canvas artifact={artifact} months={12} setMonths={() => {}} />);
  expect(html).toContain('aria-label="Named by DSL"');
  expect(html).toContain('Explained in DSL');
});
test('plain text never becomes executable markup', () => {
  const value = parseArtifact({ catalog_version: '1', title: 'untrusted', spec: { root: 'text', elements: { text: { type: 'Text', props: { text: '<img src=x onerror=alert(1)>' } } } } });
  const html = renderToStaticMarkup(<Canvas artifact={value} months={12} setMonths={() => {}} />);
  expect(html).toContain('&lt;img');
  expect(html).not.toContain('<img');
});

import { test, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Canvas } from '../src/renderer.jsx';
import { parseArtifact } from '../src/catalog.js';
import { costExplorer, gallery } from '../src/examples.js';
import { boundaries } from '../preview/fixtures.js';
test('gallery renders every component without crashing', () => {
  const html = renderToStaticMarkup(<Canvas artifact={parseArtifact(gallery)} months={12} setMonths={() => {}} />);
  expect(html).toContain('gauge-ring');
  expect(html).toContain('checklist');
  expect(html).toContain('progress-track');
  expect(html).toContain('timeline');
});
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
test('line chart scales uniformly and the diagram announces a loading state', () => {
  const artifact = parseArtifact({ catalog_version: '1', title: 'scaling', spec: { root: 'r', elements: {
    r: { type: 'Stack', props: {}, children: ['line', 'diagram'] },
    line: { type: 'LineChart', props: { title: 'Trend', data: [{ label: 'a', value: 1 }, { label: 'b', value: 2 }] } },
    diagram: { type: 'Diagram', props: { title: 'Flow', code: 'flowchart LR\n A-->B' } },
  } } });
  const html = renderToStaticMarkup(<Canvas artifact={artifact} months={12} setMonths={() => {}} />);
  expect(html).not.toContain('preserveAspectRatio');
  expect(html).toContain('Rendering diagram…');
  expect(html).toContain('aria-busy="true"');
});
test('multi-series charts pair every series with a non-color pattern', () => {
  const artifact = parseArtifact({ catalog_version: '1', title: 'series', spec: { root: 'r', elements: {
    r: { type: 'Stack', props: {}, children: ['bars', 'comp', 'stack', 'donut'] },
    bars: { type: 'BarChart', props: { title: 'Bars', data: [{ label: 'a', value: 2 }, { label: 'b', value: 1 }, { label: 'c', value: 3 }] } },
    comp: { type: 'StackedBar', props: { title: 'Composition', segments: [{ label: 'x', value: 1 }, { label: 'y', value: 2 }] } },
    stack: { type: 'StackedBarChart', props: { title: 'Stacked', categories: ['Q1'], series: [{ label: 'New', data: [3] }, { label: 'Churn', data: [1] }] } },
    donut: { type: 'DonutChart', props: { title: 'Donut', data: [{ label: 'p', value: 2 }, { label: 'q', value: 1 }, { label: 'r', value: 1 }] } },
  } } });
  const html = renderToStaticMarkup(<Canvas artifact={artifact} months={12} setMonths={() => {}} />);
  expect(html).toContain('bar-fill pat-2');
  expect(html).toContain('series-dot pat-3');
  expect(html).toContain('stacked-seg pat-2');
  expect(html).toContain('stack-seg pat-2');
  expect(html).toContain('series-pattern');
  expect(html).toContain('donut-track');
  expect(html).toContain('Donut: p 50%, q 25%, r 25%');
  expect(html).not.toContain('conic-gradient');
});
test('single-series charts stay solid', () => {
  const artifact = parseArtifact({ catalog_version: '1', title: 'single', spec: { root: 'r', elements: {
    r: { type: 'Stack', props: {}, children: ['line', 'progress', 'spark'] },
    line: { type: 'LineChart', props: { title: 'Trend', data: [{ label: 'a', value: 1 }, { label: 'b', value: 2 }] } },
    progress: { type: 'Progress', props: { title: 'Progress', value: 5, max: 10 } },
    spark: { type: 'Sparkline', props: { title: 'Spark', data: [{ label: 'a', value: 1 }, { label: 'b', value: 2 }] } },
  } } });
  const html = renderToStaticMarkup(<Canvas artifact={artifact} months={12} setMonths={() => {}} />);
  expect(html).not.toContain('pat-');
  expect(html).toContain('line-chart');
});
test('plain text never becomes executable markup', () => {
  const value = parseArtifact({ catalog_version: '1', title: 'untrusted', spec: { root: 'text', elements: { text: { type: 'Text', props: { text: '<img src=x onerror=alert(1)>' } } } } });
  const html = renderToStaticMarkup(<Canvas artifact={value} months={12} setMonths={() => {}} />);
  expect(html).toContain('&lt;img');
  expect(html).not.toContain('<img');
});

test('boundary fixture validates and zero ring data paints no slice', () => {
  expect(() => parseArtifact(boundaries)).not.toThrow();
  const render = data => renderToStaticMarkup(<Canvas artifact={parseArtifact({catalog_version:'1',title:'Ring',spec:{root:'r',elements:{r:{type:'DonutChart',props:{title:'Ring',data}}}}})} months={12} setMonths={() => {}} />);
  const zero = render([{label:'A',value:0},{label:'B',value:0}]);
  expect(zero).not.toContain('class="donut-seg"');
  const single = render([{label:'Zero',value:0},{label:'Full',value:1}]);
  expect(single).toContain('stroke-dashoffset="0"');
  expect(single).toContain('stroke-dasharray="314.1592653589793 0"');
  const tiny = render([{label:'Tiny',value:.001},{label:'Large',value:1e9}]);
  const lengths = [...tiny.matchAll(/stroke-dasharray="([\d.e+-]+) /g)].map(match => Number(match[1]));
  expect(lengths[0]).toBeGreaterThan(0);
  expect(lengths[0]).toBeLessThan(.001);
});

test('one line observation is centered and does not imply a filled trend', () => {
  const html = renderToStaticMarkup(<Canvas artifact={parseArtifact({catalog_version:'1',title:'One',spec:{root:'r',elements:{r:{type:'LineChart',props:{title:'One',data:[{label:'Now',value:1}]}}}}})} months={12} setMonths={() => {}} />);
  expect(html).toContain('cx="300"');
  expect(html).not.toContain('<polygon');
});

import { test, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Canvas } from '../src/renderer.jsx';
import { parseArtifact } from '../src/catalog.js';
import { costExplorer, gallery } from '../src/examples.js';
import { boundaries, statesReview } from '../preview/fixtures.js';
test('gallery renders every component without crashing', () => {
  const html = renderToStaticMarkup(<Canvas artifact={parseArtifact(gallery)} months={12} setMonths={() => {}} />);
  expect(html).toContain('gauge-ring');
  expect(html).toContain('checklist');
  expect(html).toContain('progress-track');
  expect(html).toContain('timeline');
});
test('metric trend belongs to its header rather than the value row', () => {
  const artifact = parseArtifact({catalog_version:'1',title:'Metric',spec:{root:'r',elements:{r:{type:'Metric',props:{label:'Throughput',value:'1,024',change:'+12%'}}}}});
  const html = renderToStaticMarkup(<Canvas artifact={artifact} months={12} setMonths={() => {}} />);
  expect(html).toContain('class="metric-head"><p class="metric-label">Throughput</p><span class="trend-badge">+12%</span></div>');
  expect(html).toContain('class="metric-line"><strong class="metric">1,024</strong></div>');
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
test('first-ramp series stay solid with matching legend marks', () => {
  const artifact = parseArtifact({ catalog_version: '1', title: 'series', spec: { root: 'r', elements: {
    r: { type: 'Stack', props: {}, children: ['bars', 'comp', 'stack', 'donut'] },
    bars: { type: 'BarChart', props: { title: 'Bars', data: [{ label: 'a', value: 2 }, { label: 'b', value: 1 }, { label: 'c', value: 3 }] } },
    comp: { type: 'StackedBar', props: { title: 'Composition', segments: [{ label: 'x', value: 1 }, { label: 'y', value: 2 }] } },
    stack: { type: 'StackedBarChart', props: { title: 'Stacked', categories: ['Q1'], series: [{ label: 'New', data: [3] }, { label: 'Churn', data: [1] }] } },
    donut: { type: 'DonutChart', props: { title: 'Donut', data: [{ label: 'p', value: 2 }, { label: 'q', value: 1 }, { label: 'r', value: 1 }] } },
  } } });
  const html = renderToStaticMarkup(<Canvas artifact={artifact} months={12} setMonths={() => {}} />);
  expect(html).toContain('class="bar-fill"');
  expect(html).not.toContain('series-dot');
  expect(html).toContain('stacked-seg pat-1');
  expect(html).toContain('stack-seg pat-1');
  expect(html).not.toContain('pat-2');
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
test('simple comparison rows share one color and expose label/value text', () => {
  const data = Array.from({length:6},(_,i)=>({label:`Day ${i+1}`,value:i}));
  const html = one('BarChart',{title:'One measure',unit:'deploys',data});
  expect(html).not.toContain('pat-');
  expect(html).not.toContain('series-dot');
  expect(html.match(/background-color:var\(--series-1\)/g)).toHaveLength(6);
  expect(html).toContain('<dt>Day 1</dt><dd>');
  expect(html).toContain('<strong>0 deploys</strong>');
  expect(html).toContain('width:0%');
  expect(html).toContain('<strong>5 deploys</strong>');
});
test('cost comparisons do not turn plans into patterned series', () => {
  const html = renderToStaticMarkup(<Canvas artifact={parseArtifact(costExplorer)} months={6} setMonths={() => {}} />);
  expect(html).not.toContain('series-dot');
  expect(html).not.toContain('bar-fill pat-');
  expect(html.match(/class="bar-fill"[^>]+background-color:var\(--series-1\)/g)).toHaveLength(2);
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

const one = (type, props) => renderToStaticMarkup(<Canvas artifact={parseArtifact({catalog_version:'1',title:'One',spec:{root:'r',elements:{r:{type,props}}}})} months={12} setMonths={() => {}} />);

test('state fixture validates and exercises optional props the gallery omits', () => {
  expect(() => parseArtifact(statesReview)).not.toThrow();
});

test('an empty gauge paints no ring rather than a round cap dot', () => {
  expect(one('Gauge',{title:'Empty',value:0,max:512})).not.toContain('gauge-ring');
  expect(one('Gauge',{title:'Partly',value:256,max:512})).toContain('gauge-ring');
  expect(one('Gauge',{title:'Above',value:900,max:512})).toContain('stroke-dasharray="276.5 276.5"');
});

test('a fractional rating draws the fraction instead of rounding a star it lacks', () => {
  const half = one('Rating',{label:'R',value:2.5,max:5});
  expect(half.match(/star on/g)).toHaveLength(2);
  expect(half).toContain('star-half-fill');
  expect(half).toContain('width:50%');
  for (const value of [0.1, 2.2, 2.75, 4.9]) {
    const html = one('Rating',{label:'R',value,max:5});
    expect((html.match(/star on/g) ?? []).length).toBe(Math.floor(value));
    expect(html).toContain(`width:${(value - Math.floor(value)) * 100}%`);
  }
  expect(one('Rating',{label:'R',value:0,max:5})).not.toContain('star on');
});

test('a zero maximum reports the value instead of a misleading zero percent', () => {
  expect(one('Progress',{title:'None',value:5,max:0})).toContain('>5</strong>');
  expect(one('Progress',{title:'Half',value:5,max:10})).toContain('50%');
  expect(one('Progress',{title:'Over',value:30,max:10})).toContain('100%');
});

test('a wrapped ramp stays separable past five series', () => {
  const segments = Array.from({length:6},(_,i)=>({label:`S${i+1}`,value:i+1}));
  const html = one('StackedBar',{title:'Six',segments});
  expect(html).toContain('stacked-seg pat-2');
  expect(html.match(/class="legend"/)).toBeTruthy();
  // Index 5 must not reuse index 0's solid mark.
  expect(html).toContain('pat-2');
  const donut = one('DonutChart',{title:'Six',data:segments});
  expect(donut).toContain('-p2)');
  const series = one('StackedBarChart',{title:'Six',categories:['A'],series:segments.map(s=>({label:s.label,data:[s.value]}))});
  expect(series).toContain('stack-seg pat-2');
});

test('automatic fill and pattern pairs do not repeat within catalog limits', () => {
  const data = Array.from({length:30},(_,i)=>({label:`S${i+1}`,value:i+1}));
  const pairs = html => [...html.matchAll(/<i class="(pat-\d+)" style="background-color:([^";]+)/g)].map(m=>`${m[1]}:${m[2]}`);
  for (const [type,props,count] of [
    ['DonutChart',{title:'Thirty',data},30],
    ['StackedBar',{title:'Twelve',segments:data.slice(0,12)},12],
    ['StackedBarChart',{title:'Eight',categories:['A'],series:data.slice(0,8).map(s=>({label:s.label,data:[s.value]}))},8],
  ]) {
    const marks = pairs(one(type,props));
    expect(marks).toHaveLength(count);
    expect(new Set(marks).size).toBe(count);
  }
});

test('numeric footer cells stay unbreakable like numeric body cells', () => {
  const html = one('Table',{title:'T',columns:['a'],rows:[['1']],footer:[12]});
  expect(html).toContain('<tfoot><tr><td class="numeric"');
});

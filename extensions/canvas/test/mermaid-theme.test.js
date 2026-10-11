import { test, expect } from 'bun:test';
import { createColorResolver, diagramThemeVariables, normalizeColor } from '../src/mermaid-theme.js';

const fallback = (name, value) => value;

test('normalizes chromium color(srgb) serialization to comma-free colours', () => {
  expect(normalizeColor('color(srgb 1 0 0)', '#000')).toBe('#ff0000');
  expect(normalizeColor('color(srgb 0.5 0.5 0.5 / 0.5)', '#000')).toBe('rgba(128, 128, 128, 0.5)');
  expect(normalizeColor('rgb(1, 2, 3)', '#000')).toBe('#010203');
  expect(normalizeColor('rgb(1 2 3)', '#000')).toBe('#010203');
  expect(normalizeColor('#abcdef', '#000')).toBe('#abcdef');
  expect(normalizeColor('rgba(0, 0, 0, 0)', '#123456')).toBe('#123456');
  expect(normalizeColor('color(srgb 0 0 0 / 0)', '#123456')).toBe('#123456');
  expect(normalizeColor('', '#123456')).toBe('#123456');
});

test('follows the requested dark mode', () => {
  expect(diagramThemeVariables(fallback, true).darkMode).toBe(true);
  expect(diagramThemeVariables(fallback, false).darkMode).toBe(false);
});

test('covers every diagram variable family mermaid 12 reads', () => {
  const vars = diagramThemeVariables(fallback, false);
  const families = {
    base: ['background', 'primaryColor', 'primaryTextColor', 'lineColor', 'textColor', 'mainBkg', 'nodeBorder', 'clusterBkg', 'clusterBorder', 'edgeLabelBackground', 'noteBkgColor', 'errorBkgColor'],
    sequence: ['actorBkg', 'actorBorder', 'actorTextColor', 'signalColor', 'labelBoxBkgColor', 'activationBkgColor', 'sequenceNumberColor'],
    gantt: ['sectionBkgColor', 'altSectionBkgColor', 'taskBkgColor', 'taskBorderColor', 'taskTextColor', 'gridColor', 'doneTaskBkgColor', 'critBkgColor', 'todayLineColor'],
    state: ['stateBkg', 'compositeBackground', 'altBackground', 'compositeBorder', 'transitionColor'],
    class: ['classText', 'fillType0', 'fillType7'],
    pie: ['pie1', 'pie6', 'pie12', 'pieSectionTextColor', 'pieOuterStrokeColor'],
    git: ['git0', 'git7', 'gitInv0', 'gitBranchLabel0', 'commitLabelColor'],
    quadrant: ['quadrant1Fill', 'quadrant4Fill', 'quadrantPointFill', 'quadrantExternalBorderStrokeFill'],
    requirement: ['requirementBackground', 'relationColor'],
    architecture: ['archEdgeColor', 'archGroupBorderColor'],
  };
  for (const [family, names] of Object.entries(families)) {
    for (const name of names) expect(vars[name], `${family}.${name}`).toBeTruthy();
  }
  for (let index = 0; index < 12; index++) expect(vars[`cScale${index}`], `cScale${index}`).toBeTruthy();
  for (let index = 0; index < 12; index++) {
    expect(vars[`cScaleLabel${index}`]).toBe(vars.textColor);
    expect(vars[`cScaleInv${index}`]).toBe(vars.nodeBorder);
  }
});

test('themes object-shaped families rather than leaving hardcoded light defaults', () => {
  const vars = diagramThemeVariables(fallback, true);
  expect(typeof vars.radar).toBe('object');
  expect(vars.radar.graticuleColor).toBeTruthy();
  expect(typeof vars.xyChart).toBe('object');
  expect(typeof vars.xyChart.plotColorPalette).toBe('string');
  expect(typeof vars.cynefin).toBe('object');
  expect(vars.cynefin.complexBg).toBeTruthy();
  expect(typeof vars.wardley).toBe('object');
  expect(vars.wardley.backgroundColor).toBeTruthy();
  expect(vars.xyChart.backgroundColor).toBe(vars.primaryColor);
});

test('builds a twelve-colour palette from --diagram-N', () => {
  const indexed = (name, value) => /^--diagram-\d+$/.test(name) ? `rgb(${name.slice(10)} 0 0)` : value;
  const vars = diagramThemeVariables(indexed, false);
  expect(vars.pie1).toBe('rgb(1 0 0)');
  expect(vars.cScale11).toBe('rgb(12 0 0)');
  expect(vars.pie1).not.toBe(vars.pie2);
});

test('font families bypass the color probe', () => {
  const previousDocument = globalThis.document, previousStyle = globalThis.getComputedStyle;
  let writes = 0;
  const style = { set color(value) { writes++; } };
  globalThis.document = { documentElement:{}, body:{appendChild() {}}, createElement:() => ({style,setAttribute() {},remove() {}}) };
  globalThis.getComputedStyle = () => ({getPropertyValue:() => 'Example Sans, sans-serif',color:'rgb(0, 0, 0)'});
  try {
    const resolve = createColorResolver();
    expect(resolve('--font', 'sans-serif')).toBe('Example Sans, sans-serif');
    expect(writes).toBe(0);
    resolve.dispose();
  } finally { globalThis.document = previousDocument; globalThis.getComputedStyle = previousStyle; }
});

test('chart marks use stronger series tokens than pastel node faces', () => {
  const vars = diagramThemeVariables((name, fallback) => ({'--diagram-1':'#dddddd','--primary-text':'#224488','--series-2':'#335577'}[name] ?? fallback),false);
  expect(vars.pie1).toBe('#dddddd');
  expect(vars.git0).toBe('#224488');
  expect(vars.git1).toBe('#335577');
  expect(vars.xyChart.plotColorPalette).toStartWith('#224488,#335577');
  expect(vars.gitBranchLabel0).toBe(vars.background);
});

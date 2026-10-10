import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/react/schema';
import { z } from 'zod';

const text = z.string().max(240);
const number = z.number().finite().min(0).max(1e9);
const series = z.array(z.object({ label: text, value: number }).strict()).min(1).max(30);
const tone = z.enum(['neutral', 'blue', 'green', 'amber', 'red']);
const treeNode = z.lazy(() => z.object({ label: text, detail: text.optional(), children: z.array(treeNode).max(20).optional() }).strict());
export const components = {
  // Layout
  Stack: { props: z.object({}).strict(), slots: ['default'], description: 'Vertical layout container' },
  Grid: { props: z.object({ columns: z.number().int().min(1).max(4).optional() }).strict(), slots: ['default'], description: 'Responsive dashboard grid that collapses in narrow panels' },
  Row: { props: z.object({ wrap: z.boolean().optional() }).strict(), slots: ['default'], description: 'Horizontal layout container; wraps unless wrap is false' },
  Card: { props: z.object({ title: text, description: text.optional() }).strict(), slots: ['default'], description: 'Titled section that groups nested blocks' },
  Disclosure: { props: z.object({ summary: text, open: z.boolean().optional() }).strict(), slots: ['default'], description: 'Collapsible section that expands locally' },
  Tabs: { props: z.object({ tabs: z.array(z.object({ label: text, body: z.string().max(2000) }).strict()).min(1).max(8) }).strict(), description: 'Locally switched tab panels; tabs are [{ label, body }]' },
  Divider: { props: z.object({ label: text.optional() }).strict(), description: 'Horizontal rule, optionally labelled' },
  // Content
  Heading: { props: z.object({ title: text, subtitle: text.optional(), eyebrow: text.optional() }).strict(), description: 'Dashboard heading with optional eyebrow and subtitle' },
  Text: { props: z.object({ text: z.string().max(4000), variant: z.enum(['body', 'lead', 'caption', 'muted', 'label']).optional(), align: z.enum(['left', 'center', 'right']).optional() }).strict(), description: 'Escaped plain text with optional variant and alignment' },
  RichText: { props: z.object({ runs: z.array(z.object({ text: text, style: z.enum(['plain', 'bold', 'italic', 'code', 'muted']).optional() }).strict()).min(1).max(80) }).strict(), description: 'Inline text with per-run emphasis; runs are [{ text, style? }]' },
  List: { props: z.object({ title: text.optional(), ordered: z.boolean().optional(), items: z.array(text).min(1).max(50) }).strict(), description: 'Bulleted or numbered list; items is a string array' },
  KeyValue: { props: z.object({ title: text.optional(), items: z.array(z.object({ label: text, value: text, tone: tone.optional() }).strict()).min(1).max(40) }).strict(), description: 'Label/value pairs; items are [{ label, value, tone? }]' },
  Badge: { props: z.object({ label: text, tone: tone.optional() }).strict(), description: 'Inline status pill' },
  Choice: { props: z.object({ label: text.optional(), mode: z.enum(['single', 'multiple']).optional(), options: z.array(z.object({ label: text, selected: z.boolean().optional() }).strict()).min(1).max(20) }).strict(), description: 'Read-only choice chips; options are [{ label, selected? }]' },
  Person: { props: z.object({ name: text, role: text.optional(), initials: text.optional(), tone: tone.optional() }).strict(), description: 'Identity chip with initials, name and role' },
  Callout: { props: z.object({ tone: tone.optional(), title: text.optional(), text: z.string().max(2000) }).strict(), description: 'Tone-coloured note with an optional title' },
  Icon: { props: z.object({ name: z.enum(['check', 'close', 'info', 'warning', 'clock', 'search', 'star', 'sparkle']), tone: tone.optional(), size: z.number().int().min(12).max(64).optional() }).strict(), description: 'Single inline icon by name' },
  CodeBlock: { props: z.object({ title: text.optional(), language: text.optional(), code: z.string().max(6000) }).strict(), description: 'Monospace, escaped code or log text' },
  Diff: { props: z.object({ title: text.optional(), before: z.array(text).min(1).max(40), after: z.array(text).min(1).max(40) }).strict(), description: 'Aligned before/after lines' },
  // Data and status
  Metric: { props: z.object({ label: text, value: text, detail: text.optional(), change: text.optional(), tone: tone.optional() }).strict(), description: 'Summary value with optional change, detail and tone' },
  Progress: { props: z.object({ title: text.optional(), value: number, max: number, unit: text.optional(), tone: tone.optional() }).strict(), description: 'Single share/progress bar for value against max' },
  StackedBar: { props: z.object({ title: text.optional(), unit: text.optional(), segments: z.array(z.object({ label: text, value: number, tone: tone.optional() }).strict()).min(1).max(12) }).strict(), description: 'Multi-segment share bar with legend; segments are [{ label, value, tone? }]' },
  Gauge: { props: z.object({ title: text.optional(), value: number, max: number, unit: text.optional(), tone: tone.optional() }).strict(), description: 'Radial gauge for one value against a maximum' },
  Sparkline: { props: z.object({ title: text.optional(), unit: text.optional(), tone: tone.optional(), data: series }).strict(), description: 'Compact trend line; data is [{ label, value }]' },
  Heatmap: { props: z.object({ title: text.optional(), columns: z.array(text).min(1).max(16), rows: z.array(z.object({ label: text, values: z.array(number).min(1).max(16) }).strict()).min(1).max(30) }).strict(), description: 'Matrix of intensity cells; each row values length must equal columns length' },
  Rating: { props: z.object({ label: text.optional(), value: number, max: z.number().int().min(1).max(10) }).strict(), description: 'Read-only star rating; value out of max' },
  Tree: { props: z.object({ title: text.optional(), nodes: z.array(treeNode).min(1).max(20) }).strict(), description: 'Hierarchical list; nodes are [{ label, detail?, children? }]' },
  // Charts
  BarChart: { props: z.object({ title: text, unit: text.optional(), data: series }).strict(), description: 'Nonnegative labeled bar chart; data is [{ label, value }]' },
  LineChart: { props: z.object({ title: text, unit: text.optional(), data: series }).strict(), description: 'Trend line with shaded area; data is [{ label, value }]' },
  DonutChart: { props: z.object({ title: text, data: series }).strict(), description: 'Distribution ring with legend; data is [{ label, value }]' },
  StackedBarChart: { props: z.object({ title: text, unit: text.optional(), categories: z.array(text).min(1).max(12), series: z.array(z.object({ label: text, data: z.array(number).min(1).max(12) }).strict()).min(1).max(8) }).strict(), description: 'Stacked bars over categories; each series data length must equal categories length' },
  ScatterChart: { props: z.object({ title: text, xUnit: text.optional(), yUnit: text.optional(), points: z.array(z.object({ x: number, y: number, label: text.optional() }).strict()).min(1).max(200) }).strict(), description: 'X/Y scatter plot; points are [{ x, y, label? }]' },
  // Collections
  Table: { props: z.object({ title: text, columns: z.array(text).min(1).max(12), rows: z.array(z.array(z.union([text, z.number().finite().min(-1e12).max(1e12), z.boolean(), z.null()])).max(12)).max(200), align: z.array(z.enum(['left', 'right'])).max(12).optional(), footer: z.array(z.union([text, z.number().finite().min(-1e12).max(1e12), z.boolean(), z.null()])).max(12).optional() }).strict(), description: 'Searchable, sortable table; rows is an array of cell arrays, align sets per-column alignment, footer is an optional totals row' },
  Checklist: { props: z.object({ title: text.optional(), items: z.array(z.object({ label: text, done: z.boolean() }).strict()).min(1).max(50) }).strict(), description: 'Task list with done/pending state; items are [{ label, done }]' },
  Timeline: { props: z.object({ title: text.optional(), items: z.array(z.object({ time: text.optional(), title: text, detail: text.optional(), tone: tone.optional() }).strict()).min(1).max(50) }).strict(), description: 'Chronological events; items are [{ time?, title, detail?, tone? }]' },
  Steps: { props: z.object({ title: text.optional(), items: z.array(z.object({ label: text, detail: text.optional(), state: z.enum(['todo', 'current', 'done']) }).strict()).min(1).max(30) }).strict(), description: 'Numbered steps with todo/current/done state' },
  // Diagram and quick tools
  Diagram: { props: z.object({ title: text, code: z.string().trim().min(1).max(8000), caption: text.optional() }).strict(), description: 'Mermaid diagram from DSL text; supports flowchart, sequence, class, state, ER, gantt, pie, quadrant, requirement, gitGraph, C4, mindmap, timeline, sankey, xychart, block, packet, kanban, architecture, radar, treemap, venn, ishikawa, wardley and more. It adopts the host theme automatically and reads accTitle/accDescr placed after the diagram type line' },
  HorizonControl: { props: z.object({ label: text, initialMonths: z.number().int().min(1).max(120), options: z.array(z.number().int().min(1).max(120)).min(1).max(12) }).strict(), description: 'Shared planning horizon control; at most one per canvas' },
  CostChart: { props: z.object({ title: text, currency: z.enum(['USD', 'EUR', 'GBP', 'PLN']), providers: z.array(z.object({ label: text, monthly: number, upfront: number }).strict()).min(1).max(20) }).strict(), description: 'Deterministic cost bars (upfront + monthly × shared months); providers are [{ label, monthly, upfront }]' },
};
// Components that accept children, derived from the catalog so the agent
// contract and the parser never drift from the component definitions.
export const CONTAINERS = Object.entries(components).filter(([, component]) => component.slots?.includes('default')).map(([name]) => name);
export function componentsSummary() {
  return Object.entries(components).map(([name, component]) => {
    const props = Object.entries(component.props.shape ?? {}).map(([key, schema]) => schema.isOptional?.() ? `${key}?` : key);
    return `${name}(${props.join(', ')}) — ${component.description}`;
  });
}
export const catalog = defineCatalog(schema, { components, actions: {} });
export const CATALOG_VERSION = '1';
export const MAX_BYTES = 256 * 1024; // File API allows 2M characters; keep canvases small and fast.

// Mermaid runs inside the panel. It renders with securityLevel 'strict', and
// the panel itself is an opaque allow-scripts iframe. Reject input that could
// escape DSL text or reconfigure the renderer anyway.
// Require an event handler to sit in attribute position (start, whitespace,
// quote, '<' or '='). A bare `on[a-z]+=` also matched ordinary label text such
// as `A[connection=fast]`, rejecting valid diagrams.
const DISALLOWED_DIAGRAM = /<\s*(script|iframe|object|embed|style|link|meta|foreignObject|svg|img)\b|javascript\s*:|data\s*:\s*text\/html|(?:^|[\s"'<=])on[a-z]+\s*=|%%\s*\{/i;
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const elementSchema = z.discriminatedUnion('type', Object.entries(components).map(([type, component]) => z.object({
  type: z.literal(type), props: component.props, children: z.array(id).max(60).optional(),
}).strict()));
export const artifactSchema = z.object({
  catalog_version: z.literal(CATALOG_VERSION),
  title: text.min(1),
  spec: z.object({ root: id, elements: z.record(id, elementSchema) }).strict(),
}).strict();

// json-render supports a broader expression/action language. This catalog
// deliberately accepts only static props and our deterministic local controls.
export function parseArtifact(input) {
  const encoded = typeof input === 'string' ? input : JSON.stringify(input);
  if (new TextEncoder().encode(encoded).length > MAX_BYTES) throw new Error('Canvas exceeds 256 KiB');
  const artifact = artifactSchema.parse(JSON.parse(encoded));
  const entries = Object.entries(artifact.spec.elements);
  if (entries.length > 100) throw new Error('Canvas exceeds 100 elements');
  let controls = 0;
  for (const [key, element] of entries) {
    const children = element.children ?? [];
    element.children = children;
    if (children.length && !CONTAINERS.includes(element.type)) throw new Error(`${key}: only ${CONTAINERS.join(', ')} can contain children`);
    if (element.type === 'Table' && element.props.rows.some(row => row.length !== element.props.columns.length)) throw new Error(`${key}: row width must match columns`);
    if (element.type === 'Table' && element.props.footer && element.props.footer.length !== element.props.columns.length) throw new Error(`${key}: footer width must match columns`);
    if (element.type === 'Heatmap' && element.props.rows.some(row => row.values.length !== element.props.columns.length)) throw new Error(`${key}: heatmap row width must match columns`);
    if (element.type === 'StackedBarChart' && element.props.series.some(entry => entry.data.length !== element.props.categories.length)) throw new Error(`${key}: stacked series length must match categories`);
    if (element.type === 'Diagram') {
      if (element.props.code.trimStart().startsWith('---')) throw new Error(`${key}: diagram front-matter config is not allowed`);
      if (DISALLOWED_DIAGRAM.test(element.props.code)) throw new Error(`${key}: diagram contains disallowed markup or directives`);
    }
    if (element.type === 'HorizonControl') {
      controls++;
      if (!element.props.options.includes(element.props.initialMonths)) throw new Error(`${key}: initialMonths must be an option`);
    }
  }
  if (controls > 1) throw new Error('Only one HorizonControl is allowed');
  const visited = new Set();
  const visit = (key, depth) => {
    if (depth > 16) throw new Error('Canvas exceeds nesting depth 16');
    if (visited.has(key)) throw new Error(`Repeated or cyclic child: ${key}`);
    if (!Object.hasOwn(artifact.spec.elements, key)) throw new Error(`Missing element: ${key}`);
    const element = artifact.spec.elements[key];
    visited.add(key);
    for (const child of element.children ?? []) visit(child, depth + 1);
  };
  visit(artifact.spec.root, 0);
  if (visited.size !== entries.length) throw new Error('Canvas contains unreachable elements');
  return artifact;
}

export function initialMonths(artifact) {
  return Object.values(artifact.spec.elements).find(element => element.type === 'HorizonControl')?.props.initialMonths ?? 12;
}

export function totalCost(provider, months) { return provider.upfront + provider.monthly * months; }

export function errorMessage(error) {
  return error.issues ? error.issues.slice(0, 3).map(issue => `${issue.path.join('.') || 'Canvas'}: ${issue.message}`).join('\n') : error.message;
}

import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/react/schema';
import { z } from 'zod';

const text = z.string().max(240);
const number = z.number().finite().min(0).max(1e9);
const series = z.array(z.object({ label: text, value: number }).strict()).min(1).max(30);
export const components = {
  Stack: { props: z.object({}).strict(), slots: ['default'], description: 'Vertical layout' },
  Grid: { props: z.object({ columns: z.number().int().min(1).max(4).optional() }).strict(), slots: ['default'], description: 'Responsive dashboard grid; collapses in narrow panels' },
  Heading: { props: z.object({ title: text, subtitle: text.optional(), eyebrow: text.optional() }).strict(), description: 'Dashboard heading' },
  Card: { props: z.object({ title: text, description: text.optional() }).strict(), slots: ['default'], description: 'Titled section' },
  Text: { props: z.object({ text: z.string().max(4000) }).strict(), description: 'Plain text, never HTML' },
  Metric: { props: z.object({ label: text, value: text, detail: text.optional(), change: text.optional(), tone: z.enum(['blue', 'green', 'amber']).optional() }).strict(), description: 'Summary value and trend' },
  LineChart: { props: z.object({ title: text, unit: text.optional(), data: series }).strict(), description: 'Trend line with shaded area and accessible data' },
  DonutChart: { props: z.object({ title: text, data: series }).strict(), description: 'Distribution ring with legend and readable values' },
  BarChart: { props: z.object({ title: text, unit: text.optional(), data: series }).strict(), description: 'Nonnegative labeled bar chart with accessible values' },
  Table: { props: z.object({ title: text, columns: z.array(text).min(1).max(12), rows: z.array(z.array(z.union([text, z.number().finite().min(-1e12).max(1e12), z.boolean(), z.null()])).max(12)).max(200) }).strict(), description: 'Searchable table with sortable columns' },
  HorizonControl: { props: z.object({ label: text, initialMonths: z.number().int().min(1).max(120), options: z.array(z.number().int().min(1).max(120)).min(1).max(12) }).strict(), description: 'Shared planning horizon control; one per canvas' },
  CostChart: { props: z.object({ title: text, currency: z.enum(['USD', 'EUR', 'GBP', 'PLN']), providers: z.array(z.object({ label: text, monthly: number, upfront: number }).strict()).min(1).max(20) }).strict(), description: 'Costs computed deterministically as upfront + monthly × shared months' },
};
export const catalog = defineCatalog(schema, { components, actions: {} });
export const CATALOG_VERSION = '1';
export const MAX_BYTES = 60_000; // Fits the SDK's 64,000-character service body boundary.
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
  if (new TextEncoder().encode(encoded).length > MAX_BYTES) throw new Error('Canvas exceeds 60,000 bytes');
  const artifact = artifactSchema.parse(JSON.parse(encoded));
  const entries = Object.entries(artifact.spec.elements);
  if (entries.length > 100) throw new Error('Canvas exceeds 100 elements');
  let controls = 0;
  for (const [key, element] of entries) {
    const children = element.children ?? [];
    element.children = children;
    if (children.length && !['Stack', 'Grid', 'Card'].includes(element.type)) throw new Error(`${key}: only Stack, Grid and Card can contain children`);
    if (element.type === 'Table' && element.props.rows.some(row => row.length !== element.props.columns.length)) throw new Error(`${key}: row width must match columns`);
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

export function snapshot(artifact, months) {
  const copy = structuredClone(artifact);
  for (const element of Object.values(copy.spec.elements)) if (element.type === 'HorizonControl') element.props.initialMonths = months;
  return parseArtifact(copy);
}

export function totalCost(provider, months) { return provider.upfront + provider.monthly * months; }

export function errorMessage(error) {
  return error.issues ? error.issues.slice(0, 3).map(issue => `${issue.path.join('.') || 'Canvas'}: ${issue.message}`).join('\n') : error.message;
}

export function artifactPath(name) {
  if (!/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,100}\.canvas\.json$/.test(name)) throw new Error('Invalid canvas filename');
  return `visualizations/${name}`;
}

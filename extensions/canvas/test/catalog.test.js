import { describe, test, expect } from 'bun:test';
import { parseArtifact, snapshot, totalCost, catalog } from '../src/catalog.js';
import { costExplorer } from '../src/examples.js';
const mutated = fn => { const value = structuredClone(costExplorer); fn(value); return value; };
describe('untrusted canvas boundary', () => {
  test('example validates with our validator and json-render catalog', () => {
    const parsed = parseArtifact(costExplorer);
    expect(parsed.title).toBe(costExplorer.title);
    expect(catalog.validate(parsed.spec).success).toBe(true);
  });
  const invalid = {
    'unknown component': value => { value.spec.elements.costs.type = 'HTML'; },
    'unknown prop': value => { value.spec.elements.intro.props.html = '<script>'; },
    'events/actions': value => { value.spec.elements.horizon.on = { change: { action: 'exec' } }; },
    'dynamic prop': value => { value.spec.elements.intro.props.title = { $state: '/secret' }; },
    'unknown top-level': value => { value.source_ref = 'file:///etc/passwd'; },
    'cycle': value => { value.spec.elements.intro.children.push('root'); },
    'duplicate child': value => { value.spec.elements.root.children.push('intro'); },
    'missing child': value => { value.spec.elements.root.children.push('missing'); },
    'inherited root': value => { value.spec.root = 'constructor'; },
    'unreachable element': value => { value.spec.elements.unused = { type: 'Text', props: { text: 'unused' } }; },
    'leaf children': value => { value.spec.elements.costs.children = ['horizon']; },
    'row mismatch': value => { value.spec.elements.table.props.rows[0].pop(); },
    'invalid horizon': value => { value.spec.elements.horizon.props.initialMonths = 120; },
    'negative value': value => { value.spec.elements.costs.props.providers[0].monthly = -1; },
    'multiple controls': value => { value.spec.elements.other = structuredClone(value.spec.elements.horizon); value.spec.elements.root.children.push('other'); },
    'wrong version': value => { value.catalog_version = '2'; },
  };
  for (const [name, change] of Object.entries(invalid)) test(`rejects ${name}`, () => expect(() => parseArtifact(mutated(change))).toThrow());
  test('size limit is enforced before parsing', () => expect(() => parseArtifact(' '.repeat(256 * 1024 + 1))).toThrow('256 KiB'));
  test('limits depth', () => {
    const value = { catalog_version: '1', title: 'deep', spec: { root: 'n0', elements: {} } };
    for (let i = 0; i < 18; i++) value.spec.elements[`n${i}`] = { type: 'Stack', props: {}, children: i < 17 ? [`n${i + 1}`] : [] };
    expect(() => parseArtifact(value)).toThrow('depth');
  });
  test('snapshot preserves source and current horizon', () => {
    const value = snapshot(costExplorer, 36);
    expect(value.spec.elements.horizon.props.initialMonths).toBe(36);
    expect(costExplorer.spec.elements.horizon.props.initialMonths).toBe(12);
    expect(totalCost(value.spec.elements.costs.props.providers[1], 36)).toBe(372);
  });
});

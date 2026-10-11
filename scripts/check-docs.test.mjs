import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { checkDocumentation } from './check-docs.mjs';
test('documentation check rejects broken links, missing scenarios and task numbering', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'docs-check-'));
  try {
    mkdirSync(`${root}/docs/specs/probe`, { recursive: true });
    mkdirSync(`${root}/docs/changes/probe`, { recursive: true });
    symlinkSync('docs', `${root}/openspec`);
    writeFileSync(`${root}/docs/specs/probe/spec.md`, '## Purpose\nProbe\n## Requirements\n### Requirement: Probe\nIt SHALL work.\n');
    writeFileSync(`${root}/docs/README.md`, '[missing](missing.md)');
    for (const name of ['proposal.md', '.openspec.yaml']) writeFileSync(`${root}/docs/changes/probe/${name}`, '');
    writeFileSync(`${root}/docs/changes/probe/tasks.md`, '- [ ] unnumbered\n');
    const failures = checkDocumentation(root).failures.join('\n');
    assert.match(failures, /missing link/);
    assert.match(failures, /has no scenarios/);
    assert.match(failures, /invalid task/);
    writeFileSync(`${root}/docs/README.md`, '# Docs');
    writeFileSync(`${root}/docs/specs/probe/spec.md`, '## Purpose\nProbe\n## Requirements\n### Requirement: Probe\nIt SHALL work.\n#### Scenario: Probe\n- **WHEN** called\n- **THEN** it works\n');
    writeFileSync(`${root}/docs/changes/probe/tasks.md`, '- [ ] 1.1 Valid task\n');
    assert.deepEqual(checkDocumentation(root).failures, []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// Structural check adapted from bright-heron. Upstream OpenSpec validates deltas.
import { readFileSync, readdirSync, existsSync, realpathSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
export function checkDocumentation(root) {
  const failures = [];
  const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const file = resolve(dir, e.name);
    return e.isDirectory() ? walk(file) : [file];
  });
  const docs = resolve(root, 'docs');
  const files = walk(docs).filter(f => f.endsWith('.md'));
  try {
    if (realpathSync(resolve(root, 'openspec')) !== realpathSync(docs)) failures.push('openspec must resolve to docs');
  } catch { failures.push('missing openspec -> docs alias'); }
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const fail = message => failures.push(`${relative(root, file)}: ${message}`);
    const prose = text.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '');
    for (const [, href] of prose.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(href)) continue;
      const target = href.split('#')[0];
      if (target && !existsSync(resolve(dirname(file), decodeURIComponent(target)))) fail(`missing link ${href}`);
    }
    if (!file.endsWith('/spec.md')) continue;
    const main = relative(docs, file).startsWith('specs/');
    if (main && (!/^## Purpose\s*$/m.test(text) || !/^## Requirements\s*$/m.test(text))) fail('main spec needs Purpose and Requirements');
    const requirements = [...text.matchAll(/^### Requirement: (.+)$/gm)];
    if (!requirements.length) fail('spec contains no requirements');
    const names = new Set();
    for (let i = 0; i < requirements.length; i++) {
      const match = requirements[i];
      if (names.has(match[1])) fail(`duplicate requirement ${match[1]}`);
      names.add(match[1]);
      const block = text.slice(match.index + match[0].length, requirements[i + 1]?.index);
      const [body, ...scenarios] = block.split(/^#### Scenario: /m);
      if (!/\b(?:SHALL|MUST)\b/.test(body)) fail(`${match[1]} needs SHALL/MUST`);
      if (!scenarios.length) fail(`${match[1]} has no scenarios`);
      for (const scenario of scenarios) {
        if (!/^- \*\*WHEN\*\*/m.test(scenario) || !/^- \*\*THEN\*\*/m.test(scenario)) fail(`${match[1]} scenario needs WHEN/THEN`);
      }
    }
  }
  for (const e of readdirSync(resolve(docs, 'changes'), { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === 'archive') continue;
    const dir = resolve(docs, 'changes', e.name);
    for (const name of ['proposal.md', 'tasks.md', '.openspec.yaml']) {
      if (!existsSync(resolve(dir, name))) failures.push(`${e.name}: missing ${name}`);
    }
    const tasks = resolve(dir, 'tasks.md');
    if (existsSync(tasks)) for (const line of readFileSync(tasks, 'utf8').split('\n')) {
      if (/^- \[[^\]]*\]/.test(line) && !/^- \[(?: |x|X)\] \d+\.\d+ .+/.test(line)) failures.push(`${e.name}: invalid task ${line}`);
    }
  }
  return { files: files.length, failures };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkDocumentation(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
  result.failures.forEach(f => console.error(f));
  console.log(`${result.files} Markdown files checked, ${result.failures.length} failures`);
  if (result.failures.length) process.exitCode = 1;
}

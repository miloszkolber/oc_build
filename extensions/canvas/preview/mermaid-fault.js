// Review-only adapter. Never included by the production build.
import mermaid from 'mermaid';

const probe = window.diagramProbe = {
  calls: [], failures: [], active: 0, maxActive: 0, hold: false, release: null,
};
export default {
  initialize: config => mermaid.initialize(config),
  async render(id, code) {
    probe.calls.push({ id, code });
    probe.maxActive = Math.max(probe.maxActive, ++probe.active);
    try {
      if (probe.hold) await new Promise(resolve => { probe.release = resolve; });
      const failure = probe.failures.shift();
      if (failure) throw new Error(failure);
      return await mermaid.render(id, code);
    } finally {
      probe.active--;
    }
  },
};

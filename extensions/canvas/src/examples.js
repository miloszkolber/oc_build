export const costExplorer = {
  catalog_version: '1', title: 'Self-hosting cost explorer',
  spec: { root: 'root', elements: {
    root: { type: 'Stack', props: {}, children: ['heading', 'summary', 'intro', 'costs', 'table'] },
    heading: { type: 'Heading', props: { eyebrow: 'PLANNING TOOL', title: 'Where should you host?', subtitle: 'Explore the trade-off between monthly spend and upfront investment.' } },
    summary: { type: 'Grid', props: { columns: 2 }, children: ['monthly', 'investment'] },
    monthly: { type: 'Metric', props: { label: 'Home server monthly', value: '€7', change: '−42%', detail: 'Compared with €12/month on a VPS', tone: 'green' } },
    investment: { type: 'Metric', props: { label: 'Upfront investment', value: '€120', detail: 'Illustrative home-server hardware cost', tone: 'blue' } },
    intro: { type: 'Card', props: { title: 'Compare the whole horizon', description: 'Illustrative inputs — change the horizon without calling a model.' }, children: ['horizon'] },
    horizon: { type: 'HorizonControl', props: { label: 'Planning horizon', initialMonths: 12, options: [12, 24, 36] } },
    costs: { type: 'CostChart', props: { title: 'Total ownership cost', currency: 'EUR', providers: [{ label: 'VPS', monthly: 12, upfront: 0 }, { label: 'Home server', monthly: 7, upfront: 120 }] } },
    table: { type: 'Table', props: { title: 'Inputs and assumptions', columns: ['Option', 'Monthly (€)', 'Upfront (€)'], rows: [['VPS', 12, 0], ['Home server', 7, 120]] } },
  } },
};

// Kitchen-sink example: exercises every catalog-1 component once so agents can
// copy any pattern. All data is illustrative.
export const showcase = {
  catalog_version: '1', title: 'Catalog showcase', spec: { root: 'root', elements: {
    root: { type: 'Stack', props: {}, children: ['heading', 'about', 'metrics', 'spotlight', 'flow', 'sequence', 'charts', 'data', 'horizon', 'costs'] },
    heading: { type: 'Heading', props: { eyebrow: 'CATALOG 1 · DEMO DATA', title: 'Every component, once', subtitle: 'Each section below demonstrates one catalog component with illustrative data.' } },
    about: { type: 'Text', props: { text: 'Copy any section into a conversation canvas. Nothing here is live data.' } },
    metrics: { type: 'Grid', props: { columns: 3 }, children: ['m1', 'm2', 'm3'] },
    m1: { type: 'Metric', props: { label: 'Throughput', value: '1,024', change: '+12%', detail: 'Events per minute', tone: 'blue' } },
    m2: { type: 'Metric', props: { label: 'Success rate', value: '99.2%', change: '+0.4 pts', detail: 'Trailing hour', tone: 'green' } },
    m3: { type: 'Metric', props: { label: 'Queue depth', value: '37', change: '-8', detail: 'Needs watching', tone: 'amber' } },
    spotlight: { type: 'Card', props: { title: 'Release note', description: 'A titled section grouping content.' }, children: ['note'] },
    note: { type: 'Text', props: { text: 'Cards group a heading, an optional description and nested blocks.' } },
    flow: { type: 'Diagram', props: { title: 'Request lifecycle', caption: 'Mermaid flowchart from DSL text.', code: 'flowchart LR\n  U[User] --> P[Canvas panel]\n  A[Coding agent] -->|writes JSON| F[(Session file)]\n  P -->|polls| F\n  F -->|spec| P' } },
    sequence: { type: 'Diagram', props: { title: 'Render handshake', code: 'sequenceDiagram\n  participant A as Agent\n  participant F as File\n  participant P as Panel\n  A->>F: write spec (atomic)\n  loop every 3s\n    P->>F: read\n  end\n  F-->>P: catalog JSON\n  P->>P: render with trusted components' } },
    charts: { type: 'Grid', props: { columns: 2 }, children: ['bars', 'trend', 'mix'] },
    bars: { type: 'BarChart', props: { title: 'Deploys per weekday', unit: 'deploys', data: [{ label: 'Mon', value: 14 }, { label: 'Tue', value: 22 }, { label: 'Wed', value: 19 }, { label: 'Thu', value: 25 }, { label: 'Fri', value: 11 }] } },
    trend: { type: 'LineChart', props: { title: 'Latency p95', unit: 'ms', data: [{ label: '00:00', value: 210 }, { label: '04:00', value: 188 }, { label: '08:00', value: 243 }, { label: '12:00', value: 301 }, { label: '16:00', value: 264 }, { label: '20:00', value: 229 }] } },
    mix: { type: 'DonutChart', props: { title: 'Traffic by region', data: [{ label: 'EU', value: 482 }, { label: 'US', value: 351 }, { label: 'APAC', value: 167 }] } },
    data: { type: 'Table', props: { title: 'Service health', columns: ['Service', 'Latency (ms)', 'Healthy', 'Note'], rows: [['api', 182, true, 'Nominal'], ['worker', 940, false, 'Backlogged'], ['cache', 12, true, null]] } },
    horizon: { type: 'HorizonControl', props: { label: 'Planning horizon', initialMonths: 12, options: [6, 12] } },
    costs: { type: 'CostChart', props: { title: 'Projected spend', currency: 'USD', providers: [{ label: 'Current', monthly: 140, upfront: 0 }, { label: 'Reserved', monthly: 95, upfront: 400 }] } },
  } },
};

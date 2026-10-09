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

export const revenueDashboard = {
  catalog_version: '1', title: 'Revenue pulse', spec: { root: 'root', elements: {
    root: { type: 'Stack', props: {}, children: ['heading', 'metrics', 'charts', 'table'] },
    heading: { type: 'Heading', props: { eyebrow: 'BUSINESS OVERVIEW · DEMO DATA', title: 'A clearer view of growth', subtitle: 'A six-month snapshot of recurring revenue, channel mix and plan performance.' } },
    metrics: { type: 'Grid', props: { columns: 3 }, children: ['revenue', 'customers', 'retention'] },
    revenue: { type: 'Metric', props: { label: 'Monthly revenue', value: '€24,800', change: '+18.6%', detail: 'vs. previous month', tone: 'blue' } },
    customers: { type: 'Metric', props: { label: 'Active customers', value: '1,284', change: '+9.2%', detail: 'Across all plans', tone: 'green' } },
    retention: { type: 'Metric', props: { label: 'Net retention', value: '108%', change: '+4 pts', detail: 'Trailing six months', tone: 'amber' } },
    charts: { type: 'Grid', props: { columns: 2 }, children: ['trend', 'mix'] },
    trend: { type: 'LineChart', props: { title: 'Recurring revenue', unit: 'EUR', data: [{ label: 'Apr', value: 14200 }, { label: 'May', value: 16100 }, { label: 'Jun', value: 15800 }, { label: 'Jul', value: 19200 }, { label: 'Aug', value: 20900 }, { label: 'Sep', value: 24800 }] } },
    mix: { type: 'DonutChart', props: { title: 'Customers by plan', data: [{ label: 'Pro', value: 706 }, { label: 'Team', value: 385 }, { label: 'Enterprise', value: 193 }] } },
    table: { type: 'Table', props: { title: 'Plan performance', columns: ['Plan', 'Customers', 'Revenue (€)', 'Retention'], rows: [['Pro', 706, 9800, '104%'], ['Team', 385, 9200, '110%'], ['Enterprise', 193, 5800, '116%']] } },
  } },
};

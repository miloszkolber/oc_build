export const costExplorer = {
  catalog_version: '1', title: 'Self-hosting cost explorer',
  spec: { root: 'root', elements: {
    root: { type: 'Stack', props: {}, children: ['intro', 'costs', 'table'] },
    intro: { type: 'Card', props: { title: 'Compare the whole horizon', description: 'Illustrative inputs — change the horizon without calling a model.' }, children: ['horizon'] },
    horizon: { type: 'HorizonControl', props: { label: 'Planning horizon', initialMonths: 12, options: [12, 24, 36] } },
    costs: { type: 'CostChart', props: { title: 'Total ownership cost', currency: 'EUR', providers: [{ label: 'VPS', monthly: 12, upfront: 0 }, { label: 'Home server', monthly: 7, upfront: 120 }] } },
    table: { type: 'Table', props: { title: 'Inputs and assumptions', columns: ['Option', 'Monthly (€)', 'Upfront (€)'], rows: [['VPS', 12, 0], ['Home server', 7, 120]] } },
  } },
};

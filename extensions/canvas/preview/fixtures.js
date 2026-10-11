import { hostThemes } from './host-themes.js';

// Default review uses the user's captured host theme, through the real SDK.
export const reviewTheme = (dark = false) => hostThemes[dark ? 'dark' : 'light'];

// Retained as an explicit stress-test palette, not the parity-review default.
export function syntheticReviewTheme(dark = false) {
  const [background, foreground, elevated, muted, border, primary, primaryText, success, successText, warning, warningText, error, errorText] = dark
    ? ['#151719','#e3e5ea','#1d2023','#949aa6','#2f3238','#6f9bff','#9db9ff','#4bbd97','#7fd4b6','#d8a53a','#e7c374','#e08494','#f4a6b5']
    : ['#ffffff','#242a36','#ffffff','#738096','#dde2eb','#3b6ef0','#2b57c8','#2f9e7a','#1f7a5d','#b8860b','#8a6408','#b83d4f','#a12d40'];
  return { mode: dark ? 'dark' : 'light', tokens: {
    background, foreground, elevated, muted, border, primary, primaryText,
    success, successText, warning, warningText, error, errorText,
    info: dark ? '#5aa6d8' : '#2f7fb8', infoText: dark ? '#8dc5ea' : '#24648f',
    subtle: dark ? '#20242a' : '#f4f6fa', mutedSurface: dark ? '#24272c' : '#f1f3f7',
    hover: dark ? '#24272c' : '#eef1f7', active: dark ? '#2b2f35' : '#e3e8f2',
    selection: dark ? '#2f343b' : '#eef1f7', selectionForeground: foreground,
    elevatedForeground: foreground, primaryForeground: background, focus: primary,
    font: 'sans-serif', mono: 'monospace', radius: '9px',
  } };
}

const long = 'Long authored label with an unbroken identifier ' + 'x'.repeat(100);
const nodes = [
  ['Heading', { title: 'Boundary review', subtitle: 'Zero, tiny, single-point and long authored data.' }],
  ...[[], [{label:'Zero',value:0},{label:'One',value:1}], [{label:'Tiny',value:.001},{label:'Large',value:1e9}], [{label:'All',value:1e9}]].map((data, i) => ['DonutChart', {title:`Ring boundary ${i}`,data:data.length ? data : [{label:'Zero A',value:0},{label:'Zero B',value:0}]}]),
  ['StackedBar', {title:'Zero composition',segments:[{label:'Absent',value:0},{label:'Present',value:100}]}],
  ['StackedBarChart', {title:'Zero stacked series',categories:['Zero','Full'],series:[{label:'Absent',data:[0,0]},{label:'Present',data:[0,10]}]}],
  ['LineChart', {title:'One observation',data:[{label:'Today',value:3}]}],
  ['Sparkline', {title:'One spark observation',data:[{label:'Today',value:3}]}],
  ['Badge', {label:long,tone:'red'}],
  ['Metric', {label:long,value:'1,000,000,000',detail:long,change:'+12%',tone:'red'}],
  ['KeyValue', {title:'Long fields',items:[{label:long,value:long,tone:'red'}]}],
  ['Progress', {title:long,value:50,max:100,unit:'jobs'}],
  ['DonutChart', {title:'Long legend',data:[{label:long,value:1e9},{label:'Other',value:1e9}]}],
  ['Tree', {nodes:[{label:long,detail:long,children:[{label:long}]}]}],
  ['Person', {name:long,role:long}],
  ['Choice', {label:'Long choice',options:[{label:long,selected:true},{label:'Other'}]}],
  ['Diff', {title:'Long diff',before:[long],after:[long]}],
  ['Table', {title:'Wide table',columns:['Identifier','Value','Status','Last updated'],rows:[[long,1e9,true,'Today']]}],
  ['Heatmap', {title:'Maximum columns',columns:Array.from({length:16},(_,i)=>`Column ${i+1}`),rows:[{label:'Series',values:Array.from({length:16},(_,i)=>i)}]}],
  ['Tabs', {tabs:[{label:long,body:long},{label:'Second',body:'Settled second state.'}]}],
  ['Diagram', {title:'Genuine diagram failure',code:'not a diagram'}],
];
export const boundaries = { catalog_version:'1', title:'Boundary review', spec:{root:'root',elements:{
  root:{type:'Stack',props:{},children:nodes.map((_,i)=>`n${i}`)},
  ...Object.fromEntries(nodes.map(([type,props],i)=>[`n${i}`,{type,props}])),
}} };

const diagramCases = [
  ['Flow', 'flowchart LR\n A[Read artifact] --> B{Valid?}\n B -->|Yes| C[Render Canvas]\n B -->|No| D[Retain last good view]\n C --> E[Poll for changes]\n D --> E'],
  ['Sequence', 'sequenceDiagram\n Agent->>Panel: Render\n Panel-->>Agent: Ready'],
  ['Class', 'classDiagram\n class Canvas {\n +String title\n +render()\n }'],
  ['State', 'stateDiagram-v2\n [*] --> Pending\n Pending --> Ready\n Ready --> [*]'],
  ['Entity', 'erDiagram\n CANVAS ||--o{ COMPONENT : contains\n CANVAS {\n string title\n }'],
  ['Gantt', 'gantt\n title Review\n dateFormat YYYY-MM-DD\n section Canvas\n Inspect :a, 2026-10-01, 3d\n Verify :after a, 2d'],
  ['Pie', 'pie title Traffic\n "EU" : 60\n "US" : 40'],
  ['Quadrant', 'quadrantChart\n title Priorities\n x-axis Low effort --> High effort\n y-axis Low impact --> High impact\n Item: [0.3, 0.6]'],
  ['Requirement', 'requirementDiagram\n requirement delivery {\n id: 1\n text: readable\n risk: low\n verifymethod: test\n }'],
  ['Git', 'gitGraph\n commit\n branch review\n checkout review\n commit\n checkout main\n merge review'],
  ['Mindmap', 'mindmap\n root((Canvas))\n  Data\n   Charts\n  Status'],
  ['Timeline', 'timeline\n title Canvas review\n 2026 : Inspect : Repair : Verify'],
  ['XY', 'xychart-beta\n title "Requests"\n x-axis ["A", "B"]\n y-axis "Count" 0 --> 10\n bar [3, 7]'],
];
export const diagramThemes = { catalog_version:'1', title:'Diagram themes', spec:{root:'root',elements:{
  root:{type:'Stack',props:{},children:diagramCases.map((_,i)=>`d${i}`)},
  ...Object.fromEntries(diagramCases.map(([title,code],i)=>[`d${i}`,{type:'Diagram',props:{title,code}}])),
}} };

// Optional props, boundary numbers and states the gallery never exercises.
const states = [
  ['Metric', {label:'No change badge',value:'42'}],
  ['Metric', {label:'No detail',value:'1,024',change:'-8',tone:'red'}],
  ['Progress', {title:'Zero progress',value:0,max:100,unit:'%'}],
  ['Progress', {title:'Above maximum',value:140,max:100,unit:'%'}],
  ['Progress', {title:'Zero maximum',value:5,max:0}],
  ['Gauge', {title:'Empty gauge',value:0,max:512,unit:'GB'}],
  ['Gauge', {title:'Above maximum',value:900,max:512,unit:'GB'}],
  ['Rating', {label:'Fractional rating',value:2.5,max:5}],
  ...[0.1, 2.2, 2.75, 4.9].map(value => ['Rating', {label:`Exact fraction ${value}`,value,max:5}]),
  ['Rating', {label:'Zero rating',value:0,max:5}],
  ['Heatmap', {title:'All-zero matrix',columns:['a','b','c'],rows:[{label:'row',values:[0,0,0]},{label:'other',values:[0,0,0]}]}],
  ['Heatmap', {title:'Constant matrix',columns:['a','b'],rows:[{label:'row',values:[7,7]}]}],
  ['Choice', {label:'Nothing selected',options:[{label:'One'},{label:'Two'}]}],
  ['Choice', {label:'Multiple mode',mode:'multiple',options:[{label:'One',selected:true},{label:'Two',selected:true},{label:'Three'}]}],
  ['Person', {name:'Single name'}],
  ['Divider', {}],
  ['Callout', {text:'A callout with no title.'}],
  ['Icon', {name:'sparkle',size:64,tone:'amber'}],
  ['Icon', {name:'star',size:12}],
  ['Timeline', {title:'No timestamps',items:[{title:'First',detail:'Detail only'},{title:'Second'}]}],
  ['Table', {title:'Footer and alignment',columns:['Item','Delta','Signed'],rows:[['Alpha',12,-4],['Beta',7,3],['Gamma',0,0]],align:['left','right','right'],footer:['Total',19,-1]}],
  ['StackedBar', {title:'Single segment',segments:[{label:'Only',value:5}]}],
  ['StackedBar', {title:'Six segments',segments:Array.from({length:6},(_,i)=>({label:`S${i+1}`,value:i+1}))}],
  ['StackedBarChart', {title:'Six series',categories:['A','B'],series:Array.from({length:6},(_,i)=>({label:`S${i+1}`,data:[i+1,i+2]}))}],
  ['BarChart', {title:'Zero among values',data:[{label:'None',value:0},{label:'Some',value:5}]}],
  ['LineChart', {title:'Flat series',data:[{label:'a',value:5},{label:'b',value:5},{label:'c',value:5}]}],
  ['Sparkline', {title:'Flat trend',data:[{label:'a',value:5},{label:'b',value:5}]}],
  ['DonutChart', {title:'Six slices',data:Array.from({length:6},(_,i)=>({label:`R${i+1}`,value:i+1}))}],
  ['BarChart', {title:'Six rows',data:Array.from({length:6},(_,i)=>({label:`R${i+1}`,value:i+1}))}],
  ['DonutChart', {title:'Thirty entries',data:Array.from({length:30},(_,i)=>({label:`Entry ${i+1}`,value:i+1}))}],
  ['StackedBar', {title:'Twelve segments',segments:Array.from({length:12},(_,i)=>({label:`S${i+1}`,value:i+1}))}],
  ['StackedBarChart', {title:'Eight series',categories:['A','B'],series:Array.from({length:8},(_,i)=>({label:`S${i+1}`,data:[i+1,i+2]}))}],
  ['ScatterChart', {title:'One point',xUnit:'rps',yUnit:'ms',points:[{x:1,y:1}]}],
  ['Text', {text:'Right aligned caption',variant:'caption',align:'right'}],
  ['List', {title:'Bulleted',items:['First','Second']}],
  ['CodeBlock', {title:'No language',code:'single line'}],
];
export const statesReview = { catalog_version:'1', title:'State review', spec:{root:'root',elements:{
  root:{type:'Stack',props:{},children:states.map((_,i)=>`s${i}`)},
  ...Object.fromEntries(states.map(([type,props],i)=>[`s${i}`,{type,props}])),
}} };

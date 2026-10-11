import { gallery, costExplorer } from '../src/examples.js';
import { boundaries, reviewTheme, statesReview } from './fixtures.js';

const frame = document.querySelector('#panel');
const params = new URLSearchParams(location.search);
const panelUrl = params.has('production') ? 'production/index.html' : params.has('faults') ? 'fault-panel.html' : 'review-panel.html';
frame.src = panelUrl;
const select = document.querySelector('#scenario');
const envelope = { channel:'openchamber.sdk', v:1 };
let dark = false;
const state = { reads:0, writes:0, requests:[], scenario:'Empty', delay:0, content:null, session:'review-session' };
const push = (type, payload) => frame.contentWindow.postMessage({ ...envelope, type, payload }, '*');
const ready = () => { if (state.scenario !== 'Connecting') push('ready', { theme:reviewTheme(dark), surface:'panel', directory:'/review', session:state.scenario === 'No conversation' ? null : {id:state.session,title:'Review',busy:false}, connection:{connected:true,account:null}, settings:{},item:null }); };
window.addEventListener('message', event => {
  if (event.source !== frame.contentWindow || event.data?.channel !== envelope.channel) return;
  const message = event.data;
  if (message.type === 'hello') { ready(); return; }
  state.requests.push({ type:message.type, payload:message.payload });
  const reply = (payload, error) => frame.contentWindow.postMessage({ ...envelope, type:'result', id:message.id, ok:!error, ...(error ? {error:error.message,code:error.code} : {payload}) }, '*');
  if (message.type === 'workspace-read') {
    // Ancestry is represented explicitly; no real project/session data is read.
    const kind = message.payload.kind;
    reply(kind === 'projects'
      ? {kind,state:'ready',projects:[{id:'review-project',name:'Review',directory:'/review'}]}
      : {kind,state:'ready',projectId:'review-project',coverage:[{directory:'/review',state:'ready'}],sessions:[{id:'review-child',title:'Child',projectId:'review-project',directory:'/review',parentId:'review-session',createdAt:0,updatedAt:0,archivedAt:null,worktree:null,activity:'idle',outcome:null,items:[]}]});
  } else if (message.type === 'file-read') {
    state.reads++;
    const scenario = state.scenario;
    const content = state.content ?? JSON.stringify(scenario === 'Gallery' ? gallery : scenario === 'Boundaries' ? boundaries : scenario === 'States' ? statesReview : costExplorer);
    setTimeout(() => {
      if (scenario === 'Empty') reply(null,{code:'NOT_FOUND',message:'Missing synthetic file'});
      else if (scenario === 'Read error') reply(null,{code:'PERMISSION_DENIED',message:'Synthetic read denied'});
      else reply({content:scenario === 'Invalid' ? '{invalid' : content});
      document.querySelector('#log').textContent = `${state.reads} reads · ${state.writes} writes`;
    }, state.delay);
  } else if (message.type === 'clipboard-write' || message.type === 'compose') reply({});
  else { if (message.type === 'file-write') state.writes++; reply(null,{code:'HOST_REJECTED',message:'Unsupported synthetic operation'}); }
});
select.onchange = () => { state.scenario = select.value; state.content = null; if (state.scenario === 'Connecting') frame.src=panelUrl; else { frame.contentWindow.dispatchEvent(new Event('focus')); ready(); } };
document.querySelector('#theme').onclick = () => { dark = !dark; ready(); document.querySelector('#theme').textContent = dark ? 'Light theme' : 'Dark theme'; };
document.querySelector('#reload').onclick = () => { frame.src = panelUrl; };
window.review = { state, ready, frame, artifacts:{gallery,costExplorer,boundaries}, setScenario(name) { select.value=name; select.onchange(); }, setSession(id) { state.session=id; push('session',{session:{id,title:id,busy:false}}); } };

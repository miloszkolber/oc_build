// Surgical fixes to the baked upstream release. Fail closed if upstream changes
// the responsible boundaries instead of silently shipping an ineffective patch.
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ?? '/opt/openchamber';
const replace = (source, before, after) => {
  if (source.split(before).length !== 2) throw new Error(`Unexpected surface source: ${before.slice(0, 90)}`);
  return source.replace(before, after);
};
const serverPath = path.join(root, 'server/lib/guests/surface.js');
let server = fs.readFileSync(serverPath, 'utf8');
server = replace(server, "import { randomUUID } from 'node:crypto';", "import { randomUUID } from 'node:crypto';\nimport { mergeWheelBatches } from './surface-input.js';");
server = replace(server, '      agentActive: frame.agentActive,', '      agentActive: frame.agentActive,\n      browserViewportMode: frame.browserViewportMode,');
server = replace(server, '      serviceSeq: seq,', "      serviceSeq: seq,\n      browserViewportMode: ['auto', 'fixed'].includes(response.headers.get('x-browser-viewport-mode')) ? response.headers.get('x-browser-viewport-mode') : undefined,");
server = replace(server, '        void enqueue(session, () => handleInput(session, viewer, message.events, handoff, frameSeq));', `        const pending = viewer.pendingWheelBatch;
        const merged = pending && pending.handoff === handoff && pending.frameSeq === frameSeq
          ? mergeWheelBatches(pending.events, message.events) : null;
        if (merged) {
          pending.events = merged;
          return;
        }
        const batch = { events: message.events, handoff, frameSeq };
        viewer.pendingWheelBatch = batch;
        void enqueue(session, () => {
          if (viewer.pendingWheelBatch === batch) viewer.pendingWheelBatch = null;
          return handleInput(session, viewer, batch.events, handoff, frameSeq);
        });`);
for (const barrier of ["      case 'release':", "      case 'resize':", "      case 'clipboard-read':"]) {
  server = replace(server, barrier, `${barrier}\n        viewer.pendingWheelBatch = null;`);
}
fs.writeFileSync(serverPath, server);
const assets = path.join(root, 'dist/assets');
const panes = fs.readdirSync(assets).filter((name) => /^GuestSurfacePane-.*\.js$/.test(name));
if (panes.length !== 1) throw new Error('Expected exactly one surface pane chunk');
const panePath = path.join(assets, panes[0]);
let pane = fs.readFileSync(panePath, 'utf8');
// Extend only the outgoing frame metadata, not the schema or any input authority.
pane = replace(pane, 'n=c.data}catch{return}', 'n=c.data;if(n.type==="frame"){const raw=JSON.parse(r);n.browserViewportMode=raw.browserViewportMode==="auto"?"auto":"fixed"}}catch{return}');
pane = replace(pane, 'mime:n.mime,agentActive:n.agentActive}', 'mime:n.mime,agentActive:n.agentActive,browserViewportMode:n.browserViewportMode}');
pane = replace(pane, 'const a=await createImageBitmap', 'if(e.parentElement)e.parentElement.dataset.browserViewportMode=t.browserViewportMode;const a=await createImageBitmap');
// React delegates wheel as passive. A native non-passive listener is required
// here because scrolling belongs to the remote page, not the surrounding app.
pane = replace(pane, 'onWheel:G,', '');
pane = replace(pane, 'if(!c)return null;', 'i.useEffect(()=>{const el=b.current;if(!el||!p)return;el.addEventListener("wheel",G,{passive:false});return()=>el.removeEventListener("wheel",G)},[p,f,D,x]);if(!c)return null;');
fs.writeFileSync(panePath, pane);
console.log('Patched browser surface: native wheel, queued scroll coalescing, explicit viewport mode');

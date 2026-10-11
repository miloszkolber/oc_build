import { hostThemes } from './host-themes.js';

const frame = document.querySelector('#panel');
const mode = new URLSearchParams(location.search).get('theme') === 'dark' ? 'dark' : 'light';
const envelope = { channel: 'openchamber.sdk', v: 1 };
// This file is copied explicitly by the preview builder, never read from a
// wildcard filesystem scope by the web server.
const content = await (await fetch('conversation.canvas.json')).text();
const ready = {
  theme: hostThemes[mode], surface: 'panel', directory: '/review',
  session: { id: 'conversation-preview', title: 'Conversation Canvas', busy: false },
  connection: { connected: true, account: null }, settings: {}, item: null,
};
window.conversationReview = { content, theme: ready.theme, reads: 0, writes: 0 };
window.addEventListener('message', event => {
  if (event.source !== frame.contentWindow || event.data?.channel !== envelope.channel) return;
  const message = event.data;
  const send = payload => frame.contentWindow.postMessage({ ...envelope, ...payload }, '*');
  if (message.type === 'hello') { send({ type: 'ready', payload: ready }); return; }
  if (message.type === 'file-read') {
    window.conversationReview.reads++;
    send({ type: 'result', id: message.id, ok: true, payload: { content } });
  } else {
    if (message.type === 'file-write') window.conversationReview.writes++;
    send({ type: 'result', id: message.id, ok: false, code: 'HOST_REJECTED', error: 'Read-only review host' });
  }
});
// The same packaged entrypoint, JS and CSS as the installed Canvas extension.
frame.src = 'production/index.html';

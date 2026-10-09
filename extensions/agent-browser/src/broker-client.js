import crypto from 'node:crypto';

// The one shape this client can dial: plain HTTP on the loopback interface.
// The label names the source so an invalid value fails loudly with its origin.
export const parseBrokerBaseUrl = (value = 'http://127.0.0.1:3001', label = 'OPENCHAMBER_BROWSER_BROKER_URL') => {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${label} must be an http://127.0.0.1 URL`); }
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`${label} must be a plain HTTP loopback URL on 127.0.0.1`);
  }
  return url.origin;
};

const accessHeaders = (access = {}) => {
  const headers = {};
  if (typeof access.viewer === 'string') headers['x-surface-viewer'] = access.viewer;
  if (access.viewerControls === true) headers['x-surface-viewer-controls'] = '1';
  if (Number.isSafeInteger(access.frameSeq)) headers['x-surface-frame-seq'] = String(access.frameSeq);
  return headers;
};

export const createBrokerClientRuntime = ({ baseUrl = process.env.OPENCHAMBER_BROWSER_BROKER_URL ?? 'http://127.0.0.1:3001', fetchImpl = fetch } = {}) => {
  const base = parseBrokerBaseUrl(baseUrl);
  let viewerTheme;
  let brokerAgentActive = false;

  const request = async (path, { method = 'GET', body, signal, access, responseType = 'json' } = {}) => {
    const headers = { ...accessHeaders(access) };
    if (body !== undefined) headers['content-type'] = 'application/json';
    let response;
    try {
      response = await fetchImpl(`${base}${path}`, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        ...(signal ? { signal } : {}),
        redirect: 'error',
        credentials: 'omit',
      });
    } catch (error) {
      throw new Error(`Shared browser broker at ${base} is unavailable: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (responseType === 'frame') {
      if (response.status === 204) return null;
      if (!response.ok) throw new Error(`Browser broker surface returned HTTP ${response.status}`);
      return {
        sequence: Number(response.headers.get('x-surface-seq')),
        width: Number(response.headers.get('x-surface-width')),
        height: Number(response.headers.get('x-surface-height')),
        browserViewportMode: response.headers.get('x-browser-viewport-mode') === 'auto' ? 'auto' : 'fixed',
        title: response.headers.get('x-surface-title') ?? '',
        agentActive: response.headers.get('x-surface-agent-active') === '1',
        mime: response.headers.get('content-type')?.split(';', 1)[0] ?? 'image/jpeg',
        bytes: Buffer.from(await response.arrayBuffer()),
      };
    }
    const text = await response.text();
    let value = null;
    try { value = text ? JSON.parse(text) : null; } catch {}
    if (!response.ok) {
      const error = new Error(value?.error || `Browser broker returned HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return value;
  };

  return {
    get agentActive() { return brokerAgentActive; },
    perform: async (action, parameters, signal) => {
      const result = await request('/browser-control', {
        method: 'POST', signal,
        body: { requestId: `browser-${crypto.randomUUID()}`, action, parameters },
      });
      if (result?.ok !== true) throw new Error(result?.error || 'The shared browser returned an unknown page state');
      return result.data;
    },
    state: (access = {}, { problems = false } = {}) => request(`/browser/state${problems ? '?problems=1' : ''}`, { access }),
    openScope: (_context, generation, access) => request('/browser/scope', { method: 'POST', body: { generation }, access }),
    selectScope: (scopeId, generation, access) => request('/browser/select', { method: 'POST', body: { scopeId, generation }, access }),
    navigate: (url, generation, access) => request('/browser/navigate', { method: 'POST', body: { url, generation }, access }),
    reload: (generation, access) => request('/browser/reload', { method: 'POST', body: { generation }, access }),
    back: (generation, access) => request('/browser/back', { method: 'POST', body: { generation }, access }),
    forward: (generation, access) => request('/browser/forward', { method: 'POST', body: { generation }, access }),
    stop: (generation, access) => request('/browser/stop', { method: 'POST', body: { generation }, access }),
    newTab: (generation, access) => request('/browser/tabs/new', { method: 'POST', body: { generation }, access }),
    selectTab: (tabId, generation, access) => request('/browser/tabs/select', { method: 'POST', body: { tabId, generation }, access }),
    closeTab: (tabId, generation, access) => request('/browser/tabs/close', { method: 'POST', body: { tabId, generation }, access }),
    setViewerTheme: async (theme) => { viewerTheme = theme; return request('/browser/viewer', { method: 'POST', body: { theme } }); },
    setDevicePixelRatio: (devicePixelRatio) => request('/browser/viewer', {
      method: 'POST', body: { devicePixelRatio, ...(viewerTheme ? { theme: viewerTheme } : {}) },
    }),
    setViewport: (viewport, generation, access) => request('/browser/viewport', { method: 'POST', body: { ...viewport, generation }, access }),
    setNativeSelectCompatibility: (enabled, generation, access) => request('/browser/select-compatibility', { method: 'POST', body: { enabled, generation }, access }),
    surfaceFrame: async ({ after, wait, signal }) => {
      const frame = await request(`/surface/frame?after=${after}&wait=${wait}`, { signal, responseType: 'frame' });
      brokerAgentActive = frame?.agentActive === true;
      return frame;
    },
    surfaceInput: (events, { viewer, frameSeq } = {}) => request('/surface/input', {
      method: 'POST', body: { events }, access: { viewer, frameSeq },
    }),
    surfaceControl: (controller, viewer) => request('/surface/control', { method: 'POST', body: { controller, ...(viewer ? { viewer } : {}) } }),
    surfaceResize: (size) => request('/surface/resize', { method: 'POST', body: size }),
    surfaceClipboard: async () => {
      const result = await request('/surface/clipboard');
      return typeof result?.text === 'string' ? result.text : '';
    },
    async close() {},
  };
};

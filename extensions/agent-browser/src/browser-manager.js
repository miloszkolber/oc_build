import { cssSize } from './viewports.js';

const GLOBAL_SCOPE_ID = 'global';

export const createBrowserManager = ({ createRuntime, now = Date.now } = {}) => {
  if (typeof createRuntime !== 'function') throw new Error('createBrowserManager requires a runtime factory');

  const scopes = new Map();
  let selectedScopeId = null;
  let controller = 'none';
  let controllingViewer = null;
  let operationQueue = Promise.resolve();
  let frameState = null;
  let frameSequence = 0;
  let viewGeneration = 0;
  let surfaceViewport = null;
  let surfaceSize = null;
  let devicePixelRatio = null;
  let viewerTheme = null;
  let closed = false;
  let notice = null;
  let view = { key: null, firstSequence: 1 };
  const frameControllers = new Set();
  const selectionWaiters = new Set();

  const enqueue = (operation) => {
    const pending = operationQueue.catch(() => {}).then(operation);
    operationQueue = pending;
    return pending;
  };
  const selected = () => selectedScopeId ? scopes.get(selectedScopeId) ?? null : null;
  const touch = (entry) => { if (entry) entry.lastActivityAt = now(); };

  const observeView = () => {
    const entry = selected();
    const key = entry ? JSON.stringify([entry.id, entry.runtime.tabs?.find((tab) => tab.active)?.id ?? null]) : null;
    if (key !== view.key) view = { key, firstSequence: frameSequence + 1 };
  };
  const shownEarlierView = (frameSeq) => {
    observeView();
    return Number.isInteger(frameSeq) && frameSeq > 0 && frameSeq < view.firstSequence;
  };
  const finishSelectionWaiter = (waiter, error = null) => {
    if (!selectionWaiters.delete(waiter)) return;
    clearTimeout(waiter.timer);
    waiter.signal?.removeEventListener('abort', waiter.onAbort);
    if (error) waiter.reject(error);
    else waiter.resolve(null);
  };
  const select = (entry) => {
    if (selectedScopeId === entry.id) return;
    for (const pending of frameControllers) pending.abort();
    selectedScopeId = entry.id;
    frameState = null;
    viewGeneration += 1;
    for (const waiter of selectionWaiters) finishSelectionWaiter(waiter);
  };
  const removeScope = (entry) => {
    scopes.delete(entry.id);
    if (selectedScopeId === entry.id) {
      for (const pending of frameControllers) pending.abort();
      selectedScopeId = null;
      frameState = null;
      viewGeneration += 1;
    }
    return entry.runtime.close();
  };
  const ensureScope = async () => {
    if (closed) throw new Error('Browser manager is closed');
    const existing = scopes.get(GLOBAL_SCOPE_ID);
    if (existing) return existing;
    const entry = { id: GLOBAL_SCOPE_ID, runtime: createRuntime(), lastActivityAt: now() };
    scopes.set(GLOBAL_SCOPE_ID, entry);
    entry.runtime.onDead?.(() => enqueue(async () => {
      if (scopes.get(GLOBAL_SCOPE_ID) !== entry) return;
      notice = { message: 'Chromium stopped unexpectedly. The next browser action starts a fresh temporary profile.' };
      await removeScope(entry);
    }).catch(() => {}));
    entry.runtime.onTabsChanged?.(() => {
      if (selectedScopeId === entry.id) viewGeneration += 1;
    });
    entry.runtime.onNavigationChanged?.(() => {
      if (selectedScopeId !== entry.id) return;
      for (const pending of frameControllers) pending.abort();
      frameState = null;
      view = { key: null, firstSequence: frameSequence + 1 };
      viewGeneration += 1;
    });
    if (!selectedScopeId) {
      select(entry);
      if (surfaceSize) await entry.runtime.surfaceResize(surfaceSize);
    }
    return entry;
  };
  const requireSelected = () => {
    const entry = selected();
    if (!entry) throw new Error('No shared browser is available yet');
    return entry;
  };
  const requireDockAccess = ({ viewer = null, frameSeq = null } = {}) => {
    if (controller !== 'none' && !(controller === 'user' && viewer !== null && viewer === controllingViewer)) {
      throw new Error('Dock controls are available only while the shared surface is idle or to the viewer in control');
    }
    if (shownEarlierView(frameSeq)) throw new Error('The browser view changed before the dock command ran');
  };
  const requireGeneration = (expectedGeneration) => {
    if (expectedGeneration !== viewGeneration) throw new Error('The browser view changed before the dock command ran');
  };
  const dockCommand = (name, parameters, expectedGeneration, access) => enqueue(async () => {
    requireDockAccess(access);
    requireGeneration(expectedGeneration);
    const entry = requireSelected();
    touch(entry);
    await entry.runtime.command(name, parameters);
  });

  return {
    expireIdle(idleTimeoutMs) {
      return enqueue(async () => {
        if (closed) return false;
        const entry = selected();
        if (!entry || now() - entry.lastActivityAt < idleTimeoutMs) return false;
        // Frame requests count as activity: an open viewer keeps its profile.
        // Run behind pending actions so an in-flight navigation cannot expire.
        controller = 'none';
        controllingViewer = null;
        notice = { message: 'The idle browser closed and its temporary profile was cleared. The next browser action starts a fresh profile.' };
        await removeScope(entry);
        return true;
      });
    },
    get agentActive() { return selected()?.runtime.agentActive === true; },
    perform(action, parameters, signal, _context) {
      return enqueue(async () => {
        signal?.throwIfAborted();
        if (closed) throw new Error('Browser manager is closed');
        if (controller === 'user') throw new Error('The user controls the browser. Wait for them to hand control back.');
        const entry = await ensureScope();
        touch(entry);
        try {
          const result = await entry.runtime.perform(action, parameters, signal);
          notice = null;
          return result;
        }
        finally { touch(entry); }
      });
    },
    performMcp(name, parameters, signal) {
      return enqueue(async () => {
        signal?.throwIfAborted();
        if (closed) throw new Error('Browser manager is closed');
        if (controller === 'user') throw new Error('The user controls the browser. Wait for them to hand control back.');
        const entry = await ensureScope();
        touch(entry);
        try {
          if (typeof entry.runtime.performMcp !== 'function') throw new Error('MCP browser actions are unavailable');
          const result = await entry.runtime.performMcp(name, parameters, signal);
          notice = null;
          return result;
        } finally { touch(entry); }
      });
    },
    state({ viewer = null } = {}, { problems = false } = {}) {
      return {
        controller,
        viewerInControl: controller === 'user' && viewer !== null && viewer === controllingViewer,
        selectedScopeId,
        generation: viewGeneration,
        notice: notice ? { ...notice } : null,
        copy: selected()?.runtime.copyRequest ?? null,
        ...(problems ? { consoleProblems: selected()?.runtime.consoleProblems?.() ?? [] } : {}),
        scopes: Array.from(scopes.values(), (entry) => ({
          id: entry.id,
          selected: entry.id === selectedScopeId,
          url: entry.runtime.url ?? 'about:blank',
          title: entry.runtime.title ?? '',
          isLoading: entry.runtime.isLoading === true,
          canGoBack: entry.runtime.canGoBack === true,
          canGoForward: entry.runtime.canGoForward === true,
          nativeSelectCompatibility: entry.runtime.nativeSelectCompatibility === true,
          nativeSelectCompatibilityError: entry.runtime.nativeSelectCompatibilityError ?? '',
          tabs: entry.runtime.tabs ?? [],
          viewport: entry.runtime.viewportState ?? null,
          problems: entry.runtime.problemCounts ?? { errors: 0, warnings: 0 },
        })),
      };
    },
    // The shared browser has no chat/project identity; the context is ignored.
    openScope(_context, expectedGeneration, access) {
      return enqueue(async () => {
        if (closed) throw new Error('Browser manager is closed');
        requireDockAccess(access);
        requireGeneration(expectedGeneration);
        const entry = await ensureScope();
        touch(entry);
        if (selectedScopeId !== entry.id) {
          if (surfaceSize) await entry.runtime.surfaceResize(surfaceSize);
          requireDockAccess(access);
          select(entry);
        }
        notice = null;
      });
    },
    selectScope(id, expectedGeneration, access) {
      return enqueue(async () => {
        requireDockAccess(access);
        requireGeneration(expectedGeneration);
        const entry = scopes.get(id);
        if (!entry) throw new Error('The selected shared browser no longer exists');
        if (surfaceSize) await entry.runtime.surfaceResize(surfaceSize);
        requireDockAccess(access);
        requireGeneration(expectedGeneration);
        select(entry);
        touch(entry);
        notice = null;
      });
    },
    navigate(url, expectedGeneration, access) { return dockCommand('navigate', { url }, expectedGeneration, access); },
    reload(expectedGeneration, access) { return dockCommand('reload', {}, expectedGeneration, access); },
    back(expectedGeneration, access) { return dockCommand('back', {}, expectedGeneration, access); },
    forward(expectedGeneration, access) { return dockCommand('forward', {}, expectedGeneration, access); },
    stop(expectedGeneration, access) { return dockCommand('stop', {}, expectedGeneration, access); },
    newTab(expectedGeneration, access) { return dockCommand('tab-new', {}, expectedGeneration, access); },
    selectTab(tabId, expectedGeneration, access) { return dockCommand('tab-select', { tabId }, expectedGeneration, access); },
    closeTab(tabId, expectedGeneration, access) { return dockCommand('tab-close', { tabId }, expectedGeneration, access); },
    setViewport({ mode, width, height, mobile }, expectedGeneration, access) {
      return enqueue(async () => {
        requireDockAccess(access);
        requireGeneration(expectedGeneration);
        const entry = requireSelected();
        touch(entry);
        await entry.runtime.configureViewport({ mode, source: 'viewer', width, height, mobile });
      });
    },
    setViewerTheme(theme) { viewerTheme = theme; },
    setDevicePixelRatio(ratio) {
      return enqueue(async () => {
        if (ratio === devicePixelRatio) return;
        const measuredWithoutRatio = devicePixelRatio === null;
        devicePixelRatio = ratio;
        if (!measuredWithoutRatio || !surfaceViewport) return;
        surfaceSize = cssSize(surfaceViewport, ratio);
        const entry = selected();
        if (entry) await entry.runtime.surfaceResize(surfaceSize);
      });
    },
    setNativeSelectCompatibility(enabled, expectedGeneration, access) {
      return enqueue(async () => {
        requireDockAccess(access);
        requireGeneration(expectedGeneration);
        const entry = requireSelected();
        touch(entry);
        const previous = entry.runtime.nativeSelectCompatibility === true;
        await entry.runtime.setNativeSelectCompatibility(enabled);
        try {
          requireDockAccess(access);
          requireGeneration(expectedGeneration);
        } catch (error) {
          await entry.runtime.setNativeSelectCompatibility(previous);
          throw error;
        }
      });
    },
    async surfaceFrame({ after, wait, signal }) {
      if (closed) return null;
      signal?.throwIfAborted();
      const entry = selected();
      if (!entry) {
        if (wait === 0) return null;
        return new Promise((resolve, reject) => {
          const waiter = { signal, resolve, reject, timer: null, onAbort: null };
          waiter.onAbort = () => finishSelectionWaiter(waiter, signal.reason ?? new DOMException('Frame request cancelled', 'AbortError'));
          waiter.timer = setTimeout(() => finishSelectionWaiter(waiter), wait);
          waiter.timer.unref?.();
          signal?.addEventListener('abort', waiter.onAbort, { once: true });
          selectionWaiters.add(waiter);
          if (signal?.aborted) waiter.onAbort();
        });
      }
      touch(entry);
      const generation = viewGeneration;
      const current = frameState?.scopeId === entry.id ? frameState : null;
      if (current?.frame && current.sequence > after) return current.frame;
      const switchController = new AbortController();
      frameControllers.add(switchController);
      const combinedSignal = signal ? AbortSignal.any([signal, switchController.signal]) : switchController.signal;
      let frame;
      try {
        frame = await entry.runtime.surfaceFrame({ after: current?.sourceSequence ?? 0, wait, signal: combinedSignal });
      } catch (error) {
        if (switchController.signal.aborted) return null;
        throw error;
      } finally { frameControllers.delete(switchController); }
      if (!frame || selectedScopeId !== entry.id || viewGeneration !== generation) return null;
      const published = frameState?.scopeId === entry.id ? frameState : null;
      if (published && frame.sequence <= published.sourceSequence) return null;
      observeView();
      frameSequence = Math.max(frameSequence + 1, after + 1);
      const wrapped = { ...frame, sequence: frameSequence };
      frameState = { scopeId: entry.id, sourceSequence: frame.sequence, sequence: frameSequence, frame: wrapped };
      return wrapped;
    },
    surfaceInput(events, { viewer = null, frameSeq = null } = {}) {
      controller = 'user';
      if (viewer) controllingViewer = viewer;
      return enqueue(async () => {
        const entry = requireSelected();
        if (shownEarlierView(frameSeq)) throw new Error('The browser view changed before this input arrived');
        touch(entry);
        await entry.runtime.surfaceControl('user');
        return entry.runtime.surfaceInput(events, viewerTheme);
      });
    },
    surfaceControl(nextController, viewer = null) {
      return enqueue(() => {
        controller = nextController;
        controllingViewer = nextController === 'user' ? viewer ?? controllingViewer : null;
        return selected()?.runtime.surfaceControl(nextController);
      });
    },
    surfaceResize(size) {
      return enqueue(() => {
        surfaceViewport = size;
        surfaceSize = cssSize(size, devicePixelRatio ?? 1);
        const entry = selected();
        return entry ? entry.runtime.surfaceResize(surfaceSize) : size;
      });
    },
    surfaceClipboard() { return enqueue(() => requireSelected().runtime.surfaceClipboard()); },
    close() {
      if (closed) return operationQueue;
      closed = true;
      for (const pending of frameControllers) pending.abort();
      for (const waiter of selectionWaiters) finishSelectionWaiter(waiter);
      const closing = Promise.allSettled(Array.from(scopes.values(), (entry) => entry.runtime.close()));
      return enqueue(async () => {
        await closing;
        scopes.clear();
        selectedScopeId = null;
        frameState = null;
      });
    },
  };
};

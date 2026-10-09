import { buildClickScript, buildSnapshotScript, buildTypeScript } from './page-scripts.js';
import { buildScrollScript } from './page-scripts-more.js';
import { isSensitiveName, redactText, redactUrl } from './inspector-format.js';

const MAX_TEXT = 4_000;
const MAX_SCREENSHOT_PIXELS = 16 * 1024 * 1024;
const REF_ATTRIBUTE = 'data-openchamber-browser-ref';
const INTERACTIVE_SELECTOR = 'a[href],button,input:not([type="hidden"]),select,textarea,[role="button"],[role="link"],[role="checkbox"],[role="tab"],[role="menuitem"],[role="option"],[onclick],[tabindex]:not([tabindex="-1"])';

const objectSchema = (properties = {}, required = [], additionalProperties) => ({
  type: 'object', properties,
  ...(required.length ? { required } : {}),
  ...(additionalProperties === undefined ? {} : { additionalProperties }),
});

// Input schemas match the captured Obscura v0.2.4 tools/list contract. Runtime
// behavior is implemented below against the one shared Chromium context.
export const MCP_TOOLS = Object.freeze([
  { name: 'browser_navigate', description: 'Navigate to a URL and wait for the page to load.', inputSchema: objectSchema({ url: { type: 'string' }, waitUntil: { type: 'string', enum: ['load', 'domcontentloaded', 'networkidle0'] } }, ['url']) },
  { name: 'browser_snapshot', description: 'Get the current page content as text, including title, URL, readable body text, and available element references.', inputSchema: objectSchema({ max_chars: { type: 'number', minimum: 0 } }, [], false) },
  { name: 'browser_click', description: 'Click an element by a recent ref from browser_snapshot/browser_interactive_elements or by CSS selector.', inputSchema: objectSchema({ ref: { type: 'string' }, selector: { type: 'string' } }) },
  { name: 'browser_fill', description: 'Set the value of an input element by ref or CSS selector.', inputSchema: objectSchema({ ref: { type: 'string' }, selector: { type: 'string' }, value: { type: 'string' } }, ['value']) },
  { name: 'browser_type', description: 'Append text to an input element by ref or CSS selector.', inputSchema: objectSchema({ ref: { type: 'string' }, selector: { type: 'string' }, text: { type: 'string' } }, ['text']) },
  { name: 'browser_press_key', description: 'Dispatch a keyboard key to an element or the document.', inputSchema: objectSchema({ key: { type: 'string' }, selector: { type: 'string' } }, ['key']) },
  { name: 'browser_select_option', description: 'Select an option in a select element by value or visible text.', inputSchema: objectSchema({ selector: { type: 'string' }, value: { type: 'string' } }, ['selector', 'value']) },
  { name: 'browser_evaluate', description: 'Evaluate a JavaScript expression in the page and return its value.', inputSchema: objectSchema({ expression: { type: 'string' } }, ['expression']) },
  { name: 'browser_wait_for', description: 'Wait for a CSS selector to appear in the DOM.', inputSchema: objectSchema({ selector: { type: 'string' }, timeout: { type: 'number' } }, ['selector']) },
  { name: 'browser_network_requests', description: 'List recent network requests made by the current page.', inputSchema: objectSchema() },
  { name: 'browser_console_messages', description: 'List console messages logged by the current page.', inputSchema: objectSchema() },
  { name: 'browser_close', description: 'Close all open tabs in the shared browser.', inputSchema: objectSchema() },
  { name: 'browser_markdown', description: 'Extract the current page as Markdown (headings, paragraphs, lists, links, and code blocks).', inputSchema: objectSchema({ max_chars: { type: 'number' } }) },
  { name: 'browser_links', description: 'List anchor links as JSON objects, optionally restricted to this origin.', inputSchema: objectSchema({ internal_only: { type: 'boolean' }, limit: { type: 'number' } }) },
  { name: 'browser_interactive_elements', description: 'List clickable and typeable elements with refs that remain valid until page navigation.', inputSchema: objectSchema({ limit: { type: 'number' } }) },
  { name: 'browser_back', description: 'Navigate back in the active page history.', inputSchema: objectSchema() },
  { name: 'browser_forward', description: 'Navigate forward in the active page history.', inputSchema: objectSchema() },
  { name: 'browser_reload', description: 'Reload the active page.', inputSchema: objectSchema() },
  { name: 'browser_get_cookies', description: 'List cookies in the shared browser cookie jar, optionally filtered by domain.', inputSchema: objectSchema({ domain: { type: 'string' } }) },
  { name: 'browser_set_cookie', description: 'Add or replace a cookie in the shared browser cookie jar.', inputSchema: objectSchema({ name: { type: 'string' }, value: { type: 'string' }, domain: { type: 'string' }, path: { type: 'string' }, secure: { type: 'boolean' }, http_only: { type: 'boolean' } }, ['name', 'value', 'domain']) },
  { name: 'browser_clear_cookies', description: 'Clear cookies from the shared browser context.', inputSchema: objectSchema() },
  { name: 'browser_wait_for_text', description: 'Wait until a substring appears in the rendered page text.', inputSchema: objectSchema({ text: { type: 'string' }, timeout: { type: 'number' } }, ['text']) },
  { name: 'browser_detect_forms', description: 'List forms and their input, textarea, select, and button fields.', inputSchema: objectSchema() },
  { name: 'browser_fill_form', description: 'Fill multiple form fields by ref or CSS selector and optionally click a submit element.', inputSchema: objectSchema({ fields: { type: 'array', items: objectSchema({ ref: { type: 'string' }, selector: { type: 'string' }, value: { type: 'string' }, type: { type: 'string', enum: ['text', 'check', 'uncheck', 'select'] } }) }, submit_ref: { type: 'string' }, submit_selector: { type: 'string' } }, ['fields']) },
  { name: 'browser_scroll', description: 'Scroll the page or bring a referenced element into view.', inputSchema: objectSchema({ direction: { type: 'string', enum: ['top', 'bottom', 'up', 'down', 'left', 'right'] }, amount: { type: 'number' }, ref: { type: 'string' }, selector: { type: 'string' } }) },
  { name: 'browser_get_attribute', description: 'Read an element attribute by ref or CSS selector.', inputSchema: objectSchema({ ref: { type: 'string' }, selector: { type: 'string' }, attribute: { type: 'string' } }, ['attribute']) },
  { name: 'browser_count', description: 'Count elements matching a CSS selector.', inputSchema: objectSchema({ selector: { type: 'string' } }, ['selector']) },
  { name: 'browser_extract', description: 'Extract structured text or attributes using a map of CSS selectors.', inputSchema: objectSchema({ schema: { type: 'object' } }, ['schema']) },
  { name: 'browser_tab_new', description: 'Open a new active tab, optionally navigating it to a URL.', inputSchema: objectSchema({ url: { type: 'string' } }) },
  { name: 'browser_tab_list', description: 'List open tabs with IDs, URLs, titles, and the active tab marker.', inputSchema: objectSchema() },
  { name: 'browser_tab_switch', description: 'Switch the shared browser to a tab by its ID.', inputSchema: objectSchema({ tab_id: { type: 'string' } }, ['tab_id']) },
  { name: 'browser_tab_close', description: 'Close a tab by ID, or close the active tab when omitted.', inputSchema: objectSchema({ tab_id: { type: 'string' } }) },
  { name: 'browser_search', description: 'Find text in the visible page and return matching snippets with context.', inputSchema: objectSchema({ query: { type: 'string' }, case_sensitive: { type: 'boolean' }, limit: { type: 'number' }, context_chars: { type: 'number' } }, ['query']) },
  { name: 'browser_storage_state', description: 'Export cookies and the active page origin localStorage/sessionStorage as JSON.', inputSchema: objectSchema() },
  { name: 'browser_set_storage_state', description: 'Restore cookies and storage entries for the currently active origin.', inputSchema: objectSchema({ state: { type: 'object' } }, ['state']) },
  { name: 'browser_screenshot', description: 'Capture the current rendered viewport as PNG image content.', inputSchema: objectSchema({ width: { type: 'number', exclusiveMinimum: 0, maximum: 32768 }, height: { type: 'number', exclusiveMinimum: 0, maximum: 32768 } }, [], false) },
  { name: 'browser_pdf', description: 'Export the current page as a paginated PDF resource.', inputSchema: objectSchema({ landscape: { type: 'boolean' }, print_background: { type: 'boolean' }, scale: { type: 'number', minimum: 0.1, maximum: 2 }, paper_width: { type: 'number', exclusiveMinimum: 0, maximum: 200 }, paper_height: { type: 'number', exclusiveMinimum: 0, maximum: 200 }, margin_top: { type: 'number', minimum: 0 }, margin_bottom: { type: 'number', minimum: 0 }, margin_left: { type: 'number', minimum: 0 }, margin_right: { type: 'number', minimum: 0 } }, [], false) },
]);

const TOOL_NAMES = new Set(MCP_TOOLS.map(({ name }) => name));
const textResult = (text) => ({ content: [{ type: 'text', text: String(text) }] });
const clipped = (value, max = MAX_TEXT) => {
  const chars = Array.from(String(value ?? ''));
  if (chars.length <= max) return String(value ?? '');
  return `${chars.slice(0, max).join('')}\n...(truncated, ${chars.length - max} more chars)`;
};
const sleep = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) return reject(signal.reason ?? new DOMException('Browser action was cancelled', 'AbortError'));
  let timer;
  const cleanup = () => signal?.removeEventListener('abort', onAbort);
  const onAbort = () => {
    clearTimeout(timer);
    cleanup();
    reject(signal.reason ?? new DOMException('Browser action was cancelled', 'AbortError'));
  };
  timer = setTimeout(() => {
    cleanup();
    resolve();
  }, ms);
  signal?.addEventListener('abort', onAbort, { once: true });
  timer.unref?.();
});

const cdpEvaluate = async (page, expression, signal) => {
  signal?.throwIfAborted();
  const response = await page.cdp.sendSession(page.sessionId, 'Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true,
  });
  signal?.throwIfAborted();
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || 'Page script failed');
  }
  return response.result ?? { value: null };
};

const evaluate = async (page, expression, signal) => (await cdpEvaluate(page, expression, signal)).value ?? null;
const pageInfo = async (page) => evaluate(page, '({url:String(location.href),title:String(document.title||"")})');
const validTimeout = (value) => {
  const seconds = value === undefined ? 30 : Number(value);
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 300) throw new Error('timeout must be between 0 and 300 seconds');
  return seconds * 1000;
};

const waitForPage = async (page, condition, timeoutMs, signal, runtime) => {
  const deadline = Date.now() + timeoutMs;
  let idleSince = 0;
  while (Date.now() <= deadline) {
    signal?.throwIfAborted();
    const ready = await evaluate(page, 'document.readyState');
    if (condition === 'domcontentloaded' && ['interactive', 'complete'].includes(ready)) return true;
    if (condition === 'load' && ready === 'complete') return true;
    if (condition === 'networkidle0' && ready === 'complete') {
      const pending = runtime.mcpNetworkRequests().some((row) => row.state === 'pending');
      if (!pending) {
        if (!idleSince) idleSince = Date.now();
        if (Date.now() - idleSince >= 500) return true;
      } else idleSince = 0;
    }
    await sleep(40, signal);
  }
  return false;
};

const markdownScript = `(() => {
  const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const inline = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName.toLowerCase();
    if (['script','style','noscript','svg'].includes(tag)) return '';
    if (tag === 'br') return '\\n';
    if (tag === 'img') return '![' + (node.alt || '') + '](' + (node.currentSrc || node.src || '') + ')';
    const text = Array.from(node.childNodes, inline).join('');
    if (tag === 'a' && node.href) return '[' + normalize(text) + '](' + node.href + ')';
    if (['strong','b'].includes(tag)) return '**' + normalize(text) + '**';
    if (['em','i'].includes(tag)) return '*' + normalize(text) + '*';
    if (tag === 'code') return '' + text.replace(/\\s+/g, ' ') + '';
    return text;
  };
  const blocks = (node, depth = 0) => {
    if (node.nodeType !== Node.ELEMENT_NODE || depth > 64) return [];
    const tag = node.tagName.toLowerCase();
    if (['script','style','noscript','svg'].includes(tag)) return [];
    if (/^h[1-6]$/.test(tag)) return [('#'.repeat(Number(tag[1])) + ' ' + normalize(inline(node)))];
    if (tag === 'pre') return [String.fromCharCode(96).repeat(3) + '\\n' + (node.innerText || node.textContent || '').replace(/\\n+$/, '') + '\\n' + String.fromCharCode(96).repeat(3)];
    if (tag === 'li') return [('  '.repeat(Math.min(depth, 8)) + '- ' + normalize(inline(node)))];
    if (tag === 'blockquote') return [normalize(inline(node)).split('\\n').map((line) => '> ' + line).join('\\n')];
    if (['p','div','section','article','header','footer','main','aside','nav','tr'].includes(tag)) {
      const children = Array.from(node.children).flatMap((child) => blocks(child, depth + 1));
      return children.length ? children : [normalize(inline(node))];
    }
    if (tag === 'ul' || tag === 'ol') return Array.from(node.children).flatMap((child) => blocks(child, depth + 1));
    const children = Array.from(node.children).flatMap((child) => blocks(child, depth + 1));
    return children.length ? children : [normalize(inline(node))];
  };
  return blocks(document.body).filter(Boolean).join('\\n\\n').replace(/\\n{3,}/g, '\\n\\n');
})()`;

const formsScript = `Array.from(document.forms, (form) => ({
  index: Array.from(document.forms).indexOf(form), id: form.id || '', name: form.getAttribute('name') || '',
  action: form.action || '', method: String(form.method || 'get').toLowerCase(),
   fields: Array.from(form.querySelectorAll('input,select,textarea,button')).filter((el) => !(el.tagName === 'INPUT' && el.type === 'hidden')).map((el) => ({
     tag: el.tagName.toLowerCase(), type: String(el.type || el.tagName).toLowerCase(), name: el.name || '', value: el.type === 'password' ? '[REDACTED]' : el.value || '',
    checked: Boolean(el.checked), required: Boolean(el.required), label: (el.getAttribute('aria-label') || el.getAttribute('placeholder') || document.querySelector('label[for="' + CSS.escape(el.id || '') + '"]')?.innerText || '').trim().slice(0,100),
    ref: el.getAttribute('${REF_ATTRIBUTE}'), options: el.tagName === 'SELECT' ? Array.from(el.options, (o) => ({value:o.value,text:(o.textContent||'').trim()})) : null,
  })),
}))`;

export const createMcpToolExecutor = (runtime) => {
  const refTables = new Map();
  const clearRefs = (tabId = runtime.activeTabId) => {
    if (tabId) refTables.delete(tabId);
  };
  runtime.onNavigationChanged?.((tabId) => clearRefs(tabId));
  const active = async () => runtime.ensurePage();
  const resolveTarget = (args, tabId = runtime.activeTabId) => {
    if (typeof args.ref === 'string' && args.ref) {
      const selector = refTables.get(tabId)?.get(args.ref);
      if (!selector) throw new Error(`Unknown or stale element ref ${args.ref}; refresh browser_snapshot or browser_interactive_elements`);
      return selector;
    }
    if (typeof args.selector === 'string' && args.selector) return args.selector;
    throw new Error("Missing 'ref' or 'selector' parameter");
  };
  const assignRefs = async (page, tabId) => {
    const expression = `(() => {
      const nodes = Array.from(document.querySelectorAll(${JSON.stringify(INTERACTIVE_SELECTOR)}));
      const rows = [];
      for (let i=0; i<nodes.length; i++) {
        const el = nodes[i]; const ref = 'e' + (i + 1); el.setAttribute(${JSON.stringify(REF_ATTRIBUTE)}, ref);
        // Form-control contents include textarea defaults, selected options, and
        // other field values, not labels. Exclude controls nested in wrappers too.
        let content = '';
        if (!el.matches('input,select,textarea')) {
          if (!el.querySelector('input,select,textarea')) {
            content = el.innerText || el.textContent || '';
          } else {
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            const parts = [];
            while (walker.nextNode()) {
              const node = walker.currentNode;
              if (!node.parentElement?.closest('input,select,textarea')) parts.push(node.nodeValue || '');
            }
            content = parts.join(' ');
          }
        }
        const label = (content || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || '').trim().replace(/\\s+/g,' ').slice(0,80);
        rows.push({ref,selector:'[${REF_ATTRIBUTE}="' + ref + '"]',tag:el.tagName.toLowerCase(),type:el.getAttribute('type')||'',role:el.getAttribute('role')||'',name:el.getAttribute('name')||'',label});
      }
      return rows;
    })()`;
    const rows = await evaluate(page, expression) ?? [];
    const table = new Map();
    for (const row of rows) table.set(row.ref, row.selector);
    refTables.set(tabId, table);
    return rows;
  };
  const afterNavigation = async (page, waitUntil = 'domcontentloaded', signal) => {
    if (!await waitForPage(page, waitUntil, 30_000, signal, runtime)) {
      throw new Error(`Timed out waiting for page ${waitUntil}`);
    }
    return pageInfo(page);
  };
  const perform = async (name, args, signal) => {
    if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Tool arguments must be an object');
    if (!TOOL_NAMES.has(name)) throw new Error(`Unknown browser tool: ${name}`);

    if (name === 'browser_navigate') {
      let url;
      try { url = new URL(args.url); } catch { throw new Error('Open an absolute http(s) URL'); }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only absolute http(s) navigation is supported; file:// navigation is disabled');
      const waitUntil = args.waitUntil ?? 'load';
      if (!['load', 'domcontentloaded', 'networkidle0'].includes(waitUntil)) throw new Error('waitUntil must be load, domcontentloaded, or networkidle0');
      const page = await active();
      runtime.clearConsoleProblems?.();
      const result = await page.cdp.sendSession(page.sessionId, 'Page.navigate', { url: url.href });
      if (result.errorText) throw new Error(`Navigation failed: ${result.errorText}`);
      clearRefs();
      const settled = await afterNavigation(page, waitUntil, signal);
       return textResult(`Navigated to ${settled.url} — "${settled.title}"`);
    }

    if (name === 'browser_snapshot') {
      const page = await active();
      const refs = await assignRefs(page, runtime.activeTabId);
      const limit = args.max_chars === undefined ? MAX_TEXT : Number(args.max_chars);
      if (!Number.isFinite(limit) || limit < 0 || limit > 1_000_000) throw new Error('max_chars must be between 0 and 1000000');
      const response = await cdpEvaluate(page, buildSnapshotScript({}), signal);
      const snapshot = response.value;
      if (!snapshot || snapshot.ok !== true) throw new Error(snapshot?.error || 'Could not snapshot the page');
      return textResult(`URL: ${snapshot.url}\nTitle: ${snapshot.title}\n\n${clipped(snapshot.text, Math.floor(limit))}${refs.length ? `\n\n${refs.length} interactive element(s) registered. Call browser_interactive_elements to list refs or pass ref to browser_click/browser_fill/browser_type.` : ''}`);
    }

    if (name === 'browser_click') {
      const page = await active();
      const selector = resolveTarget(args);
      const result = await cdpEvaluate(page, buildClickScript({ selector }), signal);
      if (!result.value?.ok) throw new Error(result.value?.error || `Element not found: ${selector}`);
      clearRefs();
      return textResult(`Clicked '${result.value.clicked}'`);
    }

    if (name === 'browser_fill') {
      const page = await active();
      const selector = resolveTarget(args);
      if (typeof args.value !== 'string') throw new Error('Missing value parameter');
      const result = await cdpEvaluate(page, buildTypeScript({ selector, value: args.value, submit: false }), signal);
      if (!result.value?.ok) throw new Error(result.value?.error || `Could not fill ${selector}`);
      return textResult(`Filled '${selector}' with value`);
    }

    if (name === 'browser_type') {
      const page = await active();
      const selector = resolveTarget(args);
      if (typeof args.text !== 'string') throw new Error('Missing text parameter');
      const expression = `(() => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el)return {error:'Element not found'}; if(!('value' in el)&&!el.isContentEditable)return {error:'Element is not editable'}; el.focus(); if(el.isContentEditable)el.textContent=(el.textContent||'')+${JSON.stringify(args.text)}; else {const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;if(setter)setter.call(el,(el.value||'')+${JSON.stringify(args.text)});else el.value=(el.value||'')+${JSON.stringify(args.text)};} el.dispatchEvent(new Event('input',{bubbles:true})); return {ok:true};})()`;
      const result = await evaluate(page, expression, signal);
      if (!result?.ok) throw new Error(result?.error || `Could not type into ${selector}`);
      return textResult(`Typed into '${selector}'`);
    }

    if (name === 'browser_press_key') {
      const page = await active();
      if (typeof args.key !== 'string' || !args.key) throw new Error('Missing key parameter');
      if (args.selector !== undefined) {
        const focus = await evaluate(page, `(() => {const el=document.querySelector(${JSON.stringify(args.selector)});if(!el)return false;el.focus();return true;})()`, signal);
        if (!focus) throw new Error(`Element not found: ${args.selector}`);
      }
      const key = args.key;
      const keyCodes = { Enter: 13, Tab: 9, Escape: 27, Backspace: 8, Delete: 46, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Home: 36, End: 35, PageUp: 33, PageDown: 34 };
      const code = key.length === 1 ? (/^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : /^\d$/.test(key) ? `Digit${key}` : '') : key;
      const common = { key, code, windowsVirtualKeyCode: keyCodes[key] ?? (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0), nativeVirtualKeyCode: keyCodes[key] ?? (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0) };
      await page.cdp.sendSession(page.sessionId, 'Input.dispatchKeyEvent', { type: 'keyDown', ...common });
      await page.cdp.sendSession(page.sessionId, 'Input.dispatchKeyEvent', { type: 'keyUp', ...common });
      return textResult(`Pressed key '${key}'`);
    }

    if (name === 'browser_select_option') {
      const page = await active();
      const result = await evaluate(page, `(() => {const el=document.querySelector(${JSON.stringify(args.selector)});if(!el)return 'element';const option=Array.from(el.options||[]).find((item)=>item.value===${JSON.stringify(args.value)}||(item.textContent||'').trim()===${JSON.stringify(args.value)});if(!option)return 'option';el.value=option.value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return 'ok';})()`, signal);
      if (result === 'element') throw new Error(`Element not found: ${args.selector}`);
      if (result !== 'ok') throw new Error(`Option not found: ${args.value}`);
      return textResult(`Selected '${args.value}' in '${args.selector}'`);
    }

    if (name === 'browser_evaluate') {
      if (typeof args.expression !== 'string') throw new Error('Missing expression parameter');
      const page = await active();
      const result = await cdpEvaluate(page, args.expression, signal);
      const value = result.value;
      const formatted = value === undefined ? result.unserializableValue ?? result.description ?? 'undefined'
        : typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? String(value);
      return textResult(clipped(formatted, 100_000));
    }

    if (name === 'browser_wait_for' || name === 'browser_wait_for_text') {
      const page = await active();
      const timeout = validTimeout(args.timeout);
      const isText = name === 'browser_wait_for_text';
      const field = isText ? args.text : args.selector;
      if (typeof field !== 'string' || !field) throw new Error(`Missing ${isText ? 'text' : 'selector'} parameter`);
      const expression = isText
        ? `((document.body?.innerText||document.body?.textContent||'').includes(${JSON.stringify(field)}))`
        : `Boolean(document.querySelector(${JSON.stringify(field)}))`;
      const deadline = Date.now() + timeout;
      do {
        signal?.throwIfAborted();
        if (await evaluate(page, expression, signal)) return textResult(`Found ${isText ? `text ${JSON.stringify(field)}` : `'${field}'`}`);
        if (Date.now() >= deadline) break;
        await sleep(Math.min(100, Math.max(1, deadline - Date.now())), signal);
      } while (true);
      throw new Error(`Timeout waiting for ${isText ? `text ${JSON.stringify(field)}` : `'${field}'`}`);
    }

    if (name === 'browser_network_requests') {
      const rows = runtime.mcpNetworkRequests();
      if (rows.length === 0) return textResult('No network requests recorded.');
      return textResult(rows.map((row) => `[${row.status ?? ''}] ${row.method} ${redactUrl(row.url, 8_192)} (${row.bodySize ?? 0}B)${row.error ? ` ${redactText(row.error)}` : ''}`).join('\n'));
    }

    if (name === 'browser_console_messages') {
      const messages = runtime.mcpConsoleMessages().map(redactText);
      return textResult(messages.length ? messages.join('\n') : 'No console messages.');
    }

    if (name === 'browser_close') {
      const count = await runtime.closeAllTabs();
      refTables.clear();
      return textResult(`Closed ${count} browser tab(s).`);
    }

    if (name === 'browser_markdown') {
      const page = await active();
      const markdown = await evaluate(page, markdownScript, signal);
      const limit = args.max_chars === undefined ? MAX_TEXT : Number(args.max_chars);
      if (!Number.isFinite(limit) || limit < 0 || limit > 1_000_000) throw new Error('max_chars must be between 0 and 1000000');
      return textResult(clipped(markdown, Math.floor(limit)));
    }

    if (name === 'browser_links') {
      const page = await active();
      const links = await evaluate(page, `(() => {const out=[];const seen=new Set();for(const a of document.querySelectorAll('a[href]')){const href=a.href||'';if(!href||href==='#'||href.startsWith('javascript:')||seen.has(href))continue;seen.add(href);out.push({text:(a.innerText||a.textContent||'').trim().replace(/\\s+/g,' ').slice(0,200),href});}return out;})()`, signal) ?? [];
      const limit = args.limit === undefined ? 100 : Number(args.limit);
      if (!Number.isInteger(limit) || limit < 0 || limit > 10_000) throw new Error('limit must be from 0 to 10000');
      const origin = new URL(runtime.url).origin;
      const lines = links.filter((link) => !args.internal_only || new URL(link.href).origin === origin).slice(0, limit).map((link) => JSON.stringify(link));
      return textResult(lines.length ? lines.join('\n') : 'No links found.');
    }

    if (name === 'browser_interactive_elements') {
      const page = await active();
      const rows = await assignRefs(page, runtime.activeTabId);
      const limit = args.limit === undefined ? 100 : Number(args.limit);
      if (!Number.isInteger(limit) || limit < 0 || limit > 10_000) throw new Error('limit must be from 0 to 10000');
      if (!rows.length) return textResult('No interactive elements on this page.');
      return textResult(rows.slice(0, limit).map((row) => {
        const kind = row.type ? `${row.tag}[${row.type}]` : row.role ? `${row.tag}[role=${row.role}]` : row.tag;
        return `ref=${row.ref.padEnd(5)} ${kind.padEnd(22)} ${JSON.stringify(row.label)}${row.name ? ` name=${JSON.stringify(row.name)}` : ''}`;
      }).join('\n'));
    }

    if (name === 'browser_back' || name === 'browser_forward' || name === 'browser_reload') {
      const command = name === 'browser_back' ? 'back' : name === 'browser_forward' ? 'forward' : 'reload';
      const before = runtime.url;
      await runtime.command(command);
      clearRefs();
      const page = await active();
      await waitForPage(page, 'domcontentloaded', 8_000, signal, runtime);
      const info = await pageInfo(page);
      if (command === 'back' && info.url === before) throw new Error('No previous page in history.');
      if (command === 'forward' && info.url === before) throw new Error('No forward page in history.');
      return textResult(`${command === 'back' ? 'Back to' : command === 'forward' ? 'Forward to' : 'Reloaded'} ${info.url}`);
    }

    if (name === 'browser_get_cookies') {
      const cookies = await runtime.getCookies();
      const domain = typeof args.domain === 'string' ? args.domain.replace(/^\./, '').toLowerCase() : null;
      const rows = cookies.filter((cookie) => !domain || String(cookie.domain || '').replace(/^\./, '').toLowerCase() === domain)
        .map((cookie) => JSON.stringify({ name: cookie.name, value: cookie.value, domain: cookie.domain, path: cookie.path, secure: cookie.secure, http_only: cookie.httpOnly }));
      return textResult(rows.length ? rows.join('\n') : 'No cookies.');
    }

    if (name === 'browser_set_cookie') {
      const cookie = {
        name: args.name, value: args.value, domain: args.domain,
        path: typeof args.path === 'string' ? args.path : '/',
        secure: args.secure === true, httpOnly: args.http_only === true,
      };
      await runtime.setCookies([cookie]);
      return textResult(`Set cookie ${cookie.name} on ${cookie.domain}${cookie.path}`);
    }

    if (name === 'browser_clear_cookies') {
      await runtime.clearCookies();
      return textResult('Cleared all cookies.');
    }

    if (name === 'browser_detect_forms') {
      const page = await active();
      await assignRefs(page, runtime.activeTabId);
      const forms = await evaluate(page, formsScript, signal) ?? [];
      const safeForms = forms.map((form) => ({
        ...form,
        action: redactUrl(form.action),
        fields: form.fields.map((field) => {
          const sensitive = field.type === 'password' || isSensitiveName(field.name) || isSensitiveName(field.label);
          return sensitive ? { ...field, value: '[REDACTED]', options: null } : field;
        }),
      }));
      return textResult(safeForms.length ? JSON.stringify(safeForms, null, 2) : 'No forms found.');
    }

    if (name === 'browser_fill_form') {
      if (!Array.isArray(args.fields)) throw new Error('Missing fields array');
      const page = await active();
      let filled = 0;
      const errors = [];
      for (const field of args.fields) {
        try {
          if (!field || typeof field !== 'object') throw new Error('Invalid field entry');
          const selector = resolveTarget(field);
          const value = typeof field.value === 'string' ? field.value : '';
          const kind = field.type || 'text';
          const result = await evaluate(page, `(() => {const el=document.querySelector(${JSON.stringify(selector)});if(!el)return 'not found';const type=${JSON.stringify(kind)};const value=${JSON.stringify(value)};if(type==='check'||type==='uncheck'){el.checked=type==='check';}else if(type==='select'){const option=Array.from(el.options||[]).find((o)=>o.value===value||(o.textContent||'').trim()===value);if(!option)return 'no matching option';el.value=option.value;}else if(el.isContentEditable){el.textContent=value;}else if('value' in el){const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;if(setter)setter.call(el,value);else el.value=value;}else{return 'not editable';}el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return 'ok';})()`, signal);
          if (result !== 'ok') throw new Error(result);
          filled += 1;
        } catch (error) { errors.push(error.message); }
      }
      if (args.submit_ref || args.submit_selector) {
        try {
          const selector = resolveTarget({ ref: args.submit_ref, selector: args.submit_selector });
          const result = await evaluate(page, `(() => {const el=document.querySelector(${JSON.stringify(selector)});if(!el)return false;el.click();return true;})()`, signal);
          if (!result) errors.push(`Submit element not found: ${selector}`);
          clearRefs();
        } catch (error) { errors.push(error.message); }
      }
      return textResult(errors.length ? `Filled ${filled} fields. Errors: ${errors.join('; ')}` : `Filled ${filled} fields.`);
    }

    if (name === 'browser_scroll') {
      const page = await active();
      const selector = args.ref || args.selector ? resolveTarget(args) : null;
      if (!selector && args.amount !== undefined) {
        const amount = Number(args.amount);
        if (!Number.isFinite(amount) || Math.abs(amount) > 1_000_000) throw new Error('amount must be a finite pixel value');
        const direction = args.direction || 'down';
        const expression = `(() => {const direction=${JSON.stringify(direction)},amount=${JSON.stringify(amount)};if(direction==='top')window.scrollTo(0,0);else if(direction==='bottom')window.scrollTo(0,document.body.scrollHeight);else if(direction==='up')window.scrollBy(0,-amount);else if(direction==='down')window.scrollBy(0,amount);else if(direction==='left')window.scrollBy(-amount,0);else if(direction==='right')window.scrollBy(amount,0);else return {error:'Unknown scroll direction'};dispatchEvent(new Event('scroll'));return {x:scrollX,y:scrollY};})()`;
        const result = await evaluate(page, expression, signal);
        if (result?.error) throw new Error(result.error);
        return textResult(`Scrolled ${direction}. ${JSON.stringify(result)}`);
      }
      const direction = args.direction || (selector ? undefined : 'down');
      const result = await cdpEvaluate(page, buildScrollScript({ selector, direction }), signal);
      if (!result.value?.ok) throw new Error(result.value?.error || 'Scroll failed');
      clearRefs();
      return textResult(`Scrolled ${direction || 'element into view'}. ${JSON.stringify(result.value)}`);
    }

    if (name === 'browser_get_attribute') {
      const page = await active();
      const selector = resolveTarget(args);
      if (typeof args.attribute !== 'string') throw new Error('Missing attribute parameter');
      const value = await evaluate(page, `(() => {const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;let value=el.getAttribute(${JSON.stringify(args.attribute)});if(value===null&&${JSON.stringify(args.attribute)}==='value')value=el.value||'';return value===null?'':String(value);})()`, signal);
      if (value === null) throw new Error(`Element not found: ${selector}`);
      return textResult(value);
    }

    if (name === 'browser_count') {
      const page = await active();
      const count = await evaluate(page, `document.querySelectorAll(${JSON.stringify(args.selector)}).length`, signal);
      return textResult(String(count ?? 0));
    }

    if (name === 'browser_extract') {
      const page = await active();
      if (!args.schema || typeof args.schema !== 'object' || Array.isArray(args.schema)) throw new Error('Missing schema object');
      const value = await evaluate(page, `(() => {const schema=${JSON.stringify(args.schema)},out={};for(const key of Object.keys(schema)){const spec=String(schema[key]);const list=key.endsWith('[]');const name=list?key.slice(0,-2):key;const at=spec.lastIndexOf('@');const attr=at>0?spec.slice(at+1):null;const selector=at>0?spec.slice(0,at):spec;const get=(el)=>el?(attr?(el.getAttribute(attr)||''):((el.innerText||el.textContent||'').trim())):null;if(list)out[name]=Array.from(document.querySelectorAll(selector),get);else out[name]=get(document.querySelector(selector));}return out;})()`, signal);
      return textResult(JSON.stringify(value ?? {}, null, 2));
    }

    if (name === 'browser_tab_new') {
      let url = null;
      if (args.url !== undefined) {
        try { url = new URL(args.url); } catch { throw new Error('Open an absolute http(s) URL'); }
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only absolute http(s) navigation is supported; file:// navigation is disabled');
      }
      const tab = await runtime.openMcpTab();
      clearRefs();
      if (url) {
        const page = await runtime.agentPage(tab.targetId);
        const result = await page.cdp.sendSession(page.sessionId, 'Page.navigate', { url: url.href });
        if (result.errorText) throw new Error(`Navigation failed: ${result.errorText}`);
        await waitForPage(page, 'domcontentloaded', 30_000, signal, runtime);
      }
      return textResult(url ? `Opened ${tab.targetId} and navigated to ${url.href}` : `Opened ${tab.targetId} (about:blank).`);
    }

    if (name === 'browser_tab_list') {
      const tabs = runtime.tabs;
      return textResult(tabs.length ? tabs.map((tab) => `${tab.active ? '*' : ' '} ${tab.id}  ${tab.url}  ${JSON.stringify(tab.title)}`).join('\n') : 'No tabs open.');
    }

    if (name === 'browser_tab_switch') {
      const id = args.tab_id;
      if (!runtime.tabs.some((tab) => tab.id === id)) throw new Error(`No such tab: ${id}`);
      await runtime.command('tab-select', { tabId: id });
      clearRefs();
      return textResult(`Active tab: ${id}`);
    }

    if (name === 'browser_tab_close') {
      const tabId = args.tab_id ?? runtime.activeTabId;
      if (!tabId) throw new Error('No tab to close');
      if (!runtime.tabs.some((tab) => tab.id === tabId)) throw new Error(`No such tab: ${tabId}`);
      await runtime.command('tab-close', { tabId });
      clearRefs(tabId);
      const activeTab = runtime.tabs.find((tab) => tab.active);
      return textResult(activeTab ? `Closed ${tabId}. Active tab now ${activeTab.id}.` : `Closed ${tabId}. No tabs remain.`);
    }

    if (name === 'browser_search') {
      const page = await active();
      if (typeof args.query !== 'string') throw new Error('Missing query parameter');
      const limit = args.limit === undefined ? 10 : Number(args.limit);
      const context = args.context_chars === undefined ? 80 : Number(args.context_chars);
      if (!Number.isInteger(limit) || limit < 0 || limit > 10_000 || !Number.isInteger(context) || context < 0 || context > 10_000) throw new Error('limit and context_chars must be non-negative integers up to 10000');
      if (limit === 0) return textResult(`No matches for ${JSON.stringify(args.query)}.`);
      const result = await evaluate(page, `(() => {const body=(document.body?.innerText||document.body?.textContent||'');const query=${JSON.stringify(args.query)};const sensitive=${args.case_sensitive === true};if(!query)return [];const hay=sensitive?body:body.toLocaleLowerCase();const needle=sensitive?query:query.toLocaleLowerCase();const out=[];let index=0;while(index<=hay.length){const at=hay.indexOf(needle,index);if(at<0)break;const start=Math.max(0,at-${context}),end=Math.min(body.length,at+needle.length+${context});out.push({offset:at,snippet:body.slice(start,end).trim().replace(/\\n/g,' ')});index=at+Math.max(needle.length,1);if(out.length>=${limit})break;}return out;})()`, signal) ?? [];
      return textResult(result.length ? `${result.length} match(es). ${result.map((row) => JSON.stringify(row)).join('\n')}` : `No matches for ${JSON.stringify(args.query)}.`);
    }

    if (name === 'browser_storage_state') {
      const cookies = (await runtime.getCookies()).map((cookie) => ({ name: cookie.name, value: cookie.value, domain: cookie.domain, path: cookie.path, secure: cookie.secure, http_only: cookie.httpOnly, same_site: cookie.sameSite, expires: cookie.expires }));
      const page = await active();
      const storage = await evaluate(page, `(() => {const localStorage=[],sessionStorage=[];try{for(let i=0;i<window.localStorage.length;i++){const k=window.localStorage.key(i);localStorage.push([k,window.localStorage.getItem(k)]);}}catch{}try{for(let i=0;i<window.sessionStorage.length;i++){const k=window.sessionStorage.key(i);sessionStorage.push([k,window.sessionStorage.getItem(k)]);}}catch{}return {origin:location.origin||'',localStorage,sessionStorage};})()`, signal);
      return textResult(JSON.stringify({ cookies, origins: storage ? [storage] : [] }, null, 2));
    }

    if (name === 'browser_set_storage_state') {
      const state = args.state;
      if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('state must be an object');
      let applied = 0;
      const cookies = Array.isArray(state.cookies) ? state.cookies.filter((cookie) => cookie && typeof cookie.name === 'string' && typeof cookie.value === 'string' && typeof cookie.domain === 'string').map((cookie) => ({
        name: cookie.name, value: cookie.value, domain: cookie.domain, path: cookie.path || '/', secure: cookie.secure === true,
        httpOnly: cookie.http_only === true || cookie.httpOnly === true, ...(cookie.same_site ? { sameSite: cookie.same_site } : {}),
        ...(Number.isFinite(cookie.expires) ? { expires: cookie.expires } : {}),
      })) : [];
      if (cookies.length) { await runtime.setCookies(cookies); applied += cookies.length; }
      const page = await active();
      const currentOrigin = new URL(runtime.url).origin;
      const origins = Array.isArray(state.origins) ? state.origins : [];
      const current = origins.filter((entry) => entry && entry.origin === currentOrigin);
      let skipped = origins.length - current.length;
      for (const entry of current) {
        const local = Array.isArray(entry.localStorage) ? entry.localStorage.filter((pair) => Array.isArray(pair) && typeof pair[0] === 'string' && typeof pair[1] === 'string') : [];
        const session = Array.isArray(entry.sessionStorage) ? entry.sessionStorage.filter((pair) => Array.isArray(pair) && typeof pair[0] === 'string' && typeof pair[1] === 'string') : [];
        await evaluate(page, `(() => {for(const [k,v] of ${JSON.stringify(local)})localStorage.setItem(k,v);for(const [k,v] of ${JSON.stringify(session)})sessionStorage.setItem(k,v);return true;})()`, signal);
        applied += local.length + session.length;
      }
      return textResult(`Restored ${applied} state entries.${skipped ? ` Skipped ${skipped} origin(s) that do not match the active page origin ${currentOrigin}.` : ''}`);
    }

    if (name === 'browser_screenshot') {
      const page = await active();
      const metrics = await page.cdp.sendSession(page.sessionId, 'Page.getLayoutMetrics');
      const viewport = metrics.cssLayoutViewport ?? metrics.layoutViewport;
      const width = args.width === undefined ? Math.round(viewport?.clientWidth ?? runtime.viewport?.width ?? 0) : Number(args.width);
      const height = args.height === undefined ? Math.round(viewport?.clientHeight ?? runtime.viewport?.height ?? 0) : Number(args.height);
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || width > 32_768 || height > 32_768 || Math.ceil(width) * Math.ceil(height) > MAX_SCREENSHOT_PIXELS) {
        throw new Error('screenshot dimensions must be finite, positive, at most 32768 pixels, and no more than 16 megapixels');
      }
      const capture = await page.cdp.sendSession(page.sessionId, 'Page.captureScreenshot', {
        format: 'png', fromSurface: true, captureBeyondViewport: true,
        clip: { x: 0, y: 0, width, height, scale: 1 },
      });
      if (typeof capture.data !== 'string') throw new Error('The current page has no renderable viewport');
      return { content: [{ type: 'image', data: capture.data, mimeType: 'image/png' }] };
    }

    if (name === 'browser_pdf') {
      const page = await active();
      const options = {
        landscape: args.landscape === true,
        printBackground: args.print_background === true,
        scale: args.scale ?? 1,
        paperWidth: args.paper_width ?? 8.5,
        paperHeight: args.paper_height ?? 11,
        marginTop: args.margin_top ?? 0.4,
        marginBottom: args.margin_bottom ?? 0.4,
        marginLeft: args.margin_left ?? 0.4,
        marginRight: args.margin_right ?? 0.4,
        transferMode: 'ReturnAsBase64',
      };
      const pdf = await page.cdp.sendSession(page.sessionId, 'Page.printToPDF', options);
      if (typeof pdf.data !== 'string') throw new Error('Chromium returned no PDF data');
      return { content: [{ type: 'resource', resource: { uri: 'browser://capture/current-page.pdf', mimeType: 'application/pdf', blob: pdf.data } }] };
    }

    throw new Error(`Browser tool is not implemented: ${name}`);
  };
  return perform;
};

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

async function browser(response, networkError) {
    const alerts = [], listeners = {}, classes = new Map();
    const context = vm.createContext({
        Response, Error, TypeError, SyntaxError, URL, console,
        window: { addEventListener: (name, callback) => listeners[name] = callback },
        alert: message => alerts.push(message),
        fetch: async () => { if (networkError) throw networkError; return response; },
        HTMLElement: class { attachShadow() { this.shadowRoot = {}; } },
        customElements: { define: (name, component) => classes.set(name, component) },
    });
    const modules = new Map();
    async function load(id) {
        if (!modules.has(id)) {
            let source;
            if (id === '/config.js') source = 'export default { backEndUrl: "", sessionTag: "mm" };';
            else if (id === '/c/script/bdoc.js') source = 'export default {};';
            else if (id === '/c/script/bsession.js') source = 'export default class {}';
            else source = fs.readFileSync(path.join(root, id), 'utf8');
            modules.set(id, new vm.SourceTextModule(source, { context, identifier: id }));
        }
        const module = modules.get(id);
        if (module.status === 'unlinked') await module.link((specifier, parent) =>
            loadModule(new URL(specifier, 'https://test.example' + parent.identifier).pathname));
        if (module.status === 'linked') await module.evaluate();
        return module;
    }
    async function loadModule(id) { return load(id); }
    const api = (await load('/c/script/api-errors.js')).namespace;
    return { api, alerts, listeners, classes, load };
}

test('uses backend message and request ID while preserving the original response body', async () => {
    const response = new Response(JSON.stringify({ message: 'Email service is not configured.', code: 'EmailConfigurationError', requestId: 'server-id' }), { status: 503 });
    const { api } = await browser();
    const error = await api.createApiError(response);
    assert.equal(error.message, 'Email service is not configured.');
    assert.equal(error.status, 503);
    assert.equal(error.code, 'EmailConfigurationError');
    assert.equal(error.requestId, 'server-id');
    assert.equal(response.bodyUsed, false);
    assert.equal((await response.json()).message, 'Email service is not configured.');
});

test('supports legacy JSON API errors, validation fields, and empty/HTML responses', async () => {
    const { api } = await browser();
    for (const body of [
        { errors: [{ detail: 'Name already exists.' }] },
        { error: 'Name already exists.' },
        { error: { message: 'Name already exists.' } },
    ]) assert.equal(await api.getApiErrorMessage(new Response(JSON.stringify(body), { status: 409 })), 'Name already exists.');
    const validation = new Response(JSON.stringify({ message: 'Failed Validation', log: [
        { severity: 'Warning', message: 'Trimmed whitespace.' },
        { severity: 'Error', property: 'name', message: 'Name is required.' },
    ] }), { status: 400 });
    assert.equal(await api.getApiErrorMessage(validation), 'name: Name is required.');
    const html = new Response('<html>Internal stack trace</html>', { status: 502, headers: { 'X-Request-ID': 'header-id' } });
    const text = await api.getApiErrorMessage(html);
    assert.match(text, /required service/);
    assert.doesNotMatch(text, /header-id|Reference:/);
    assert.equal((await api.createApiError(html)).requestId, 'header-id');
    assert.doesNotMatch(text, /html|stack trace/);
});

test('successful responses stay intact; unchecked JSON reads reject HTTP failures', async () => {
    const { api } = await browser();
    const good = new Response('{"items":[1]}', { status: 200 });
    assert.equal((await api.readJsonResponse(good)).items[0], 1);
    await assert.rejects(api.readJsonResponse(new Response('{"message":"Permission denied."}', { status: 403 })),
        error => error.status === 403 && error.message === 'Permission denied.');
    await assert.rejects(api.readJsonResponse(new Response('', { status: 200 })), error => error.code === 'InvalidResponse');
});

test('network failures have useful text and aborted requests remain cancellations', async () => {
    const cause = new TypeError('Failed to fetch');
    const { api } = await browser(null, cause);
    await assert.rejects(api.apiFetch('/api/test'), error => error.code === 'NetworkError' && error.cause === cause);
    const abort = Object.assign(new Error('cancelled'), { name: 'AbortError' });
    const cancelled = await browser(null, abort);
    await assert.rejects(cancelled.api.apiFetch('/api/test'), error => error === abort);
});

test('shared modal handlers show the server message once', async () => {
    const app = await browser();
    await app.load('/c/script/mm-create-project-modal.js');
    const Modal = app.classes.get('mm-create-project-modal');
    const modal = new Modal();
    const response = new Response('{"message":"The project limit has been reached.","requestId":"limit-id"}', { status: 403 });
    await modal.handleError(response);
    await modal.handleError(response);
    assert.deepEqual(app.alerts, ['The project limit has been reached.']);
});

test('unhandled API failures reach the common UI boundary', async () => {
    const app = await browser();
    const error = await app.api.createApiError(new Response('{"message":"Database unavailable."}', { status: 503 }));
    let prevented = false;
    app.listeners.unhandledrejection({ reason: error, preventDefault: () => prevented = true });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(prevented, true);
    assert.deepEqual(app.alerts, ['Database unavailable.']);
});

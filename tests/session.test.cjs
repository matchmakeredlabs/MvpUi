// Run with: node --experimental-vm-modules --test tests/session.test.cjs
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const loginHtml = readFileSync(path.join(root, "c/Login.html"), "utf8");
const expiredToken = "un=testuser&x=20000101T000000Z";
const validToken = "un=testuser&x=20990101T000000Z";
const originalPage = "https://matchmaker.test/c/Collections?id=123#details";

async function browser({ url = originalPage, token, response, networkError } = {}) {
    const redirects = [];
    const storage = new Map(token ? [["bsession_mm", token]] : []);
    const elements = new Map();
    const created = [];
    function element() {
        return {
            hidden: false, textContent: "", value: "", style: {}, children: [], attributes: {}, events: {},
            focus() { this.focused = true; },
            addEventListener(name, handler) { this.events[name] = handler; },
            appendChild(child) { this.children.push(child); },
            setAttribute(name, value) { this.attributes[name] = value; },
            show() { this.hidden = false; },
            hide() { this.hidden = true; },
        };
    }
    for (const match of loginHtml.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
        elements.set(match[1], Object.assign(element(), { hidden: /\bhidden\b/.test(match[0]) }));
    }
    elements.set("header-container", element());
    const location = new URL(url);
    location.replace = target => redirects.push(target);
    const context = vm.createContext({
        URL, URLSearchParams, alert() {},
        console: { log() {} },
        window: { location },
        localStorage: {
            getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value),
            removeItem: key => storage.delete(key),
            clear: () => storage.clear(),
        },
        FormData: class { constructor(form) { this.get = key => form.values[key]; } },
        document: {
            getElementById: id => elements.get(id) ?? null,
            createElement() { const node = element(); created.push(node); return node; },
            addEventListener() {},
        },
        async fetch() {
            if (networkError) throw networkError;
            return response;
        },
    });
    const sources = {
        "/c/script/api-errors.js": readFileSync(path.join(root, "c/script/api-errors.js"), "utf8"),
        "/config.js": 'export default { backEndUrl: "", sessionTag: "mm" };',
        "/c/script/mmx_auth.js": readFileSync(path.join(root, "c/script/mmx_auth.js"), "utf8"),
        "/c/script/bsession.js": readFileSync(path.join(root, "c/script/bsession.js"), "utf8"),
        "/c/script/mm-password-visibility.js": "export function enablePasswordVisibility() {}",
        "/c/script/mm-self-register-form.js": "",
        "/c/script/mm-forgot-password-form.js": "",
        "/c/script/mm-loading.js": "",
        "/c/Login": loginHtml.match(/<script type="module">([\s\S]*?)<\/script>/)[1] + "\nexport { submitLogin };",
    };
    const modules = new Map(Object.entries(sources).map(([id, source]) => [
        id, new vm.SourceTextModule(source, { context, identifier: id }),
    ]));
    async function load(id) {
        const module = modules.get(id);
        if (module.status === "unlinked") await module.link((specifier, parent) =>
            modules.get(new URL(specifier, "https://matchmaker.test" + parent.identifier).pathname));
        if (module.status === "linked") await module.evaluate();
        return module.namespace;
    }
    const auth = (await load("/c/script/mmx_auth.js")).default;
    const Session = (await load("/c/script/bsession.js")).default;
    async function submit() {
        const { submitLogin } = await load("/c/Login");
        await submitLogin({ preventDefault() {}, target: { values: { username: "testuser", password: "password" } } });
    }
    return { auth, session: new Session("", "mm"), load, submit, redirects, storage, elements, created };
}

function apiResponse(status, refreshedToken, body = {}) {
    return {
        status, ok: status >= 200 && status < 300,
        headers: { get: name => name === "Authentication-Info" && refreshedToken ? "Bearer-Update = " + refreshedToken : null },
        json: async () => body,
    };
}

test("unauthorized API responses clear the session and retain the login redirect", async () => {
    const app = await browser({ token: validToken, response: apiResponse(401) });
    await app.session.fetch("/api/groups");
    assert.equal(app.storage.has("bsession_mm"), false);
    assert.deepEqual(app.redirects, ["/c/Login"]);
});

test("connection failures preserve the session and expose a useful error", async () => {
    const cause = new TypeError("Failed to fetch");
    const app = await browser({ token: validToken, networkError: cause });
    await assert.rejects(app.session.fetch("/api/groups"), error => error.code === "NetworkError" && error.cause === cause);
    assert.equal(app.storage.get("bsession_mm"), validToken);
    assert.deepEqual(app.redirects, []);
});

test("wrong passwords show the backend credential message without redirecting", async () => {
    const app = await browser({ url: "https://matchmaker.test/c/Login", response: apiResponse(401, null, {
        message: "Username and/or password is invalid.", requestId: "login-request"
    }) });
    await app.submit();
    assert.equal(app.elements.get("form_msg").textContent,
        "Username and/or password is invalid.");
    assert.equal(app.elements.get("login_submit").disabled, false);
    assert.deepEqual(app.redirects, []);
});

test("a connection failure while signing in shows a connection error", async () => {
    const app = await browser({ url: "https://matchmaker.test/c/Login", networkError: new TypeError("Failed to fetch") });
    await app.submit();
    assert.match(app.elements.get("form_msg").textContent, /Check your connection/);
    assert.equal(app.elements.get("login_loading").hidden, true);
    assert.deepEqual(app.redirects, []);
});

test("successful sign-in still refreshes the token and opens the home page", async () => {
    const app = await browser({ url: "https://matchmaker.test/c/Login", response: apiResponse(200, validToken) });
    await app.submit();
    assert.equal(app.storage.get("bsession_mm"), validToken);
    assert.deepEqual(app.redirects, ["/c/index"]);
});

test("sign-in displays the server message without a reference instead of a generic status label", async () => {
    const app = await browser({ url: "https://matchmaker.test/c/Login", response: apiResponse(503, null, {
        message: "Sign-in is unavailable while maintenance finishes.", requestId: "signin-request"
    }) });
    await app.submit();
    assert.equal(app.elements.get("form_msg").textContent,
        "Sign-in is unavailable while maintenance finishes.");
    assert.equal(app.elements.get("login_submit").disabled, false);
});

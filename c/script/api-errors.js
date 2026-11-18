const responseErrors = new WeakMap();

export class ApiError extends Error {
    constructor(message, { status = 0, code = "RequestFailed", requestId = null, cause } = {}) {
        super(message, { cause });
        this.name = "ApiError";
        this.isApiError = true;
        this.status = status;
        this.code = code;
        this.requestId = requestId;
        this.presented = false;
    }
}

function defaultMessage(status) {
    return ({
        400: "Check the submitted values and try again.",
        401: "Please sign in to continue.",
        403: "You do not have permission to perform this action.",
        404: "The requested resource was not found.",
        409: "The request conflicts with the current resource. Refresh and try again.",
        429: "Too many requests. Wait a moment and try again.",
        502: "A required service could not complete the request. Try again shortly.",
        503: "The service is currently unavailable. Try again shortly.",
        504: "The request took too long. Try again shortly.",
    })[status] || (status >= 500 ? "An unexpected server error occurred. Try again or contact support."
        : "The request could not be completed.");
}

function text(value) {
    return typeof value === "string" && value.trim() && !/^\s*</.test(value) ? value.trim() : null;
}

function messageFrom(body) {
    if (typeof body === "string") return text(body);
    const validation = Array.isArray(body?.log) ? body.log.filter(item => item.severity === "Error") : [];
    if (validation.length) return [...new Set(validation.map(item =>
        item.property ? `${item.property}: ${item.message}` : item.message))].join(" ");
    const direct = text(body?.message) || text(body?.detail) || text(body?.error)
        || text(body?.error?.message) || text(body?.Message);
    if (direct) return direct;
    if (Array.isArray(body?.errors)) {
        const messages = body.errors.map(item => text(item.detail) || text(item.message)).filter(Boolean);
        if (messages.length) return [...new Set(messages)].join(" ");
    } else if (body?.errors && typeof body.errors === "object") {
        const messages = Object.entries(body.errors).flatMap(([field, errors]) =>
            (Array.isArray(errors) ? errors : [errors]).map(error => `${field}: ${error}`));
        if (messages.length) return messages.join(" ");
    }
    return text(body?.log?.[0]?.message) || text(body?.title);
}

const isResponse = value => value && typeof value.status === "number" && typeof value.json === "function";

export async function createApiError(response, fallback) {
    if (response?.isApiError) return response;
    if (!isResponse(response)) {
        return new ApiError(fallback || text(response?.message) || "The request could not be completed.", { cause: response });
    }
    if (!responseErrors.has(response)) {
        responseErrors.set(response, (async () => {
            let body;
            try { body = await (response.clone ? response.clone() : response).json(); } catch { /* Empty/HTML response. */ }
            return new ApiError(messageFrom(body) || fallback || defaultMessage(response.status), {
                status: response.status,
                code: body?.code || body?.errors?.[0]?.code || "RequestFailed",
                requestId: text(body?.requestId) || response.headers?.get?.("X-Request-ID") || null,
            });
        })());
    }
    return responseErrors.get(response);
}

export async function getApiErrorMessage(error, fallback) {
    const parsed = await createApiError(error, fallback);
    parsed.presented = true;
    return parsed.message;
}

export async function showApiError(error, fallback) {
    const parsed = await createApiError(error, fallback);
    if (parsed.presented) return;
    parsed.presented = true;
    if (typeof globalThis.alert === "function") globalThis.alert(parsed.message);
}

export async function apiFetch(input, options) {
    try { return await fetch(input, options); }
    catch (cause) {
        if (cause?.name === "AbortError") throw cause;
        throw new ApiError("Could not reach the server. Check your connection and try again.", { code: "NetworkError", cause });
    }
}

export async function ensureApiResponse(response) {
    if (!response.ok) throw await createApiError(response);
    return response;
}

export async function readJsonResponse(response) {
    await ensureApiResponse(response);
    try { return await response.json(); }
    catch (cause) {
        if (cause?.name === "AbortError") throw cause;
        throw new ApiError("The server returned an unreadable response. Try again or contact support.", {
            status: response.status, code: "InvalidResponse", requestId: response.headers?.get?.("X-Request-ID"), cause,
        });
    }
}

export async function readTextResponse(response) {
    await ensureApiResponse(response);
    return response.text();
}

// A final boundary for async event handlers/list loaders without a local error UI.
// Locally handled errors keep their own inline/modal presentation.
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("unhandledrejection", event => {
        if (event.reason?.isApiError || isResponse(event.reason)) {
            event.preventDefault();
            void showApiError(event.reason);
        }
    });
}

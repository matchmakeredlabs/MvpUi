export default class MmLoading extends HTMLElement {
    static observedAttributes = ["message"];
    static defaultDelay = 1000;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        if (this.shadowRoot.hasChildNodes()) return;

        const initiallyHidden = this.hidden;
        const style = document.createElement("style");
        style.textContent = `
            :host {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 0.65rem;
                color: #111;
            }
            :host([hidden]) { display: none !important; }
            :host([overlay]) {
                position: fixed;
                inset: 0;
                z-index: 9999;
                background: rgba(255, 255, 255, 0.82);
            }
            .spinner {
                width: 1.5rem;
                height: 1.5rem;
                box-sizing: border-box;
                border: 3px solid #d5d5d5;
                border-top-color: #0875bb;
                border-radius: 50%;
                animation: mm-loading-spin 0.8s linear infinite;
            }
            @keyframes mm-loading-spin { to { transform: rotate(360deg); } }
        `;

        this.#message = document.createElement("span");
        this.#message.textContent = this.getAttribute("message") || "Loading...";
        this.shadowRoot.append(style, document.createElement("span"), this.#message);
        this.shadowRoot.children[1].className = "spinner";
        this.setAttribute("role", "status");
        this.setAttribute("aria-live", "polite");

        if (!initiallyHidden) this.show();
    }

    #message;
    #showTimer;

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "message" && this.#message && oldValue !== newValue) {
            this.#message.textContent = newValue || "Loading...";
        }
    }

    show(message) {
        if (message) this.setAttribute("message", message);
        clearTimeout(this.#showTimer);

        const configuredDelay = Number(this.getAttribute("delay"));
        const delay =
            this.hasAttribute("delay") && Number.isFinite(configuredDelay)
                ? Math.max(0, configuredDelay)
                : MmLoading.defaultDelay;

        if (delay === 0) {
            this.hidden = false;
            return;
        }

        this.hidden = true;
        this.#showTimer = setTimeout(() => {
            this.hidden = false;
            this.#showTimer = undefined;
        }, delay);
    }

    hide() {
        clearTimeout(this.#showTimer);
        this.#showTimer = undefined;
        this.hidden = true;
    }

    disconnectedCallback() {
        clearTimeout(this.#showTimer);
        this.#showTimer = undefined;
    }
}

customElements.define("mm-loading", MmLoading);

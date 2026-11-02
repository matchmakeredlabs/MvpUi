import "./mm-modal.js";

export default class MmMessageModal extends HTMLElement {
    #modal;
    #resolve;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        if (this.#modal) return;

        const styles = document.createElement("link");
        styles.rel = "stylesheet";
        styles.href = "/c/res/styles.css";

        this.#modal = document.createElement("mm-modal");
        this.#modal.onHide = () => this.#settle(false);
        this.shadowRoot.append(styles, this.#modal);
    }

    show({
        title = "Message",
        message = "",
        confirmText = "OK",
        cancelText = null,
    } = {}) {
        this.#settle(false);

        const content = document.createElement("div");
        content.style.display = "grid";
        content.style.gap = "0.75rem";

        const heading = document.createElement("h3");
        heading.textContent = title;
        heading.style.margin = "0";

        const copy = document.createElement("p");
        copy.textContent = message;
        copy.style.margin = "0";
        copy.style.whiteSpace = "pre-wrap";
        content.append(heading, copy);

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.justifyContent = "flex-end";
        actions.style.gap = "0.5rem";

        if (cancelText) {
            const cancel = document.createElement("button");
            cancel.type = "button";
            cancel.className = "modal-button small-button5";
            cancel.textContent = cancelText;
            cancel.addEventListener("click", () => {
                this.#settle(false);
                this.#modal.hide();
            });
            actions.append(cancel);
        }

        const confirm = document.createElement("button");
        confirm.type = "button";
        confirm.className = "modal-button small-button5";
        confirm.textContent = confirmText;
        confirm.addEventListener("click", () => {
            this.#settle(true);
            this.#modal.hide();
        });
        actions.append(confirm);
        content.append(actions);

        this.#modal.replaceChildren(content);
        const result = new Promise((resolve) => {
            this.#resolve = resolve;
        });
        this.#modal.show();
        requestAnimationFrame(() => confirm.focus());
        return result;
    }

    #settle(value) {
        if (!this.#resolve) return;
        const resolve = this.#resolve;
        this.#resolve = null;
        resolve(value);
    }
}

customElements.define("mm-message-modal", MmMessageModal);

function getAppMessageModal() {
    let modal = document.querySelector("mm-message-modal[data-app-message]");
    if (!modal) {
        modal = document.createElement("mm-message-modal");
        modal.dataset.appMessage = "";
        document.body.append(modal);
    }
    return modal;
}

export function showMessage(options) {
    return getAppMessageModal().show(options);
}

export function confirmMessage(options) {
    return getAppMessageModal().show({
        confirmText: "Confirm",
        cancelText: "Cancel",
        ...options,
    });
}

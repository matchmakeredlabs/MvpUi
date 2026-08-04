import "./mm-modal.js";

export default class MmPromptModal extends HTMLElement {
    #modal;
    #input;
    #error;
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
        this.#modal.onHide = () => this.#settle(null);
        this.shadowRoot.append(styles, this.#modal);
    }

    ask({
        title = "Enter a value",
        message = "",
        label = "Value",
        placeholder = "",
        initialValue = "",
        confirmText = "Save",
        cancelText = "Cancel",
        expectedValue = null,
    } = {}) {
        this.#settle(null);

        const form = document.createElement("form");
        form.style.display = "grid";
        form.style.gap = "0.75rem";

        const heading = document.createElement("h3");
        heading.textContent = title;
        heading.style.margin = "0";
        form.append(heading);

        if (message) {
            const copy = document.createElement("p");
            copy.textContent = message;
            copy.style.margin = "0";
            form.append(copy);
        }

        const inputLabel = document.createElement("label");
        inputLabel.style.display = "grid";
        inputLabel.style.gap = "0.25rem";
        inputLabel.textContent = label;

        this.#input = document.createElement("input");
        this.#input.type = "text";
        this.#input.value = initialValue;
        this.#input.placeholder = placeholder;
        this.#input.autocomplete = "off";
        this.#input.required = true;
        inputLabel.append(this.#input);
        form.append(inputLabel);

        this.#error = document.createElement("div");
        this.#error.style.color = "#b42318";
        this.#error.style.minHeight = "1.25rem";
        this.#error.setAttribute("role", "alert");
        form.append(this.#error);

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.justifyContent = "flex-end";
        actions.style.gap = "0.5rem";

        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "modal-button small-button5";
        cancel.textContent = cancelText;
        cancel.addEventListener("click", () => this.#modal.hide());

        const submit = document.createElement("button");
        submit.type = "submit";
        submit.className = "modal-button small-button5";
        submit.textContent = confirmText;
        actions.append(cancel, submit);
        form.append(actions);

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const value = this.#input.value.trim();
            if (!value) {
                this.#error.textContent = "A value is required.";
                this.#input.focus();
                return;
            }
            if (expectedValue !== null && value !== expectedValue) {
                this.#error.textContent = `Type "${expectedValue}" to confirm.`;
                this.#input.focus();
                return;
            }

            this.#settle(value);
            this.#modal.hide();
        });

        this.#modal.replaceChildren(form);
        const result = new Promise((resolve) => {
            this.#resolve = resolve;
        });

        this.#modal.show();
        requestAnimationFrame(() => this.#input.focus());
        return result;
    }

    #settle(value) {
        if (!this.#resolve) return;
        const resolve = this.#resolve;
        this.#resolve = null;
        resolve(value);
    }
}

customElements.define("mm-prompt-modal", MmPromptModal);

import bdoc from "./bdoc.js";
import config from "/config.js";
import "./mm-loading.js";

class MmForgotPasswordForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        bdoc.append(
            this.shadowRoot,
            bdoc.ele(
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/styles.css")
            ),
            bdoc.ele(
                "form",
                bdoc.class("mmc_form auth-card"),
                bdoc.eventListener("submit", (event) => this.#requestReset(event)),
                bdoc.ele("h2", "Reset Password"),
                bdoc.ele(
                    "div",
                    bdoc.attr("id", "forgot_msg"),
                    bdoc.class("message"),
                    bdoc.attr("aria-live", "polite"),
                    bdoc.attr("style", "visibility: hidden;")
                ),
                this.#field("email", "Email:", "email", "email"),
                bdoc.ele(
                    "p",
                    bdoc.class("auth-form-actions"),
                    bdoc.ele(
                        "button",
                        bdoc.attr("type", "submit"),
                        bdoc.attr("id", "forgot-submit"),
                        bdoc.attr("style", "cursor: pointer;"),
                        "Send reset link"
                    ),
                    bdoc.ele(
                        "mm-loading",
                        bdoc.attr("id", "forgot-loading"),
                        bdoc.attr("message", "Sending reset link..."),
                        bdoc.attr("hidden", ""),
                        bdoc.attr("style", "margin-left: 0.75rem;")
                    )
                ),
                bdoc.ele(
                    "p",
                    bdoc.class("auth-toggle"),
                    bdoc.ele(
                        "button",
                        bdoc.attr("type", "button"),
                        bdoc.class("link-button"),
                        bdoc.eventListener("click", () =>
                            this.dispatchEvent(
                                new CustomEvent("show-login", {
                                    bubbles: true,
                                    composed: true,
                                })
                            )
                        ),
                        "Back to sign in"
                    )
                )
            )
        );
    }

    #field(id, label, type, autocomplete) {
        return bdoc.ele(
            "p",
            bdoc.ele("label", bdoc.attr("for", id), label),
            " ",
            bdoc.ele(
                "input",
                bdoc.attr("type", type),
                bdoc.attr("name", id),
                bdoc.attr("id", id),
                bdoc.attr("autocomplete", autocomplete),
                bdoc.attr("required", "true")
            )
        );
    }

    async #requestReset(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const email = formData.get("email")?.toString().trim() ?? "";

        this.#setBusy(true);
        try {
            const response = await fetch(`${config.backEndUrl}/api/password-resets`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                this.#setMessage(await this.#errorMessage(response), true);
                return;
            }

            form.reset();
            this.#setMessage("If an account exists for that email, a reset link has been sent.");
        } catch {
            this.#setMessage("Could not reach the server.", true);
        } finally {
            this.#setBusy(false);
        }
    }

    #setBusy(isBusy) {
        this.shadowRoot.querySelector("form").setAttribute(
            "aria-busy",
            isBusy ? "true" : "false"
        );
        this.shadowRoot.getElementById("forgot-submit").disabled = isBusy;
        const loading = this.shadowRoot.getElementById("forgot-loading");
        if (isBusy) {
            loading.show();
        } else {
            loading.hide();
        }
    }

    #setMessage(message, isError = false) {
        const messageNode = this.shadowRoot.getElementById("forgot_msg");
        messageNode.textContent = message;
        messageNode.classList.toggle("error", isError);
        messageNode.style.color = isError ? "darkred" : "#5D9732";
        messageNode.style.visibility = "visible";
    }

    async #errorMessage(response) {
        try {
            const body = await response.json();
            return (
                body.message ||
                body.detail ||
                body.title ||
                body.error ||
                body.errors?.[0]?.detail ||
                body.errors?.[0]?.title ||
                "Password reset failed."
            );
        } catch {
            return "Password reset failed.";
        }
    }
}

customElements.define("mm-forgot-password-form", MmForgotPasswordForm);

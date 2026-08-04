import bdoc from "./bdoc.js";
import config from "/config.js";
import "./mm-loading.js";

class MmPasswordResetForm extends HTMLElement {
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
                bdoc.eventListener("submit", (event) => this.#resetPassword(event)),
                bdoc.ele("h2", "Reset Password"),
                bdoc.ele(
                    "div",
                    bdoc.attr("id", "reset_msg"),
                    bdoc.class("message"),
                    bdoc.attr("aria-live", "polite"),
                    bdoc.attr("style", "visibility: hidden;")
                ),
                this.#field("new-password", "New Password:", "password", "new-password"),
                this.#field("confirm-password", "Confirm Password:", "password", "new-password"),
                bdoc.ele(
                    "p",
                    bdoc.class("auth-form-actions"),
                    bdoc.ele(
                        "button",
                        bdoc.attr("type", "submit"),
                        bdoc.attr("id", "reset-submit"),
                        bdoc.attr("style", "cursor: pointer;"),
                        "Reset password"
                    ),
                    bdoc.ele(
                        "mm-loading",
                        bdoc.attr("id", "reset-loading"),
                        bdoc.attr("message", "Resetting password..."),
                        bdoc.attr("hidden", ""),
                        bdoc.attr("style", "margin-left: 0.75rem;")
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

    async #resetPassword(event) {
        event.preventDefault();
        const token = new URLSearchParams(window.location.search).get("token");
        if (!token) {
            this.#setMessage("Password reset token is missing.", true);
            return;
        }

        const form = event.target;
        const formData = new FormData(form);
        const newPassword = formData.get("new-password")?.toString() ?? "";
        const confirmPassword = formData.get("confirm-password")?.toString() ?? "";
        if (newPassword !== confirmPassword) {
            this.#setMessage("Passwords do not match.", true);
            return;
        }

        this.#setBusy(true);
        try {
            const response = await fetch(`${config.backEndUrl}/api/password-resets/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword }),
            });

            if (!response.ok) {
                this.#setMessage(await this.#errorMessage(response), true);
                return;
            }

            form.reset();
            this.#setMessage("Password reset. You can sign in now.");
            const messageNode = this.shadowRoot.getElementById("reset_msg");
            messageNode.append(" ", bdoc.ele("a", bdoc.attr("href", "/c/Login"), "Sign in"));
            this.shadowRoot.getElementById("reset-submit").disabled = true;
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
        const submit = this.shadowRoot.getElementById("reset-submit");
        if (isBusy) {
            submit.disabled = true;
            this.shadowRoot.getElementById("reset-loading").show();
        } else {
            this.shadowRoot.getElementById("reset-loading").hide();
            if (!this.shadowRoot.getElementById("reset_msg").querySelector("a")) {
                submit.disabled = false;
            }
        }
    }

    #setMessage(message, isError = false) {
        const messageNode = this.shadowRoot.getElementById("reset_msg");
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

customElements.define("mm-password-reset-form", MmPasswordResetForm);

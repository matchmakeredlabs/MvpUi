import bdoc from "./bdoc.js";
import config from "/config.js";
import "./mm-loading.js";

class MmAccountConfirmation extends HTMLElement {
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
                "section",
                bdoc.class("mmc_form auth-card"),
                bdoc.ele("h2", "Confirm Account"),
                bdoc.ele(
                    "mm-loading",
                    bdoc.attr("id", "confirm-loading"),
                    bdoc.attr("message", "Confirming account...")
                ),
                bdoc.ele(
                    "div",
                    bdoc.attr("id", "confirm_msg"),
                    bdoc.class("message"),
                    bdoc.attr("aria-live", "polite"),
                    bdoc.attr("hidden", "")
                )
            )
        );
        this.#confirm();
    }

    async #confirm() {
        const token = new URLSearchParams(window.location.search).get("token");
        if (!token) {
            this.#setMessage("Confirmation token is missing.", true);
            return;
        }

        let response;
        try {
            response = await fetch(`${config.backEndUrl}/api/account-registrations/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });
        } catch {
            this.#setMessage("Could not reach the server.", true);
            return;
        }

        if (!response.ok) {
            this.#setMessage(await this.#errorMessage(response), true);
            return;
        }

        const body = await response.json();
        this.#setMessage("Account confirmed. You can sign in now.");
        const messageNode = this.shadowRoot.getElementById("confirm_msg");
        messageNode.append(
            " ",
            bdoc.ele(
                "a",
                bdoc.attr("href", `/c/Login?username=${encodeURIComponent(body.userId ?? "")}`),
                "Sign in"
            )
        );
    }

    #setMessage(message, isError = false) {
        this.shadowRoot.getElementById("confirm-loading").hide();
        const messageNode = this.shadowRoot.getElementById("confirm_msg");
        messageNode.textContent = message;
        messageNode.style.color = isError ? "darkred" : "#5D9732";
        messageNode.hidden = false;
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
                "Account confirmation failed."
            );
        } catch {
            return "Account confirmation failed.";
        }
    }
}

customElements.define("mm-account-confirmation", MmAccountConfirmation);

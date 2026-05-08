import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import config from "/config.js";

class MmAccountSettings extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        const userId = MmAccountSettings.session.getCachedUserID();

        bdoc.append(
            this.shadowRoot,
            bdoc.ele(
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/styles.css")
            ),
            bdoc.ele(
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/mm-form.css")
            ),
            bdoc.ele(
                "section",
                bdoc.class("account-settings"),
                bdoc.ele("h2", "Account Settings"),
                bdoc.ele(
                    "p",
                    bdoc.class("account-user"),
                    userId ? `Signed in as ${userId}` : ""
                ),
                bdoc.ele(
                    "form",
                    bdoc.attr("id", "change-password"),
                    bdoc.class("form"),
                    bdoc.eventListener("submit", (event) =>
                        this.#changePassword(event)
                    ),
                    bdoc.ele(
                        "div",
                        bdoc.class("form-groups-container"),
                        this.#passwordField("current-password", "Current Password"),
                        this.#passwordField("new-password", "New Password"),
                        this.#passwordField(
                            "confirm-password",
                            "Confirm New Password"
                        )
                    ),
                    bdoc.ele(
                        "div",
                        bdoc.class("form-end"),
                        bdoc.ele(
                            "button",
                            bdoc.attr("type", "submit"),
                            "Change Password"
                        )
                    ),
                    bdoc.ele("div", bdoc.attr("id", "message"), bdoc.class("message"))
                )
            )
        );
    }

    #passwordField(id, label) {
        return bdoc.ele(
            "div",
            bdoc.class("form-group"),
            bdoc.ele(
                "label",
                bdoc.attr("for", id),
                label,
                bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
            ),
            bdoc.ele(
                "input",
                bdoc.attr("type", "password"),
                bdoc.attr("id", id),
                bdoc.attr("name", id),
                bdoc.attr("autocomplete", id === "current-password" ? "current-password" : "new-password"),
                bdoc.attr("required", "true")
            )
        );
    }

    async #changePassword(event) {
        event.preventDefault();

        const userId = MmAccountSettings.session.getCachedUserID();
        if (!userId) {
            this.#setMessage("Could not determine the signed-in user.", true);
            return;
        }

        const form = event.target;
        const formData = new FormData(form);
        const currentPassword = formData.get("current-password")?.toString() ?? "";
        const newPassword = formData.get("new-password")?.toString() ?? "";
        const confirmPassword = formData.get("confirm-password")?.toString() ?? "";

        if (newPassword !== confirmPassword) {
            this.#setMessage("New passwords do not match.", true);
            return;
        }

        let response;
        try {
            response = await MmAccountSettings.session.fetch(
                `/api/users/${encodeURIComponent(userId)}/change-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        currentPassword,
                        newPassword,
                    }),
                }
            );
        } catch {
            this.#setMessage("Could not reach the server.", true);
            return;
        }

        if (!response.ok) {
            this.#setMessage(await this.#errorMessage(response), true);
            return;
        }

        form.reset();
        this.#setMessage("Password changed.");
    }

    #setMessage(message, isError = false) {
        const messageNode = this.shadowRoot.getElementById("message");
        messageNode.textContent = message;
        messageNode.classList.toggle("error", isError);
    }

    async #errorMessage(response) {
        try {
            const body = await response.json();
            return body.message || body.detail || body.title || "Password change failed.";
        } catch {
            return "Password change failed.";
        }
    }
}

customElements.define("mm-account-settings", MmAccountSettings);

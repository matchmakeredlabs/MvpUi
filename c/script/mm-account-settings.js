import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import config from "/config.js";
import { enablePasswordVisibility } from "./mm-password-visibility.js";
import "./mm-loading.js";

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
                    bdoc.attr("id", "change-full-name"),
                    bdoc.class("form"),
                    bdoc.eventListener("submit", (event) =>
                        this.#changeFullName(event)
                    ),
                    bdoc.ele("h3", "Profile"),
                    bdoc.ele(
                        "div",
                        bdoc.class("form-groups-container"),
                        bdoc.ele(
                            "div",
                            bdoc.class("form-group"),
                            bdoc.ele(
                                "label",
                                bdoc.attr("for", "full-name"),
                                "Full Name",
                                bdoc.ele(
                                    "span",
                                    bdoc.class("mmc_form_required"),
                                    " *"
                                )
                            ),
                            bdoc.ele(
                                "input",
                                bdoc.attr("type", "text"),
                                bdoc.attr("id", "full-name"),
                                bdoc.attr("name", "full-name"),
                                bdoc.attr("autocomplete", "name"),
                                bdoc.attr("required", "true"),
                                bdoc.attr("disabled", "")
                            )
                        )
                    ),
                    bdoc.ele(
                        "div",
                        bdoc.class("form-end"),
                        bdoc.ele(
                            "button",
                            bdoc.attr("type", "submit"),
                            bdoc.attr("id", "full-name-submit"),
                            bdoc.attr("disabled", ""),
                            "Change Full Name"
                        ),
                        bdoc.ele(
                            "mm-loading",
                            bdoc.attr("id", "full-name-loading"),
                            bdoc.attr("message", "Loading profile..."),
                            bdoc.attr("style", "margin-left: 0.75rem;")
                        )
                    ),
                    bdoc.ele(
                        "div",
                        bdoc.attr("id", "full-name-message"),
                        bdoc.class("message"),
                        bdoc.attr("aria-live", "polite")
                    )
                ),

                bdoc.ele("p"),
                bdoc.ele("h3", "Password"),
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
                    bdoc.ele(
                        "div",
                        bdoc.attr("id", "password-message"),
                        bdoc.class("message"),
                        bdoc.attr("aria-live", "polite")
                    )
                )
            )
        );

        enablePasswordVisibility(this.shadowRoot);
        this.#loadFullName(userId);
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
            this.#setMessage(
                "password-message",
                "Could not determine the signed-in user.",
                true
            );
            return;
        }

        const form = event.target;
        const formData = new FormData(form);
        const currentPassword = formData.get("current-password")?.toString() ?? "";
        const newPassword = formData.get("new-password")?.toString() ?? "";
        const confirmPassword = formData.get("confirm-password")?.toString() ?? "";

        if (newPassword !== confirmPassword) {
            this.#setMessage(
                "password-message",
                "New passwords do not match.",
                true
            );
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
            this.#setMessage(
                "password-message",
                "Could not reach the server.",
                true
            );
            return;
        }

        if (!response.ok) {
            this.#setMessage(
                "password-message",
                await this.#errorMessage(response, "Password change failed."),
                true
            );
            return;
        }

        form.reset();
        this.#setMessage("password-message", "Password changed.");
    }

    async #loadFullName(userId) {
        if (!userId) {
            this.#setFullNameBusy(false);
            this.#setMessage(
                "full-name-message",
                "Could not determine the signed-in user.",
                true
            );
            return;
        }

        try {
            const response = await MmAccountSettings.session.fetch(
                `/api/users/${encodeURIComponent(userId)}`
            );
            if (!response.ok) {
                this.#setMessage(
                    "full-name-message",
                    await this.#errorMessage(
                        response,
                        "Could not load the current full name."
                    ),
                    true
                );
                return;
            }

            const user = await response.json();
            this.shadowRoot.getElementById("full-name").value =
                user.fullName || "";
        } catch {
            this.#setMessage(
                "full-name-message",
                "Could not reach the server.",
                true
            );
        } finally {
            this.#setFullNameBusy(false);
        }
    }

    async #changeFullName(event) {
        event.preventDefault();

        const userId = MmAccountSettings.session.getCachedUserID();
        if (!userId) {
            this.#setMessage(
                "full-name-message",
                "Could not determine the signed-in user.",
                true
            );
            return;
        }

        const formData = new FormData(event.target);
        const fullName =
            formData.get("full-name")?.toString().trim() ?? "";
        this.#setFullNameBusy(true, "Saving full name...");

        try {
            const response = await MmAccountSettings.session.fetch(
                `/api/users/${encodeURIComponent(userId)}/change-full-name`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ fullName }),
                }
            );

            if (!response.ok) {
                this.#setMessage(
                    "full-name-message",
                    await this.#errorMessage(
                        response,
                        "Full name change failed."
                    ),
                    true
                );
                return;
            }

            const body = await response.json();
            this.shadowRoot.getElementById("full-name").value =
                body.fullName || fullName;
            this.#setMessage("full-name-message", "Full name changed.");
        } catch {
            this.#setMessage(
                "full-name-message",
                "Could not reach the server.",
                true
            );
        } finally {
            this.#setFullNameBusy(false);
        }
    }

    #setFullNameBusy(isBusy, message = "Loading profile...") {
        this.shadowRoot.getElementById("full-name").disabled = isBusy;
        this.shadowRoot.getElementById("full-name-submit").disabled = isBusy;
        const loading = this.shadowRoot.getElementById("full-name-loading");
        if (isBusy) {
            loading.show(message);
        } else {
            loading.hide();
        }
    }

    #setMessage(elementId, message, isError = false) {
        const messageNode = this.shadowRoot.getElementById(elementId);
        messageNode.textContent = message;
        messageNode.classList.toggle("error", isError);
    }

    async #errorMessage(response, fallback) {
        try {
            const body = await response.json();
            return body.message || body.detail || body.title || fallback;
        } catch {
            return fallback;
        }
    }
}

customElements.define("mm-account-settings", MmAccountSettings);

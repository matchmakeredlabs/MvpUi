import bdoc from "./bdoc.js";
import config from "/config.js";

class MmSelfRegisterForm extends HTMLElement {
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
                bdoc.eventListener("submit", (event) => this.#register(event)),
                bdoc.ele("h2", "Create Account"),
                bdoc.ele(
                    "div",
                    bdoc.attr("id", "register_msg"),
                    bdoc.class("message"),
                    bdoc.attr("aria-live", "polite"),
                    bdoc.attr("style", "visibility: hidden;")
                ),
                this.#field("email", "Email:", "email", "email"),
                this.#field(
                    "new-password",
                    "New Password:",
                    "password",
                    "new-password"
                ),
                this.#field(
                    "confirm-password",
                    "Confirm Password:",
                    "password",
                    "new-password"
                ),
                bdoc.ele(
                    "p",
                    bdoc.class("auth-form-actions"),
                    bdoc.ele(
                        "button",
                        bdoc.attr("type", "submit"),
                        bdoc.attr("style", "cursor: pointer;"),
                        "Create account"
                    )
                ),
                bdoc.ele(
                    "p",
                    bdoc.class("auth-toggle"),
                    "Already have an account? ",
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
                        "Sign in"
                    )
                )
            )
        );
    }

    #field(id, label, type, autocomplete) {
        return bdoc.ele(
            "p",
            bdoc.ele(
                "label",
                bdoc.attr("for", id),
                label
            ),
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

    async #register(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);
        const email = formData.get("email")?.toString().trim() ?? "";
        const password = formData.get("new-password")?.toString() ?? "";
        const confirmPassword =
            formData.get("confirm-password")?.toString() ?? "";

        if (password !== confirmPassword) {
            this.#setMessage("Passwords do not match.", true);
            return;
        }

        let response;
        try {
            response = await fetch(`${config.backEndUrl}/api/users`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: email,
                    password,
                    fullName: email,
                }),
            });
        } catch {
            this.#setMessage("Could not reach the server.", true);
            return;
        }

        if (!response.ok) {
            this.#setMessage(await this.#errorMessage(response), true);
            return;
        }

        form.reset();
        this.#setMessage("Account created. You can sign in now.");
        this.dispatchEvent(
            new CustomEvent("registered", {
                bubbles: true,
                composed: true,
                detail: { email },
            })
        );
    }

    #setMessage(message, isError = false) {
        const messageNode = this.shadowRoot.getElementById("register_msg");
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
                body.log?.[0]?.message ||
                "Registration failed."
            );
        } catch {
            return "Registration failed.";
        }
    }
}

customElements.define("mm-self-register-form", MmSelfRegisterForm);

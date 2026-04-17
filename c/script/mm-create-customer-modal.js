import bdoc from "./bdoc.js";

class MmCreateCustomerModal extends HTMLElement {
    onSuccess = () => {};

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    handleError = async (response) => {
        try {
            const body = await response.json();

            if (body.log?.[0]?.message) {
                alert(body.log[0].message);
            } else if (body.error) {
                alert(body.error);
            } else {
                alert("An error occurred");
            }
        } catch {
            alert("An error occurred");
        }
    };

    show = () => {
        customElements.whenDefined("mm-modal").then(() => {
            this.shadowRoot.querySelector("mm-modal").show();
        });
    };

    hide = () => {
        customElements.whenDefined("mm-modal").then(() => {
            this.shadowRoot.querySelector("mm-modal").hide();
        });
    };

    connectedCallback() {
        bdoc.append(
            this.shadowRoot,
            bdoc.ele(
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/styles.css")
            ),
            bdoc.ele(
                "style",
                `
                .header-button {
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    cursor: pointer;
                    border-radius: 4px;
                    text-wrap: nowrap;
                    width: min-content;
                    margin-top: 1em;
                }

                .header-button.add-entity-button {
                    background-color: #5D9732;
                }

                .header-button.add-entity-button:hover {
                    background-color: #497528;
                }

                .header-button.add-entity-button2 {
                    background-color: #D18316;
                }

                .header-button.add-entity-button2:hover {
                    background-color: #905a0f;
                }

                .header-button.cancel-button {
                    background-color: #D32F2F;
                }

                .header-button.cancel-button:hover {
                    background-color: #B71C1C;
                }

                .form-end {
                    display: flex;
                    flex-direction: column;
                    gap: 1em;
                }

                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1em;
                }

                mm-create-customer-form {
                    padding: 1em;
                    padding-bottom: 0;
                }
                `
            ),
            bdoc.ele("mm-modal"),
            bdoc.script("mm-modal.js"),
            bdoc.script("mm-create-customer-form.js")
        );

        Promise.all([
            customElements.whenDefined("mm-modal"),
            customElements.whenDefined("mm-create-customer-form"),
        ]).then(() => {
            const modal = this.shadowRoot.querySelector("mm-modal");

            const onSettled = (onSuccess) => async (variables, response) => {
                if (!response) return;
                if (response.status !== 200) {
                    this.handleError(response);
                    return;
                }

                onSuccess(variables, await response.json());
            };

            const form = bdoc.ele(
                "mm-create-customer-form",
                bdoc.ele(
                    "div",
                    bdoc.class("form-end"),
                    bdoc.ele(
                        "div",
                        bdoc.class("modal-footer"),
                        bdoc.ele(
                            "button",
                            bdoc.class("header-button cancel-button"),
                            "Cancel",
                            bdoc.eventListener("click", () => modal.hide())
                        ),
                        bdoc.ele(
                            "button",
                            bdoc.class("header-button add-entity-button2"),
                            "Create Customer",
                            bdoc.eventListener("click", () => {
                                form.onSettled = onSettled(
                                    async (variables, response) => {
                                        this.onSuccess(variables, response);
                                        modal.hide();
                                    }
                                );
                                form.submit();
                            })
                        ),
                        bdoc.ele(
                            "button",
                            bdoc.class("header-button add-entity-button"),
                            "Create and View",
                            bdoc.eventListener("click", () => {
                                form.onSettled = onSettled(
                                    async (variables, response) => {
                                        this.onSuccess(variables, response);
                                        window.location.href = `/c/Customer?id=${response.id}`;
                                    }
                                );
                                form.submit();
                            })
                        )
                    ),
                    bdoc.attr("slot", "form-footer")
                )
            );

            bdoc.append(
                modal,
                bdoc.ele(
                    "h2",
                    "Create Customer",
                    bdoc.attr("style", "margin-left: 18px;")
                ),
                form
            );
        });
    }
}

customElements.define("mm-create-customer-modal", MmCreateCustomerModal);

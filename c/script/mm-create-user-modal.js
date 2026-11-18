import { showApiError, readJsonResponse } from "./api-errors.js";
import bdoc from "./bdoc.js";

class MmCreateUserModal extends HTMLElement {
    onSuccess = () => {};

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    handleError = async (error) => { await showApiError(error); };

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
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/mm-create-project-modal.css")
            ),
            bdoc.ele("mm-modal"),
            bdoc.script("mm-modal.js"),
            bdoc.script("mm-create-user-form.js")
        );

        Promise.all([
            customElements.whenDefined("mm-modal"),
            customElements.whenDefined("mm-create-user-form"),
        ]).then(() => {
            const createUserModal = this.shadowRoot.querySelector("mm-modal");

            const createUserForm = bdoc.ele(
                "mm-create-user-form",
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
                            bdoc.eventListener("click", () => {
                                createUserModal.hide();
                            })
                        ),
                        bdoc.ele(
                            "button",
                            bdoc.class("header-button add-entity-button2"),
                            "Create User",
                            bdoc.eventListener("click", () => {
                                createUserForm.submit();
                            })
                        )
                    ),
                    bdoc.attr("slot", "form-footer")
                )
            );

            createUserForm.onSettled = async (variables, response) => {
                if (response) {
                    if (response.status !== 200) {
                        this.handleError(response);
                        return;
                    }

                    this.onSuccess(variables, await readJsonResponse(response));
                    createUserModal.hide();
                }
            };

            bdoc.append(
                createUserModal,
                bdoc.ele(
                    "h2",
                    "Create User",
                    bdoc.attr("style", "margin: 0 0 12px 0;")
                ),
                createUserForm
            );
        });
    }
}
customElements.define("mm-create-user-modal", MmCreateUserModal);

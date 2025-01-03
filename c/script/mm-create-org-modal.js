import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

class MmCreateOrgModal extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    onSuccess = () => {};

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    handleError = async (response) => {
        try {
            const body = await response.json();

            if (body.log) {
                alert(body.log[0].message);
            } else if (body.error) {
                alert(body.error);
            } else {
                alert("An error occurred");
            }
        } catch (e) {
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
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/mm-create-org-modal.css")
            ),

            bdoc.ele("mm-modal"),

            bdoc.script("mm-modal.js"),
            bdoc.script("mm-create-org-form.js")
        );

        Promise.all([
            customElements.whenDefined("mm-modal"),
            customElements.whenDefined("mm-create-org-form"),
        ]).then(() => {
            const createGroupModal = this.shadowRoot.querySelector("mm-modal");

            const onSettled = (onSuccess) => async (variables, response) => {
                if (response) {
                    if (response.status !== 200) {
                        this.handleError(response);
                        return;
                    }

                    onSuccess(variables, await response.json());
                }
            };

            const createGroupForm = bdoc.ele(
                "mm-create-org-form",
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
                                createGroupModal.hide();
                            })
                        ),
                        bdoc.ele(
                            "button",
                            bdoc.class("header-button add-entity-button2"),
                            "Create Org and Go to Org",
                            bdoc.eventListener("click", () => {
                                createGroupForm.onSettled = onSettled(
                                    async (variables, response, addedGroup) => {
                                        this.onSuccess(
                                            variables,
                                            response,
                                            addedGroup
                                        );

                                        window.location.href = `/c/Organization/${response.id}`;
                                    }
                                );
                                createGroupForm.submit();
                            })
                        ),
                        bdoc.ele(
                            "button",
                            bdoc.class("header-button add-entity-button"),
                            "Create Org and Return",
                            bdoc.eventListener("click", () => {
                                createGroupForm.onSettled = onSettled(
                                    async (variables, response, addedGroup) => {
                                        this.onSuccess(
                                            variables,
                                            response,
                                            addedGroup
                                        );
                                        createGroupModal.hide();
                                    }
                                );
                                createGroupForm.submit();
                            })
                        )
                    ),
                    bdoc.attr("slot", "form-footer")
                )
            );

            bdoc.append(
                createGroupModal,

                bdoc.ele(
                    "h2",
                    "Create Organization",
                    bdoc.attr("style", "margin-left: 18px;")
                ),
                createGroupForm
            );
        });
    }
}
customElements.define("mm-create-org-modal", MmCreateOrgModal);

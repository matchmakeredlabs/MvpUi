import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

class MmCreateElementModal extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    static observedAttributes = ["parent-element"];

    #parentElementJSON;

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "parent-element") {
            this.#parentElementJSON = newValue;
            const createElementForm = this.shadowRoot.querySelector(
                "mm-create-element-form"
            );
            if (createElementForm) {
                bdoc.append(
                    createElementForm,
                    bdoc.attr("parent-element", newValue)
                );
            }
        }
    }

    onSuccess = () => {};

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    handleError = async (response) => {
        let message = `Request failed: ${response.status} ${response.statusText}`;

        try {
            const responseText = await response.text();
            if (responseText) {
                try {
                    const body = JSON.parse(responseText);

                    message =
                        body.log?.[0]?.message ??
                        body.error ??
                        body.message ??
                        body.ExceptionMessage ??
                        body.exceptionMessage ??
                        body.title ??
                        message;
                } catch {
                    message = responseText;
                }
            }
        } catch {}

        alert(message);
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
                bdoc.attr("href", "/c/res/mm-create-collection-modal.css")
            ),

            bdoc.ele("mm-modal"),

            bdoc.script("mm-modal.js"),
            bdoc.script("mm-create-element-form.js")
        );

        Promise.all([
            customElements.whenDefined("mm-modal"),
            customElements.whenDefined("mm-create-element-form"),
        ]).then(() => {
            const createCollectionModal =
                this.shadowRoot.querySelector("mm-modal");

            const onSettled = (onSuccess) => async (variables, response) => {
                if (response) {
                    if (response.status !== 200) {
                        this.handleError(response);
                        return;
                    }

                    onSuccess(variables, await response.json());
                }
            };

            const createElementForm = bdoc.ele(
                "mm-create-element-form",
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
                                createCollectionModal.hide();
                            })
                        ),
                        bdoc.ele(
                            "button",
                            bdoc.class("header-button add-entity-button"),
                            "Create Element",
                            bdoc.eventListener("click", () => {
                                createElementForm.onSettled = onSettled(
                                    async (variables, response) => {
                                        this.onSuccess(variables, response);
                                        createCollectionModal.hide();
                                    }
                                );
                                createElementForm.submit();
                            })
                        )
                    ),
                    bdoc.attr("slot", "form-footer")
                )
            );

            bdoc.append(
                createCollectionModal,

                bdoc.ele(
                    "h2",
                    "Create Element",
                    bdoc.attr("style", "margin-left: 18px;")
                ),
                createElementForm
            );
        });
    }
}
customElements.define("mm-create-element-modal", MmCreateElementModal);

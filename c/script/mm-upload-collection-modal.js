import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

class MmUploadCollectionModal extends HTMLElement {
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
                bdoc.attr("href", "/c/res/mm-create-collection-modal.css")
            ),

            bdoc.ele("mm-modal"),

            bdoc.script("mm-modal.js"),
            bdoc.script("mm-upload-collection-form.js")
        );

        Promise.all([
            customElements.whenDefined("mm-modal"),
            customElements.whenDefined("mm-upload-collection-form"),
        ]).then(() => {
            const uploadCollectionModal =
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

            const uploadCollectionForm = bdoc.ele(
                "mm-upload-collection-form",
                bdoc.ele(
                    "div",

                    bdoc.class("form-end"),

                    bdoc.ele(
                        "div",
                        bdoc.class("modal-footer"),

                        bdoc.ele(
                            "button",
                            bdoc.attr("type", "button"),
                            bdoc.class("header-button cancel-button"),
                            "Cancel",
                            bdoc.eventListener("click", () => {
                                uploadCollectionModal.hide();
                            })
                        ),
                        bdoc.ele(
                            "button",
                            bdoc.attr("type", "button"),
                            bdoc.class("header-button add-entity-button2"),
                            "Import Collection",
                            bdoc.eventListener("click", () => {
                                uploadCollectionForm.onSettled = onSettled(
                                    async (variables, response, addedGroup) => {
                                        this.onSuccess(
                                            variables,
                                            response,
                                            addedGroup
                                        );
                                        uploadCollectionModal.hide();
                                    }
                                );
                                uploadCollectionForm.submit();
                            })
                        ),
                        bdoc.ele(
                            "button",
                            bdoc.attr("type", "button"),
                            bdoc.class("header-button add-entity-button"),
                            "Import and Edit Collection",
                            bdoc.eventListener("click", () => {
                                uploadCollectionForm.onSettled = onSettled(
                                    async (variables, response, addedGroup) => {
                                        this.onSuccess(
                                            variables,
                                            response,
                                            addedGroup
                                        );

                                        window.location.href = `/c/EditCollection?id=${response.descriptors[0].id}`;
                                    }
                                );
                                uploadCollectionForm.submit();
                            })
                        )
                    ),
                    bdoc.attr("slot", "form-footer")
                )
            );

            bdoc.append(
                uploadCollectionModal,

                bdoc.ele(
                    "h2",
                    "Import Collection",
                    bdoc.attr("style", "margin-left: 18px;")
                ),
                uploadCollectionForm
            );
        });
    }
}
customElements.define("mm-upload-collection-modal", MmUploadCollectionModal);

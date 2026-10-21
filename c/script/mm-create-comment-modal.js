import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

class MmCreateCommentModal extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    static observedAttributes = ["parent-element"];

    #parentElementJSON;

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "parent-element") {
            this.#parentElementJSON = newValue;
            const createCommentForm = this.shadowRoot.querySelector(
                "mm-create-comment-form"
            );
            if (createCommentForm) {
                bdoc.append(
                    createCommentForm,
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
        try {
            const body = await response.json();

            if (body.log) {
                alert(body.log[0].message);
            } else if (body.error) {
                alert(body.error);
            } else if (body.message) {
                alert(body.message);
            } else if (body.ExceptionMessage) {
                alert(body.ExceptionMessage);
            } else {
                alert("An error occurred");
            }
        } catch (e) {
            alert("An error occurred");
        }
    };

    show = () => {
        Promise.all([
            customElements.whenDefined("mm-modal"),
            customElements.whenDefined("mm-create-comment-form"),
        ]).then(() => {
            const createCommentForm = this.shadowRoot.querySelector(
                "mm-create-comment-form"
            );
            this.setCommentFormValues(createCommentForm);
            this.shadowRoot.querySelector("mm-modal").show();
        });
    };

    hide = () => {
        customElements.whenDefined("mm-modal").then(() => {
            this.shadowRoot.querySelector("mm-modal").hide();
        });
    };

    setCommentFormValues = (commentForm) => {};

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
            bdoc.script("mm-create-comment-form.js")
        );

        Promise.all([
            customElements.whenDefined("mm-modal"),
            customElements.whenDefined("mm-create-comment-form"),
        ]).then(() => {
            const commentModal = this.shadowRoot.querySelector("mm-modal");

            const onSettled = (onSuccess) => async (variables, response) => {
                if (response) {
                    if (response.status !== 200) {
                        this.handleError(response);
                        return;
                    }

                    onSuccess(variables, await response.json());
                }
            };

            const createCommentForm = bdoc.ele(
                "mm-create-comment-form",
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
                                commentModal.hide();
                            })
                        ),
                        bdoc.ele(
                            "button",
                            bdoc.class("header-button add-entity-button"),
                            "Add Comment",
                            bdoc.eventListener("click", () => {
                                createCommentForm.onSettled = onSettled(
                                    async (variables, response) => {
                                        this.onSuccess(variables, response);
                                        commentModal.hide();
                                    }
                                );
                                createCommentForm.submit();
                            })
                        )
                    ),
                    bdoc.attr("slot", "form-footer")
                )
            );

            bdoc.append(
                commentModal,

                bdoc.ele(
                    "h2",
                    "Comment on Palet",
                    bdoc.attr("style", "margin-left: 18px;")
                ),
                createCommentForm
            );
        });
    }
}
customElements.define("mm-create-comment-modal", MmCreateCommentModal);

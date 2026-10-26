import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

class MmCreateProjectModal extends HTMLElement {
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
                bdoc.attr("href", "/c/res/mm-create-project-modal.css")
            ),

            bdoc.ele("mm-modal"),

            bdoc.script("mm-modal.js"),
            bdoc.script("mm-create-project-form.js")
        );

        Promise.all([
            customElements.whenDefined("mm-modal"),
            customElements.whenDefined("mm-create-project-form"),
        ]).then(() => {
            const createProjectModal = this.shadowRoot.querySelector("mm-modal");

            const onSettled = (onSuccess) => async (variables, response) => {
                if (response) {
                    if (response.status !== 200) {
                        this.handleError(response);
                        return;
                    }

                    onSuccess(variables, await response.json());
                }
            };

            const createProjectForm = bdoc.ele(
                "mm-create-project-form",
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
                                createProjectModal.hide();
                            })
                        ),

                        bdoc.ele(
                            "button",
                            bdoc.class("header-button add-entity-button2"),
                            "Create Project",
                            bdoc.eventListener("click", () => {
                                createProjectForm.onSettled = onSettled(
                                    async (variables, response, addedGroup) => {
                                        this.onSuccess(
                                            variables,
                                            response,
                                            addedGroup
                                        );
                                        createProjectModal.hide();
                                    }
                                );
                                createProjectForm.submit();
                            })
                        ),
                        bdoc.ele(
                            "button",
                            bdoc.class("header-button add-entity-button"),
                            "Create and View Project",
                            bdoc.eventListener("click", () => {
                                createProjectForm.onSettled = onSettled(
                                    async (variables, response, addedGroup) => {
                                        this.onSuccess(
                                            variables,
                                            response,
                                            addedGroup
                                        );

                                        window.location.href = `/c/Project?id=${response.id}`;
                                    }
                                );
                                createProjectForm.submit();
                            })
                        )
                    ),
                    bdoc.attr("slot", "form-footer")
                )
            );

            bdoc.append(
                createProjectModal,

                bdoc.ele(
                    "h2",
                    "Create Project",
                    bdoc.attr("style", "margin-left: 18px;")
                ),
                createProjectForm
            );
        });
    }
}
customElements.define("mm-create-project-modal", MmCreateProjectModal);

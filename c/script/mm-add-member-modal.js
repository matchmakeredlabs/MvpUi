import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

class MmAddMemberModal extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    static observedAttributes = [
        "parent-id",
        "parent-type",
        "member-type",
        "allowed-roles",
    ];

    #parentId;
    #parentType;
    #memberType;
    #allowedRoles;

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "parent-id") {
            this.#parentId = newValue;
        } else if (name === "parent-type") {
            this.#parentType = newValue;
        } else if (name === "member-type") {
            this.#memberType = newValue;
        } else if (name === "allowed-roles") {
            this.#allowedRoles = newValue;
        }
    }

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

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

    onSuccess = () => {};

    handleError = async (response) => {
        const body = await response.json();
        if (body.error) alert(body.error);
        if (body.log) alert(body.log[0].message);
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
                bdoc.attr("href", "/c/res/mm-create-group-modal.css")
            ),

            bdoc.ele("mm-modal"),

            bdoc.script("mm-modal.js"),
            bdoc.script("mm-add-member-form.js")
        );

        Promise.all([
            customElements.whenDefined("mm-modal"),
            customElements.whenDefined("mm-add-member-form"),
        ]).then(() => {
            const addMemberModal = this.shadowRoot.querySelector("mm-modal");

            const onSettled = (variables, response) => {
                if (response) {
                    if (response.status !== 200) {
                        this.handleError(response);
                        return;
                    }
                    this.onSuccess(variables, response);
                }
            };

            const memberText = {
                user: "User",
                group: "Group",
            };

            const addMemberForm = bdoc.ele(
                "mm-add-member-form",
                bdoc.attr("parent-id", this.#parentId),
                bdoc.attr("parent-type", this.#parentType),
                bdoc.attr("member-type", this.#memberType),
                this.#allowedRoles
                    ? bdoc.attr("allowed-roles", this.#allowedRoles)
                    : null,
                bdoc.ele(
                    "div",
                    bdoc.class("modal-footer"),
                    bdoc.attr("slot", "form-footer"),
                    bdoc.ele(
                        "button",
                        bdoc.class("header-button cancel-button"),
                        "Cancel",
                        bdoc.eventListener("click", () => {
                            addMemberModal.hide();
                        })
                    ),
                    bdoc.ele(
                        "button",
                        bdoc.class("header-button add-entity-button"),
                        `Add ${memberText[this.#memberType]}`,
                        bdoc.eventListener("click", () => {
                            addMemberForm.submit();
                        })
                    )
                )
            );

            bdoc.append(
                addMemberModal,

                bdoc.ele(
                    "h2",
                    `Add ${memberText[this.#memberType]}`,
                    bdoc.attr("style", "margin-left: 18px;")
                ),
                addMemberForm
            );

            console.log(addMemberModal);

            addMemberForm.onSettled = onSettled;
        });
    }
}
customElements.define("mm-add-member-modal", MmAddMemberModal);

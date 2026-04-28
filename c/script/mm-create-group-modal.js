import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";
import MmAddMemberForm from "./mm-add-member-form.js";

class MmCreateGroupModal extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    static observedAttributes = [
        "org-id",
        "owner-id",
        "owner-type",
        "parent-id",
        "parent-type",
        "add-self",
    ];

    #orgId;
    #ownerId;
    #ownerType;
    #parentId;
    #parentType;
    #addSelf;

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "org-id") {
            this.#orgId = newValue;
        } else if (name === "owner-id") {
            this.#ownerId = newValue;
        } else if (name === "owner-type") {
            this.#ownerType = newValue;
        } else if (name === "parent-id") {
            this.#parentId = newValue;
        } else if (name === "parent-type") {
            this.#parentType = newValue;
        } else if (name === "add-self") {
            this.#addSelf = true;
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
                bdoc.attr("href", "/c/res/mm-create-group-modal.css")
            ),

            bdoc.ele("mm-modal"),

            bdoc.script("mm-modal.js"),
            bdoc.script("mm-create-group-form.js")
        );

        Promise.all([
            customElements.whenDefined("mm-modal"),
            customElements.whenDefined("mm-create-group-form"),
        ]).then(() => {
            const createGroupModal = this.shadowRoot.querySelector("mm-modal");

            const onSettled = (onSuccess) => async (variables, response) => {
                if (response) {
                    if (response.status !== 200) {
                        this.handleError(response);
                        return;
                    }

                    if (this.#parentId && this.#parentType) {
                        if (
                            this.shadowRoot.getElementById(
                                "add-to-parent-checkbox"
                            ).checked &&
                            (this.#parentType !== "org" ||
                                createGroupForm
                                    .getInnerForm()
                                    .querySelector("#owner").value !==
                                    this.#orgId)
                        ) {
                            const body = await response.json();
                            const newVariables = {
                                id: body.id,
                            };
                            if (this.#parentType === "org") {
                                newVariables.role =
                                    this.shadowRoot.getElementById(
                                        "role-select"
                                    ).value;
                            }
                            const newResponse =
                                await MmAddMemberForm.addMemberToEntity(
                                    this.#parentId,
                                    newVariables,
                                    "group",
                                    this.#parentType
                                );
                            if (newResponse.status !== 200) {
                                this.handleError(newResponse);
                                return;
                            }

                            onSuccess(newVariables, body, true);
                            return;
                        }
                    }

                    if (
                        this.#parentType === "org" &&
                        createGroupForm
                            .getInnerForm()
                            .querySelector("#owner").value ===
                            this.#orgId
                    ) {
                        const body = await response.json();
                        onSuccess(
                            {
                                ...variables,
                                role: createGroupForm
                                    .getInnerForm()
                                    .querySelector("#role").value,
                                id: body.id,
                            },
                            body,
                            true
                        );
                    } else {
                        onSuccess(variables, await response.json(), false);
                    }
                }
            };

            const parameters = {
                org: {
                    fullText: "organization",
                },
                group: {
                    fullText: "group",
                },
            };

            const displayId =
                this.#parentId &&
                (this.#parentType === "group"
                    ? this.#parentId.split(":")[1]
                    : this.#parentId);

            const addToParentCheckbox = this.#parentType
                ? bdoc.ele(
                      "div",
                      bdoc.class("checkbox-group"),
                      bdoc.ele(
                          "input",
                          bdoc.attr("type", "checkbox"),
                          bdoc.attr("id", "add-to-parent-checkbox")
                      ),
                      `Add as member of current ${
                          parameters[this.#parentType].fullText
                      } ${displayId}`,
                      this.#parentType === "org"
                          ? bdoc.eventListener("change", ({ target }) => {
                                if (target.checked) {
                                    bdoc.append(
                                        this.shadowRoot.getElementById(
                                            "add-to-parent"
                                        ),
                                        bdoc.ele(
                                            "div",
                                            bdoc.class("select-group"),
                                            bdoc.id("role-select-group"),
                                            "Role (Current Organization)",
                                            bdoc.ele(
                                                "select",
                                                bdoc.attr("id", "role-select"),
                                                bdoc.attr("name", "role"),
                                                ...MmAddMemberForm.roles.map(
                                                    (role) =>
                                                        bdoc.ele(
                                                            "option",
                                                            bdoc.attr(
                                                                "value",
                                                                role
                                                            ),
                                                            role
                                                        )
                                                )
                                            )
                                        )
                                    );
                                } else {
                                    this.shadowRoot
                                        .getElementById("add-to-parent")
                                        .removeChild(
                                            this.shadowRoot.getElementById(
                                                "role-select-group"
                                            )
                                        );
                                }
                            })
                          : null
                  )
                : null;

            const addToParent = bdoc.ele(
                "div",
                bdoc.class("form-row"),
                bdoc.id("add-to-parent"),
                this.#parentId ? addToParentCheckbox : null
            );

            const createGroupForm = bdoc.ele(
                "mm-create-group-form",
                this.#orgId ? bdoc.attr("org-id", this.#orgId) : null,
                this.#ownerId
                    ? bdoc.attr("owner-id", this.#ownerId)
                    : null,
                this.#ownerType
                    ? bdoc.attr("owner-type", this.#ownerType)
                    : null,
                this.#addSelf ? bdoc.attr("add-self") : null,
                bdoc.ele(
                    "div",

                    bdoc.class("form-end"),

                    addToParent,

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
                            "Create Group",
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
                        ),
                        bdoc.ele(
                            "button",
                            bdoc.class("header-button add-entity-button"),
                            "Create and Manage Group",
                            bdoc.eventListener("click", () => {
                                createGroupForm.onSettled = onSettled(
                                    async (variables, response, addedGroup) => {
                                        this.onSuccess(
                                            variables,
                                            response,
                                            addedGroup
                                        );

                                        window.location.href = `/c/Group?id=${response.id}`;
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
                    "Create Group",
                    bdoc.attr("style", "margin-left: 18px;")
                ),
                createGroupForm
            );

            if (this.#parentType === "org") {
                addToParent.style.display = "none";
            }

            const ownerInput = createGroupForm
                .getInnerForm()
                .querySelector("#owner");
            if (this.#parentType === "org") {
                bdoc.append(
                    ownerInput,
                    bdoc.eventListener("ownerchange", ({ target }) => {
                        if (target.value === this.#orgId) {
                            addToParent.style.display = "none";
                        } else {
                            addToParent.style.display = "flex";
                        }
                    })
                );
            }
        });
    }
}
customElements.define("mm-create-group-modal", MmCreateGroupModal);

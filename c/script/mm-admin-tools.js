import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

class MmAdminTools extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

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
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/mm-admin-tools.css")
            ),

            bdoc.ele(
                "div",
                bdoc.class("button-container"),
                bdoc.attr("style", "margin-top: 40px"),
                bdoc.ele(
                    "a",
                    bdoc.attr(
                        "style",
                        "text-decoration: none; border-radius: 12px"
                    ),
                    bdoc.id("create-user-button"),
                    bdoc.ele(
                        "div",
                        bdoc.class("big-button big-button2"),
                        bdoc.ele(
                            "div",
                            bdoc.class("button-text"),
                            "Create User"
                        ),
                        bdoc.ele(
                            "div",
                            bdoc.class("button-description"),
                            "Create a new user"
                        )
                    )
                ),
                bdoc.ele(
                    "a",
                    bdoc.attr(
                        "style",
                        "text-decoration: none; border-radius: 12px"
                    ),
                    bdoc.id("create-org-button"),
                    bdoc.ele(
                        "div",
                        bdoc.class("big-button big-button3"),
                        bdoc.ele(
                            "div",
                            bdoc.class("button-text"),
                            "Create Org"
                        ),
                        bdoc.ele(
                            "div",
                            bdoc.class("button-description"),
                            "Create a new organization"
                        )
                    )
                ),
                bdoc.ele(
                    "a",
                    bdoc.attr("href", "/c/callapi"),
                    bdoc.attr(
                        "style",
                        "text-decoration: none; border-radius: 12px"
                    ),
                    bdoc.ele(
                        "div",
                        bdoc.class("big-button big-button5"),
                        bdoc.ele("div", bdoc.class("button-text"), "Call API"),
                        bdoc.ele(
                            "div",
                            bdoc.class("button-description"),
                            "MatchMaker API test tool"
                        )
                    )
                )
            ),
            bdoc.ele("mm-create-org-modal"),

            bdoc.ele("mm-modal"),

            bdoc.script("mm-modal.js"),
            bdoc.script("mm-create-user-form.js"),
            bdoc.script("mm-create-org-modal.js")
        );

        Promise.all([
            customElements.whenDefined("mm-modal"),
            customElements.whenDefined("mm-create-user-form"),
            customElements.whenDefined("mm-create-org-modal"),
        ]).then(() => {
            const createUserModal = this.shadowRoot.querySelector("mm-modal");

            const createUserForm = bdoc.ele(
                "mm-create-user-form",
                bdoc.ele(
                    "div",
                    bdoc.class("modal-footer"),
                    bdoc.attr("slot", "form-footer"),
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
                        bdoc.class("header-button add-entity-button"),
                        "Create User",
                        bdoc.eventListener("click", () => {
                            createUserForm.submit();
                        })
                    )
                )
            );

            createUserForm.onSettled = async (variables, response) => {
                if (response) {
                    if (response.status !== 200) {
                        console.log(response);
                        alert(
                            `Failed to create user with id ${variables["name"]}`
                        );
                        return;
                    }
                    alert(
                        `User with id ${variables["name"]} successfully created`
                    );
                }
            };

            const createOrgButton =
                this.shadowRoot.getElementById("create-org-button");

            const createOrgModal = this.shadowRoot.querySelector(
                "mm-create-org-modal"
            );

            bdoc.append(
                createOrgButton,
                bdoc.eventListener("click", () => {
                    createOrgModal.show();
                })
            );

            bdoc.append(
                createUserModal,

                bdoc.ele(
                    "h2",
                    "Create User",
                    bdoc.attr("style", "margin-left: 18px;")
                ),
                createUserForm
            );

            bdoc.append(
                this.shadowRoot.getElementById("create-user-button"),
                bdoc.eventListener("click", () => {
                    createUserModal.show();
                })
            );
        });
    }
}
customElements.define("mm-admin-tools", MmAdminTools);

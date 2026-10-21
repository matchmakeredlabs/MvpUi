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
                "h2",
                "Create",
                bdoc.attr("style", "margin-left: 1.5em; margin-top: 40px;")
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
                )
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

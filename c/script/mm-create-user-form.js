import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import config from "/config.js";

export default class MmCreateUserForm extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    onSettled = (response) => {};

    #submitCreateUser = async (event) => {
        event.preventDefault();
        console.log("submitCreateUser");

        const formData = new FormData(event.target);

        const variables = {
            name: formData.get("user-id"),
            password: formData.get("password"),
            fullName: formData.get("full-name"),
        };
        const response = await MmCreateUserForm.createUser(variables);

        this.onSettled(variables, response);
    };

    static createUser = async (userObj) => {
        return await MmCreateUserForm.session.fetch("/api/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(userObj),
        });
    };

    getInnerForm = () => this.shadowRoot.querySelector("form");

    submit = () => {
        this.getInnerForm().dispatchEvent(
            new Event("submit", { cancelable: true })
        );
    };

    connectedCallback() {
        const formGroupsContainer = bdoc.ele(
            "div",
            bdoc.class("form-groups-container"),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "user-id"),
                    "User ID",
                    bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                ),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "text"),
                    bdoc.attr("id", "user-id"),
                    bdoc.attr("name", "user-id"),
                    bdoc.attr("required", "true")
                )
            ),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "full-name"),
                    "User Full Name",
                    bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                ),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "text"),
                    bdoc.attr("id", "full-name"),
                    bdoc.attr("name", "full-name"),
                    bdoc.attr("required", "true")
                )
            ),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "password"),
                    "User Password",
                    bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                ),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "password"),
                    bdoc.attr("id", "password"),
                    bdoc.attr("name", "password"),
                    bdoc.attr("required", "true")
                )
            )
        );

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
                bdoc.attr("href", "/c/res/mm-form.css")
            ),
            bdoc.ele(
                "form",
                bdoc.class("form"),
                bdoc.eventListener("submit", this.#submitCreateUser),
                formGroupsContainer,
                bdoc.ele("slot", bdoc.attr("name", "form-footer"))
            )
        );
    }
}

customElements.define("mm-create-user-form", MmCreateUserForm);

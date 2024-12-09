import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import config from "/config.js";

export default class MmAddUser extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);
    static observedAttributes = ["entity-id", "type"];

    #entityId;
    #type;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "entity-id") {
            this.#entityId = newValue;
        } else if (name === "type") {
            this.#type = newValue;
        }
    }

    static fetchOrganization = async (orgId) => {
        const response = await MmAddUser.session.fetch("/api/orgs/" + orgId);

        return await response.json();
        // what happens when user does not have perms for org?
    };

    static fetchGroup = async (groupId) => {
        const response = await MmAddUser.session.fetch(
            "/api/groups/" + groupId
        );

        return await response.json();
    };

    onSubmit = () => {};

    static roles = ["editor", "reader"];

    #submitAddUser = (entityType, entityId) => async (event) => {
        event.preventDefault();

        const formData = new FormData(event.target);

        const userId = formData.get("user-id");

        let variables;
        let response;

        switch (entityType) {
            case "org":
                const role = formData.get("role");
                variables = { id: userId, role };
                response = await MmAddUser.addUserToOrg(entityId, variables);
                break;
            case "group":
                variables = userId;
                response = await MmAddUser.addUserToGroup(entityId, variables);
                break;
        }

        this.onSubmit(variables, response);
    };

    static updateOrg = async (orgId, orgObj) => {
        return await MmAddUser.session.fetch("/api/orgs/" + orgId, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(orgObj),
        });
    };

    static updateGroup = async (groupId, groupObj) => {
        return await MmAddUser.session.fetch("/api/groups/" + groupId, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(groupObj),
        });
    };

    static addUserToOrg = async (orgId, userObj) => {
        const currentOrg = await MmAddUser.fetchOrganization(orgId);

        if (currentOrg) {
            if (currentOrg.members.find((member) => member.id === userObj.id)) {
                alert("User already exists in organization");
                return;
            }
            currentOrg.members.push(userObj);
            return MmAddUser.updateOrg(orgId, currentOrg);
        }
    };

    static addUserToGroup = async (groupId, userId) => {
        const currentGroup = await MmAddUser.fetchGroup(groupId);

        if (currentGroup) {
            if (currentGroup.members.find(userId)) {
                alert("User already exists in group");
                return;
            }
            currentGroup.members.push(userId);
            return MmAddUser.updateGroup(groupId, currentGroup);
        }
    };

    getInnerForm = () => this.shadowRoot.querySelector("form");

    submit = () => {
        this.getInnerForm().dispatchEvent(new Event("submit"));
    };

    connectedCallback() {
        const formGroupsContainer = bdoc.ele(
            "div",
            bdoc.class("form-groups-container"),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele("label", bdoc.attr("for", "user-id"), "User ID"),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "text"),
                    bdoc.attr("id", "user-id"),
                    bdoc.attr("name", "user-id"),
                    bdoc.attr("required", "true")
                )
            )
        );

        if (this.#type === "org") {
            bdoc.append(
                formGroupsContainer,
                bdoc.ele(
                    "div",
                    bdoc.class("form-group"),
                    bdoc.ele("label", bdoc.attr("for", "role"), "Role"),
                    bdoc.ele(
                        "select",
                        bdoc.attr("id", "role"),
                        bdoc.attr("name", "role"),
                        ...MmAddUser.roles.map((role) =>
                            bdoc.ele("option", bdoc.attr("value", role), role)
                        )
                    )
                )
            );
        }

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
                bdoc.attr("href", "/c/res/mm-add-user.css")
            ),
            bdoc.ele(
                "form",
                bdoc.class("form"),
                bdoc.eventListener(
                    "submit",
                    this.#submitAddUser(this.#type, this.#entityId)
                ),
                formGroupsContainer,
                bdoc.ele("slot", bdoc.attr("name", "form-footer"))
            )
        );
    }
}

customElements.define("mm-add-user", MmAddUser);

import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import config from "/config.js";

export default class MmAddMemberForm extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);
    static observedAttributes = ["parent-id", "parent-type", "member-type"];

    #parentId;
    #parentType;
    #memberType;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "parent-id") {
            this.#parentId = newValue;
        } else if (name === "parent-type") {
            this.#parentType = newValue;
        } else if (name === "member-type") {
            this.#memberType = newValue;
        }
    }

    static fetchOrganization = async (orgId) => {
        const response = await MmAddMemberForm.session.fetch(
            "/api/orgs/" + orgId
        );

        return await response.json();
        // what happens when user does not have perms for org?
    };

    static fetchGroup = async (groupId) => {
        const response = await MmAddMemberForm.session.fetch(
            "/api/groups/" + groupId
        );

        return await response.json();
    };

    onSettled = () => {};

    static roles = ["editor", "reader"];

    #submitAddMember = (parentType, parentId, memberType) => async (event) => {
        event.preventDefault();

        const formData = new FormData(event.target);

        const memberParams = {
            user: {
                getId: () => formData.get("user-id"),
            },
            group: {
                getId: () => {
                    const orgId = formData.get("org-id");
                    const groupId = formData.get("group-id");
                    return orgId.toLowerCase() + ":" + groupId.toLowerCase();
                },
            },
        };

        const parentParams = {
            org: {
                getVariables: () => {
                    const role = formData.get("role");
                    // in case we want to make sure the user looks at the role selection
                    if (role === "--") {
                        alert("Please select a role.");
                        return;
                    }
                    return {
                        id: memberParams[memberType].getId(),
                        role,
                    };
                },
            },
            group: {
                getVariables: () => ({ id: memberParams[memberType].getId() }),
            },
        };

        const variables = parentParams[parentType].getVariables();
        const response = await MmAddMemberForm.addMemberToEntity(
            parentId,
            variables,
            memberType,
            parentType
        );
        this.onSettled(variables, response);
    };

    static updateOrg = async (orgId, orgObj) => {
        return await MmAddMemberForm.session.fetch("/api/orgs/" + orgId, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(orgObj),
        });
    };

    static updateGroup = async (groupId, groupObj) => {
        return await MmAddMemberForm.session.fetch("/api/groups/" + groupId, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(groupObj),
        });
    };

    static addMemberToEntity = async (
        parentId,
        memberObj,
        memberType,
        parentType
    ) => {
        let currentParent;
        if (parentType === "org") {
            currentParent = await MmAddMemberForm.fetchOrganization(parentId);
        } else if (parentType === "group") {
            currentParent = await MmAddMemberForm.fetchGroup(parentId);
        }

        const existsTextMemberText = {
            user: "User",
            group: "Group",
        };

        const parameters = {
            org: {
                existsTextParentText: "organization",
                checkId: (member) => member.id === memberObj.id,
                addMember: () => currentParent.members.push(memberObj),
                update: MmAddMemberForm.updateOrg,
            },
            group: {
                existsTextParentText: "group",
                checkId: (member) => member === memberObj.id,
                addMember: () => currentParent.members.push(memberObj.id),
                update: MmAddMemberForm.updateGroup,
            },
        };

        if (currentParent) {
            if (currentParent.members.find(parameters[parentType].checkId)) {
                alert(
                    `${existsTextMemberText[memberType]} with id ${memberObj.id} is already a member of ${parameters[parentType].existsTextParentText} with id ${parentId}`
                );
                return;
            }
            parameters[parentType].addMember();

            return parameters[parentType].update(parentId, currentParent);
        }
    };

    getInnerForm = () => this.shadowRoot.querySelector("form");

    submit = () => {
        this.getInnerForm().dispatchEvent(new Event("submit"));
    };

    connectedCallback() {
        const formFields = {
            user: [
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
                ),
            ],
            group: [
                bdoc.ele(
                    "div",
                    bdoc.class("form-group"),
                    bdoc.ele(
                        "label",
                        bdoc.attr("for", "org-id"),
                        "Group Organization"
                    ),
                    bdoc.ele(
                        "input",
                        bdoc.attr("type", "text"),
                        bdoc.attr("id", "org-id"),
                        bdoc.attr("name", "org-id"),
                        bdoc.attr("required", "true")
                    )
                ),
                bdoc.ele(
                    "div",
                    bdoc.class("form-group"),
                    bdoc.ele(
                        "label",
                        bdoc.attr("for", "group-id"),
                        "Group Name"
                    ),
                    bdoc.ele(
                        "input",
                        bdoc.attr("type", "text"),
                        bdoc.attr("id", "group-id"),
                        bdoc.attr("name", "group-id"),
                        bdoc.attr("required", "true")
                    )
                ),
            ],
        };
        const formGroupsContainer = bdoc.ele(
            "div",
            bdoc.class("form-groups-container"),
            ...formFields[this.#memberType]
        );

        if (this.#parentType === "org") {
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
                        ...MmAddMemberForm.roles.map((role) =>
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
                bdoc.attr("href", "/c/res/mm-form.css")
            ),
            bdoc.ele(
                "form",
                bdoc.class("form"),
                bdoc.eventListener(
                    "submit",
                    this.#submitAddMember(
                        this.#parentType,
                        this.#parentId,
                        this.#memberType
                    )
                ),
                formGroupsContainer,
                bdoc.ele("slot", bdoc.attr("name", "form-footer"))
            )
        );
    }
}

customElements.define("mm-add-member-form", MmAddMemberForm);

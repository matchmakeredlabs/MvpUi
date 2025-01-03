import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import config from "/config.js";
import MmOrganizations from "./mm-organizations.js";
import MmAddMemberForm from "./mm-add-member-form.js";

export default class MmCreateGroupForm extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    static observedAttributes = ["org-id"];

    #orgId;

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "org-id") {
            this.#orgId = newValue;
        }
    }

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    onSettled = () => {};

    #submitCreateGroup = async (event) => {
        event.preventDefault();

        const formData = new FormData(event.target);

        const variables = {
            name: formData.get("name"),
            org: formData.get("organization"),
            role: formData.get("role"),
            members: [],
        };
        const description = formData.get("description");
        if (description && description.trim() !== "") {
            variables.description = formData.get("description");
        }
        const response = await MmCreateGroupForm.createGroup(variables);

        this.onSettled(variables, response);
    };

    static createGroup = async (groupObj) => {
        const groupRole = groupObj.role;
        delete groupObj.role;

        const createGroupResponse = await MmCreateGroupForm.session.fetch(
            "/api/groups",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(groupObj),
            }
        );
        const originalResponse = createGroupResponse.clone();
        try {
            const group = await createGroupResponse.json();

            const [org, groupId] = group.id.split(":");

            const orgResponse = await MmAddMemberForm.addMemberToEntity(
                org,
                { id: group.id, role: groupRole },
                "group",
                "org"
            );
            if (!orgResponse.ok) {
                await MmCreateGroupForm.session.fetch(
                    "/api/groups/" + group.id,
                    {
                        method: "DELETE",
                    }
                );
                return orgResponse;
            }

            return originalResponse;
        } catch {
            return originalResponse;
        }
    };

    #getOrgs = async () => {
        let orgs = await MmOrganizations.fetchOrganizations();

        if (!this.#orgId) {
            orgs = [{ id: "", name: "Select an organization" }, ...orgs];
        }

        for (const org of orgs) {
            if (!org["_canWriteGroups"]) {
                continue;
            }

            const option = bdoc.ele(
                "option",
                bdoc.attr("value", org.id),
                org.name
            );
            if (
                org.id === "" ||
                (this.#orgId &&
                    org.id.toLowerCase() === this.#orgId.toLowerCase())
            ) {
                bdoc.append(option, bdoc.attr("selected"));
            }
            bdoc.append(this.shadowRoot.querySelector("select"), option);
        }
    };

    getInnerForm = () => {
        return this.shadowRoot.querySelector("form");
    };

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
                bdoc.ele("label", bdoc.attr("for", "name"), "Group Name"),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "text"),
                    bdoc.attr("id", "name"),
                    bdoc.attr("name", "name"),
                    bdoc.attr("required", "true")
                )
            ),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "organization"),
                    "Owning Organization"
                ),
                bdoc.ele(
                    "select",
                    bdoc.attr("id", "organization"),
                    bdoc.attr("name", "organization"),
                    bdoc.attr("required", "true")
                )
            ),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "role"),
                    "Role (Owning Organization)"
                ),
                bdoc.ele(
                    "select",
                    bdoc.attr("id", "role"),
                    bdoc.attr("name", "role"),
                    bdoc.attr("required", "true"),
                    ...MmAddMemberForm.roles.map((role) =>
                        bdoc.ele("option", bdoc.attr("value", role), role)
                    )
                )
            ),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "description"),
                    "Description"
                ),
                bdoc.ele(
                    "textarea",
                    bdoc.attr("id", "description"),
                    bdoc.attr("name", "description")
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
                bdoc.eventListener("submit", this.#submitCreateGroup),
                formGroupsContainer,
                bdoc.ele("slot", bdoc.attr("name", "form-footer"))
            )
        );

        this.#getOrgs();
    }
}

customElements.define("mm-create-group-form", MmCreateGroupForm);

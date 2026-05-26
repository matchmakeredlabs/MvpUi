import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import config from "/config.js";
import MmCustomers from "./mm-customers.js";
import MmProjects from "./mm-projects.js";

export default class MmAddMemberForm extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);
    static observedAttributes = ["parent-id", "parent-type", "member-type"];

    #parentId;
    #parentType;
    #memberType;
    #cachedCustomers = [];
    #cachedGroups = [];
    #cachedProjects = [];
    #groupChoicesPreloadPromise;

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

    static fetchProject = async (projectId) => {
        const response = await MmAddMemberForm.session.fetch(
            "/api/orgs/" + projectId
        );

        return await response.json();
        // what happens when user does not have perms for this project?
    };

    static fetchGroup = async (groupId) => {
        const response = await MmAddMemberForm.session.fetch(
            "/api/groups/" + groupId
        );

        return await response.json();
    };

    static fetchGroups = async () => {
        const response = await MmAddMemberForm.session.fetch("/api/groups");
        return (await response.json()).items || [];
    };

    static fetchCustomer = async (customerId) => {
        const response = await MmAddMemberForm.session.fetch(
            "/api/customers/" + customerId
        );

        return await response.json();
    };

    onSettled = () => {};

    static roles = ["reader", "editor", "owner"];

    static getGroupOwnerType = (group) =>
        group.customerId || group.customer || group.ownerType === "customer"
            ? "customer"
            : "org";

    static getGroupOwnerId = (group) =>
        group.customerId ||
        group.customer ||
        group.org ||
        group.orgId ||
        group.id?.split(":")[0] ||
        "";

    static getGroupName = (group) => {
        if (group.name) return group.name;
        if (!group.id) return "";
        const [, ...groupIdParts] = group.id.split(":");
        return groupIdParts.join(":") || group.id;
    };

    #preloadGroupChoices = async () => {
        if (!this.#groupChoicesPreloadPromise) {
            this.#groupChoicesPreloadPromise = Promise.all([
                MmAddMemberForm.fetchGroups().catch(() => []),
                MmCustomers.fetchCustomers().catch(() => []),
                MmProjects.fetchProjects().catch(() => []),
            ]).then(([groups, customers, projects]) => {
                this.#cachedGroups = groups || [];
                this.#cachedCustomers = customers || [];
                this.#cachedProjects = projects || [];
            });
        }

        await this.#groupChoicesPreloadPromise;
    };

    #getOwnerLabel = (ownerType, ownerId) => {
        if (ownerType === "customer") {
            const customer = this.#cachedCustomers.find(
                (customer) => customer.id === ownerId
            );
            return customer?.name || customer?.id || ownerId;
        }

        const project = this.#cachedProjects.find((project) => project.id === ownerId);
        return project?.name || project?.id || ownerId;
    };

    #getGroupsForSelectedOwner = () => {
        const ownerTypeSelect = this.shadowRoot.querySelector(
            "#group-owner-type"
        );
        const ownerSelect = this.shadowRoot.querySelector("#group-owner");
        const ownerType = ownerTypeSelect?.value || "org";
        const ownerId = ownerSelect?.value || "";

        if (!ownerId) return [];

        return this.#cachedGroups.filter((group) => {
            if (group.id === this.#parentId) return false;

            return (
                MmAddMemberForm.getGroupOwnerType(group) === ownerType &&
                MmAddMemberForm.getGroupOwnerId(group) === ownerId
            );
        });
    };

    #populateGroupSelect = () => {
        const groupSelect = this.shadowRoot.querySelector("#group-id");
        if (!groupSelect) return;

        const groups = this.#getGroupsForSelectedOwner();
        groupSelect.innerHTML = "";

        bdoc.append(
            groupSelect,
            bdoc.ele(
                "option",
                bdoc.attr("value", ""),
                bdoc.attr("disabled", "true"),
                bdoc.attr("selected", "true"),
                groups.length ? "Select a group" : "No groups available"
            )
        );

        for (const group of groups) {
            bdoc.append(
                groupSelect,
                bdoc.ele(
                    "option",
                    bdoc.attr("value", group.id),
                    MmAddMemberForm.getGroupName(group)
                )
            );
        }

        groupSelect.disabled = groups.length === 0;
    };

    #populateGroupOwners = async () => {
        const ownerTypeSelect = this.shadowRoot.querySelector(
            "#group-owner-type"
        );
        const ownerSelect = this.shadowRoot.querySelector("#group-owner");
        if (!ownerTypeSelect || !ownerSelect) return;

        await this.#preloadGroupChoices();

        const ownerType = ownerTypeSelect.value || "org";
        const ownerIds = Array.from(
            new Set(
                this.#cachedGroups
                    .filter(
                        (group) =>
                            group.id !== this.#parentId &&
                            MmAddMemberForm.getGroupOwnerType(group) ===
                                ownerType
                    )
                    .map(MmAddMemberForm.getGroupOwnerId)
                    .filter(Boolean)
            )
        ).sort((a, b) =>
            this.#getOwnerLabel(ownerType, a).localeCompare(
                this.#getOwnerLabel(ownerType, b)
            )
        );

        ownerSelect.innerHTML = "";

        bdoc.append(
            ownerSelect,
            bdoc.ele(
                "option",
                bdoc.attr("value", ""),
                bdoc.attr("disabled", "true"),
                bdoc.attr("selected", "true"),
                ownerIds.length
                    ? `Select a ${
                          ownerType === "customer" ? "customer" : "project"
                      }`
                    : "No group owners available"
            )
        );

        for (const ownerId of ownerIds) {
            bdoc.append(
                ownerSelect,
                bdoc.ele(
                    "option",
                    bdoc.attr("value", ownerId),
                    this.#getOwnerLabel(ownerType, ownerId)
                )
            );
        }

        ownerSelect.disabled = ownerIds.length === 0;
        this.#populateGroupSelect();
    };

    #submitAddMember = (parentType, parentId, memberType) => async (event) => {
        event.preventDefault();

        const formData = new FormData(event.target);

        const memberParams = {
            user: {
                getVariables: () => {
                    const userId = formData.get("user-id");
                    if (!userId) {
                        alert("Please enter a user ID.");
                        return;
                    }

                    return { id: userId };
                },
            },
            group: {
                getVariables: () => {
                    const ownerType = formData.get("group-owner-type");
                    const ownerId = formData.get("group-owner");
                    const groupId = formData.get("group-id");

                    if (!ownerId) {
                        alert("Please select a group owner.");
                        return;
                    }

                    if (!groupId) {
                        alert("Please select a group.");
                        return;
                    }

                    const variables = {
                        id: groupId,
                    };

                    if (ownerType === "customer") {
                        variables.customerId = ownerId;
                    } else {
                        variables.org = ownerId;
                    }

                    return variables;
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
                    const memberVariables =
                        memberParams[memberType].getVariables();
                    if (!memberVariables) return;

                    return {
                        ...memberVariables,
                        role,
                    };
                },
            },
            group: {
                getVariables: () => memberParams[memberType].getVariables(),
            },
        };

        const variables = parentParams[parentType].getVariables();
        if (!variables) return;

        const response = await MmAddMemberForm.addMemberToEntity(
            parentId,
            variables,
            memberType,
            parentType
        );
        this.onSettled(variables, response);
    };

    static updateProject = async (projectId, projectObj) => {
        return await MmAddMemberForm.session.fetch("/api/orgs/" + projectId, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(projectObj),
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

    static updateCustomer = async (customerId, customerObj) => {
        return await MmAddMemberForm.session.fetch(
            "/api/customers/" + customerId,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(customerObj),
            }
        );
    };

    static addMemberToEntity = async (
        parentId,
        memberObj,
        memberType,
        parentType
    ) => {
        let currentParent;
        if (parentType === "org") {
            currentParent = await MmAddMemberForm.fetchProject(parentId);
        } else if (parentType === "group") {
            currentParent = await MmAddMemberForm.fetchGroup(parentId);
        } else if (parentType === "customer") {
            currentParent = await MmAddMemberForm.fetchCustomer(parentId);
        }

        const existsTextMemberText = {
            user: "User",
            group: "Group",
        };

        const parameters = {
            org: {
                existsTextParentText: "project",
                checkId: (member) => member.id === memberObj.id,
                addMember: () => currentParent.members.push(memberObj),
                update: MmAddMemberForm.updateProject,
            },
            group: {
                existsTextParentText: "group",
                checkId: (member) => member === memberObj.id,
                addMember: () => currentParent.members.push(memberObj.id),
                update: MmAddMemberForm.updateGroup,
            },
            customer: {
                existsTextParentText: "customer",
                checkId: (member) => member.id === memberObj.id,
                addMember: () => {
                    if (!Array.isArray(currentParent.roles)) {
                        currentParent.roles = [];
                    }
                    currentParent.roles.push(memberObj);
                },
                update: MmAddMemberForm.updateCustomer,
            },
        };

        if (currentParent) {
            const parentMembers =
                parentType === "customer"
                    ? currentParent.roles || []
                    : currentParent.members || [];

            if (parentMembers.find(parameters[parentType].checkId)) {
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
        this.getInnerForm().dispatchEvent(
            new Event("submit", { cancelable: true })
        );
    };

    connectedCallback() {
        const formFields = {
            user: [
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
            ],
            group: [
                bdoc.ele(
                    "div",
                    bdoc.class("form-group"),
                    bdoc.ele(
                        "label",
                        bdoc.attr("for", "group-owner-type"),
                        "Owned By Type",
                        bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                    ),
                    bdoc.ele(
                        "select",
                        bdoc.attr("id", "group-owner-type"),
                        bdoc.attr("name", "group-owner-type"),
                        bdoc.ele(
                            "option",
                            bdoc.attr("value", "org"),
                            "Project"
                        ),
                        bdoc.ele(
                            "option",
                            bdoc.attr("value", "customer"),
                            "Customer"
                        )
                    )
                ),
                bdoc.ele(
                    "div",
                    bdoc.class("form-group"),
                    bdoc.ele(
                        "label",
                        bdoc.attr("for", "group-owner"),
                        "Owned By",
                        bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                    ),
                    bdoc.ele(
                        "select",
                        bdoc.attr("id", "group-owner"),
                        bdoc.attr("name", "group-owner"),
                        bdoc.attr("required", "true")
                    )
                ),
                bdoc.ele(
                    "div",
                    bdoc.class("form-group"),
                    bdoc.ele(
                        "label",
                        bdoc.attr("for", "group-id"),
                        "Group Name",
                        bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                    ),
                    bdoc.ele(
                        "select",
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

        if (this.#parentType === "org" || this.#parentType === "customer") {
            bdoc.append(
                formGroupsContainer,
                bdoc.ele(
                    "div",
                    bdoc.class("form-group"),
                    bdoc.ele(
                        "label",
                        bdoc.attr("for", "role"),
                        this.#parentType === "customer"
                            ? "Role (Customer)"
                            : "Role"
                    ),
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

        if (this.#memberType === "group") {
            const ownerTypeSelect =
                this.shadowRoot.querySelector("#group-owner-type");
            const ownerSelect = this.shadowRoot.querySelector("#group-owner");

            bdoc.append(
                ownerTypeSelect,
                bdoc.eventListener("change", () => {
                    this.#populateGroupOwners();
                })
            );

            bdoc.append(
                ownerSelect,
                bdoc.eventListener("change", () => {
                    this.#populateGroupSelect();
                })
            );

            this.#populateGroupOwners();
        }
    }
}

customElements.define("mm-add-member-form", MmAddMemberForm);

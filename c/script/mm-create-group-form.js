import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import config from "/config.js";
import MmProjects from "./mm-projects.js";
import MmCustomers from "./mm-customers.js";
import MmAddMemberForm from "./mm-add-member-form.js";

export default class MmCreateGroupForm extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    static observedAttributes = ["project-id", "owner-id", "owner-type", "add-self"];

    #projectId;
    #ownerId;
    #ownerType = "org";
    #addSelf;
    #cachedCustomers;
    #cachedProjects;
    #ownersPreloadPromise;

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "project-id") {
            this.#projectId = newValue;
            this.#ownerId = newValue;
            this.#ownerType = "org";
        } else if (name === "owner-id") {
            this.#ownerId = newValue;
        } else if (name === "owner-type") {
            this.#ownerType = newValue || "org";
        } else if (name === "add-self") {
            this.#addSelf = true;
        }
    }

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    onSettled = () => {};

    #preloadOwners = async () => {
        if (!this.#ownersPreloadPromise) {
            this.#ownersPreloadPromise = Promise.all([
                MmCustomers.fetchCustomers().catch(() => []),
                MmProjects.fetchProjects().catch(() => []),
            ])
                .then(([customers, projects]) => {
                    this.#cachedCustomers = customers || [];
                    this.#cachedProjects = projects || [];
                })
                .catch(() => {
                    this.#cachedCustomers = [];
                    this.#cachedProjects = [];
                });
        }

        await this.#ownersPreloadPromise;
    };

    #submitCreateGroup = async (event) => {
        event.preventDefault();

        const formData = new FormData(event.target);

        const members = [];
        if (this.#addSelf) {
            const currUserId = MmCreateGroupForm.session.getCachedUserID();
            members.push(currUserId);
        }

        const ownerType = (formData.get("owner-type") || "org").toString();
        const ownerId = formData.get("owner");
        const variables = {
            name: formData.get("name"),
            members: members,
            role: formData.get("role"),
        };

        if (ownerType === "customer") {
            variables.customerId = ownerId;
        } else {
            variables.org = ownerId;
        }

        const description = formData.get("description");

        if (description) {
            if (description.trim() == "") {
                variables.description = ""
            }
            variables.description = formData.get("description");
        } else {
            variables.description = ""
        }
        const response = await MmCreateGroupForm.createGroup(variables);

        this.onSettled(variables, response);
    };

    static createGroup = async (groupObj) => {
        const groupRole = groupObj.role;
        const groupOwnerType = groupObj.customerId ? "customer" : "org";
        const groupOwnerId = groupObj.customerId || groupObj.org;
        delete groupObj.role;

        const createGroupUrl =
            groupOwnerType === "customer"
                ? `/api/groups/customers/${encodeURIComponent(groupOwnerId)}`
                : `/api/groups/orgs/${encodeURIComponent(groupOwnerId)}`;

        const createGroupResponse = await MmCreateGroupForm.session.fetch(
            createGroupUrl,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(groupObj),
            }
        );

        // If create failed (e.g., invalid name), return the original error response.
        if (!createGroupResponse.ok) {
            return createGroupResponse;
        }

        if (groupRole === "none") {
            return createGroupResponse;
        }
        const originalResponse = createGroupResponse.clone();
        try {
            const group = await createGroupResponse.json();

            const parentResponse = await MmAddMemberForm.addMemberToEntity(
                groupOwnerId,
                { id: group.id, role: groupRole },
                "group",
                groupOwnerType
            );
            if (!parentResponse || !parentResponse.ok) {
                await MmCreateGroupForm.session.fetch(
                    "/api/groups/" + group.id,
                    {
                        method: "DELETE",
                    }
                );
                return parentResponse;
            }

            return originalResponse;
        } catch {
            return originalResponse;
        }
    };

    #populateOwners = async () => {
        const ownerTypeSelect = this.shadowRoot.querySelector("#owner-type");
        const ownerSelect = this.shadowRoot.querySelector("#owner");
        if (!ownerTypeSelect || !ownerSelect) return;

        const ownerType = ownerTypeSelect.value || this.#ownerType || "org";
        ownerSelect.innerHTML = "";

        if (ownerType === "customer") {
            await this.#preloadOwners();
            const customers = this.#cachedCustomers || [];
            const eligibleCustomers = customers.filter(
                (customer) => customer._canWriteCustomer !== false
            );

            bdoc.append(
                ownerSelect,
                bdoc.ele(
                    "option",
                    bdoc.attr("value", ""),
                    bdoc.attr("disabled", "true"),
                    bdoc.attr("selected", "true"),
                    eligibleCustomers.length
                        ? "Select a customer"
                        : "No customers available"
                )
            );

            for (const customer of eligibleCustomers) {
                const option = bdoc.ele(
                    "option",
                    bdoc.attr("value", customer.id),
                    customer.name || customer.id
                );
                if (
                    this.#ownerId &&
                    customer.id.toLowerCase() === this.#ownerId.toLowerCase()
                ) {
                    bdoc.append(option, bdoc.attr("selected"));
                }
                bdoc.append(ownerSelect, option);
            }

            ownerSelect.disabled = eligibleCustomers.length === 0;
            return;
        }

        await this.#preloadOwners();
        let projects = this.#cachedProjects || [];
        const eligibleProjects = projects.filter((project) => project["_canWriteGroups"]);

        bdoc.append(
            ownerSelect,
            bdoc.ele(
                "option",
                bdoc.attr("value", ""),
                bdoc.attr("disabled", "true"),
                bdoc.attr("selected", "true"),
                eligibleProjects.length
                    ? "Select a project"
                    : "No projects available"
            )
        );

        for (const project of eligibleProjects) {
            const option = bdoc.ele(
                "option",
                bdoc.attr("value", project.id),
                project.name
            );
            if (
                this.#ownerId &&
                project.id.toLowerCase() === this.#ownerId.toLowerCase()
            ) {
                bdoc.append(option, bdoc.attr("selected"));
            }
            bdoc.append(ownerSelect, option);
        }

        ownerSelect.disabled = eligibleProjects.length === 0;
    };

    getInnerForm = () => {
        return this.shadowRoot.querySelector("form");
    };

    submit = () => {
        this.getInnerForm().dispatchEvent(
            new Event("submit", { cancelable: true })
        );
    };

    connectedCallback() {
        const roleChoices = ["none", ...MmAddMemberForm.roles];

        const formGroupsContainer = bdoc.ele(
            "div",
            bdoc.class("form-groups-container"),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "name"),
                    "Group Name",
                    bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                ),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "text"),
                    bdoc.attr("id", "name"),
                    bdoc.attr("name", "name"),
                    bdoc.attr("pattern", "^\\w+$"),
                    bdoc.attr(
                        "title",
                        "Group name may only contain letters, numbers, and underscore (no spaces)."
                    ),
                    bdoc.attr("required", "true")
                )
            ),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "owner-type"),
                    "Owned By Type",
                    bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                ),
                bdoc.ele(
                    "select",
                    bdoc.attr("id", "owner-type"),
                    bdoc.attr("name", "owner-type"),
                    bdoc.ele("option", bdoc.attr("value", "org"), "Project"),
                    bdoc.ele("option", bdoc.attr("value", "customer"), "Customer")
                )
            ),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "owner"),
                    "Owned By",
                    bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                ),
                bdoc.ele(
                    "select",
                    bdoc.attr("id", "owner"),
                    bdoc.attr("name", "owner"),
                    bdoc.attr("required", "true")
                )
            ),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.id("role-group"),
                bdoc.ele(
                    "label",
                    bdoc.id("role-label"),
                    bdoc.attr("for", "role"),
                    "Role in Parent Project",
                    bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                ),
                bdoc.ele(
                    "select",
                    bdoc.attr("id", "role"),
                    bdoc.attr("name", "role"),
                    bdoc.attr("required", "true"),
                    ...roleChoices.map((role) =>
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

        const ownerTypeSelect = this.shadowRoot.querySelector("#owner-type");
        const ownerSelect = this.shadowRoot.querySelector("#owner");
        const roleGroup = this.shadowRoot.querySelector("#role-group");
        const roleLabel = this.shadowRoot.querySelector("#role-label");

        const updateRoleLabel = () => {
            roleLabel.textContent =
                ownerTypeSelect.value === "customer"
                    ? "Role in Parent Customer"
                    : "Role in Parent Project";
            roleLabel.appendChild(
                bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
            );
        };

        ownerTypeSelect.value = this.#ownerType || "org";
        bdoc.append(
            ownerTypeSelect,
            bdoc.eventListener("change", async () => {
                roleGroup.style.display = "block";
                updateRoleLabel();
                await this.#populateOwners();
            })
        );

        bdoc.append(
            ownerSelect,
            bdoc.eventListener("change", () => {
                // keep the add-to-parent logic in the modal in sync when the owner changes
                ownerSelect.dispatchEvent(new Event("ownerchange"));
            })
        );

        roleGroup.style.display = "block";
        updateRoleLabel();
        this.#preloadOwners();
        this.#populateOwners();
    }
}

customElements.define("mm-create-group-form", MmCreateGroupForm);

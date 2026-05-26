import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

export default class MmCustomer extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);
    static customerRoutes = [
        "/api/customers",
        "/api/customer",
        "/customers",
        "/customer",
    ];
    static projectRoutes = ["/api/orgs", "/api/org", "/orgs", "/org"];
    static userRoutes = ["/api/users", "/api/user", "/users", "/user"];

    static principalTypeFromId = (principalId) =>
        `${principalId || ""}`.includes(":") ? "Group" : "User";

    static fetchUsers = async () => {
        for (const route of MmCustomer.userRoutes) {
            const response = await MmCustomer.session.fetch(route);
            if (response.status === 200) {
                const json = await response.json();
                return json.items || [];
            }
            if (response.status !== 404) return Promise.reject(response);
        }
        return Promise.reject(
            new Response(null, {
                status: 404,
                statusText: "Users endpoint not found",
            })
        );
    };

    static getUserLabel = (user) => user?.fullName || user?.name || user?.id || "";

    #customer;
    #projects = [];
    #users = [];

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    static fetchCustomer = async (customerId) => {
        for (const route of MmCustomer.customerRoutes) {
            const response = await MmCustomer.session.fetch(
                `${route}/${customerId}`
            );
            if (response.status === 200) return await response.json();
            if (response.status !== 404) return Promise.reject(response);
        }
        return Promise.reject(
            new Response(null, {
                status: 404,
                statusText: "Customer endpoint not found",
            })
        );
    };

    static fetchProjects = async () => {
        for (const route of MmCustomer.projectRoutes) {
            const response = await MmCustomer.session.fetch(route);
            if (response.status === 200) {
                const json = await response.json();
                return json.items || [];
            }
            if (response.status !== 404) return Promise.reject(response);
        }
        return Promise.reject(
            new Response(null, {
                status: 404,
                statusText: "Projects endpoint not found",
            })
        );
    };

    static updateCustomer = async (customerId, customerObj) => {
        for (const route of MmCustomer.customerRoutes) {
            const response = await MmCustomer.session.fetch(
                `${route}/${customerId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(customerObj),
                }
            );
            if (response.status === 200) return await response.json();
            if (response.status !== 404) return Promise.reject(response);
        }

        return Promise.reject(
            new Response(null, {
                status: 404,
                statusText: "Customer update endpoint not found",
            })
        );
    };

    static handleError = async (response) => {
        try {
            const body = await response.json();
            if (body.error) alert(body.error);
            else if (body.log?.[0]?.message) alert(body.log[0].message);
            else alert(`Error: ${response.status} ${response.statusText}`);
        } catch {
            alert(`Error: ${response.status} ${response.statusText}`);
        }
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
                bdoc.attr("href", "/c/res/mm-group.css")
            ),
            bdoc.ele(
                "div",
                bdoc.class("headers-container"),
                bdoc.ele("h2", "Customer"),
                bdoc.ele(
                    "h3",
                    bdoc.attr("id", "customer-name-title"),
                    bdoc.attr("style", "color: black; margin: 0;")
                )
            ),
            bdoc.ele(
                "div",
                bdoc.class("dropdowns-container"),
                bdoc.ele(
                    "mm-dropdown",
                    bdoc.attr("id", "settings-dropdown"),
                    bdoc.ele(
                        "h3",
                        "Customer Settings",
                        bdoc.attr("style", "margin: 0;"),
                        bdoc.attr("slot", "button-text")
                    ),
                    bdoc.ele(
                        "div",
                        bdoc.attr("id", "customer-form-container"),
                        bdoc.attr("slot", "dropdown-body")
                    )
                ),
                bdoc.ele(
                    "mm-dropdown",
                    bdoc.attr("id", "users-dropdown"),
                    bdoc.ele(
                        "h3",
                        "Permissions",
                        bdoc.attr("style", "margin: 0;"),
                        bdoc.attr("slot", "button-text")
                    ),
                    bdoc.ele(
                        "div",
                        bdoc.attr("id", "roles-container"),
                        bdoc.attr("slot", "dropdown-body")
                    )
                ),
                bdoc.ele(
                    "mm-dropdown",
                    bdoc.attr("id", "projects-dropdown"),
                    bdoc.ele(
                        "h3",
                        "Projects",
                        bdoc.attr("style", "margin: 0;"),
                        bdoc.attr("slot", "button-text")
                    ),
                    bdoc.ele(
                        "div",
                        bdoc.attr("id", "members-container"),
                        bdoc.attr("slot", "dropdown-body")
                    )
                )
            ),
            bdoc.script("mm-table.js"),
            bdoc.script("mm-filter-table.js"),
            bdoc.script("mm-dropdown.js")
        );

        this.#loadCustomer();
    }

    #getCustomerId() {
        return (
            new URLSearchParams(window.location.search).get("id") ||
            this.getAttribute("id")
        );
    }

    #cleanForSave(customer) {
        const cleaned = { ...customer };
        delete cleaned._canCreateOrgs;
        delete cleaned._canWriteCustomer;
        delete cleaned._roles;
        delete cleaned._orgs;
        delete cleaned.members;
        return cleaned;
    }

    async #loadCustomer() {
        const customerId = this.#getCustomerId();
        if (!customerId) {
            window.location.href = "/c/Customers";
            return;
        }

        const customer = await MmCustomer.fetchCustomer(customerId).catch(
            async (response) => {
                await MmCustomer.handleError(response);
                return null;
            }
        );

        if (!customer) return;

        const [projects, users] = await Promise.all([
            MmCustomer.fetchProjects().catch(() => []),
            MmCustomer.fetchUsers().catch(() => []),
        ]);
        this.#customer = customer;
        this.#users = users;

        const projectsFromList = projects.filter((project) => project.customerId === customerId);
        const projectIdsFromCustomer = Array.isArray(customer._orgs)
            ? customer._orgs
            : [];

        this.#projects =
            projectsFromList.length > 0
                ? projectsFromList
                : projectIdsFromCustomer.map((id) => ({ id }));

        this.shadowRoot.querySelector("#customer-name-title").textContent =
            customer.name || customer.id;

        this.#renderCustomerForm();
        this.#renderRoles();
        this.#renderMembers();

        const settingsDropdown = this.shadowRoot.getElementById("settings-dropdown");
        const usersDropdown = this.shadowRoot.getElementById("users-dropdown");
        const projectsDropdown = this.shadowRoot.getElementById("projects-dropdown");

        if (settingsDropdown && usersDropdown && projectsDropdown) {
            settingsDropdown.classList.add("show");
            usersDropdown.classList.add("show");
            projectsDropdown.classList.add("show");

            const settingsChevron = settingsDropdown.shadowRoot?.getElementById("chevron");
            const usersChevron = usersDropdown.shadowRoot?.getElementById("chevron");
            const projectsChevron = projectsDropdown.shadowRoot?.getElementById("chevron");

            settingsChevron?.classList.add("down");
            usersChevron?.classList.add("down");
            projectsChevron?.classList.add("down");
        }
    }

    async #saveRoles(updatedRoles) {
        const updated = this.#cleanForSave({
            ...this.#customer,
            roles: updatedRoles,
        });

        const response = await MmCustomer.updateCustomer(
            this.#getCustomerId(),
            updated
        ).catch(async (r) => {
            await MmCustomer.handleError(r);
            return null;
        });

        if (!response) return false;
        await this.#loadCustomer();
        return true;
    }

    #renderCustomerForm() {
        const customer = this.#customer;
        const container = this.shadowRoot.querySelector("#customer-form-container");
        container.innerHTML = "";

        const canWrite = !!customer._canWriteCustomer;
        const digitsOnlyNumber = (value) => {
            const digits = `${value ?? ""}`.replace(/\D+/g, "");
            return digits === "" ? 0 : Number(digits);
        };
        const blockNonDigitInput = (event) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            const allowedKeys = new Set([
                "Backspace",
                "Delete",
                "Tab",
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "End",
            ]);
            if (allowedKeys.has(event.key)) return;
            if (/^\d$/.test(event.key)) return;
            event.preventDefault();
        };
        const sanitizeDigitsOnlyInput = ({ target }) => {
            target.value = `${target.value ?? ""}`.replace(/\D+/g, "");
        };

        const nameInput = bdoc.ele(
            "input",
            bdoc.attr("type", "text"),
            bdoc.attr("value", customer.name || ""),
            bdoc.attr("id", "customer-name"),
            canWrite ? null : bdoc.attr("disabled", "true")
        );

        const descInput = bdoc.ele(
            "textarea",
            bdoc.attr("id", "customer-description"),
            canWrite ? null : bdoc.attr("disabled", "true"),
            customer.description || ""
        );

        const allowedProjects = bdoc.ele(
            "input",
            bdoc.attr("type", "number"),
            bdoc.attr("id", "customer-allowed-projects"),
            bdoc.attr("min", "0"),
            bdoc.attr("step", "1"),
            bdoc.attr("inputmode", "numeric"),
            bdoc.attr("pattern", "[0-9]*"),
            bdoc.attr("value", customer.allowedProjects ?? 0),
            bdoc.eventListener("keydown", blockNonDigitInput),
            bdoc.eventListener("input", sanitizeDigitsOnlyInput),
            canWrite ? null : bdoc.attr("disabled", "true")
        );

        const usersPerProject = bdoc.ele(
            "input",
            bdoc.attr("type", "number"),
            bdoc.attr("id", "customer-users-per-project"),
            bdoc.attr("min", "0"),
            bdoc.attr("step", "1"),
            bdoc.attr("inputmode", "numeric"),
            bdoc.attr("pattern", "[0-9]*"),
            bdoc.attr("value", customer.usersPerProject ?? 0),
            bdoc.eventListener("keydown", blockNonDigitInput),
            bdoc.eventListener("input", sanitizeDigitsOnlyInput),
            canWrite ? null : bdoc.attr("disabled", "true")
        );

        const elePerCollection = bdoc.ele(
            "input",
            bdoc.attr("type", "number"),
            bdoc.attr("id", "customer-ele-per-collection"),
            bdoc.attr("min", "0"),
            bdoc.attr("step", "1"),
            bdoc.attr("inputmode", "numeric"),
            bdoc.attr("pattern", "[0-9]*"),
            bdoc.attr("value", customer.elePerCollection ?? 0),
            bdoc.eventListener("keydown", blockNonDigitInput),
            bdoc.eventListener("input", sanitizeDigitsOnlyInput),
            canWrite ? null : bdoc.attr("disabled", "true")
        );

        const canUseApi = bdoc.ele(
            "input",
            bdoc.attr("type", "checkbox"),
            bdoc.attr("id", "customer-can-use-api"),
            customer.canUseApi ? bdoc.attr("checked", "true") : null,
            canWrite ? null : bdoc.attr("disabled", "true")
        );

        const saveButton = bdoc.ele(
            "button",
            "Save Customer",
            !canWrite ? bdoc.attr("disabled", "true") : null,
            bdoc.eventListener("click", async () => {
                const updated = this.#cleanForSave({
                    ...this.#customer,
                    name: nameInput.value.trim(),
                    description: descInput.value.trim(),
                    allowedProjects: digitsOnlyNumber(allowedProjects.value),
                    usersPerProject: digitsOnlyNumber(usersPerProject.value),
                    elePerCollection: digitsOnlyNumber(elePerCollection.value),
                    canUseApi: canUseApi.checked,
                });

                const customerId = this.#getCustomerId();
                const response = await MmCustomer.updateCustomer(
                    customerId,
                    updated
                ).catch(async (r) => {
                    await MmCustomer.handleError(r);
                    return null;
                });

                if (!response) return;
                this.#customer = { ...updated };
                alert("Customer updated.");
                this.#loadCustomer();
            })
        );

        bdoc.append(
            container,
            bdoc.ele(
                "div",
                bdoc.attr(
                    "style",
                    "display:grid;grid-template-columns:12em 1fr;gap:0.5em;align-items:center;max-width:48em;"
                ),
                bdoc.ele("strong", "Name"),
                nameInput,
                bdoc.ele("strong", "Description"),
                descInput,
                bdoc.ele("strong", "Allowed Projects"),
                allowedProjects,
                bdoc.ele("strong", "Users Per Project"),
                usersPerProject,
                bdoc.ele("strong", "Elements Per Collection"),
                elePerCollection,
                bdoc.ele("strong", "Can Use API"),
                canUseApi
            ),
            bdoc.ele("div", bdoc.attr("style", "margin-top:0.75em"), saveButton)
        );
    }

    #renderRoles() {
        const container = this.shadowRoot.querySelector("#roles-container");
        container.innerHTML = "";

        const canWrite = !!this.#customer._canWriteCustomer;
        const roleEntries = this.#customer.roles || [];
        const userOptions = [
            bdoc.ele("option", bdoc.attr("value", ""), "Select a user"),
            ...this.#users.map((user) =>
                bdoc.ele(
                    "option",
                    bdoc.attr("value", user.id),
                    MmCustomer.getUserLabel(user)
                )
            ),
        ];

        const newPrincipalIdSelect = bdoc.ele(
            "select",
            !canWrite ? bdoc.attr("disabled", "true") : null,
            ...userOptions
        );
        const newRoleSelect = bdoc.ele(
            "select",
            !canWrite ? bdoc.attr("disabled", "true") : null,
            bdoc.ele("option", bdoc.attr("value", "reader"), "reader"),
            bdoc.ele("option", bdoc.attr("value", "editor"), "editor"),
            bdoc.ele("option", bdoc.attr("value", "owner"), "owner")
        );
        const addRoleButton = bdoc.ele(
            "button",
            "Add User Permission",
            !canWrite ? bdoc.attr("disabled", "true") : null,
            bdoc.eventListener("click", async () => {
                const id = newPrincipalIdSelect.value.trim();
                if (!id) return;
                if (roleEntries.some((r) => r.id === id)) {
                    alert("Principal already has a role.");
                    return;
                }
                await this.#saveRoles([
                    ...roleEntries,
                    { id, role: newRoleSelect.value },
                ]);
            })
        );

        bdoc.append(
            container,
            bdoc.ele(
                "div",
                bdoc.attr(
                    "style",
                    "display:flex;gap:0.5em;align-items:center;flex-wrap:wrap;margin-bottom:0.75em"
                ),
                newPrincipalIdSelect,
                newRoleSelect,
                addRoleButton
            )
        );

        const filterTable = bdoc.ele(
            "mm-filter-table",
            bdoc.attr("id", "users-filter-table"),
            bdoc.attr("sort-properties", "ID,Type,Role"),
            bdoc.attr("slot", "dropdown-body"),
            bdoc.attr("first-col-width", "inherit")
        );

        filterTable.generateCols = () => ({
            ID: (entry) => entry.id,
            Type: (entry) => MmCustomer.principalTypeFromId(entry.id),
            Role: (entry) => {
                return bdoc.ele(
                    "select",
                    !canWrite ? bdoc.attr("disabled", "true") : null,
                    bdoc.ele(
                        "option",
                        bdoc.attr("value", "reader"),
                        entry.role === "reader"
                            ? bdoc.attr("selected", "true")
                            : null,
                        "reader"
                    ),
                    bdoc.ele(
                        "option",
                        bdoc.attr("value", "editor"),
                        entry.role === "editor"
                            ? bdoc.attr("selected", "true")
                            : null,
                        "editor"
                    ),
                    bdoc.ele(
                        "option",
                        bdoc.attr("value", "owner"),
                        entry.role === "owner"
                            ? bdoc.attr("selected", "true")
                            : null,
                        "owner"
                    ),
                    bdoc.eventListener("change", async (e) => {
                        const updatedRoles = roleEntries.map((r) =>
                            r.id === entry.id
                                ? { ...r, role: e.target.value }
                                : r
                        );
                        await this.#saveRoles(updatedRoles);
                    })
                );
            },
            Actions: (entry) =>
                bdoc.ele(
                    "td",
                    bdoc.attr(
                        "style",
                        "float: right; border: none; white-space: nowrap;"
                    ),
                    bdoc.ele(
                        "button",
                        bdoc.class("remove-button"),
                        bdoc.attr(
                            "style",
                            "border-color: white; background-color: #D32F2F; border-radius: 5px; color: white; cursor: pointer;"
                        ),
                        "⨉ Remove",
                        !canWrite ? bdoc.attr("disabled", "true") : null,
                        bdoc.eventListener("click", async () => {
                            if (!confirm(`Remove role for ${entry.id}?`)) return;
                            await this.#saveRoles(
                                roleEntries.filter((r) => r.id !== entry.id)
                            );
                        })
                    )
                ),
        });

        filterTable.customSorts = {
            ID: (a, b) => (a.id > b.id ? 1 : -1),
            Type: (a, b) =>
                MmCustomer.principalTypeFromId(a.id).localeCompare(
                    MmCustomer.principalTypeFromId(b.id)
                ),
            Role: (a, b) => {
                const roleOrder = ["owner", "editor", "reader"];
                return roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
            },
        };

        filterTable.customColStyles = {
            Actions: "width: 1%;",
        };

        bdoc.append(container, filterTable);
        filterTable.loadData(roleEntries);
    }

    #renderMembers() {
        const container = this.shadowRoot.querySelector("#members-container");
        container.innerHTML = "";

        const projectIds =
            this.#projects.length > 0
                ? this.#projects.map((project) => project.id || project)
                : Array.isArray(this.#customer._orgs)
                  ? this.#customer._orgs
                  : [];

        if (!projectIds.length) {
            bdoc.append(container, bdoc.ele("p", "No projects."));
            return;
        }

        const projects = projectIds.map((projectId) => ({
            id: projectId,
        }));

        const filterTable = bdoc.ele(
            "mm-filter-table",
            bdoc.attr("id", "projects-filter-table"),
            bdoc.attr("sort-properties", "ID"),
            bdoc.attr("first-col-width", "inherit")
        );

        filterTable.generateCols = () => ({
            ID: (project) =>
                bdoc.ele(
                    "a",
                    bdoc.attr("href", `/c/Project?id=${project.id}`),
                    project.id
                ),
        });

        filterTable.customSorts = {
            ID: (a, b) => (a.id > b.id ? 1 : -1),
        };

        bdoc.append(container, filterTable);
        filterTable.loadData(projects);
    }
}

customElements.define("mm-customer", MmCustomer);

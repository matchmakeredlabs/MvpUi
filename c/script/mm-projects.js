import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";
import MmCustomers from "./mm-customers.js";

export default class MmProjects extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    static getCustomerLabel = (customerMap, customerId) => {
        if (!customerId) return "";
        const customer = customerMap[customerId];
        return customer?.name || customer?.id || customerId;
    };

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    static canCreateProjects = () => {
        const acl = MmProjects.session.getCachedAcl();
        if (!acl) return false;
        if ("admin" in acl) return true;

        return Object.entries(acl).some(
            ([scope, perms]) =>
                scope !== "admincustomer" && perms.includes("WriteCustomer")
        );
    };

    static canWriteProject = (projectId) => {
        const acl = MmProjects.session.getCachedAcl();
        if (!acl) return false;
        if ("admin" in acl) return true;

        return acl[projectId]?.includes("WriteOrg") || false;
    };

    static canWriteCustomer = (customerId) => {
        const acl = MmProjects.session.getCachedAcl();
        if (!acl) return false;
        if ("admin" in acl) return true;

        return acl[customerId]?.includes("WriteCustomer") || false;
    };

    static fetchProjects = async () => {
        const response = await MmProjects.session.fetch("/api/orgs");
        return (await response.json()).items;
    };

    static fetchCustomers = async () => {
        try {
            return await MmCustomers.fetchCustomers();
        } catch {
            return [];
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
                bdoc.attr("href", "/c/res/mm-projects.css")
            ),
            bdoc.ele(
                "div",
                bdoc.class("header-container"),
                bdoc.ele(
                    "h2",
                    "Projects",
                    bdoc.attr("style", "margin-left: 1.5em")
                ),
                MmProjects.canCreateProjects()
                    ? bdoc.ele(
                          "button",
                          bdoc.attr("id", "create-project-button"),
                          bdoc.class("header-button add-entity-button2"),
                          "✐  Create New Project"
                      )
                    : null
            ),
            bdoc.ele(
                "mm-create-project-modal"
            ),
            bdoc.ele(
                "div",
                bdoc.attr("style", "max-height: 80%; margin: 20px"),
                bdoc.ele(
                    "mm-filter-table",
                    bdoc.attr("sort-properties", "name,Customer,description")
                ),
                bdoc.ele(
                    "script",
                    bdoc.attr("type", "module"),
                    bdoc.attr("src", "/c/script/mm-filter-table.js")
                ),
                bdoc.ele(
                    "script",
                    bdoc.attr("type", "module"),
                    bdoc.attr("src", "/c/script/mm-create-project-modal.js")
                )
            )
        );
        this.#renderProjects();
    }

    #renderProjects = async () => {
        const [projects, customers] = await Promise.all([
            MmProjects.fetchProjects(),
            MmProjects.fetchCustomers(),
        ]);
        const customerMap = Object.fromEntries(
            customers.map((customer) => [customer.id, customer])
        );

        customElements.whenDefined("mm-filter-table").then(() => {
            const table = this.shadowRoot.querySelector("mm-filter-table");
            table.generateCols = () => ({
                name: (project) => {
                    if (!MmProjects.canWriteProject(project.id)) {
                        return project.name;
                    }

                    return bdoc.ele(
                        "a",
                        bdoc.attr("href", `/c/Project?id=${project.id}`),
                        project.name
                    );
                },
                Customer: (project) => {
                    const customerId = project.customerId || project.customer || "";
                    if (!customerId) return "";
                    const label = MmProjects.getCustomerLabel(customerMap, customerId);
                    if (!MmProjects.canWriteCustomer(customerId)) {
                        return label;
                    }

                    return bdoc.ele(
                        "a",
                        bdoc.attr("href", `/c/Customer?id=${customerId}`),
                        label
                    );
                },
                description: (project) => project.description,
            });
            table.customSorts = {
                name: (a, b) => a.name.localeCompare(b.name),
                Customer: (a, b) =>
                    MmProjects.getCustomerLabel(
                        customerMap,
                        a.customerId || a.customer || ""
                    ).localeCompare(
                        MmProjects.getCustomerLabel(
                            customerMap,
                            b.customerId || b.customer || ""
                        )
                    ),
                description: (a, b) =>
                    (a.description || "").localeCompare(b.description || ""),
            };
            table.loadData(
                projects.map((project) => {
                    const customerId = project.customerId || project.customer || "";
                    return {
                        ...project,
                        Customer: MmProjects.getCustomerLabel(
                            customerMap,
                            customerId
                        ),
                    };
                })
            );

            const createProjectButton = this.shadowRoot.getElementById(
                "create-project-button"
            );
            if (!createProjectButton) return;

            customElements.whenDefined("mm-create-project-modal").then(() => {
                const createProjectModal = this.shadowRoot.querySelector(
                    "mm-create-project-modal"
                );
                if (createProjectModal) {
                    createProjectModal.onSuccess = async () => {
                        await this.#renderProjects();
                    };
                    createProjectButton.onclick = () => {
                        createProjectModal.show();
                    };
                }
            });
        });
    };
}
customElements.define("mm-projects", MmProjects);

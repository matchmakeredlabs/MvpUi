import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

export default class MmCustomers extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);
    static customerRoutes = [
        "/api/customers",
        "/api/customer",
        "/customers",
        "/customer",
    ];

    static truncateOneWord = (value, maxLength = 15) => {
        if (!value) return value;
        const text = `${value}`;
        return text.length > maxLength && !/\s/.test(text)
            ? `${text.slice(0, maxLength - 3)}...`
            : text;
    };

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    static canCreateCustomers = () => {
        const acl = MmCustomers.session.getCachedAcl();
        if (!acl) return false;
        if ("admin" in acl) return true;

        return acl.adminorganization?.includes("WriteCustomer") || false;
    };

    static canWriteCustomer = (customerId) => {
        const acl = MmCustomers.session.getCachedAcl();
        if (!acl) return false;
        if ("admin" in acl) return true;

        return acl[customerId]?.includes("WriteCustomer") || false;
    };

    static fetchCustomers = async () => {
        for (const route of MmCustomers.customerRoutes) {
            const response = await MmCustomers.session.fetch(route);
            if (response.status === 200) {
                const data = await response.json();
                return data.items || [];
            }
            // Only try alternate routes when endpoint is truly missing.
            // For auth/permission/validation statuses, fail immediately.
            if (response.status !== 404) return Promise.reject(response);
        }
        return Promise.reject(
            new Response(null, {
                status: 404,
                statusText: "Customers endpoint not found",
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
                bdoc.attr("href", "/c/res/mm-projects.css")
            ),
            bdoc.ele(
                "div",
                bdoc.class("header-container"),
                bdoc.ele(
                    "h2",
                    "Organizations",
                    bdoc.attr("style", "margin-left: 1.5em")
                ),
                MmCustomers.canCreateCustomers()
                    ? bdoc.ele(
                          "button",
                          bdoc.attr("id", "create-customer-button"),
                          bdoc.class("header-button add-entity-button2"),
                          "✐  Create New Organization"
                      )
                    : null
            ),
            bdoc.ele("mm-create-customer-modal"),
            bdoc.ele(
                "div",
                bdoc.class("list-table-container"),
                bdoc.ele(
                    "mm-filter-table",
                    bdoc.attr(
                        "sort-properties",
                        "name,description,allowedProjects,usersPerProject"
                    ),
                    bdoc.attr("first-col-width", "25%")
                ),
                bdoc.ele(
                    "script",
                    bdoc.attr("type", "module"),
                    bdoc.attr("src", "/c/script/mm-filter-table.js")
                ),
                bdoc.ele(
                    "script",
                    bdoc.attr("type", "module"),
                    bdoc.attr("src", "/c/script/mm-create-customer-modal.js")
                )
            )
        );
        this.#renderCustomers();
    }

    #renderCustomers = async () => {
        const customers = await MmCustomers.fetchCustomers().catch((response) => {
            MmCustomers.handleError(response);
            return [];
        });

        customElements.whenDefined("mm-filter-table").then(() => {
            const table = this.shadowRoot.querySelector("mm-filter-table");
            table.generateCols = () => ({
                name: (customer) => {
                    const label = customer.name || customer.id;
                    const displayLabel = MmCustomers.truncateOneWord(label);
                    return bdoc.ele(
                        "a",
                        bdoc.attr("href", `/c/Customer?id=${customer.id}`),
                        bdoc.attr("title", label),
                        displayLabel
                    );
                },
                description: (customer) =>
                    MmCustomers.truncateOneWord(customer.description || ""),
                allowedProjects: (customer) =>
                    customer.allowedProjects ?? "",
                usersPerProject: (customer) =>
                    customer.usersPerProject ?? "",
                canUseApi: (customer) => (customer.canUseApi ? "Yes" : "No"),
            });
            table.customSorts = {
                name: (a, b) =>
                    (a.name || a.id || "").localeCompare(b.name || b.id || ""),
                description: (a, b) =>
                    (a.description || "").localeCompare(b.description || ""),
                allowedProjects: (a, b) =>
                    (a.allowedProjects || 0) - (b.allowedProjects || 0),
                usersPerProject: (a, b) =>
                    (a.usersPerProject || 0) - (b.usersPerProject || 0),
            };
            table.loadData(
                customers.map((customer) => ({
                    ...customer,
                    canUseApiLabel: customer.canUseApi ? "Yes" : "No",
                }))
            );

            const createCustomerButton = this.shadowRoot.getElementById(
                "create-customer-button"
            );
            if (!createCustomerButton) return;

            customElements.whenDefined("mm-create-customer-modal").then(() => {
                const createCustomerModal = this.shadowRoot.querySelector(
                    "mm-create-customer-modal"
                );
                if (createCustomerModal) {
                    createCustomerModal.onSuccess = async () => {
                        await this.#renderCustomers();
                    };
                    createCustomerButton.onclick = () => {
                        createCustomerModal.show();
                    };
                }
            });
        });
    };
}

customElements.define("mm-customers", MmCustomers);

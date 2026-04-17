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

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

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
                "div",
                bdoc.class("header-container"),
                bdoc.ele(
                    "h2",
                    "Customers",
                    bdoc.attr("style", "margin-left: 1.5em")
                )
            ),
            bdoc.ele(
                "div",
                bdoc.attr("style", "max-height: 80%; margin: 20px"),
                bdoc.ele(
                    "mm-table",
                    bdoc.attr(
                        "sort-properties",
                        "name,description,allowedProjects,usersPerProject"
                    )
                ),
                bdoc.script("mm-table.js")
            )
        );
        this.#renderCustomers();
    }

    #renderCustomers = async () => {
        const customers = await MmCustomers.fetchCustomers().catch((response) => {
            MmCustomers.handleError(response);
            return [];
        });

        customElements.whenDefined("mm-table").then(() => {
            const table = this.shadowRoot.querySelector("mm-table");
            table.cols = {
                name: (customer) =>
                    bdoc.ele(
                        "a",
                        bdoc.attr("href", `/c/Customer?id=${customer.id}`),
                        customer.name || customer.id
                    ),
                description: (customer) => customer.description || "",
                allowedProjects: (customer) =>
                    customer.allowedProjects ?? "",
                usersPerProject: (customer) =>
                    customer.usersPerProject ?? "",
                canUseApi: (customer) => (customer.canUseApi ? "Yes" : "No"),
            };
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
            table.data = customers;
        });
    };
}

customElements.define("mm-customers", MmCustomers);

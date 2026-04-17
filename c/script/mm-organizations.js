import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";
import MmCustomers from "./mm-customers.js";

export default class MmOrganizations extends HTMLElement {
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

    static fetchOrganizations = async () => {
        const response = await MmOrganizations.session.fetch("/api/orgs");
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
                bdoc.attr("href", "/c/res/mm-organizations.css")
            ),
            bdoc.ele(
                "div",
                bdoc.class("header-container"),

                bdoc.ele(
                    "h2",
                    "Organizations",
                    bdoc.attr("style", "margin-left: 1.5em")
                )

                // bdoc.ele(
                //     "button",
                //     bdoc.class("header-button add-entity-button2"),
                //     "✐  Create New Organization"
                // )
            ),
            bdoc.ele(
                "div",
                bdoc.attr("style", "max-height: 80%; margin: 20px"),
                bdoc.ele(
                    "mm-table",
                    bdoc.attr("sort-properties", "name,Customer,description")
                ),
                bdoc.ele(
                    "script",
                    bdoc.attr("type", "module"),
                    bdoc.attr("src", "/c/script/mm-table.js")
                )
            )
        );
        this.#renderOrganizations();
    }

    #renderOrganizations = async () => {
        const [organizations, customers] = await Promise.all([
            MmOrganizations.fetchOrganizations(),
            MmOrganizations.fetchCustomers(),
        ]);
        const customerMap = Object.fromEntries(
            customers.map((customer) => [customer.id, customer])
        );

        customElements.whenDefined("mm-table").then(() => {
            const table = this.shadowRoot.querySelector("mm-table");
            table.cols = {
                name: (org) =>
                    bdoc.ele(
                        "a",
                        bdoc.attr("href", `/c/Organization?id=${org.id}`),
                        org.name
                    ),
                Customer: (org) => {
                    const customerId = org.customerId || org.customer || "";
                    if (!customerId) return "";
                    return bdoc.ele(
                        "a",
                        bdoc.attr("href", `/c/Customer?id=${customerId}`),
                        MmOrganizations.getCustomerLabel(customerMap, customerId)
                    );
                },
                description: (org) => org.description,
            };
            table.customSorts = {
                name: (a, b) => a.name.localeCompare(b.name),
                Customer: (a, b) =>
                    MmOrganizations.getCustomerLabel(
                        customerMap,
                        a.customerId || a.customer || ""
                    ).localeCompare(
                        MmOrganizations.getCustomerLabel(
                            customerMap,
                            b.customerId || b.customer || ""
                        )
                    ),
                description: (a, b) =>
                    (a.description || "").localeCompare(b.description || ""),
            };
            table.data = organizations;
        });
    };
}
customElements.define("mm-organizations", MmOrganizations);

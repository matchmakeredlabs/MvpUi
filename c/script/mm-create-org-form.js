import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import config from "/config.js";

export default class MmCreateOrgForm extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    static customerRoutes = [
        "/api/customers",
        "/api/customer",
        "/customers",
        "/customer",
    ];

    static orgRoutes = ["/api/orgs", "/api/org", "/orgs", "/org"];

    static fetchCustomers = async () => {
        for (const route of MmCreateOrgForm.customerRoutes) {
            const response = await MmCreateOrgForm.session.fetch(route);
            if (response.status === 200) {
                const json = await response.json();
                return json.items || [];
            }
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

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    onSettled = () => {};

    #submitCreateOrg = async (event) => {
        event.preventDefault();

        const formData = new FormData(event.target);
        const currentUserId = MmCreateOrgForm.session.getCachedUserID();

        const variables = {
            name: formData.get("name"),
            customerId: formData.get("customer"),
            members: currentUserId
                ? [{ id: currentUserId.toLowerCase(), role: "owner" }]
                : [],
        };
        const description = formData.get("description");
        if (description) {
            if (description.trim() == "") {
                variables.description = ""
            }
            variables.description = formData.get("description");
        } else {
            variables.description = ""
        }
        const response = await MmCreateOrgForm.createOrg(variables);

        this.onSettled(variables, response);
    };

    static createOrg = async (orgObj) => {
        for (const route of MmCreateOrgForm.orgRoutes) {
            const payloadCustomerId = {
                ...orgObj,
                customerId: orgObj.customerId,
            };
            const payloadCustomer = {
                ...orgObj,
                customer: orgObj.customerId,
            };
            const payloadNoCustomer = { ...orgObj };
            delete payloadNoCustomer.customerId;
            delete payloadNoCustomer.customer;

            const attempts = [
                {
                    url: route,
                    payload: payloadCustomerId,
                },
                {
                    url: route,
                    payload: payloadCustomer,
                },
                {
                    url: `${route}?customerId=${encodeURIComponent(
                        orgObj.customerId || ""
                    )}`,
                    payload: payloadNoCustomer,
                },
                {
                    url: `${route}?customer=${encodeURIComponent(
                        orgObj.customerId || ""
                    )}`,
                    payload: payloadNoCustomer,
                },
            ];

            let lastResponse = null;
            for (const attempt of attempts) {
                const response = await MmCreateOrgForm.session.fetch(
                    attempt.url,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(attempt.payload),
                    }
                );

                if (response.status === 200) return response;
                if (response.status !== 404) {
                    lastResponse = response;
                }
            }

            if (lastResponse) return lastResponse;
        }
        return new Response(null, {
            status: 404,
            statusText: "Organization create endpoint not found",
        });
    };

    getInnerForm = () => {
        return this.shadowRoot.querySelector("form");
    };

    submit = () => {
        this.getInnerForm().dispatchEvent(
            new Event("submit", { cancelable: true })
        );
    };

    #populateCustomers = async () => {
        const customers = await MmCreateOrgForm.fetchCustomers().catch(
            async (response) => {
                await MmCreateOrgForm.handleError(response);
                return [];
            }
        );

        const customerSelect = this.shadowRoot.querySelector("#customer");
        if (!customerSelect) return;
        customerSelect.innerHTML = "";

        const eligibleCustomers = customers.filter(
            (customer) => customer._canCreateOrgs !== false
        );

        bdoc.append(
            customerSelect,
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
            bdoc.append(
                customerSelect,
                bdoc.ele(
                    "option",
                    bdoc.attr("value", customer.id),
                    customer.name || customer.id
                )
            );
        }

        if (!eligibleCustomers.length) {
            customerSelect.setAttribute("disabled", "true");
        } else {
            customerSelect.removeAttribute("disabled");
        }
    };

    connectedCallback() {
        const formGroupsContainer = bdoc.ele(
            "div",
            bdoc.class("form-groups-container"),

                bdoc.ele(
                    "div",
                    bdoc.class("form-group"),
                    bdoc.ele(
                        "label",
                        bdoc.attr("for", "name"),
                        "Project Name",
                        bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                    ),
                    bdoc.ele(
                        "input",
                        bdoc.attr("type", "text"),
                        bdoc.attr("id", "name"),

                        bdoc.attr("placeholder", "Acme Anvils"),
                        bdoc.attr("name", "name"),
                        bdoc.attr("required", "true")
                    )
                ),

                bdoc.ele(
                    "div",
                    bdoc.class("form-group"),
                    bdoc.ele(
                        "label",
                        bdoc.attr("for", "customer"),
                        "Customer Name",
                        bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                    ),
                    bdoc.ele(
                        "select",
                        bdoc.attr("id", "customer"),
                        bdoc.attr("name", "customer"),
                        bdoc.attr("required", "true")
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
                bdoc.eventListener("submit", this.#submitCreateOrg),
                formGroupsContainer,
                bdoc.ele("slot", bdoc.attr("name", "form-footer"))
            )
        );

        this.#populateCustomers();
    }
}

customElements.define("mm-create-org-form", MmCreateOrgForm);

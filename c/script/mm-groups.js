import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";
import MmCustomers from "./mm-customers.js";

export default class MmGroups extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    #onPageShow;

    static getOwnedByType = (group) => {
        return group.customerId || group.customer || group.ownerType === "customer"
            ? "Customer"
            : "Project";
    };

    static getOwnedById = (group) => {
        return group.customerId || group.customer || group.org || group.orgId || "";
    };

    static getCustomerLabel = (customerMap, customerId) => {
        if (!customerId) return "";
        const customer = customerMap[customerId];
        return customer?.name || customer?.id || customerId;
    };

    static getOwnedByLabel = (group, customerMap) => {
        const ownerType = MmGroups.getOwnedByType(group);
        const ownerId = MmGroups.getOwnedById(group);
        if (!ownerId) return ownerType;

        if (ownerType === "Customer") {
            return `${ownerType}: ${MmGroups.getCustomerLabel(customerMap, ownerId)}`;
        }

        return `${ownerType}: ${ownerId}`;
    };

    static renderOwnedBy = (group, cachedAcl, customerMap) => {
        const ownerType = MmGroups.getOwnedByType(group);
        const ownerId = MmGroups.getOwnedById(group);

        if (!ownerId) {
            return ownerType;
        }

        if (ownerType === "Customer") {
            const label = MmGroups.getCustomerLabel(customerMap, ownerId);
            if (!MmGroups.canWriteCustomer(ownerId)) {
                return `${ownerType}: ${label}`;
            }

            return bdoc.ele(
                "span",
                `${ownerType}: `,
                bdoc.ele(
                    "a",
                    bdoc.attr("href", `/c/Customer?id=${ownerId}`),
                    label
                )
            );
        }

        return bdoc.ele(
            "span",
            `${ownerType}: `,
            MmGroups.canWriteProject(ownerId)
                ? bdoc.ele(
                      "a",
                      bdoc.attr("href", `/c/Project?id=${ownerId}`),
                      ownerId
                  )
                : ownerId
        );
    };

    static fetchCustomers = async () => {
        try {
            return await MmCustomers.fetchCustomers();
        } catch {
            return [];
        }
    };

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    static fetchGroups = async () => {
        const response = await MmGroups.session.fetch("/api/groups");
        return (await response.json()).items;
    };

    static canReadGroups = () => {
        const acl = MmGroups.session.getCachedAcl();
        if (!acl) return false;
        if ("admin" in acl) return true;

        return Object.values(acl).some((perms) => perms.includes("ReadGroup"));
    };

    static canCreateGroups = () => {
        const acl = MmGroups.session.getCachedAcl();
        if (!acl) return false;
        if ("admin" in acl) return true;

        return Object.values(acl).some(
            (perms) => perms.includes("WriteGroup")
        ) || Object.entries(acl).some(
            ([scope, perms]) =>
                scope !== "admincustomer" && perms.includes("WriteCustomer")
        );
    };

    static canWriteGroup = (group) => {
        const acl = MmGroups.session.getCachedAcl();
        if (!acl) return false;
        if ("admin" in acl) return true;

        return acl[group.org]?.includes("WriteGroup") || false;
    };

    static canWriteCustomer = (customerId) => {
        const acl = MmGroups.session.getCachedAcl();
        if (!acl) return false;
        if ("admin" in acl) return true;

        return acl[customerId]?.includes("WriteCustomer") || false;
    };

    static canWriteProject = (projectId) => {
        const acl = MmGroups.session.getCachedAcl();
        if (!acl) return false;
        if ("admin" in acl) return true;

        return acl[projectId]?.includes("WriteOrg") || false;
    };

    #renderShell() {
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
                bdoc.attr("href", "/c/res/mm-groups.css")
            ),
            MmGroups.canCreateGroups()
                ? bdoc.ele(
                      "div",
                      bdoc.class("header-container"),
                      bdoc.ele(
                          "h2",
                          "My Groups",
                          bdoc.attr("style", "margin-left: 1.5em")
                      ),
                      bdoc.ele(
                          "button",
                          bdoc.attr("id", "create-group-button"),
                          bdoc.class("header-button add-entity-button2"),
                          "✐  Create New Group"
                      )
                  )
                : bdoc.ele(
                      "div",
                      bdoc.class("header-container"),
                      bdoc.ele(
                          "h2",
                          "My Groups",
                          bdoc.attr("style", "margin-left: 1.5em")
                      )
                  ),
            bdoc.ele(
                "mm-filter-table",
                bdoc.attr("style", "height: 100%"),
                bdoc.attr("filter-properties", "ownedByType"),
                bdoc.attr(
                    "filter-display-names",
                    JSON.stringify({ ownedByType: "Owned by" })
                ),
                bdoc.attr("sort-properties", "name,Owned by"),
                bdoc.attr("first-col-width", "40%"),
            ),
            bdoc.ele("mm-create-group-modal"),
            bdoc.script("mm-filter-table.js"),
            bdoc.script("mm-create-group-modal.js")
        );
    }

    #reloadPage = async () => {
        this.shadowRoot.innerHTML = "";
        this.#renderShell();
        await this.#renderGroups();
    };

    connectedCallback() {
        if (!MmGroups.canReadGroups()) {
            bdoc.append(
                this.shadowRoot,
                bdoc.ele(
                    "link",
                    bdoc.attr("rel", "stylesheet"),
                    bdoc.attr("href", "/c/res/styles.css")
                ),
                bdoc.ele("h2", "My Groups"),
                bdoc.ele("p", "You do not have permission to view groups.")
            );
            return;
        }

        this.#renderShell();

        // Browser back/forward can restore this page from BFCache with stale data.
        // Re-render on pageshow so newly created groups appear without manual refresh.
        this.#onPageShow = () => {
            this.#reloadPage();
        };
        window.addEventListener("pageshow", this.#onPageShow);

        this.#renderGroups();
    }

    disconnectedCallback() {
        if (this.#onPageShow) {
            window.removeEventListener("pageshow", this.#onPageShow);
        }
    }

    #renderGroups = async () => {
        const filterTable = this.shadowRoot.querySelector("mm-filter-table");
        if (!filterTable) return;

        filterTable.data = [];

        let loadingRow = this.shadowRoot.getElementById("groups-loading");
        if (!loadingRow) {
            loadingRow = bdoc.ele(
                "p",
                bdoc.attr("id", "groups-loading"),
                "Loading groups..."
            );
            this.shadowRoot.appendChild(loadingRow);
        }

        const [groups, customers] = await Promise.all([
            MmGroups.fetchGroups(),
            MmGroups.fetchCustomers(),
        ]);
        const customerMap = customers.reduce((acc, customer) => {
            acc[customer.id] = customer;
            return acc;
        }, {});
        const cachedAcl = MmGroups.session.getCachedAcl();

        Promise.all([
            customElements.whenDefined("mm-filter-table"),
            customElements.whenDefined("mm-create-group-modal"),
        ]).then(() => {
            const toTableRow = (group) => ({
                ...group,
                ownedByType: MmGroups.getOwnedByType(group),
            });

            filterTable.generateCols = () => ({
                name: (group) => {
                    if (!MmGroups.canWriteGroup(group)) {
                        return group.name;
                    }

                    return bdoc.ele(
                        "a",
                        bdoc.attr("href", `/c/Group?id=${group.id}`),
                        group.name
                    );
                },
                ["Owned by"]: (group) =>
                    MmGroups.renderOwnedBy(group, cachedAcl, customerMap),
                description: (group) =>
                    group.description
                        ? bdoc.ele(
                              "td",
                              bdoc.attr("style", "max-width: 500px"),
                              group.description
                          )
                        : "",
            });

            filterTable.customSorts = {
                ["Owned by"]: (a, b) =>
                    MmGroups.getOwnedByLabel(a, customerMap).localeCompare(
                        MmGroups.getOwnedByLabel(b, customerMap)
                    ),
                name: (a, b) =>
                    a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1,
            };
            filterTable.loadData(groups.map(toTableRow));

            const createGroupButton = this.shadowRoot.getElementById(
                "create-group-button"
            );
            const createGroupModal = this.shadowRoot.querySelector(
                "mm-create-group-modal"
            );
            if (createGroupButton && createGroupModal) {
                createGroupModal.onSuccess = async () => {
                    await this.#reloadPage();
                };
                createGroupButton.onclick = () => {
                    createGroupModal.show();
                };
            }

            loadingRow?.remove();
        });
    };
}
customElements.define("mm-groups", MmGroups);

import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

export default class MmGroups extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    #onPageShow;

    static getOwnedByType = (group) => {
        return group.customerId || group.customer || group.ownerType === "customer"
            ? "Organization"
            : "Project";
    };

    static getOwnedById = (group) => {
        return group.customerId || group.customer || group.project || group.projectId || group.org || "";
    };

    static truncateOneWord = (value, maxLength = 15) => {
        if (!value) return value;
        const text = `${value}`;
        return text.length > maxLength && !/\s/.test(text)
            ? `${text.slice(0, maxLength - 3)}...`
            : text;
    };

    static getOwnedByLabel = (group) => {
        const ownerType = MmGroups.getOwnedByType(group);
        const ownerId = MmGroups.getOwnedById(group);
        return ownerId ? `${ownerType}: ${ownerId}` : ownerType;
    };

    static renderOwnedBy = (group) => {
        const ownerType = MmGroups.getOwnedByType(group);
        const ownerId = MmGroups.getOwnedById(group);

        if (!ownerId) {
            return ownerType;
        }

        if (ownerType === "Organization") {
            return bdoc.ele(
                "span",
                `${ownerType}: `,
                bdoc.ele(
                    "a",
                    bdoc.attr("href", `/c/Customer?id=${ownerId}`),
                    ownerId
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

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    static fetchGroups = async () => {
        const response = await MmGroups.session.fetch("/api/groups");
        const text = await response.text();
        const body = text ? JSON.parse(text) : {};

        if (!response.ok) {
            const message = body.Message || body.message || body.title || text || response.statusText;
            throw new Error(`HTTP ${response.status} ${response.statusText}: ${message}`);
        }

        return body.items || [];
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

        return acl[MmGroups.getOwnedById(group)]?.includes("WriteGroup") || false;
    };

    static canWriteProject = (projectId) => {
        const acl = MmGroups.session.getCachedAcl();
        if (!acl) return false;
        if ("admin" in acl) return true;

        return acl[projectId]?.includes("WriteProject") || false;
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
                bdoc.class("list-table"),
                bdoc.attr("filter-properties", "ownedByType"),
                bdoc.attr(
                    "filter-display-names",
                    JSON.stringify({ ownedByType: "Owned by" })
                ),
                bdoc.attr("sort-properties", "name,Owned by"),
                bdoc.attr("first-col-width", "25%"),
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
        this.#onPageShow = (event) => {
            if (event.persisted) {
                this.#reloadPage();
            }
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

        let groups;
        try {
            groups = await MmGroups.fetchGroups();
        } catch (err) {
            await customElements.whenDefined("mm-filter-table");
            filterTable.loadData([]);
            bdoc.append(
                this.shadowRoot,
                bdoc.ele("p", `Failed to load groups: ${err.message}`)
            );
            return;
        }

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
                    const label = MmGroups.truncateOneWord(group.name);
                    if (!MmGroups.canWriteGroup(group)) {
                        return label;
                    }

                    return bdoc.ele(
                        "a",
                        bdoc.attr("href", `/c/Group?id=${group.id}`),
                        bdoc.attr("title", group.name),
                        label
                    );
                },
                ["Owned by"]: (group) => MmGroups.renderOwnedBy(group),
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
                    MmGroups.getOwnedByLabel(a).localeCompare(MmGroups.getOwnedByLabel(b)),
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
        });
    };
}
customElements.define("mm-groups", MmGroups);

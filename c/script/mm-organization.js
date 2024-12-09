import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";
import MmAddUser from "./mm-add-user.js";

export default class MmOrganization extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    #groups = [];
    #users = [];

    #permissions = new Set();

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    static fetchOrganization = async (orgId) => {
        const response = await MmOrganization.session.fetch(
            "/api/orgs/" + orgId
        );

        // if (response.status !== 200) {
        //     MmOrganization.handleError(response);
        //     return Promise.reject();
        // }

        return await response.json();
        // what happens when user does not have perms for org?
    };

    static updateOrg = async (orgId, orgObj) => {
        const response = await MmOrganization.session.fetch(
            "/api/orgs/" + orgId,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(orgObj),
            }
        );

        if (response.status !== 200) {
            MmOrganization.handleError(response);
            return Promise.reject();
        }

        return await response.json();
    };

    static removeEntityFromOrg = async (orgId, entityId) => {
        const currentOrg = await MmOrganization.fetchOrganization(orgId);
        const newMembers = currentOrg.members.filter(
            (member) => member.id !== entityId
        );
        if (newMembers.length === currentOrg.members.length) {
            alert(`${entityId} not found in organization ${orgId}`);
            return;
        }

        return await MmOrganization.updateOrg(orgId, {
            ...currentOrg,
            members: newMembers,
        });
    };

    static updateEntityRoleInOrg = async (orgId, entityId, newRole) => {
        const currentOrg = await MmOrganization.fetchOrganization(orgId);
        const newMembers = currentOrg.members.map((member) =>
            member.id === entityId ? { ...member, role: newRole } : member
        );

        return await MmOrganization.updateOrg(orgId, {
            ...currentOrg,
            members: newMembers,
        });
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
                bdoc.attr("href", "/c/res/mm-organization.css")
            ),
            bdoc.ele(
                "div",
                bdoc.class("headers-container"),
                bdoc.ele("h2", `Organization`)
            ),
            bdoc.ele("div", bdoc.class("dropdowns-container")),
            bdoc.ele("mm-modal", bdoc.id("add-user-modal")),
            bdoc.ele("mm-modal", bdoc.id("add-group-modal")),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-filter-table.js")
            ),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-dropdown.js")
            ),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-modal.js")
            ),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-add-user.js")
            ),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-add-group.js")
            )
        );
        this.#renderOrganization();
    }

    static handleError = async (response) => {
        const body = await response.json();
        if (body.error) alert(body.error);
        if (body.log) alert(body.log[0].message);
    };

    static splitUsersAndGroups = (organization) => {
        const users = [];
        const groups = [];
        for (let member of organization.members) {
            if (member.id.includes(":")) {
                const [org, groupId] = member.id.split(":");
                groups.push({
                    ...member,
                    org,
                    groupId,
                });
            } else {
                users.push(member);
            }
        }
        return { users, groups };
    };

    #renderOrganization = async () => {
        const orgId = new URLSearchParams(window.location.search).get("org");
        // const orgId = new URL(window.location.href).pathname.split("/").pop();

        if (!orgId) {
            window.location.href = "/c/Organizations";
        }
        const organization = await MmOrganization.fetchOrganization(orgId);
        // add check to ensure org returned with no issues
        if (!organization) {
            return; // temp, should redirect to organizations
        }

        if (organization._canUpdate) {
            this.#permissions.add("update");
        }
        if (organization._canWriteGroups) {
            this.#permissions.add("writeGroups");
        }

        const { users, groups } =
            MmOrganization.splitUsersAndGroups(organization);
        this.#groups = groups;
        this.#users = users;

        const headerContainer =
            this.shadowRoot.querySelector(".headers-container");
        bdoc.append(headerContainer, bdoc.ele("h3", `${organization.name}`));

        Promise.all([
            customElements.whenDefined("mm-filter-table"),
            customElements.whenDefined("mm-add-user"),
            customElements.whenDefined("mm-add-group"),
            customElements.whenDefined("mm-modal"),
        ]).then(() => {
            const dropdownsContainer = this.shadowRoot.querySelector(
                ".dropdowns-container"
            );
            if (this.#users.length > 0) {
                const usersFilterTable = bdoc.ele(
                    "mm-filter-table",
                    bdoc.attr("id", "users-filter-table"),
                    bdoc.attr("filter-properties", "role"),
                    bdoc.attr("sort-properties", "id, role"),
                    bdoc.attr("slot", "dropdown-body")
                );

                bdoc.append(
                    dropdownsContainer,
                    bdoc.ele(
                        "mm-dropdown",
                        bdoc.attr("id", "users-dropdown"),
                        usersFilterTable,
                        bdoc.ele(
                            "h3",
                            "Users",
                            bdoc.attr("style", "margin: 0;"),
                            bdoc.attr("slot", "button-text")
                        )
                    )
                );

                usersFilterTable.addCustomStylesheets(
                    "/c/res/mm-organization.css"
                );

                const usersFilterTableCols = {
                    ID: (user) => user.id,
                    role: (user) => user.role,
                };

                if (this.#permissions.has("update")) {
                    const addUserModal =
                        this.shadowRoot.getElementById("add-user-modal");

                    const addUserForm = bdoc.ele(
                        "mm-add-user",
                        bdoc.attr("type", "org"),
                        bdoc.attr("entity-id", orgId),
                        bdoc.ele(
                            "div",
                            bdoc.class("modal-footer"),
                            bdoc.attr("slot", "form-footer"),
                            bdoc.ele(
                                "button",
                                bdoc.class("header-button cancel-button"),
                                "Cancel",
                                bdoc.eventListener("click", () => {
                                    addUserModal.hide();
                                })
                            ),
                            bdoc.ele(
                                "button",
                                bdoc.class("header-button add-entity-button"),
                                "Add User",
                                bdoc.eventListener("click", () => {
                                    addUserForm.submit();
                                })
                            )
                        )
                    );
                    addUserForm.onSubmit = async (variables, response) => {
                        if (response) {
                            if (response.status !== 200) {
                                MmOrganization.handleError(response);
                                return;
                            }
                            this.#users.push(variables);
                            usersFilterTable.loadData(this.#users);
                            addUserModal.hide();
                        }
                    };
                    bdoc.append(
                        addUserModal,
                        bdoc.ele(
                            "h2",
                            "Add User",
                            bdoc.attr("style", "margin-left: 18px;")
                        ),
                        addUserForm
                    );

                    const buttonGroup = bdoc.ele(
                        "div",
                        bdoc.class("button-group"),
                        bdoc.attr("slot", "header"),
                        bdoc.ele(
                            "button",
                            bdoc.attr("id", "add-user-button"),
                            bdoc.class("header-button add-entity-button"),
                            "Add User",
                            bdoc.eventListener("click", () => {
                                addUserModal.show();
                            })
                        )
                    );

                    usersFilterTableCols.role = (user) => {
                        if (user.role === "owner") {
                            return "owner";
                        }
                        return bdoc.ele(
                            "select",
                            bdoc.class("role-select"),
                            ...MmAddUser.roles.map((role) => {
                                if (role === user.role) {
                                    return bdoc.ele(
                                        "option",
                                        bdoc.attr("value", role),
                                        bdoc.attr("selected"),
                                        role
                                    );
                                }
                                return bdoc.ele(
                                    "option",
                                    bdoc.attr("value", role),

                                    role
                                );
                            }),
                            bdoc.eventListener("change", (event) => {
                                const newRole = event.target.value;

                                MmOrganization.updateEntityRoleInOrg(
                                    orgId,
                                    user.id,
                                    newRole
                                ).then(
                                    () => {
                                        this.#users = this.#users.map((u) =>
                                            u.id === user.id
                                                ? { ...u, role: newRole }
                                                : u
                                        );
                                        usersFilterTable.loadData(this.#users);
                                    },
                                    () => {
                                        event.target.value = user.role;
                                    }
                                );
                            })
                        );
                    };

                    usersFilterTableCols[""] = (user) => {
                        if (user.role === "owner") {
                            return "";
                        }
                        return bdoc.ele(
                            "button",
                            bdoc.class("remove-button"),
                            "Remove From Organization",
                            bdoc.eventListener("click", () => {
                                const confirmRemove = confirm(
                                    `Are you sure you want to remove ${user.id} from the organization?`
                                );
                                if (confirmRemove) {
                                    MmOrganization.removeEntityFromOrg(
                                        orgId,
                                        user.id
                                    ).then(() => {
                                        this.#users = this.#users.filter(
                                            (u) => u.id !== user.id
                                        );

                                        usersFilterTable.loadData(this.#users);
                                        console.log(this.#users);
                                    });
                                }
                            })
                        );
                    };

                    bdoc.append(usersFilterTable, buttonGroup);
                }

                usersFilterTable.generateCols = () => usersFilterTableCols;
                usersFilterTable.loadData(this.#users);
            }

            if (this.#groups.length > 0) {
                const groupsFilterTable = bdoc.ele(
                    "mm-filter-table",
                    bdoc.attr("id", "groups-filter-table"),
                    bdoc.attr("filter-properties", "role,org"),
                    bdoc.attr("sort-properties", "groupId,role,org"),
                    bdoc.attr("slot", "dropdown-body")
                );

                if (this.#permissions.has("update")) {
                    const addGroupModal =
                        this.shadowRoot.getElementById("add-group-modal");
                    bdoc.append(
                        addGroupModal,
                        bdoc.ele(
                            "h2",
                            "Add Existing Group",
                            bdoc.attr("style", "margin-left: 18px;")
                        ),
                        bdoc.ele(
                            "mm-add-group",
                            bdoc.attr("type", "org"),
                            bdoc.attr("entity-id", orgId),
                            bdoc.ele(
                                "div",
                                bdoc.class("modal-footer"),
                                bdoc.attr("slot", "form-footer"),
                                bdoc.ele(
                                    "button",
                                    bdoc.class("header-button cancel-button"),
                                    "Cancel",
                                    bdoc.eventListener("click", () => {
                                        addGroupModal.hide();
                                    })
                                ),
                                bdoc.ele(
                                    "button",
                                    bdoc.class(
                                        "header-button add-entity-button"
                                    ),
                                    "Add Group",
                                    bdoc.attr("type", "submit")
                                )
                            )
                        )
                    );

                    const buttonGroup = bdoc.ele(
                        "div",
                        bdoc.class("button-group"),
                        bdoc.attr("slot", "header"),
                        bdoc.ele(
                            "button",
                            bdoc.attr("id", "add-group-button"),
                            bdoc.class("header-button add-entity-button"),
                            "Add Existing Group",
                            bdoc.eventListener("click", () => {
                                addGroupModal.show();
                            })
                        )
                    );

                    bdoc.append(groupsFilterTable, buttonGroup);
                }

                bdoc.append(
                    dropdownsContainer,
                    bdoc.ele(
                        "mm-dropdown",
                        bdoc.attr("id", "groups-dropdown"),
                        groupsFilterTable,
                        bdoc.ele(
                            "h3",
                            "Groups",
                            bdoc.attr("style", "margin: 0;"),
                            bdoc.attr("slot", "button-text")
                        )
                    )
                );

                groupsFilterTable.addCustomStylesheets(
                    "/c/res/mm-organization.css"
                );

                groupsFilterTable.generateCols = () => ({
                    name: (group) => group.groupId,
                    role: (group) => group.role,
                    ["Owned by"]: (group) => group.org,
                });
                groupsFilterTable.loadData(this.#groups);
            }
        });
    };
}
customElements.define("mm-organization", MmOrganization);

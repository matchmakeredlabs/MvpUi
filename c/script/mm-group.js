import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

export default class MmGroup extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    groups = [];
    users = [];
    roles = [];

    #group;

    #permissions = new Set();

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    static fetchGroup = async (groupId) => {
        const response = await MmGroup.session.fetch("/api/groups/" + groupId);

        if (response.status !== 200) {
            return Promise.reject(response);
        }

        return await response.json();
    };

    static updateGroup = async (groupId, groupObj) => {
        const response = await MmGroup.session.fetch("/api/groups/" + groupId, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(groupObj),
        });

        if (response.status !== 200) {
            MmGroup.handleError(response);
            return Promise.reject();
        }

        return await response.json();
    };

    static renderLinkIfCachedPermsOnOrg = (orgId, cachedAcl) => {
        return orgId in cachedAcl || "admin" in cachedAcl
            ? bdoc.ele(
                  "a",
                  bdoc.attr("href", `/c/Organization?id=${orgId}`),
                  orgId
              )
            : orgId;
    };

    // static renderLinkIfCachedPermsOnGroup = (groupId, cachedAcl) => {
    //     return (groupId in cachedAcl && cachedAcl[groupId].includes("")) || "admin" in cachedAcl
    //         ? bdoc.ele("a", bdoc.attr("href", `/c/Group?id=${groupId}`), groupId)
    //         : groupId;
    // };

    static removeEntityFromGroup = async (groupId, entityId) => {
        const currentGroup = await MmGroup.fetchGroup(groupId);
        const newMembers = currentGroup.members.filter(
            (member) => member !== entityId
        );
        if (newMembers.length === currentGroup.members.length) {
            alert(`${entityId} not found in group ${groupId}`);
            return;
        }

        return await MmGroup.updateGroup(groupId, {
            ...currentGroup,
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
                bdoc.attr("href", "/c/res/mm-group.css")
            ),
            bdoc.ele(
                "div",
                bdoc.class("headers-container"),
                bdoc.ele(
                    "div",
                    bdoc.class("header-buttons"),
                    bdoc.id("delete-container"),
                    bdoc.ele("h2", `Group`)
                )
            ),
            bdoc.ele(
                "div",
                bdoc.class("dropdowns-container"),
                bdoc.ele(
                    "mm-dropdown",
                    bdoc.attr("id", "roles-dropdown"),
                    bdoc.ele(
                        "h3",
                        "Roles",
                        bdoc.attr("style", "margin: 0;"),
                        bdoc.attr("slot", "button-text")
                    )
                ),
                bdoc.ele(
                    "mm-dropdown",
                    bdoc.attr("id", "users-dropdown"),
                    bdoc.ele(
                        "h3",
                        "Users",
                        bdoc.attr("style", "margin: 0;"),
                        bdoc.attr("slot", "button-text")
                    )
                ),
                bdoc.ele(
                    "mm-dropdown",
                    bdoc.attr("id", "groups-dropdown"),
                    bdoc.ele(
                        "h3",
                        "Groups",
                        bdoc.attr("style", "margin: 0;"),
                        bdoc.attr("slot", "button-text")
                    )
                )
            ),

            bdoc.script("mm-filter-table.js"),
            bdoc.script("mm-dropdown.js"),
            bdoc.script("mm-create-group-modal.js"),
            bdoc.script("mm-add-member-modal.js")
        );
        this.#renderGroup();
    }

    static handleError = async (response) => {
        const body = await response.json();
        if (body.error) alert(body.error);
        if (body.log) alert(body.log[0].message);
    };

    static splitUsersAndGroups = (group) => {
        const users = [];
        const groups = [];
        if (!group.members) return { users, groups };
        for (let memberId of group.members) {
            if (memberId.includes(":")) {
                const [org, groupId] = memberId.split(":");
                groups.push({
                    id: memberId,
                    org,
                    groupId,
                });
            } else {
                users.push({ id: memberId });
            }
        }
        return { users, groups };
    };

    #renderGroup = async () => {
        const groupId = new URLSearchParams(window.location.search).get("id");

        if (!groupId) {
            window.location.href = "/c/Groups";
        }
        const group = await MmGroup.fetchGroup(groupId).catch(() => {
            window.location.href = "/c/Groups";
        });

        this.#group = group;
        this.roles = group._roles;

        if (group._canUpdate) {
            this.#permissions.add("update");
        }

        const { users, groups } = MmGroup.splitUsersAndGroups(group);
        this.groups = groups;
        this.users = users;

        const headerContainer =
            this.shadowRoot.querySelector(".headers-container");

        const cachedAcl = MmGroup.session.getCachedAcl();

        const descriptionContainer = bdoc.ele(
            "div",
            bdoc.id("description-container")
        );
        const infoContainer = bdoc.ele(
            "div",
            bdoc.class("info-container"),
            descriptionContainer,
            bdoc.ele(
                "p",
                "Owned by: ",
                MmGroup.renderLinkIfCachedPermsOnOrg(group.org, cachedAcl)
            )
        );

        bdoc.append(
            headerContainer,
            bdoc.ele(
                "h3",
                `${group.name}`,
                bdoc.attr("style", "color: black;")
            ),
            infoContainer
        );

        const descriptionEditButtons = bdoc.ele(
            "div",
            bdoc.class("edit-buttons"),
            bdoc.ele(
                "button",
                "Save",
                bdoc.eventListener("click", async () => {
                    const description =
                        this.shadowRoot.getElementById("description").innerText;
                    const currentGroup = await MmGroup.fetchGroup(groupId);
                    if (description.trim() === currentGroup.description.trim())
                        return;
                    MmGroup.updateGroup(groupId, {
                        ...currentGroup,
                        description,
                    }).then(() => {
                        alert("Description updated successfully");
                        descriptionEditButtons.style.display = "none";
                        this.#group.description = description;
                    });
                })
            ),
            bdoc.ele(
                "button",
                "Cancel",
                bdoc.eventListener("click", () => {
                    descriptionContainer.innerHTML = "";
                    bdoc.append(
                        descriptionContainer,
                        generateDescription(this.#group.description)
                    );
                    bdoc.append(descriptionContainer, descriptionEditButtons);
                    descriptionEditButtons.style.display = "none";
                })
            )
        );

        const generateDescription = (description) => {
            let text = "";
            if (description) {
                text = description;
            }
            const descEle = bdoc.ele("p", text, bdoc.id("description"));
            if (this.#permissions.has("update")) {
                descEle.contentEditable = true;
                bdoc.append(
                    descEle,
                    bdoc.class("mmc_editable"),
                    bdoc.eventListener("input", () => {
                        descriptionEditButtons.style.display = "inline-flex";
                    })
                );
            }
            return descEle;
        };

        if (group.description && group.description.length > 0) {
            bdoc.append(
                descriptionContainer,
                generateDescription(group.description)
            );
        } else {
            if (this.#permissions.has("update")) {
                bdoc.append(
                    descriptionContainer,
                    bdoc.ele(
                        "button",
                        "Add Description",
                        bdoc.eventListener("click", () => {
                            descriptionContainer.innerHTML = "";
                            bdoc.append(
                                descriptionContainer,
                                generateDescription("")
                            );
                        })
                    )
                );
            } else {
                infoContainer.removeChild(descriptionContainer);
            }
        }

        bdoc.append(descriptionContainer, descriptionEditButtons);
        descriptionEditButtons.style.display = "none";

        if (
            (group.org in cachedAcl &&
                cachedAcl[group.org].includes("WriteGroup")) ||
            "admin" in cachedAcl
        ) {
            bdoc.append(
                this.shadowRoot.getElementById("delete-container"),
                bdoc.ele(
                    "button",
                    bdoc.class("header-button delete-button"),
                    "Delete Group",
                    bdoc.eventListener("click", () => {
                        const confirmDelete = confirm(
                            `Are you sure you want to delete ${group.name}?`
                        );
                        if (confirmDelete) {
                            MmGroup.session
                                .fetch(`/api/groups/${groupId}`, {
                                    method: "DELETE",
                                })
                                .then(() => {
                                    window.location.href = "/c/Groups.html";
                                });
                        }
                    })
                )
            );
        }

        const addUserModal = bdoc.ele(
            "mm-add-member-modal",
            bdoc.attr("id", "add-user-modal"),
            bdoc.attr("parent-type", "group"),
            bdoc.attr("member-type", "user"),
            bdoc.attr("parent-id", groupId)
        );
        const addGroupModal = bdoc.ele(
            "mm-add-member-modal",
            bdoc.attr("id", "add-group-modal"),
            bdoc.attr("parent-type", "group"),
            bdoc.attr("member-type", "group"),
            bdoc.attr("parent-id", groupId)
        );
        bdoc.append(this.shadowRoot, addUserModal, addGroupModal);

        Promise.all([
            customElements.whenDefined("mm-filter-table"),
            customElements.whenDefined("mm-add-member-modal"),
            customElements.whenDefined("mm-create-group-modal"),
        ]).then(() => {
            const rolesDropdown =
                this.shadowRoot.getElementById("roles-dropdown");
            const usersDropdown =
                this.shadowRoot.getElementById("users-dropdown");
            const groupsDropdown =
                this.shadowRoot.getElementById("groups-dropdown");

            const properties = {
                group: {
                    ["sort-properties"]: "name,Owned by",
                    ["filter-properties"]: "org",
                    ["dropdown-text"]: "Groups",
                    ["cols"]: {
                        name: (group) => group.groupId,
                        ["Owned by"]: (group) =>
                            MmGroup.renderLinkIfCachedPermsOnOrg(
                                group.org,
                                cachedAcl
                            ),
                    },
                    ["identifier"]: "groupId",
                    ["button-group"]: null,
                    ["add-button-text"]: "+ Add Group to Group",
                    ["dropdown"]: groupsDropdown,
                    ["get-obj"]: (group) => {
                        const [org, groupId] = group.id.split(":");
                        return {
                            id: group.id,
                            org,
                            groupId,
                        };
                    },
                },
                user: {
                    ["sort-properties"]: "ID",
                    ["dropdown-text"]: "Users",
                    ["cols"]: {
                        ID: (user) => user.id,
                    },
                    ["identifier"]: "id",
                    ["button-group"]: null,
                    ["add-button-text"]: "+ Add User to Group",
                    ["dropdown"]: usersDropdown,
                    ["get-obj"]: (user) => {
                        return {
                            id: user.id,
                        };
                    },
                },
            };

            const getButtonGroupContainer = (type) =>
                bdoc.ele(
                    "div",
                    bdoc.attr("style", "margin-left: 1em"),
                    bdoc.attr("slot", "dropdown-body"),
                    properties[type]["button-group"]
                );

            const generateTable = (type) => {
                const filterTable = bdoc.ele(
                    "mm-filter-table",
                    bdoc.attr("id", `${type}s-filter-table`),
                    bdoc.attr(
                        "sort-properties",
                        properties[type]["sort-properties"]
                    ),
                    bdoc.attr("slot", "dropdown-body"),
                    bdoc.attr("first-col-width", "inherit")
                );

                if (properties[type]["filter-properties"]) {
                    bdoc.append(
                        filterTable,
                        bdoc.attr(
                            "filter-properties",
                            properties[type]["filter-properties"]
                        )
                    );
                }

                bdoc.append(properties[type]["dropdown"], filterTable);

                const filterTableCols = properties[type]["cols"];

                if (this.#permissions.has("update")) {
                    filterTableCols["Actions"] = (entity) => {
                        return bdoc.ele(
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
                                    "border-color: white; background-color: #D32F2F; border-radius: 5px; color: white; cursor: pointer; "
                                ),
                                "⨉ Remove",
                                bdoc.eventListener("click", () => {
                                    const confirmRemove = confirm(
                                        `Are you sure you want to remove ${
                                            entity[properties[type].identifier]
                                        } from the group?`
                                    );
                                    if (confirmRemove) {
                                        MmGroup.removeEntityFromGroup(
                                            groupId,
                                            entity.id
                                        ).then(() => {
                                            this[`${type}s`] = this[
                                                `${type}s`
                                            ].filter((e) => e.id !== entity.id);
                                            if (this[`${type}s`].length === 0) {
                                                properties[type][
                                                    "dropdown"
                                                ].removeChild(filterTable);
                                                bdoc.append(
                                                    properties[type][
                                                        "dropdown"
                                                    ],
                                                    getButtonGroupContainer(
                                                        type
                                                    )
                                                );
                                            } else {
                                                filterTable.loadData(
                                                    this[`${type}s`]
                                                );
                                            }
                                        });
                                    }
                                })
                            )
                        );
                    };

                    bdoc.append(filterTable, properties[type]["button-group"]);
                }

                filterTable.generateCols = () => filterTableCols;
                filterTable.customSorts = {
                    ID: (a, b) => (a.id > b.id ? 1 : -1),
                    name: (a, b) => (a.name > b.name ? 1 : -1),
                    ["Owned by"]: (a, b) => (a.org > b.org ? 1 : -1),
                };
                filterTable.customColStyles = {
                    Actions: "width: 1%;",
                };
                filterTable.loadData(this[`${type}s`]);
            };

            if (this.#permissions.has("update")) {
                const createButtonGroup = (type) => {
                    const addEntityModal = this.shadowRoot.getElementById(
                        `add-${type}-modal`
                    );

                    addEntityModal.onSuccess = (variables) => {
                        this[`${type}s`].push(
                            properties[`${type}`]["get-obj"](variables)
                        );
                        if (this[`${type}s`].length === 1) {
                            generateTable(type);
                        }
                        const filterTable = this.shadowRoot.getElementById(
                            `${type}s-filter-table`
                        );
                        filterTable.loadData(this[`${type}s`]);
                        addEntityModal.hide();
                    };

                    properties[type]["button-group"] = bdoc.ele(
                        "div",
                        bdoc.class("button-group"),
                        bdoc.attr("slot", "header")
                    );

                    if (type === "group") {
                        const createGroupModal = bdoc.ele(
                            "mm-create-group-modal",
                            bdoc.attr("org-id", group.org),
                            bdoc.attr("parent-id", groupId),
                            bdoc.attr("parent-type", "group")
                        );
                        createGroupModal.onSuccess = async (
                            variables,
                            response,
                            addedGroup
                        ) => {
                            if (addedGroup) {
                                this[`${type}s`].push(
                                    properties[`${type}`]["get-obj"](variables)
                                );
                                if (this[`${type}s`].length === 1) {
                                    generateTable(type);
                                }
                                const filterTable =
                                    this.shadowRoot.getElementById(
                                        `${type}s-filter-table`
                                    );
                                filterTable.loadData(this[`${type}s`]);
                            }
                        };
                        bdoc.append(this.shadowRoot, createGroupModal);
                        bdoc.append(
                            properties.group["button-group"],
                            bdoc.ele(
                                "button",
                                bdoc.attr("id", "create-group-button"),
                                bdoc.class("header-button add-entity-button2"),
                                "✐  Create New Group",
                                bdoc.eventListener("click", () => {
                                    createGroupModal.show();
                                })
                            )
                        );
                    }

                    bdoc.append(
                        properties[type]["button-group"],
                        bdoc.ele(
                            "button",
                            bdoc.attr("id", `add-${type}-button`),
                            bdoc.class("header-button add-entity-button"),
                            properties[type]["add-button-text"],
                            bdoc.eventListener("click", () => {
                                addEntityModal.show();
                            })
                        )
                    );
                };

                createButtonGroup("user");
                createButtonGroup("group");
            }

            if (this.roles.length > 0) {
                const filterTable = bdoc.ele(
                    "mm-filter-table",
                    bdoc.attr("id", `roles-filter-table`),
                    bdoc.attr("sort-properties", "organization,role"),
                    bdoc.attr("slot", "dropdown-body"),
                    bdoc.attr("first-col-width", "inherit")
                );
                bdoc.append(rolesDropdown, filterTable);
                filterTable.generateCols = () => ({
                    organization: (role) =>
                        MmGroup.renderLinkIfCachedPermsOnOrg(
                            role.orgId,
                            cachedAcl
                        ),
                    role: (role) => role.role,
                });
                filterTable.customSorts = {
                    organization: (a, b) => (a.orgId > b.orgId ? 1 : -1),
                    role: (a, b) => {
                        const roleOrder = ["owner", "editor", "reader"];
                        return (
                            roleOrder.indexOf(a.role) -
                            roleOrder.indexOf(b.role)
                        );
                    },
                };
                filterTable.loadData(this.roles);
            } else {
                bdoc.append(
                    rolesDropdown,
                    bdoc.ele(
                        "p",
                        "This group has no roles on any organization.",
                        bdoc.attr("slot", "dropdown-body"),
                        bdoc.attr("style", "margin: 1em;")
                    )
                );
            }

            if (this.users.length > 0) {
                generateTable("user");
            } else if (properties.user["button-group"]) {
                bdoc.append(
                    properties.user["dropdown"],
                    getButtonGroupContainer("user")
                );
            }

            if (this.groups.length > 0) {
                generateTable("group");
            } else if (properties.group["button-group"]) {
                bdoc.append(
                    properties.group["dropdown"],
                    getButtonGroupContainer("group")
                );
            }
        });
    };
}
customElements.define("mm-group", MmGroup);

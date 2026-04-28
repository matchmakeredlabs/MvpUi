import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";
import MmCustomer from "./mm-customer.js";
import MmAddMemberForm from "./mm-add-member-form.js";

export default class MmOrganization extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    groups = [];
    users = [];

    #org;

    #permissions = new Set();

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    static fetchOrganization = async (orgId) => {
        const response = await MmOrganization.session.fetch(
            "/api/orgs/" + orgId
        );
        if (response.status !== 200) {
            return Promise.reject(response);
        }

        return await response.json();

        // what happens when user does not have perms for org?
    };

    static renderCustomerLink = (customerId, customer) => {
        const label = customer?.name || customer?.id || customerId;
        return bdoc.ele(
            "a",
            bdoc.attr("href", `/c/Customer?id=${customerId}`),
            label
        );
    };

    static getGroupOwnerType = (group) =>
        group.customerId || group.customer || group.ownerType === "customer"
            ? "Customer"
            : "Project";

    static getGroupOwnerId = (group) =>
        group.customerId ||
        group.customer ||
        group.org ||
        group.orgId ||
        group.id?.split(":")[0] ||
        "";

    static getGroupOwnedByLabel = (group) => {
        const ownerType = MmOrganization.getGroupOwnerType(group);
        const ownerId = MmOrganization.getGroupOwnerId(group);
        return ownerId ? `${ownerType}: ${ownerId}` : ownerType;
    };

    static renderGroupOwnedBy = (group, cachedAcl) => {
        const ownerType = MmOrganization.getGroupOwnerType(group);
        const ownerId = MmOrganization.getGroupOwnerId(group);

        if (!ownerId) return ownerType;

        if (ownerType === "Customer") {
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
            ownerId in cachedAcl || "admin" in cachedAcl
                ? bdoc.ele(
                      "a",
                      bdoc.attr("href", `/c/Project?id=${ownerId}`),
                      ownerId
                  )
                : ownerId
        );
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
            alert(`${entityId} not found in project ${orgId}`);
            return Promise.reject();
        }

        return await MmOrganization.updateOrg(orgId, {
            ...currentOrg,
            members: newMembers,
        });
    };

    static deleteGroup = async (groupId) => {
        const response = await MmOrganization.session.fetch(
            "/api/groups/" + groupId,
            {
                method: "DELETE",
            }
        );
        if (response.status !== 200) {
            MmOrganization.handleError(response);
            return Promise.reject();
        }
        return await response.json();
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
                bdoc.ele("h2", `Project`)
            ),
            bdoc.ele(
                "div",
                bdoc.class("dropdowns-container"),
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
        this.#renderOrganization();
    }

    static handleError = async (response) => {
        try {
            const body = await response.json();
            if (body.error) alert(body.error);
            if (body.log) alert(body.log[0].message);
        } catch (e) {
            alert("An error occurred");
        }
    };
    static splitUsersAndGroups = (organization) => {
        const users = [];
        const groups = [];
        for (let member of organization.members) {
            if (member.id.includes(":")) {
                const [ownerId, ...groupIdParts] = member.id.split(":");
                const groupId = groupIdParts.join(":");
                const ownerType =
                    member.customerId || member.customer ? "customer" : "org";
                groups.push({
                    ...member,
                    org: member.org || (ownerType === "org" ? ownerId : ""),
                    customerId:
                        member.customerId ||
                        member.customer ||
                        (ownerType === "customer" ? ownerId : ""),
                    ownerType,
                    ownedByLabel: MmOrganization.getGroupOwnedByLabel({
                        ...member,
                        org: member.org || (ownerType === "org" ? ownerId : ""),
                        customerId:
                            member.customerId ||
                            member.customer ||
                            (ownerType === "customer" ? ownerId : ""),
                        ownerType,
                    }),
                    groupId,
                });
            } else {
                users.push(member);
            }
        }
        return { users, groups };
    };

    #renderOrganization = async () => {
        const orgId = new URLSearchParams(window.location.search).get("id");

        if (!orgId) {
            window.location.href = "/c/Projects";
        }

        const organization = await MmOrganization.fetchOrganization(
            orgId
        ).catch(() => {
            window.location.href = "/c/Projects";
        });

        const customer = organization.customerId
            ? await MmCustomer.fetchCustomer(organization.customerId).catch(
                  () => null
              )
            : null;
        const customerId = organization.customerId || organization.customer;

        if (organization._canUpdate) {
            this.#permissions.add("update");
        }

        if (organization._canWriteGroups) {
            this.#permissions.add("writeGroups");
        }

        const { users, groups } =
            MmOrganization.splitUsersAndGroups(organization);
        this.groups = groups;
        this.users = users;

        this.#org = organization;

        const cachedAcl = MmOrganization.session.getCachedAcl();

        const headerContainer =
            this.shadowRoot.querySelector(".headers-container");

        const descriptionContainer = bdoc.ele(
            "div",
            bdoc.id("description-container")
        );
        const infoContainer = bdoc.ele(
            "div",
            bdoc.class("info-container"),
            customerId
                ? bdoc.ele(
                      "p",
                      "Customer: ",
                      MmOrganization.renderCustomerLink(
                          customerId,
                          customer
                      )
                  )
                : null,
            descriptionContainer
        );

        bdoc.append(
            headerContainer,
            bdoc.ele(
                "h3",
                `${organization.name}`,
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
                    const currentOrg = await MmOrganization.fetchOrganization(
                        orgId
                    );
                    if (description.trim() === currentOrg.description.trim())
                        return;
                    MmOrganization.updateOrg(orgId, {
                        ...currentOrg,
                        description,
                    }).then(() => {
                        alert("Description updated successfully");
                        descriptionEditButtons.style.display = "none";
                        this.#org.description = description;
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
                        generateDescription(this.#org.description)
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

        if (organization.description && organization.description.length > 0) {
            bdoc.append(
                descriptionContainer,
                generateDescription(organization.description)
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

        const addUserModal = bdoc.ele(
            "mm-add-member-modal",
            bdoc.attr("id", "add-user-modal"),
            bdoc.attr("parent-type", "org"),
            bdoc.attr("member-type", "user"),
            bdoc.attr("parent-id", orgId)
        );
        const addGroupModal = bdoc.ele(
            "mm-add-member-modal",
            bdoc.attr("id", "add-group-modal"),
            bdoc.attr("parent-type", "org"),
            bdoc.attr("member-type", "group"),
            bdoc.attr("parent-id", orgId)
        );
        bdoc.append(this.shadowRoot, addUserModal, addGroupModal);

        Promise.all([
            customElements.whenDefined("mm-filter-table"),
            customElements.whenDefined("mm-add-member-modal"),
            customElements.whenDefined("mm-create-group-modal"),
        ]).then(() => {
            const usersDropdown =
                this.shadowRoot.getElementById("users-dropdown");
            const groupsDropdown =
                this.shadowRoot.getElementById("groups-dropdown");

            const properties = {
                group: {
                    ["sort-properties"]: "name,Owned by,role",
                    ["filter-properties"]: "ownedByLabel,role",
                    ["filter-display-names"]: JSON.stringify({
                        ownedByLabel: "Owned by",
                    }),

                    ["cols"]: {
                        name: (group) =>
                            bdoc.ele(
                                "a",
                                bdoc.attr("href", `/c/Group?id=${group.id}`),
                                group.groupId
                            ),
                        role: (group) => group.role || "",
                        ["Owned by"]: (group) =>
                            MmOrganization.renderGroupOwnedBy(group, cachedAcl),
                    },
                    ["identifier"]: "groupId",
                    ["button-group"]: null,
                    ["add-button-text"]: "+ Add Group to Project",
                    ["dropdown"]: groupsDropdown,
                    ["get-obj"]: (group) => {
                        const [ownerId, ...groupIdParts] = group.id.split(":");
                        const groupId = groupIdParts.join(":");
                        const ownerType =
                            group.customerId || group.customer
                                ? "customer"
                                : "org";
                        return {
                            ...group,
                            id: group.id,
                            org:
                                group.org ||
                                (ownerType === "org" ? ownerId : ""),
                            customerId:
                                group.customerId ||
                                group.customer ||
                                (ownerType === "customer" ? ownerId : ""),
                            ownerType,
                            ownedByLabel: MmOrganization.getGroupOwnedByLabel({
                                ...group,
                                org:
                                    group.org ||
                                    (ownerType === "org" ? ownerId : ""),
                                customerId:
                                    group.customerId ||
                                    group.customer ||
                                    (ownerType === "customer" ? ownerId : ""),
                                ownerType,
                            }),
                            groupId,
                        };
                    },
                },
                user: {
                    ["sort-properties"]: "ID,role",
                    ["filter-properties"]: "role",
                    ["cols"]: {
                        ID: (user) => user.id,
                        role: (user) => user.role || "",
                    },
                    ["identifier"]: "id",
                    ["button-group"]: null,
                    ["add-button-text"]: "+ Add User to Project",
                    ["dropdown"]: usersDropdown,
                    ["get-obj"]: (user) => {
                        return {
                            ...user,
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
                    bdoc.attr("first-col-width", "30%"),
                    bdoc.attr("last-col-width", "1%")
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

                if (properties[type]["filter-display-names"]) {
                    bdoc.append(
                        filterTable,
                        bdoc.attr(
                            "filter-display-names",
                            properties[type]["filter-display-names"]
                        )
                    );
                }

                bdoc.append(properties[type]["dropdown"], filterTable);

                const filterTableCols = properties[type]["cols"];

                if (this.#permissions.has("update")) {
                    const ownedBySameOrgRoles = [
                        "none",
                        ...MmAddMemberForm.roles,
                    ];
                    filterTableCols["role"] = (member) => {
                        return bdoc.ele(
                            "select",
                            bdoc.class("role-select"),
                            ...(type === "group" && member.org === orgId
                                ? ownedBySameOrgRoles
                                : MmAddMemberForm.roles
                            ).map((role) => {
                                if (
                                    role === member.role ||
                                    (role === "none" && !member.role)
                                ) {
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

                                if (
                                    newRole === member.role ||
                                    (newRole === "none" &&
                                        (!member.role ||
                                            member.role === "none"))
                                ) {
                                    return;
                                }

                                let promise;

                                if (newRole === "none") {
                                    promise =
                                        MmOrganization.removeEntityFromOrg(
                                            orgId,
                                            member.id
                                        );
                                } else if (
                                    member.role &&
                                    member.role !== "none"
                                ) {
                                    promise =
                                        MmOrganization.updateEntityRoleInOrg(
                                            orgId,
                                            member.id,
                                            newRole
                                        );
                                } else {
                                    promise = MmAddMemberForm.addMemberToEntity(
                                        orgId,
                                        { id: member.id, role: newRole },
                                        type,
                                        "org"
                                    );
                                }

                                promise.then(
                                    // on success, update the role in the table
                                    () => {
                                        this[`${type}s`] = this[`${type}s`].map(
                                            (m) =>
                                                m.id === member.id
                                                    ? { ...m, role: newRole }
                                                    : m
                                        );
                                        filterTable.loadData(this[`${type}s`]);
                                    },
                                    // on failure, keep the role the same
                                    () => {
                                        event.target.value =
                                            member.role || "none";
                                    }
                                );
                            })
                        );
                    };

                    filterTableCols["Actions"] = (entity) => {
                        if (
                            type === "group" &&
                            entity.org === orgId &&
                            !this.#permissions.has("writeGroups")
                        ) {
                            return "";
                        }

                        return type === "group" && entity.org === orgId
                            ? bdoc.ele(
                                  "td",
                                  bdoc.attr(
                                      "style",
                                      "float: right; border: none; white-space: nowrap;"
                                  ),

                                  bdoc.ele(
                                      "button",
                                      bdoc.class("delete-button"),
                                      bdoc.attr(
                                          "style",
                                          "border-color: white; background-color: #a82525; border-radius: 5px; color: white; cursor: pointer;"
                                      ),
                                      "🗑️ Delete",
                                      bdoc.eventListener("click", () => {
                                          const confirmRemove = confirm(
                                              `Are you sure you want to delete the group ${
                                                  entity[
                                                      properties[type]
                                                          .identifier
                                                  ]
                                              }? Deleting this group may impact the permissions of its members, which may include groups and users. This action cannot be undone.`
                                          );
                                          if (confirmRemove) {
                                              MmOrganization.deleteGroup(
                                                  entity.id
                                              ).then(() => {
                                                  this[`${type}s`] = this[
                                                      `${type}s`
                                                  ].filter(
                                                      (e) => e.id !== entity.id
                                                  );
                                                  if (
                                                      this[`${type}s`]
                                                          .length === 0
                                                  ) {
                                                      properties[type][
                                                          "dropdown"
                                                      ].removeChild(
                                                          filterTable
                                                      );
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
                              )
                            : bdoc.ele(
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
                                      bdoc.eventListener("click", () => {
                                          const confirmRemove = confirm(
                                              `Are you sure you want to remove ${
                                                  entity[
                                                      properties[type]
                                                          .identifier
                                                  ]
                                              } from the project?`
                                          );
                                          if (confirmRemove) {
                                              MmOrganization.removeEntityFromOrg(
                                                  orgId,
                                                  entity.id
                                              ).then(() => {
                                                  this[`${type}s`] = this[
                                                      `${type}s`
                                                  ].filter(
                                                      (e) => e.id !== entity.id
                                                  );
                                                  if (
                                                      this[`${type}s`]
                                                          .length === 0
                                                  ) {
                                                      properties[type][
                                                          "dropdown"
                                                      ].removeChild(
                                                          filterTable
                                                      );
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
                    role: (a, b) => {
                        const roleOrder = ["owner", "editor", "reader"];
                        return (
                            roleOrder.indexOf(a.role) -
                            roleOrder.indexOf(b.role)
                        );
                    },
                    ID: (a, b) => (a.id < b.id ? -1 : 1),
                    name: (a, b) => (a.groupId < b.groupId ? -1 : 1),
                    ["Owned by"]: (a, b) =>
                        MmOrganization.getGroupOwnedByLabel(a).localeCompare(
                            MmOrganization.getGroupOwnedByLabel(b)
                        ),
                };
                filterTable.customColStyles = {
                    ["Actions"]: "width: 1%;",
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
                            bdoc.attr("org-id", organization.id),
                            bdoc.attr("parent-id", organization.id),
                            bdoc.attr("parent-type", "org")
                        );

                        createGroupModal.onSuccess = (
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
customElements.define("mm-organization", MmOrganization);

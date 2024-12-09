import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import config from "/config.js";

class MmAddGroup extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);
    static observedAttributes = ["entity-id", "type"];

    #entityId;
    #type;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "entity-id") {
            this.#entityId = newValue;
        } else if (name === "type") {
            this.#type = newValue;
        }
    }

    onSubmit = () => {};

    static roles = ["editor", "reader"];

    static submitAddGroup = (entityType, entityId) => async (event) => {
        event.preventDefault();

        const formData = new FormData(event.target);

        const groupId = formData.get("group-id");

        switch (entityType) {
            case "org":
                const role = formData.get("role");
                MmAddGroup.addGroupToOrg(entityId, { id: groupId, role });
                break;
            case "group":
                MmAddGroup.addGroupToGroup(entityId, { id: groupId });
                break;
        }
    };

    static addGroupToOrg = async (orgId, groupObj) => {
        console.log("Adding group", groupObj, "to org", orgId);
    };

    static addGroupToGroup = async (groupId, groupObj) => {
        console.log("Adding group", groupObj, "to group", groupId);
    };

    connectedCallback() {
        const formGroupsContainer = bdoc.ele(
            "div",
            bdoc.class("form-groups-container"),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele("label", bdoc.attr("for", "group-id"), "Group ID"),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "text"),
                    bdoc.attr("id", "group-id"),
                    bdoc.attr("name", "group-id"),
                    bdoc.attr("required", "true")
                )
            )
        );

        if (this.#type === "org") {
            bdoc.append(
                formGroupsContainer,
                bdoc.ele(
                    "div",
                    bdoc.class("form-group"),
                    bdoc.ele("label", bdoc.attr("for", "role"), "Role"),
                    bdoc.ele(
                        "select",
                        bdoc.attr("id", "role"),
                        bdoc.attr("name", "role"),
                        ...MmAddGroup.roles.map((role) =>
                            bdoc.ele("option", bdoc.attr("value", role), role)
                        )
                    )
                )
            );
        }

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
                bdoc.attr("href", "/c/res/mm-add-user.css")
            ),
            bdoc.ele(
                "form",
                bdoc.class("form"),
                bdoc.eventListener("submit", (event) => {
                    MmAddGroup.submitAddGroup(
                        this.#type,
                        this.#entityId
                    )(event).then(this.onSubmit);
                }),
                formGroupsContainer,
                bdoc.ele("slot", bdoc.attr("name", "form-footer"))
            )
        );
    }
}

customElements.define("mm-add-group", MmAddGroup);

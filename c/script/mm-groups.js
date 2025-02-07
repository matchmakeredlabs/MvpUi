import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

export default class MmGroups extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    static fetchGroups = async () => {
        const response = await MmGroups.session.fetch("/api/groups");
        return (await response.json()).items;
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
                bdoc.attr("href", "/c/res/mm-groups.css")
            ),
            bdoc.ele(
                "h2",
                "My Groups",
                bdoc.attr("style", "margin-left: 1.5em")
            ),
            bdoc.ele(
                "mm-filter-table",
                bdoc.attr("style", "height: 80%"),
                bdoc.attr("filter-properties", "org"),
                bdoc.attr("sort-properties", "name,organization"),
                bdoc.attr("first-col-width", "40%"),
                bdoc.ele(
                    "div",
                    bdoc.class("button-group"),
                    bdoc.attr("slot", "header"),
                    bdoc.ele(
                        "button",
                        bdoc.attr("id", "create-group-button"),
                        bdoc.class("header-button add-entity-button2"),
                        "✐  Create New Group"
                    )
                )
            ),
            bdoc.ele("mm-create-group-modal"),
            bdoc.script("mm-filter-table.js"),
            bdoc.script("mm-create-group-modal.js")
        );
        this.#renderGroups();
    }

    #renderGroups = async () => {
        const groups = await MmGroups.fetchGroups();

        Promise.all([
            customElements.whenDefined("mm-filter-table"),
            customElements.whenDefined("mm-create-group-modal"),
        ]).then(() => {
            const filterTable =
                this.shadowRoot.querySelector("mm-filter-table");
            filterTable.generateCols = () => ({
                name: (group) =>
                    bdoc.ele(
                        "a",
                        bdoc.attr("href", `/c/Group/${group.id}`),
                        group.name
                    ),
                organization: (group) => group.org,
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
                organization: (a, b) =>
                    a.org.toLowerCase() > b.org.toLowerCase() ? 1 : -1,
                name: (a, b) =>
                    a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1,
            };
            filterTable.loadData(groups);

            const createGroupButton = this.shadowRoot.getElementById(
                "create-group-button"
            );
            const createGroupModal = this.shadowRoot.querySelector(
                "mm-create-group-modal"
            );
            bdoc.append(
                createGroupButton,
                bdoc.eventListener("click", () => {
                    createGroupModal.show();
                })
            );
        });
    };
}
customElements.define("mm-groups", MmGroups);

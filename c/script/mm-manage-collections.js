import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

export default class ManageCollections extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    static fetchCollections = async () => {
        const response = await ManageCollections.session.fetch(
            "/api/collections"
        );
        return (await response.json()).collections;
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
                bdoc.attr("href", "/c/res/mm-manage-collections.css")
            ),
            bdoc.ele(
                "div",
                bdoc.attr("style", "padding-left:2em;"),

                bdoc.ele("h2", "Manage Collections")
            ),
            bdoc.ele(
                "mm-filter-table",
                bdoc.attr("filter-properties", "subject,publisher,_orgId"),
                bdoc.attr(
                    "filter-display-names",
                    JSON.stringify({
                        ["_orgId"]: "Project",
                    })
                ),
                bdoc.attr(
                    "sort-properties",
                    "name,subject,publisher,Project,% Described"
                ),
                bdoc.attr("display-properties", "subject,publisher")
            ),
            bdoc.ele("mm-create-collection-modal"),
            bdoc.ele("mm-upload-collection-modal"),
            bdoc.script("mm-filter-table.js"),
            bdoc.script("mm-create-collection-modal.js"),
            bdoc.script("mm-upload-collection-modal.js")
        );
        this.#renderCollections();
    }

    #renderCollections = async () => {
        const collections = await ManageCollections.fetchCollections();

        const editableCollections = collections.filter(
            (collection) => collection["_canUpdate"]
        );

        Promise.all([
            customElements.whenDefined("mm-filter-table"),
            customElements.whenDefined("mm-create-collection-modal"),
            customElements.whenDefined("mm-upload-collection-modal"),
        ]).then(() => {
            const filterTable =
                this.shadowRoot.querySelector("mm-filter-table");

            const createCollectionModal = this.shadowRoot.querySelector(
                "mm-create-collection-modal"
            );
            const onCreationSuccess = (variables, response) => {
                const collection = response.descriptors[0];
                collection.percentDescribed = 0; // default to 0% described
                filterTable.loadData([collection, ...editableCollections]);
            };

            createCollectionModal.onSuccess = onCreationSuccess;

            const uploadCollectionModal = this.shadowRoot.querySelector(
                "mm-upload-collection-modal"
            );

            uploadCollectionModal.onSuccess = onCreationSuccess;

            bdoc.append(
                filterTable,
                bdoc.ele(
                    "div",
                    bdoc.attr("slot", "header"),
                    bdoc.class("button-group"),
                    bdoc.ele(
                        "button",
                        bdoc.class("header-button add-entity-button2"),
                        "✐ Create New Collection",
                        bdoc.eventListener("click", () => {
                            createCollectionModal.show();
                        })
                    ),
                    bdoc.ele(
                        "button",
                        bdoc.class("header-button add-entity-button"),
                        "+ Import Collection",
                        bdoc.eventListener("click", () => {
                            uploadCollectionModal.show();
                        })
                    )
                )
            );

            const filterTableCols = {
                name: (collection) =>
                    bdoc.ele(
                        "a",
                        bdoc.attr(
                            "href",
                            `/c/EditCollection?id=${collection.id}`
                        ),
                        collection.name
                    ),
                subject: (collection) => collection.subject || "Null",
                publisher: (collection) => collection.publisher || "Null",
                // ["Creation Date"]: (collection) => collection.datePublished,

                Project: (collection) => collection._orgId || "Null",
                ["% Described"]: (collection) => {
                    const percent = collection.percentDescribed;
                    return `${percent}%`;
                },
            };

            filterTable.generateCols = () => filterTableCols;
            filterTable.customSorts = {
                name: (a, b) => (a.name < b.name ? -1 : 1),
                ["% Described"]: (a, b) => {
                    return a.percentDescribed - b.percentDescribed;
                },
                Project: (a, b) => (a._orgId < b._orgId ? -1 : 1),
            };

            for (const collection of editableCollections) {
                const leafWithKeyCount = collection._leafWithKeyCount;
                const leafCount = collection._leafCount;
                if (
                    leafWithKeyCount === null ||
                    leafCount === null ||
                    leafCount === 0
                ) {
                    // default to 0% described
                    collection.percentDescribed = 0;
                    continue;
                }

                if (leafCount < 0 || leafWithKeyCount < 0) {
                    const negativeCounts = [];
                    if (leafCount < 0) {
                        negativeCounts.push(`leafCount (${leafCount})`);
                    }
                    if (leafWithKeyCount < 0) {
                        negativeCounts.push(`leafWithKeyCount (${leafWithKeyCount})`);
                    }
                    const negativeDetails = negativeCounts.join(" and ");
                    alert(
                        `Error: Collection "${collection.name}" contains invalid negative values for ${negativeDetails}.`
                    );
                    collection.percentDescribed = 0;
                    continue;
                }
                collection.percentDescribed = Math.round(
                    (leafWithKeyCount / leafCount) * 100
                );
            }

            filterTable.loadData(editableCollections);
        });
    };
}
customElements.define("mm-manage-collections", ManageCollections);

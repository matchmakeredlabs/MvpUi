import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";
import MmCollections from "./mm-collections.js";

export default class MmCreateSets extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    selectedCollectionIds = [];

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

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
                bdoc.attr("href", "/c/res/mm-create-sets.css")
            ),
            bdoc.ele(
                "div",
                bdoc.attr("style", "padding-left:2em;"),
                bdoc.class("create-sets-header"),

                bdoc.ele("h2", "Create Custom Set from Collection")
            ),
            bdoc.ele(
                "mm-filter-table",
                bdoc.attr("style", "height: 90%"),
                bdoc.attr("filter-properties", "subject,publisher,_orgId"),
                bdoc.attr(
                    "filter-display-names",
                    JSON.stringify({
                        ["_orgId"]: "Project",
                    })
                ),
                bdoc.attr(
                    "sort-properties",
                    "Name,Subject,Publisher,Project,% Described"
                ),
                bdoc.attr("display-properties", "subject,publisher")
            ),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-filter-table.js")
            )
        );
        this.#renderCollections();
    }

    #disableCheckboxes = (clickedCheckbox, root) => {
        const checkboxes = root.querySelectorAll(".collection-checkbox");

        checkboxes.forEach((checkbox) => {
            if (checkbox !== clickedCheckbox) {
                checkbox.disabled = clickedCheckbox.checked;
            }
        });
    };

    #renderCollections = async () => {
        const collections = await MmCollections.fetchCollections();
        for (const collection of collections) {
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

        customElements.whenDefined("mm-filter-table").then(() => {
            const filterTable =
                this.shadowRoot.querySelector("mm-filter-table");

            filterTable.addCustomStylesheets(["/c/res/mm-create-sets.css"]);

            const createSetButton = bdoc.ele(
                "button",
                bdoc.id("create-set-button"),
                bdoc.attr("disabled", "true"),
                "Create Custom Set →",
                bdoc.eventListener("click", () => {
                    if (this.selectedCollectionIds.length === 0) {
                        alert(
                            "Error: You must select a collection to create a custom set."
                        );
                        return;
                    }
                    const selectedCollectionId = this.selectedCollectionIds[0];
                    window.location.href = `./SelectSubset?id=${selectedCollectionId}`;
                })
            );

            filterTable.addCustomHeaderElements([createSetButton]);

            filterTable.generateCols = (displayProperties) => ({
                name: (collection) =>
                    bdoc.ele(
                        "a",
                        bdoc.attr("href", `Browse?id=${collection.id}`),
                        collection.name
                    ),
                ...displayProperties.reduce((acc, property) => {
                    acc[property] = (item) => {
                        let currentValue = item[property];
                        if (
                            currentValue === null ||
                            currentValue === "" ||
                            currentValue === undefined
                        ) {
                            currentValue = "Null";
                        }
                        return currentValue;
                    };
                    return acc;
                }, {}),
                Project: (collection) => collection._orgId || "Null",
                ["% Described"]: (collection) => {
                    const percent = collection.percentDescribed;
                    return `${percent}%`;
                },
                select: (collection, root) =>
                    bdoc.ele(
                        "td",
                        bdoc.attr("style", "text-align: center;"),
                        bdoc.ele(
                            "input",
                            bdoc.attr("type", "checkbox"),
                            bdoc.class("collection-checkbox"),
                            bdoc.attr("style", "cursor: pointer;"),

                            bdoc.eventListener("change", (e) => {
                                if (e.target.checked) {
                                    this.selectedCollectionIds = [
                                        collection.id,
                                    ];
                                    // this.selectedCollectionIds.push(
                                    //     collection.id
                                    // );
                                } else {
                                    this.selectedCollectionIds = [];
                                    // this.selectedCollectionIds.filter(
                                    //     (id) => id !== collection.id
                                    // );
                                }
                                createSetButton.disabled =
                                    this.selectedCollectionIds.length === 0;

                                this.#disableCheckboxes(e.target, root);
                            })
                        )
                    ),
            });

            const sortPotentiallyNull = (attr) => (a, b) => {
                const aValue = a[attr] || "Null";
                const bValue = b[attr] || "Null";
                if (aValue === bValue) {
                    return 0;
                }
                return aValue.localeCompare(bValue);
            };

            filterTable.customSorts = {
                ["Name"]: sortPotentiallyNull("name"),
                ["Subject"]: sortPotentiallyNull("subject"),
                ["Publisher"]: sortPotentiallyNull("publisher"),
                Project: (a, b) => (a._orgId < b._orgId ? -1 : 1),
                ["% Described"]: (a, b) => {
                    return a.percentDescribed - b.percentDescribed;
                },
            };

            filterTable.loadData(collections);
        });
    };
}
customElements.define("mm-create-sets", MmCreateSets);

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
                bdoc.attr("filter-properties", "subject,publisher"),
                bdoc.attr("sort-properties", "subject,publisher"),
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
                                    this.selectedCollectionIds.push(
                                        collection.id
                                    );
                                } else {
                                    this.selectedCollectionIds =
                                        this.selectedCollectionIds.filter(
                                            (id) => id !== collection.id
                                        );
                                }
                                createSetButton.disabled =
                                    this.selectedCollectionIds.length === 0;

                                this.#disableCheckboxes(e.target, root);
                            })
                        )
                    ),
            });

            filterTable.loadData(collections);
        });
    };
}
customElements.define("mm-create-sets", MmCreateSets);

import bdoc from "./bdoc.js";

class MmViewCustomSets extends HTMLElement {
    #summarizedCustomSets = [];
    #displayCustomSets = {};
    #customSetsData = {};

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
                bdoc.attr("href", "/c/res/mm-collections.css")
            ),
            bdoc.ele(
                "div",
                bdoc.attr("style", "padding-left:2em;"),

                bdoc.ele("h2", "Custom Sets")
            ),
            bdoc.ele(
                "mm-filter-table",
                bdoc.attr("filter-properties", "subject,creator"),
                bdoc.attr("sort-properties", "subject,creator"),
                bdoc.attr("display-properties", "subject,creator")
            ),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-filter-table.js")
            )
        );
        this.#fetchCustomSets();
    }

    #fetchCustomSets = async () => {
        this.#customSetsData = JSON.parse(localStorage.getItem("customSets"));

        Object.keys(this.#customSetsData).forEach((customSetName) => {
            const customSet = this.#customSetsData[customSetName];

            let summarizedCustomSet = {};

            summarizedCustomSet.name = customSetName;

            Object.values(customSet.descriptors).forEach((descriptor) => {
                Object.keys(descriptor).forEach((key) => {
                    if (key === "name") {
                        return;
                    }
                    if (!(key in summarizedCustomSet)) {
                        summarizedCustomSet[key] = new Set();
                    }
                    summarizedCustomSet[key].add(descriptor[key]);
                });
            });

            this.#summarizedCustomSets.push(summarizedCustomSet);
        });

        this.#summarizedCustomSets.forEach((summarizedCustomSet) => {
            // generate display properties
            this.#displayCustomSets[summarizedCustomSet.name] = {};
            Object.keys(summarizedCustomSet).forEach((key) => {
                let displayValue = "";
                if (summarizedCustomSet[key] instanceof Set) {
                    const uniqueValues = Array.from(summarizedCustomSet[key]);
                    uniqueValues.forEach((value, i) => {
                        displayValue += value;
                        if (i < uniqueValues.length - 1) {
                            displayValue += ", ";
                        }
                    });
                } else {
                    displayValue = summarizedCustomSet[key];
                }
                this.#displayCustomSets[summarizedCustomSet.name][key] =
                    displayValue;
            });
        });

        customElements.whenDefined("mm-filter-table").then(() => {
            const filterTable =
                this.shadowRoot.querySelector("mm-filter-table");
            filterTable.generateFilterOptions = (
                _displayElements,
                filters,
                selectedOptions,
                root
            ) => {
                this.#summarizedCustomSets.forEach((summarizedCustomSet) => {
                    filters.forEach((filter) => {
                        summarizedCustomSet[filter].forEach((currentValue) => {
                            if (
                                currentValue === null ||
                                currentValue === "" ||
                                currentValue === undefined
                            ) {
                                currentValue = "Null";
                            }

                            if (!(currentValue in selectedOptions[filter])) {
                                selectedOptions[filter][currentValue] = false;
                                bdoc.append(
                                    root.getElementById(`${filter}-dropdown`),
                                    bdoc.ele(
                                        "option",
                                        currentValue,
                                        bdoc.attr("value", currentValue)
                                    )
                                );
                            }
                        });
                    });
                });
            };
            filterTable.dataFilteredBySearchKeywords = (
                _displayData,
                keywords
            ) =>
                keywords.length > 0
                    ? this.#summarizedCustomSets.filter((summarizedCustomSet) =>
                          keywords.some((keyword) =>
                              JSON.stringify(summarizedCustomSet.name)
                                  .toLowerCase()
                                  .includes(keyword.toLowerCase())
                          )
                      )
                    : this.#summarizedCustomSets;

            filterTable.dataFilteredByFilterOptions = (
                filteredBySearch,
                filters
            ) =>
                filteredBySearch
                    .filter((item) =>
                        Object.keys(filters).every((filter) =>
                            Object.keys(filters[filter]).some(
                                (selected) => filters[filter][selected]
                            )
                                ? Object.keys(filters[filter]).some(
                                      (selected) =>
                                          filters[filter][selected]
                                              ? item[filter].has(selected)
                                              : false
                                  )
                                : true
                        )
                    )
                    .map(
                        (summarizedCustomSet) =>
                            this.#displayCustomSets[summarizedCustomSet.name]
                    );
            filterTable.nameElementCallback = (customSet) =>
                bdoc.ele(
                    "a",
                    bdoc.attr("href", `/c/ViewCustomSet?key=${customSet.name}`),
                    customSet.name
                );

            filterTable.loadData(Object.values(this.#displayCustomSets));
        });
    };
}
customElements.define("mm-view-custom-sets", MmViewCustomSets);

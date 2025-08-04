import bdoc from "./bdoc.js";
import MmMatchProfileSelect from "./mm-match-profile-select.js";

export default class MmViewCustomSets extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    loadingElement;

    connectedCallback() {
        this.loadingElement = bdoc.ele(
            "h2",
            "Loading...",
            bdoc.attr("style", "margin: 2em; text-align: center;")
        );

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
                bdoc.attr("href", "/c/res/mm-view-custom-sets.css")
            ),
            bdoc.ele(
                "div",
                bdoc.attr("style", "padding-left:2em;"),

                bdoc.ele("h2", "Custom Sets")
            ),
            bdoc.ele(
                "div",
                bdoc.id("custom-sets-filter-table-container"),
                this.loadingElement
            ),
            // bdoc.ele(
            //     "mm-filter-table",
            //     bdoc.attr("filter-properties", "subject,creator"),
            //     bdoc.attr("sort-properties", "subject,creator"),
            //     bdoc.attr("display-properties", "subject,creator")
            // ),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-filter-table.js")
            )
        );
        this.#renderCustomSets();
    }

    // marked async in case we want to store custom sets in backend
    static fetchCustomSets = async () => {
        const settings = await MmMatchProfileSelect.getSettings();

        return settings.customSets || {};
    };

    static generateSummarizedAndDisplayCustomSets = (customSetsData) => {
        const summarizedCustomSets = [];

        Object.keys(customSetsData).forEach((customSetName) => {
            const customSet = customSetsData[customSetName];

            let leafCount = 0;
            let leafWithKeyCount = 0;
            for (const descriptor of customSet.descriptors) {
                if (descriptor._isLeaf) {
                    leafCount++;
                    if (descriptor.key && descriptor.key !== "") {
                        leafWithKeyCount++;
                    }
                }
            }

            let summarizedCustomSet = {};

            summarizedCustomSet.percentDescribed =
                leafCount > 0
                    ? Math.round((leafWithKeyCount / leafCount) * 100)
                    : 0;

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

            summarizedCustomSets.push(summarizedCustomSet);
        });

        const displayCustomSets = {};

        summarizedCustomSets.forEach((summarizedCustomSet) => {
            // generate display properties
            displayCustomSets[summarizedCustomSet.name] = {};
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
                displayCustomSets[summarizedCustomSet.name][key] = displayValue;
            });
        });

        return [summarizedCustomSets, displayCustomSets];
    };

    static generateFilterOptionsCallback =
        (summarizedCustomSets) =>
        (_displayElements, filters, selectedOptions, root) => {
            summarizedCustomSets.forEach((summarizedCustomSet) => {
                filters.forEach((filter) => {
                    if (!(filter in summarizedCustomSet)) {
                        const currentValue = "Null";
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
                    } else {
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
                    }
                });
            });
        };

    static generateDataFilteredBySearchKeywordsCallback =
        (summarizedCustomSets) => (_displayData, keywords) =>
            keywords.length > 0
                ? summarizedCustomSets.filter((summarizedCustomSet) =>
                      keywords.some((keyword) =>
                          JSON.stringify(summarizedCustomSet.name)
                              .toLowerCase()
                              .includes(keyword.toLowerCase())
                      )
                  )
                : summarizedCustomSets;

    static generateDataFilteredByFilterOptionsCallback =
        (displayCustomSets) => (filteredBySearch, filters) =>
            filteredBySearch
                .filter((item) =>
                    Object.keys(filters).every((filter) =>
                        Object.keys(filters[filter]).some(
                            (selected) => filters[filter][selected]
                        )
                            ? Object.keys(filters[filter]).some((selected) =>
                                  filters[filter][selected]
                                      ? (item[filter] &&
                                            item[filter].has(selected)) ||
                                        (selected === "Null" &&
                                            (item[filter] === undefined ||
                                                item[filter] === null ||
                                                item[filter] === "" ||
                                                item[filter].size === 0 ||
                                                item[filter].has("")))
                                      : false
                              )
                            : true
                    )
                )
                .map(
                    (summarizedCustomSet) =>
                        displayCustomSets[summarizedCustomSet.name]
                );

    static nameElementCallback = (customSet) =>
        bdoc.ele(
            "a",
            bdoc.attr("href", `/c/ViewCustomSet?key=${customSet.name}`),
            customSet.name
        );

    #renderCustomSets = async () => {
        const customSetsData = await MmViewCustomSets.fetchCustomSets();

        console.log(customSetsData);

        let summarizedCustomSets, displayCustomSets;
        try {
            [summarizedCustomSets, displayCustomSets] =
                MmViewCustomSets.generateSummarizedAndDisplayCustomSets(
                    customSetsData
                );
        } catch {
            summarizedCustomSets = [];
            displayCustomSets = {};
        }

        this.loadingElement.style.display = "none";

        customElements.whenDefined("mm-filter-table").then(() => {
            const customSetsFilterTableContainer =
                this.shadowRoot.querySelector(
                    "#custom-sets-filter-table-container"
                );

            if (!summarizedCustomSets || summarizedCustomSets.length === 0) {
                bdoc.append(
                    customSetsFilterTableContainer,
                    bdoc.ele(
                        "div",
                        bdoc.attr("style", "margin: 2em;"),
                        bdoc.ele("p", "No custom sets found."),
                        bdoc.ele(
                            "a",
                            bdoc.attr("href", "/c/CreateSets"),
                            "Create a custom set"
                        )
                    )
                );
            } else {
                const filterTable = bdoc.ele(
                    "mm-filter-table",
                    bdoc.attr("filter-properties", "subject,publisher,_orgId"),
                    bdoc.attr(
                        "filter-display-names",
                        JSON.stringify({
                            ["_orgId"]: "Organization",
                        })
                    ),
                    bdoc.attr(
                        "sort-properties",
                        "subject,publisher,name,Organization,Described"
                    ),
                    bdoc.attr("display-properties", "subject,publisher")
                );

                bdoc.append(customSetsFilterTableContainer, filterTable);

                filterTable.generateFilterOptions =
                    MmViewCustomSets.generateFilterOptionsCallback(
                        summarizedCustomSets
                    );
                filterTable.dataFilteredBySearchKeywords =
                    MmViewCustomSets.generateDataFilteredBySearchKeywordsCallback(
                        summarizedCustomSets
                    );
                filterTable.dataFilteredByFilterOptions =
                    MmViewCustomSets.generateDataFilteredByFilterOptionsCallback(
                        displayCustomSets
                    );

                filterTable.nameElementCallback =
                    MmViewCustomSets.nameElementCallback;

                filterTable.generateCols = (displayProperties) => ({
                    name: MmViewCustomSets.nameElementCallback,
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
                    Organization: (collection) => collection._orgId || "Null",

                    ["Described"]: (customSet) =>
                        bdoc.ele(
                            "td",
                            bdoc.attr("style", "text-align: center;"),
                            `${customSet.percentDescribed}%`
                        ),
                });

                filterTable.customSorts = {
                    ["Described"]: (a, b) => {
                        return a.percentDescribed - b.percentDescribed;
                    },
                    Organization: (a, b) => (a._orgId < b._orgId ? -1 : 1),
                };

                filterTable.loadData(Object.values(displayCustomSets));
            }
        });
    };
}
customElements.define("mm-view-custom-sets", MmViewCustomSets);

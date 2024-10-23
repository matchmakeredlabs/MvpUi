import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

class MmViewCustomSets extends HTMLElement {
    static observedAttributes = [
        "list-to-filter",
        "list-to-sort",
        "display-properties",
    ];

    #summarizedCustomSets = [];
    #displayCustomSets = {};
    #customSetsData = {};
    #searchKeywords = [];

    #listToFilter = [];
    #listToSort = [];
    #displayProperties = [];

    #selectedOptions = {};

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    sortCustomSetsBy(attribute) {
        this.#summarizedCustomSets = this.#summarizedCustomSets.sort(
            (aSummarized, bSummarized) => {
                // custom sets with no attribute are put at the end
                const a = this.#displayCustomSets[aSummarized.name];
                const b = this.#displayCustomSets[bSummarized.name];
                if (
                    (!(attribute in b) && attribute in a) ||
                    a[attribute] < b[attribute]
                ) {
                    return -1;
                }
                if (
                    (!(attribute in a) && attribute in b) ||
                    a[attribute] > b[attribute]
                ) {
                    return 1;
                }
                return 0;
            }
        );

        this.render();
    }

    firstLetterUppercase(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case "list-to-filter":
                this.#listToFilter = newValue.split(",");
                break;
            case "list-to-sort":
                this.#listToSort = newValue.split(",");
                break;
            case "display-properties":
                this.#displayProperties = newValue.split(",");
                break;
        }
    }

    connectedCallback() {
        const keywordContainer = bdoc.ele("span", bdoc.id("keyword-container"));
        const keywordElement = bdoc.ele(
            "input",
            bdoc.id("keywordElement"),
            bdoc.attr("type", "text")
        );
        const addKeyword = bdoc.ele(
            "button",
            bdoc.id("addKeyword"),
            "+",
            bdoc.eventListener("click", () => {
                const keyword = keywordElement.value;

                if (keyword) {
                    keywordElement.value = "";

                    const filterElement = bdoc.ele(
                        "div",
                        bdoc.class("filter"),
                        keyword
                    );

                    const closeButton = bdoc.ele(
                        "span",
                        bdoc.class("close"),

                        bdoc.eventListener("click", () => {
                            keywordContainer.removeChild(filterElement);
                            this.#searchKeywords = this.#searchKeywords.filter(
                                (kw) => kw !== keyword
                            );
                            this.render();
                        })
                    );
                    closeButton.innerHTML = "&times;";

                    bdoc.append(filterElement, closeButton);
                    // filterElement.textContent = keyword;
                    this.#searchKeywords.push(keyword);

                    bdoc.append(keywordContainer, filterElement);
                    this.render();
                }
            })
        );

        const sortDropdown = bdoc.ele(
            "select",
            bdoc.id("sortDropdown"),
            bdoc.ele("option", "--", bdoc.attr("value", "--")),
            ...this.#listToSort.map((sortOption) =>
                bdoc.ele(
                    "option",
                    this.firstLetterUppercase(sortOption),
                    bdoc.attr("value", sortOption)
                )
            ),

            bdoc.eventListener("change", ({ target }) => {
                const selectedOption = target.options[target.selectedIndex];
                if (selectedOption.value !== "--") {
                    this.sortCustomSetsBy(selectedOption.value);
                }
            })
        );

        const filterDropdownsContainer = bdoc.ele(
            "div",
            bdoc.id("filterDropdowns"),
            bdoc.ele("b", "Filter by: ")
        );

        const filterContainers = this.#listToFilter.map((filter) => {
            const oneFilterDropdown = bdoc.ele(
                "select",
                bdoc.id(`${filter}-dropdown`),
                bdoc.attr("style", "width: 100px"),
                bdoc.eventListener("change", ({ target }) => {
                    const selectedOption = target.options[target.selectedIndex];
                    for (let option in this.#selectedOptions[filter]) {
                        this.#selectedOptions[filter][option] = false;
                    }
                    if (selectedOption.value !== "--") {
                        this.#selectedOptions[filter][
                            selectedOption.value
                        ] = true;
                    }
                    this.render();
                })
            );
            const defaultOption = bdoc.ele(
                "option",
                bdoc.attr("value", "--"),
                "--"
            );
            bdoc.append(oneFilterDropdown, defaultOption);

            bdoc.append(
                filterDropdownsContainer,
                " " + this.firstLetterUppercase(filter) + " ",
                oneFilterDropdown
            );

            const spanForFilterContainer = bdoc.ele(
                "span",
                bdoc.id(`${filter}-container`)
            );

            this.#selectedOptions[filter] = [];

            return spanForFilterContainer;
        });

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

                bdoc.ele("h2", "Custom Sets"),
                bdoc.ele(
                    "div",
                    bdoc.id("filterContainers"),
                    keywordContainer,
                    ...filterContainers
                ),

                bdoc.ele("b", "Search by Keyword: "),
                keywordElement,
                addKeyword,
                bdoc.ele("br"),
                filterDropdownsContainer,

                bdoc.ele("b", "Sort by: "),
                sortDropdown
            ),
            bdoc.ele("mm-table"),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-table.js")
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

            this.#listToFilter.forEach((filter) => {
                summarizedCustomSet[filter].forEach((currentValue) => {
                    if (
                        currentValue === null ||
                        currentValue === "" ||
                        currentValue === undefined
                    ) {
                        currentValue = "Null";
                    }

                    if (!(currentValue in this.#selectedOptions[filter])) {
                        this.#selectedOptions[filter][currentValue] = false;
                        bdoc.append(
                            this.shadowRoot.getElementById(
                                `${filter}-dropdown`
                            ),
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

        this.render();
    };

    render() {
        let customSetsFilteredByKeyword =
            this.#searchKeywords.length > 0
                ? this.#summarizedCustomSets.filter((summarizedCustomSet) =>
                      this.#searchKeywords.every((keyword) =>
                          // question: use all of summarizedCustomSet or just name?
                          JSON.stringify(summarizedCustomSet.name)
                              .toLowerCase()
                              .includes(keyword.toLowerCase())
                      )
                  )
                : this.#summarizedCustomSets;

        let customSetsFilteredByFilter = customSetsFilteredByKeyword.filter(
            (summarizedCustomSet) =>
                Object.keys(this.#selectedOptions).every((filter) =>
                    Object.keys(this.#selectedOptions[filter]).every(
                        (selected) =>
                            this.#selectedOptions[filter][selected]
                                ? summarizedCustomSet[filter].has(selected)
                                : true
                    )
                )
        );

        Object.keys(this.#selectedOptions).forEach((filter) => {
            // If all options are false, replace options with options generated from filtered collections
            if (
                Object.values(this.#selectedOptions[filter]).every(
                    (selected) => !selected
                )
            ) {
                const optionsElement = this.shadowRoot.getElementById(
                    `${filter}-dropdown`
                );
                optionsElement.innerHTML = "";
                bdoc.append(
                    optionsElement,
                    bdoc.ele("option", "--", bdoc.attr("value", "--"))
                );

                customSetsFilteredByFilter.reduce((acc, customSet) => {
                    customSet[filter].forEach((currentValue) => {
                        if (
                            currentValue === null ||
                            currentValue === "" ||
                            currentValue === undefined
                        ) {
                            currentValue = "Null";
                        }

                        if (!(currentValue in acc)) {
                            acc[currentValue] = false;
                            bdoc.append(
                                this.shadowRoot.getElementById(
                                    `${filter}-dropdown`
                                ),
                                bdoc.ele(
                                    "option",
                                    currentValue,
                                    bdoc.attr("value", currentValue)
                                )
                            );
                        }
                    });
                    return acc;
                }, {});
            }
        });

        const table = this.shadowRoot.querySelector("mm-table");

        // collections render through setter; if custom element not defined then attribute is set without using setter
        customElements.whenDefined("mm-table").then(() => {
            table.cols = {
                name: (customSet) =>
                    bdoc.ele(
                        "a",
                        bdoc.attr(
                            "href",
                            `/c/ViewCustomSet?key=${customSet.name}`
                        ),
                        customSet.name
                    ),
                ...this.#displayProperties.reduce((acc, property) => {
                    acc[property] = (customSet) => {
                        let currentValue = customSet[property];
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
            };

            table.data = customSetsFilteredByFilter.map(
                (customSet) => this.#displayCustomSets[customSet.name]
            );
        });
    }
}
customElements.define("mm-view-custom-sets", MmViewCustomSets);

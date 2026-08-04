import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

class MmFilterTable extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    static observedAttributes = [
        "filter-properties",
        "sort-properties",
        "display-properties",
        "first-col-width",
        "filter-display-names",
    ];

    #data = [];
    #searchKeywords = [];

    #listToFilter = [];
    #sortProperties;
    #displayProperties = [];
    #filterDisplayNames = {};
    #firstColWidth = false;

    #selectedOptions = {};

    addCustomHeaderElements(elements) {
        bdoc.append(
            this.shadowRoot.querySelector(".filter-table-header"),
            ...elements
        );
    }

    set customSorts(customSorts) {
        customElements.whenDefined("mm-table").then(() => {
            this.shadowRoot.querySelector("mm-table").customSorts = customSorts;
        });
    }

    set customColStyles(customColStyles) {
        customElements.whenDefined("mm-table").then(() => {
            this.shadowRoot.querySelector("mm-table").customColStyles =
                customColStyles;
        });
    }

    addCustomStylesheets(stylesheets) {
        if (!Array.isArray(stylesheets)) {
            stylesheets = [stylesheets];
        }
        stylesheets.forEach((stylesheet) => {
            bdoc.append(
                this.shadowRoot,
                bdoc.ele(
                    "link",
                    bdoc.attr("rel", "stylesheet"),
                    bdoc.attr("href", stylesheet)
                )
            );
        });
    }

    getInnerTableRoot = async () => {
        let shadowRoot;
        await customElements.whenDefined("mm-table").then(() => {
            shadowRoot = this.shadowRoot
                .querySelector("mm-table")
                .getShadowRoot();
        });
        return shadowRoot;
    };

    getInnerTable = async () => {
        let table;
        await customElements.whenDefined("mm-table").then(() => {
            table = this.shadowRoot.querySelector("mm-table");
        });
        return table;
    };

    // #sortAttribute = "";

    nameElementCallback = (item) =>
        bdoc.ele("a", bdoc.attr("href", `Browse?id=${item.id}`), item.name);

    generateCols = (displayProperties) => ({
        name: this.nameElementCallback,
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
    });

    dataFilteredBySearchKeywords = (data, keywords) =>
        keywords.length > 0
            ? data.filter((item) =>
                  keywords.some((keyword) =>
                      JSON.stringify(item)
                          .toLowerCase()
                          .includes(keyword.toLowerCase())
                  )
              )
            : data;

    dataFilteredByFilterOptions = (data, selectedOptions) =>
        data.filter((item) =>
            Object.keys(selectedOptions).every((filter) =>
                Object.keys(selectedOptions[filter]).some(
                    (selected) => selectedOptions[filter][selected]
                )
                    ? Object.keys(selectedOptions[filter]).some((selected) =>
                          selectedOptions[filter][selected]
                              ? item[filter] === selected ||
                                ((item[filter] === undefined ||
                                    item[filter] === null ||
                                    item[filter] === "") &&
                                    selected === "Null")
                              : false
                      )
                    : true
            )
        );

    generateFilterOptions = (data, filters, selectedOptions, root) => {
        data.forEach((item) => {
            filters.forEach((filter) => {
                let currentValue = item[filter];

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
    };

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    loadData(data) {
        this.#data = data;

        this.generateFilterOptions(
            this.#data,
            this.#listToFilter,
            this.#selectedOptions,
            this.shadowRoot
        );

        this.render();
    }

    // getSortedItems = (items, attribute) =>
    //     items.sort((a, b) => {
    //         // put items with no attribute at the end
    //         if (
    //             (!(attribute in b) && attribute in a) ||
    //             a[attribute] < b[attribute]
    //         ) {
    //             return -1;
    //         }
    //         if (
    //             (!(attribute in a) && attribute in b) ||
    //             a[attribute] > b[attribute]
    //         ) {
    //             return 1;
    //         }
    //         return 0;
    //     });

    firstLetterUppercase(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case "filter-properties":
                this.#listToFilter = newValue.split(",");
                break;
            case "filter-display-names":
                this.#filterDisplayNames = JSON.parse(newValue);
                break;
            case "sort-properties":
                this.#sortProperties = newValue;
                break;
            case "display-properties":
                this.#displayProperties = newValue.split(",");
                break;
            case "first-col-width":
                this.#firstColWidth = newValue;

                break;
        }
    }

    #addFilterElement = (parent, filter, onClose) => {
        const filterElement = bdoc.ele("div", bdoc.class("filter"), filter);

        const closeButton = bdoc.ele(
            "span",
            bdoc.class("close"),
            bdoc.eventListener("click", (e) => {
                onClose(e);
                parent.removeChild(filterElement);
            })
        );
        closeButton.innerHTML = "&times;";

        bdoc.append(filterElement, closeButton);
        bdoc.append(parent, filterElement);
    };

    connectedCallback() {
        const keywordContainer = bdoc.ele("span", bdoc.id("keyword-container"));
        const keywordElement = bdoc.ele(
            "input",
            bdoc.id("keywordElement"),
            bdoc.attr("type", "text"),
            bdoc.attr("placeholder", "Enter search term..."),
            bdoc.eventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddKeyword();
                }
            })
        );
        const handleAddKeyword = () => {
            const keyword = keywordElement.value;

            if (keyword !== "") {
                keywordElement.value = "";

                this.#addFilterElement(keywordContainer, keyword, () => {
                    this.#searchKeywords = this.#searchKeywords.filter(
                        (kw) => kw !== keyword
                    );
                    this.render();
                });

                this.#searchKeywords.push(keyword);
                this.render();
            }
        };
        const addKeyword = bdoc.ele(
            "button",
            bdoc.id("addKeyword"),
            "+ Filter",
            bdoc.attr("style", "cursor: pointer;"),
            bdoc.eventListener("click", handleAddKeyword)
        );

        // const sortDropdown = bdoc.ele(
        //     "select",
        //     bdoc.id("sortDropdown"),
        //     bdoc.ele("option", "--", bdoc.attr("value", "--")),
        //     ...this.#listToSort.map((sortOption) =>
        //         bdoc.ele(
        //             "option",
        //             this.firstLetterUppercase(sortOption),
        //             bdoc.attr("value", sortOption)
        //         )
        //     ),

        //     bdoc.eventListener("change", ({ target }) => {
        //         const selectedOption = target.options[target.selectedIndex];
        //         if (selectedOption.value !== "--") {
        //             if (this.#sortAttribute !== selectedOption.value) {
        //                 this.#sortAttribute = selectedOption.value;
        //                 this.render();
        //             }
        //         }
        //     })
        // );

        const filterDropdownsContainer =
            this.#listToFilter.length > 0
                ? bdoc.ele(
                      "div",
                      bdoc.id("filterDropdowns"),
                      bdoc.ele("b", "Filter by: ")
                  )
                : null;

        const filterContainers = this.#listToFilter.map((filter) => {
            const filterDisplayName =
                filter in this.#filterDisplayNames
                    ? this.#filterDisplayNames[filter]
                    : this.firstLetterUppercase(filter);

            const oneFilterDropdown = bdoc.ele(
                "select",
                bdoc.id(`${filter}-dropdown`),
                bdoc.attr("style", "width: 100px; cursor: pointer;"),
                bdoc.eventListener("change", ({ target }) => {
                    const selectedOption = target.options[target.selectedIndex];
                    if (
                        selectedOption.value !== "--" &&
                        !this.#selectedOptions[filter][selectedOption.value]
                    ) {
                        this.#selectedOptions[filter][
                            selectedOption.value
                        ] = true;

                        this.#addFilterElement(
                            keywordContainer,
                            `${filterDisplayName}: ${selectedOption.value}`,
                            () => {
                                this.#selectedOptions[filter][
                                    selectedOption.value
                                ] = false;

                                this.render();
                            }
                        );
                    }
                    target.selectedIndex = 0;
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
                " " + filterDisplayName + " ",
                oneFilterDropdown
            );

            const spanForFilterContainer = bdoc.ele(
                "span",
                bdoc.id(`${filter}-container`)
            );

            this.#selectedOptions[filter] = [];

            return spanForFilterContainer;
        });

        const table = bdoc.ele("mm-table");

        if (this.#firstColWidth) {
            bdoc.append(
                table,
                bdoc.attr("first-col-width", this.#firstColWidth)
            );
        }

        if (this.#sortProperties) {
            bdoc.append(
                table,
                bdoc.attr("sort-properties", this.#sortProperties)
            );
        }

        const filtersContainer = bdoc.ele(
            "div",
            bdoc.class("filters-container"),

            bdoc.ele(
                "div",
                bdoc.id("filterContainers"),
                keywordContainer,
                ...filterContainers
            ),

            bdoc.ele("b", "Search: "),
            keywordElement,
            addKeyword,
            bdoc.ele("br")
        );

        if (this.#listToFilter.length > 0) {
            bdoc.append(filtersContainer, filterDropdownsContainer);
        }
        // if (this.#listToSort.length > 0) {
        //     bdoc.append(
        //         filtersContainer,
        //         bdoc.ele("b", "Sort by: "),
        //         sortDropdown
        //     );
        // }

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
                bdoc.attr("href", "/c/res/mm-filter-table.css")
            ),
            bdoc.ele(
                "div",
                bdoc.class("filter-table-header"),
                filtersContainer,
                bdoc.ele("slot", bdoc.attr("name", "header"))
            ),

            table,
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-table.js")
            )
        );
    }

    render() {
        const dataFilteredByKeyword = this.dataFilteredBySearchKeywords(
            this.#data,
            this.#searchKeywords
        );

        const dataFilteredByFilter = this.dataFilteredByFilterOptions(
            dataFilteredByKeyword,
            this.#selectedOptions
        );

        // const sortedData =
        //     this.#sortAttribute === ""
        //         ? dataFilteredByFilter
        //         : this.getSortedItems(
        //               dataFilteredByFilter,
        //               this.#sortAttribute
        //           );

        // items render through setter; if custom element not defined then attribute is set without using setter

        const table = this.shadowRoot.querySelector("mm-table");
        customElements.whenDefined("mm-table").then(() => {
            table.cols = this.generateCols(this.#displayProperties);
            table.totalCount = this.#data.length;
            table.data = dataFilteredByFilter;
        });
    }
}
customElements.define("mm-filter-table", MmFilterTable);

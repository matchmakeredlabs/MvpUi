import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

class MmFilterTable extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    static observedAttributes = [
        "filter-properties",
        "sort-properties",
        "display-properties",
    ];

    #data = [];
    #searchKeywords = [];

    #listToFilter = [];
    #listToSort = [];
    #displayProperties = [];

    #selectedOptions = {};

    #sortAttribute = "";

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
                      JSON.stringify(item.name)
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
                              ? item[filter] === selected
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

    getSortedItems = (items, attribute) =>
        items.sort((a, b) => {
            // put items with no attribute at the end
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
        });

    firstLetterUppercase(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case "filter-properties":
                this.#listToFilter = newValue.split(",");
                break;
            case "sort-properties":
                this.#listToSort = newValue.split(",");
                break;
            case "display-properties":
                this.#displayProperties = newValue.split(",");
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
            bdoc.attr("type", "text")
        );
        const addKeyword = bdoc.ele(
            "button",
            bdoc.id("addKeyword"),
            "+",
            bdoc.eventListener("click", () => {
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
                    if (this.#sortAttribute !== selectedOption.value) {
                        this.#sortAttribute = selectedOption.value;
                        this.render();
                    }
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
                    if (
                        selectedOption.value !== "--" &&
                        !this.#selectedOptions[filter][selectedOption.value]
                    ) {
                        this.#selectedOptions[filter][
                            selectedOption.value
                        ] = true;

                        this.#addFilterElement(
                            keywordContainer,
                            selectedOption.value,
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

        const sortedData =
            this.#sortAttribute === ""
                ? dataFilteredByFilter
                : this.getSortedItems(
                      dataFilteredByFilter,
                      this.#sortAttribute
                  );

        // items render through setter; if custom element not defined then attribute is set without using setter

        const table = this.shadowRoot.querySelector("mm-table");

        customElements.whenDefined("mm-table").then(() => {
            table.cols = this.generateCols(this.#displayProperties);

            table.data = sortedData;
        });
    }
}
customElements.define("mm-filter-table", MmFilterTable);

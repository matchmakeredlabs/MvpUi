import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

class MmCollections extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    static observedAttributes = [
        "list-to-filter",
        "list-to-sort",
        "display-properties",
        "on-collection-click-url",
    ];

    #collections = [];
    #searchKeywords = [];

    #listToFilter = [];
    #listToSort = [];
    #displayProperties = "";
    #onCollectionClickUrl = "";

    #selectedOptions = {};

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    sortCollectionsBy(attribute) {
        this.#collections = this.#collections.sort((a, b) => {
            // put collections with no attribute at the end
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
                this.#displayProperties = newValue;
                break;
            case "on-collection-click-url":
                this.#onCollectionClickUrl = newValue;
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
                    this.sortCollectionsBy(selectedOption.value);
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
                    if (selectedOption.value !== "--")
                        this.#selectedOptions[filter][
                            selectedOption.value
                        ] = true;
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

                bdoc.ele("h2", "Collections"),
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
            bdoc.ele(
                "mm-collections-display",
                bdoc.attr("display-properties", this.#displayProperties),
                bdoc.attr("on-collection-click-url", this.#onCollectionClickUrl)
            ),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-collections-display.js")
            )
        );
        this.#fetchCollections();
    }

    #fetchCollections = async () => {
        const response = await MmCollections.session.fetch("/api/collections");
        this.#collections = (await response.json()).collections;

        this.#collections.forEach((collection) => {
            this.#listToFilter.forEach((filter) => {
                let currentValue = collection[filter];

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
                        this.shadowRoot.getElementById(`${filter}-dropdown`),
                        bdoc.ele(
                            "option",
                            currentValue,
                            bdoc.attr("value", currentValue)
                        )
                    );
                }
            });
        });

        this.render();
    };

    render() {
        let collectionsFilteredByKeyword =
            this.#searchKeywords.length > 0
                ? this.#collections.filter((collection) =>
                      this.#searchKeywords.every((keyword) =>
                          // question: use all of collection or just name?
                          JSON.stringify(collection.name)
                              .toLowerCase()
                              .includes(keyword.toLowerCase())
                      )
                  )
                : this.#collections;

        let collectionsFilteredByFilter = collectionsFilteredByKeyword.filter(
            (collection) =>
                Object.keys(this.#selectedOptions).every((filter) =>
                    Object.keys(this.#selectedOptions[filter]).every(
                        (selected) =>
                            this.#selectedOptions[filter][selected]
                                ? collection[filter] === selected
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
                const options = collectionsFilteredByFilter.reduce(
                    (acc, collection) => {
                        let currentValue = collection[filter];

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
                                optionsElement,
                                bdoc.ele(
                                    "option",
                                    currentValue,
                                    bdoc.attr("value", currentValue)
                                )
                            );
                        }

                        return acc;
                    },
                    {}
                );
            }
        });

        // collections render through setter; if custom element not defined then attribute is set without using setter
        customElements.whenDefined("mm-collections-display").then(() => {
            this.shadowRoot.querySelector(
                "mm-collections-display"
            ).collections = collectionsFilteredByFilter;
        });
    }
}
customElements.define("mm-collections", MmCollections);

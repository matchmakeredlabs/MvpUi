import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";
import MmViewCustomSets from "./mm-view-custom-sets.js";
import MmCollections from "./mm-collections.js";

class MmMatchSets extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    #customSetsData = {};
    #collections = [];

    #sets = {
        independent: {
            ["custom-set"]: [],
            ["collections"]: [],
        },
        dependent: {
            ["custom-set"]: [],
            ["collections"]: [],
        },
    };
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        const customSetsContainer = bdoc.ele(
            "div",
            bdoc.class("dropdown-table-container"),
            bdoc.id("custom-sets-filter-table-container"),
            bdoc.ele(
                "mm-filter-table",
                bdoc.id("custom-sets-table"),
                bdoc.attr("filter-properties", "subject,creator"),
                bdoc.attr("sort-properties", "subject,creator"),
                bdoc.attr("display-properties", "subject,creator")
            )
        );

        const collectionsContainer = bdoc.ele(
            "div",
            bdoc.class("dropdown-table-container"),
            bdoc.id("collections-filter-table-container"),
            bdoc.ele(
                "mm-filter-table",
                bdoc.id("collections-table"),
                bdoc.attr("filter-properties", "subject,publisher"),
                bdoc.attr("sort-properties", "subject,publisher"),
                bdoc.attr("display-properties", "subject,publisher")
            )
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
                bdoc.attr("href", "/c/res/mm-match-sets.css")
            ),
            bdoc.ele(
                "div",
                bdoc.class("match-sets-header"),
                bdoc.ele(
                    "h2",
                    "Match Sets",
                    bdoc.attr("style", "width: 365px")
                ),
                bdoc.ele(
                    "button",
                    bdoc.class("header-button reset"),
                    "Reset",
                    bdoc.eventListener("click", () => {
                        localStorage.removeItem(
                            "currentGenerateMatchesWorkflow"
                        );
                        for (const setCategory in this.#sets) {
                            for (const setType in this.#sets[setCategory]) {
                                for (const set of this.#sets[setCategory][
                                    setType
                                ]) {
                                    const identifierType =
                                        setType === "custom-set"
                                            ? "name"
                                            : "id";
                                    this.#removeSet(
                                        set[identifierType],
                                        setCategory,
                                        setType
                                    );
                                }
                            }
                        }
                        customElements
                            .whenDefined("mm-filter-table")
                            .then(async () => {
                                const tables =
                                    this.shadowRoot.querySelectorAll(
                                        "mm-filter-table"
                                    );

                                for (const table of tables) {
                                    const tableRoot =
                                        await table.getInnerTableRoot();

                                    const inputs =
                                        tableRoot.querySelectorAll("input");
                                    for (const input of inputs) {
                                        input.checked = false;
                                    }
                                }
                            });
                    })
                ),
                bdoc.ele(
                    "div",
                    bdoc.class("header-button-group"),
                    bdoc.ele(
                        "mm-match-profile-select",
                        bdoc.attr("style", "margin-top: 1em")
                    ),
                    bdoc.ele(
                        "button",
                        bdoc.class("header-button match-profile"),
                        "Match Profile"
                    ),
                    bdoc.ele(
                        "button",
                        bdoc.class("header-button generate-matches"),
                        "Generate Matches →",
                        bdoc.eventListener(
                            "click",
                            this.#onClickGenerateMatches
                        )
                    )
                )
            ),

            bdoc.ele(
                "div",
                bdoc.class("both-chosen-sets-container"),
                bdoc.ele(
                    "div",
                    bdoc.class("chosen-sets-container"),
                    bdoc.ele("h3", "Independent"),
                    bdoc.ele(
                        "div",
                        bdoc.class("chosen-sets independent"),
                        bdoc.id("independent-sets"),
                        bdoc.ele(
                            "h4",
                            bdoc.id("independent-sets-start-text"),
                            'Click "Add to Independent" to add sets'
                        )
                    )
                ),
                bdoc.ele(
                    "div",
                    bdoc.class("chosen-sets-container"),
                    bdoc.ele("h3", "Dependent"),
                    bdoc.ele(
                        "div",
                        bdoc.class("chosen-sets dependent"),
                        bdoc.id("dependent-sets"),
                        bdoc.ele(
                            "h4",
                            bdoc.id("dependent-sets-start-text"),
                            'Click "Add to Dependent" to add sets'
                        )
                    )
                )
            ),

            bdoc.ele(
                "div",
                bdoc.class("dropdown-container"),
                bdoc.id("custom-sets-container"),
                bdoc.ele(
                    "div",
                    bdoc.class("dropdown-button-container"),
                    bdoc.ele(
                        "button",
                        bdoc.class("dropdown-button"),
                        bdoc.ele(
                            "span",
                            bdoc.class("chevron"),
                            bdoc.id("custom-sets-chevron")
                        ),
                        bdoc.ele("h2", "Custom Sets")
                    ),
                    bdoc.eventListener("click", () => {
                        customSetsContainer.classList.toggle("show");
                        this.shadowRoot
                            .getElementById("custom-sets-container")
                            .classList.toggle("show");
                        this.shadowRoot
                            .getElementById("custom-sets-chevron")
                            .classList.toggle("down");
                    })
                ),
                customSetsContainer
            ),

            bdoc.ele(
                "div",
                bdoc.class("dropdown-container"),
                bdoc.id("collections-container"),
                bdoc.ele(
                    "div",
                    bdoc.class("dropdown-button-container"),
                    bdoc.ele(
                        "button",
                        bdoc.class("dropdown-button"),
                        bdoc.ele(
                            "span",
                            bdoc.class("chevron"),
                            bdoc.id("collections-chevron")
                        ),
                        bdoc.ele("h2", "Collections")
                    ),
                    bdoc.eventListener("click", () => {
                        collectionsContainer.classList.toggle("show");
                        this.shadowRoot
                            .getElementById("collections-container")
                            .classList.toggle("show");
                        this.shadowRoot
                            .getElementById("collections-chevron")
                            .classList.toggle("down");
                    })
                ),
                collectionsContainer
            ),

            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-filter-table.js")
            ),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-match-profile-modal.js")
            ),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-match-profile-select.js")
            )
        );

        this.#fetchData();
    }

    #onClickGenerateMatches = () => {
        for (const setCategory in this.#sets) {
            if (
                !Object.keys(this.#sets[setCategory]).some(
                    (setType) => this.#sets[setCategory][setType].length > 0
                )
            ) {
                alert(
                    "Need both independent and dependent sets to generate matches"
                );
                return;
            }
        }
        this.#storeSets();
        window.location.href = "/c/GenerateMatches";
    };

    #storeSets = () => {
        const setIds = {
            independent: {
                collections: this.#sets.independent.collections.map(
                    (collection) => collection.id
                ),
                ["custom-set"]: this.#sets.independent["custom-set"].map(
                    (customSet) => customSet.name
                ),
            },
            dependent: {
                collections: this.#sets.dependent.collections.map(
                    (collection) => collection.id
                ),
                ["custom-set"]: this.#sets.dependent["custom-set"].map(
                    (customSet) => customSet.name
                ),
            },
        };
        localStorage.setItem(
            "currentGenerateMatchesWorkflow",
            JSON.stringify(setIds)
        );
    };

    #removeSet = (setIdentifier, setCategory, setType) => {
        const container = this.shadowRoot.getElementById(`${setCategory}-sets`);
        container.removeChild(
            this.shadowRoot.getElementById(
                `${setCategory}-set-${setIdentifier}`
            )
        );

        const identifierType = setType === "custom-set" ? "name" : "id";

        const otherSetType =
            setType === "custom-set" ? "collections" : "custom-set";

        this.#sets[setCategory][setType] = this.#sets[setCategory][
            setType
        ].filter((set) => set[identifierType] !== setIdentifier);

        if (
            this.#sets[setCategory][setType].length === 0 &&
            this.#sets[setCategory][otherSetType].length === 0
        ) {
            this.shadowRoot.getElementById(
                `${setCategory}-sets-start-text`
            ).style.display = "block";
        }
    };

    #fetchData = async () => {
        this.#collections = await MmCollections.fetchCollections();

        this.#customSetsData = await MmViewCustomSets.fetchCustomSets();

        let summarizedCustomSets, displayCustomSets;
        if (this.#customSetsData) {
            [summarizedCustomSets, displayCustomSets] =
                MmViewCustomSets.generateSummarizedAndDisplayCustomSets(
                    this.#customSetsData
                );
        }

        const addSetElement = (set, setCategory, setType, tableRoot) => {
            const container = this.shadowRoot.getElementById(
                `${setCategory}-sets`
            );

            const identifierType = setType === "custom-set" ? "name" : "id";
            const setElement = bdoc.ele(
                "div",
                bdoc.class("chosen-set"),
                bdoc.id(`${setCategory}-set-${set[identifierType]}`),
                set.name
            );
            const closeButton = bdoc.ele(
                "span",
                bdoc.class("close"),
                bdoc.eventListener("click", () => {
                    this.#removeSet(set[identifierType], setCategory, setType);

                    this.#storeSets();
                    tableRoot.getElementById(
                        `${setCategory}-${setType}-${set[identifierType]}-checkbox`
                    ).checked = false;
                })
            );

            closeButton.innerHTML = "&times;";

            bdoc.append(setElement, closeButton);
            bdoc.append(container, setElement);
        };

        const addSet = (set, setCategory, setType, tableRoot) => {
            const identifierType = setType === "custom-set" ? "name" : "id";
            const otherCategory =
                setCategory === "independent" ? "dependent" : "independent";
            const otherSetType =
                setType === "custom-set" ? "collections" : "custom-set";

            if (
                this.#sets[setCategory][setType].length === 0 &&
                this.#sets[setCategory][otherSetType].length === 0
            ) {
                this.shadowRoot.getElementById(
                    `${setCategory}-sets-start-text`
                ).style.display = "none";
            }

            this.#sets[setCategory][setType].push(set);

            if (
                this.#sets[otherCategory][setType].some(
                    (otherSet) =>
                        otherSet[identifierType] === set[identifierType]
                )
            ) {
                tableRoot.getElementById(
                    `${otherCategory}-${setType}-${set[identifierType]}-checkbox`
                ).checked = false;
                this.#removeSet(set[identifierType], otherCategory, setType);
            }

            addSetElement(set, setCategory, setType, tableRoot);
        };

        const generateCheckbox = (set, setCategory, setType, tableRoot) => {
            const identifierType = setType === "custom-set" ? "name" : "id";

            return bdoc.ele(
                "td",
                bdoc.attr("style", "text-align: center"),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "checkbox"),
                    bdoc.id(
                        `${setCategory}-${setType}-${set[identifierType]}-checkbox`
                    ),
                    bdoc.eventListener("change", ({ target }) => {
                        if (target.checked) {
                            addSet(set, setCategory, setType, tableRoot);
                            this.#storeSets();
                        } else {
                            this.#removeSet(
                                set[identifierType],
                                setCategory,
                                setType
                            );
                            this.#storeSets();
                        }
                    })
                )
            );
        };

        const loadSavedSets = (setType, tableRoot) => {
            const savedSetIds = JSON.parse(
                localStorage.getItem("currentGenerateMatchesWorkflow")
            );
            if (savedSetIds) {
                for (const setCategory in savedSetIds) {
                    for (const setIdentifier of savedSetIds[setCategory][
                        setType
                    ]) {
                        const set =
                            setType === "custom-set"
                                ? displayCustomSets[setIdentifier]
                                : this.#collections.find(
                                      (collection) =>
                                          collection.id === setIdentifier
                                  );

                        const checkbox = tableRoot.getElementById(
                            `${setCategory}-${setType}-${setIdentifier}-checkbox`
                        );

                        checkbox.checked = true;

                        addSet(set, setCategory, setType, tableRoot);
                    }
                }
            }
        };

        customElements.whenDefined("mm-filter-table").then(() => {
            if (this.#collections) {
                const collectionsTable =
                    this.shadowRoot.getElementById("collections-table");
                // to change table height to prevent scrolling
                collectionsTable.addCustomStylesheets(
                    "/c/res/mm-match-sets.css"
                );

                collectionsTable.generateCols = (displayProperties) => ({
                    name: (collection) =>
                        bdoc.ele(
                            "a",
                            bdoc.attr("href", `Browse?id=${collection.id}`),
                            collection.name
                        ),
                    ...displayProperties.reduce((acc, property) => {
                        acc[property] = (collection) => {
                            let currentValue = collection[property];
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
                    ["Add to Independent"]: (collection, root) =>
                        generateCheckbox(
                            collection,
                            "independent",
                            "collections",
                            root
                        ),
                    ["Add to Dependent"]: (collection, root) =>
                        generateCheckbox(
                            collection,
                            "dependent",
                            "collections",
                            root
                        ),
                });

                collectionsTable.loadData(this.#collections);

                // ensures that saved sets are loaded after table is loaded
                setTimeout(async () => {
                    const innerTableRoot =
                        await collectionsTable.getInnerTableRoot();

                    loadSavedSets("collections", innerTableRoot);
                }, 0);
            }

            if (this.#customSetsData) {
                const customSetsTable =
                    this.shadowRoot.getElementById("custom-sets-table");

                customSetsTable.addCustomStylesheets(
                    "/c/res/mm-match-sets.css"
                );

                customSetsTable.generateFilterOptions =
                    MmViewCustomSets.generateFilterOptionsCallback(
                        summarizedCustomSets
                    );
                customSetsTable.dataFilteredBySearchKeywords =
                    MmViewCustomSets.generateDataFilteredBySearchKeywordsCallback(
                        summarizedCustomSets
                    );
                customSetsTable.dataFilteredByFilterOptions =
                    MmViewCustomSets.generateDataFilteredByFilterOptionsCallback(
                        displayCustomSets
                    );

                customSetsTable.generateCols = (displayProperties) => ({
                    name: (customSet) =>
                        bdoc.ele(
                            "a",
                            bdoc.attr(
                                "href",
                                `ViewCustomSet?key=${customSet.name}`
                            ),
                            customSet.name
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
                    ["Add to Independent"]: (customSet, root) =>
                        generateCheckbox(
                            customSet,
                            "independent",
                            "custom-set",
                            root
                        ),
                    ["Add to Dependent"]: (customSet, root) =>
                        generateCheckbox(
                            customSet,
                            "dependent",
                            "custom-set",
                            root
                        ),
                });

                customSetsTable.loadData(Object.values(displayCustomSets));

                setTimeout(async () => {
                    const innerTableRoot =
                        await customSetsTable.getInnerTableRoot();

                    loadSavedSets("custom-set", innerTableRoot);
                }, 0);
            }
        });

        customElements.whenDefined("mm-match-profile-modal").then(() => {
            const matchProfileButton =
                this.shadowRoot.querySelector(".match-profile");
            const matchProfileModal = bdoc.ele("mm-match-profile-modal");

            bdoc.append(this.shadowRoot, matchProfileModal);
            matchProfileButton.addEventListener("click", () => {
                matchProfileModal.show();
            });
        });
    };
}

customElements.define("mm-match-sets", MmMatchSets);

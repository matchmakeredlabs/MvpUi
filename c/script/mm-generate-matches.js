import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";
import MmViewCustomSets from "./mm-view-custom-sets.js";
import MmCollections from "./mm-collections.js";
import MmMatchProfileModal from "./mm-match-profile-modal.js";
import MmElementCard from "./mm-element-card.js";

class MmGenerateMatches extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    #collections = [];
    #customSetsData = {};

    #currentlySelectedElement = null;

    #matchesData = null;

    #reqIds = {
        srcDescriptorIds: [],
        dstDescriptorIds: [],
    };

    #sets = {};

    #collectionElements = {};

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
                bdoc.attr("href", "/c/res/mm-generate-matches.css")
            ),
            bdoc.ele(
                "div",
                bdoc.class("independent-sets-container"),

                bdoc.ele("h1", "Independent Elements"),
                bdoc.ele(
                    "div",
                    bdoc.class("independent-sets"),
                    bdoc.id("independent-sets")
                )
            ),
            bdoc.ele(
                "div",
                bdoc.class("matches-container"),
                bdoc.id("matches-container"),
                bdoc.ele(
                    "div",
                    bdoc.class("matches-header-container"),
                    bdoc.ele(
                        "div",
                        bdoc.class("match-header"),
                        bdoc.ele("h1", "Matching Elements"),
                        bdoc.ele(
                            "select",
                            bdoc.id("type-select"),
                            ...Object.keys(MmElementCard.EleTypeTranslate).map(
                                (type) =>
                                    bdoc.ele(
                                        "option",
                                        bdoc.attr("value", type),
                                        MmElementCard.EleTypeTranslate[type]
                                    )
                            ),
                            bdoc.eventListener("change", () => {
                                this.#selectElement();
                            })
                        )
                    ),
                    bdoc.ele(
                        "div",
                        bdoc.class("match-profile-container"),
                        bdoc.ele(
                            "button",
                            bdoc.class("header-button match-profile"),
                            "Match Profile"
                        ),
                        bdoc.ele("mm-match-profile-select")
                    )
                ),
                bdoc.ele("div", bdoc.class("matches"), bdoc.id("matches"))
            ),

            bdoc.ele("mm-modal", bdoc.id("element-modal")),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-collection.js")
            ),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-dropdown.js")
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
            ),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-element-card.js")
            ),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-modal.js")
            )
        );

        this.#fetchSets();

        customElements.whenDefined("mm-match-profile-modal").then(() => {
            const matchProfileButton =
                this.shadowRoot.querySelector(".match-profile");
            const matchProfileModal = bdoc.ele("mm-match-profile-modal");

            bdoc.append(this.shadowRoot, matchProfileModal);
            matchProfileButton.addEventListener("click", () => {
                matchProfileModal.show();
            });
        });
        customElements.whenDefined("mm-match-profile-select").then(() => {
            const matchProfileSelect = this.shadowRoot.querySelector(
                "mm-match-profile-select"
            );

            matchProfileSelect.onSelectAction = () => {
                this.#matchesData = null;
                this.#selectElement();
            };
        });
    }

    #fetchSets = async () => {
        const setIds = JSON.parse(
            localStorage.getItem("currentGenerateMatchesWorkflow")
        );

        if (!setIds) {
            bdoc.append(
                this.shadowRoot,
                bdoc.ele(
                    "div",
                    "No independent or dependent sets selected. Please select sets to view matches."
                )
            );
            return;
        }

        this.#collections = await MmCollections.fetchCollections();

        this.#customSetsData = await MmViewCustomSets.fetchCustomSets();

        for (const setCategory in setIds) {
            for (const setType in setIds[setCategory]) {
                const sets = setIds[setCategory][setType];
                if (sets.length > 0) {
                    if (!this.#sets[setCategory]) {
                        this.#sets[setCategory] = {};
                    }
                    this.#sets[setCategory][setType] = sets.map((setId) => {
                        if (setType === "custom-set") {
                            return {
                                name: setId,
                                ...this.#customSetsData[setId],
                            };
                        } else if (setType === "collections") {
                            return this.#collections.find(
                                (collection) => collection.id === setId
                            );
                        }
                    });
                }
            }
        }

        const categoryToTarget = {
            dependent: "dstDescriptorIds",
            independent: "srcDescriptorIds",
        };

        // build request ids
        for (const setCategory in this.#sets) {
            for (const setType in this.#sets[setCategory]) {
                const sets = this.#sets[setCategory][setType];
                switch (setType) {
                    case "custom-set":
                        for (const customSet of sets) {
                            Object.values(customSet.descriptors).forEach(
                                (descriptor) => {
                                    this.#reqIds[
                                        categoryToTarget[setCategory]
                                    ].push(descriptor.id);
                                }
                            );
                        }
                        break;
                    case "collections":
                        for (const collection of sets) {
                            const response = await (
                                await MmGenerateMatches.session.fetch(
                                    "/api/collections/" + collection.id
                                )
                            ).json();

                            this.#collectionElements[collection.id] =
                                response.collection;
                            this.#reqIds[categoryToTarget[setCategory]] =
                                this.#reqIds[
                                    categoryToTarget[setCategory]
                                ].concat(
                                    response.collection.map(
                                        (element) => element.id
                                    )
                                );
                        }
                        break;
                }
            }
        }

        this.#render();
    };

    #generateMatches = async () => {
        const matchProfile = MmMatchProfileModal.getMatchWeights();

        const reqMatchProfile = {};

        for (const key in matchProfile) {
            const reqKey = key.substring(4).replace("-", "_");
            reqMatchProfile[reqKey] = parseFloat(matchProfile[key]);
        }
        const req = {
            ...this.#reqIds,
            profile: reqMatchProfile,
        };

        const response = await MmGenerateMatches.session.fetch(
            "/api/report/mxn",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(req),
            }
        );

        const responseJson = await response.json();

        this.#matchesData = responseJson;
    };

    #selectElement = () => {
        if (!this.#currentlySelectedElement) {
            return;
        }
        const { selectedElement, elementObj } = this.#currentlySelectedElement;
        const selectedElementLi = selectedElement.parentElement;
        const selectedElementButton = selectedElementLi.querySelector("button");

        if (!selectedElementButton.classList.contains("mmb_leaf")) {
            return;
        }

        const matchesContainer = this.shadowRoot.getElementById("matches");

        matchesContainer.innerHTML = "";

        if (!this.#matchesData) {
            this.#generateMatches().then(() => {
                this.#selectElement(selectedElement, elementObj);
            });
            bdoc.append(matchesContainer, bdoc.ele("p", "Loading matches..."));
            return;
        }

        const typeSelect = this.shadowRoot.getElementById("type-select");
        const selectedType = typeSelect.value;

        const elementMatches = this.#matchesData.result.find(
            ({ item }) => item.id === elementObj.id
        );

        bdoc.append(
            matchesContainer,
            bdoc.ele(
                "div",
                bdoc.class("matches-showing"),
                bdoc.ele(
                    "p",
                    `Showing matches for: `,
                    bdoc.ele(
                        "span",
                        bdoc.attr("style", "font-weight: bold;"),
                        elementObj.name
                    )
                ),

                this.#renderTooltipButton(elementObj)
            )
        );

        const matches =
            selectedType === "any"
                ? elementMatches.matches
                : elementMatches.matches.filter(
                      (element) => element.eleType === selectedType
                  );

        if (matches.length === 0) {
            bdoc.append(matchesContainer, bdoc.ele("p", "No matches found."));
        }

        const matchesSortedByMatchIndex = matches.sort(
            (a, b) => b.matchIndex - a.matchIndex
        );

        for (const match of matchesSortedByMatchIndex) {
            const matchElement = bdoc.ele(
                "mm-element-card",
                bdoc.attr("value", JSON.stringify(match))
            );
            bdoc.append(matchesContainer, matchElement);
        }
    };

    #renderTooltipButton = (currentNode) => {
        const tooltip = bdoc.ele("div", bdoc.class("info-button"), "i");

        Promise.all([
            customElements.whenDefined("mm-element-card"),
            customElements.whenDefined("mm-modal"),
        ]).then(() => {
            const elementModal =
                this.shadowRoot.getElementById("element-modal");

            const modalContent = elementModal.getModalContent();

            if (!modalContent.classList.contains("mmc_descriptor")) {
                modalContent.classList.add("mmc_descriptor");
                modalContent.style.width = "500px";
            }

            tooltip.addEventListener("click", () => {
                modalContent.innerHTML = "";
                MmElementCard.renderElement(
                    currentNode,
                    modalContent,
                    bdoc.ele(
                        "span",
                        bdoc.class("close"),
                        "×",
                        bdoc.eventListener("click", () => elementModal.hide())
                    )
                );
                elementModal.show();
            });
        });
        return tooltip;
    };

    #render = () => {
        const independentSetsContainer =
            this.shadowRoot.getElementById("independent-sets");
        const independentSets = this.#sets.independent;

        const generateDisplaySet = (setName, descriptors, setId) => {
            const collectionDisplay = bdoc.ele("mm-collection");

            customElements.whenDefined("mm-collection").then(() => {
                collectionDisplay.generateCustomDescriptorElement =
                    this.#renderTooltipButton;
                collectionDisplay.includeStylesheet(
                    "/c/res/mm-generate-matches.css"
                );

                collectionDisplay.loadDescriptors(descriptors);

                collectionDisplay.select = (selectedElement, elementObj) => {
                    this.#currentlySelectedElement = {
                        selectedElement,
                        elementObj,
                    };
                    this.#selectElement();
                };
            });

            const collectionContainer = bdoc.ele(
                "div",
                bdoc.class("collection-container")
            );

            const collectionHeaderButton = bdoc.ele(
                "button",
                bdoc.class("mmb_partial"),
                bdoc.eventListener("click", ({ target }) => {
                    collectionContainer.classList.toggle("show");

                    target.classList.toggle("mmb_expanded");
                })
            );
            bdoc.append(
                collectionContainer,
                bdoc.ele(
                    "div",
                    bdoc.class("collection-header-container"),
                    collectionHeaderButton,
                    bdoc.ele("p", bdoc.class("collection-header"), setName)
                ),
                bdoc.ele(
                    "div",
                    bdoc.class("collection-display-container"),
                    collectionDisplay
                )
            );

            return collectionContainer;
        };

        Object.keys(independentSets).forEach((setType) => {
            const sets = independentSets[setType];
            if (Object.keys(sets).length > 0) {
                const headerName = {
                    ["custom-set"]: "Custom Sets",
                    ["collections"]: "Collections",
                };

                const displaySets = [];

                switch (setType) {
                    case "custom-set":
                        for (const customSet of sets) {
                            displaySets.push(
                                generateDisplaySet(
                                    customSet.name,
                                    Object.values(customSet.descriptors)
                                )
                            );
                        }
                        break;
                    case "collections":
                        for (const collection of sets) {
                            const elements =
                                this.#collectionElements[collection.id];

                            displaySets.push(
                                generateDisplaySet(
                                    collection.name,
                                    elements,
                                    collection.id
                                )
                            );
                        }
                }

                bdoc.append(
                    independentSetsContainer,
                    bdoc.ele(
                        "mm-dropdown",
                        bdoc.attr("id", setType + "-dropdown"),
                        bdoc.ele(
                            "h3",
                            bdoc.attr("slot", "button-text"),
                            bdoc.attr("style", "margin: 0;"),
                            headerName[setType]
                        ),
                        bdoc.ele(
                            "div",
                            bdoc.attr("slot", "dropdown-body"),
                            bdoc.class("set-collections-container"),
                            ...displaySets
                        )
                    )
                );
            }
        });
    };
}

customElements.define("mm-generate-matches", MmGenerateMatches);

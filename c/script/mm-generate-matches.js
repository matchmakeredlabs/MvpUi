import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";
import MmViewCustomSets from "./mm-view-custom-sets.js";
import MmCollections from "./mm-collections.js";
import MmMatchProfileModal from "./mm-match-profile-modal.js";
import MmElementCard from "./mm-element-card.js";
import { convertJsonToCsv } from "./downloadhelper.js";
import "./mm-loading.js";
import "./mm-modal.js";

class MmGenerateMatches extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);
    numOnPage = 0;

    #collections = [];
    #customSetsData = {};

    #currentlySelectedElement = null;
    #displayedElement = null;

    #matchesData = null;
    #generateMatchesPromise = null;
    #matchesGeneration = 0;

    #reqIds = {
        srcDescriptorIds: [],
        dstDescriptorIds: [],
    };

    #sets = {};

    #collectionElements = {};

    #fetchSetsPromise;

    #matchDirectionsElement = bdoc.ele(
        "p",
        "Click on a described element to view matches.",
        bdoc.attr("style", "display: none;")
    );

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
                bdoc.class("anchored-sets-container"),

                bdoc.ele("h1", "Anchored Elements"),
                bdoc.ele(
                    "div",
                    bdoc.class("anchored-sets"),
                    bdoc.id("anchored-sets"),
                    bdoc.ele(
                        "mm-loading",
                        bdoc.id("loading"),
                        bdoc.attr("message", "Loading anchored elements..."),
                        bdoc.attr("style", "display: flex; margin: 2em auto;")
                    )
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
                        bdoc.ele(
                            "h1",
                            "Matching Elements",
                            bdoc.ele(
                                "span",
                                bdoc.attr(
                                    "style",
                                    "font-size: 15px; display: inline-block; vertical-align: middle; margin-left: 10px;"
                                ),
                                bdoc.ele(
                                    "mm-tooltip",
                                    bdoc.ele(
                                        "slot",
                                        bdoc.attr("name", "tooltip-button"),
                                        bdoc.attr("slot", "tooltip-button"),
                                        bdoc.eventListener(
                                            "click",
                                            () => this.#showDownloadModal()
                                        )
                                    ),
                                    bdoc.ele(
                                        "span",
                                        bdoc.attr("slot", "tooltip-content"),
                                        "Download Match Report"
                                    )
                                )
                            )
                        ),

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
                        )
                    )
                ),
                bdoc.ele(
                    "div",
                    bdoc.class("matches"),
                    bdoc.id("matches"),
                    this.#matchDirectionsElement
                )
            ),

            bdoc.ele(
                "mm-modal",
                bdoc.id("download-modal"),
                bdoc.ele(
                    "form",
                    bdoc.class("download-report-form"),
                    bdoc.eventListener("submit", (event) =>
                        event.preventDefault()
                    ),
                    bdoc.ele("h2", "Download Match Report"),
                    bdoc.ele(
                        "p",
                        bdoc.class("download-scope"),
                        "This export includes only the matches shown for the selected anchored element and element type."
                    ),
                    bdoc.ele(
                        "label",
                        bdoc.class("download-threshold-row"),
                        bdoc.ele(
                            "span",
                            "Only include matches with a MatchIndex greater than or equal to:"
                        ),
                        bdoc.ele(
                            "input",
                            bdoc.attr("type", "number"),
                            bdoc.attr("id", "match-threshold"),
                            bdoc.attr("name", "match-threshold"),
                            bdoc.attr("value", "0"),
                            bdoc.attr("min", "0"),
                            bdoc.attr("step", "any"),
                            bdoc.attr("required", "true")
                        )
                    ),
                    bdoc.ele(
                        "div",
                        bdoc.class("download-report-actions"),
                        this.#downloadButton("json", "Download JSON"),
                        this.#downloadButton("csv", "Download CSV")
                    ),
                    bdoc.ele(
                        "p",
                        bdoc.id("download-status"),
                        bdoc.class("download-status"),
                        bdoc.attr("aria-live", "polite")
                    )
                )
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
                bdoc.attr("src", "/c/script/mm-match-profile-modal.js")
            ),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-element-card.js")
            ),
            bdoc.script("mm-tooltip.js")
        );

        this.#fetchSetsPromise = this.#fetchSets();

        customElements.whenDefined("mm-match-profile-modal").then(() => {
            const matchProfileButton =
                this.shadowRoot.querySelector(".match-profile");
            const matchProfileModal = bdoc.ele("mm-match-profile-modal");

            bdoc.append(this.shadowRoot, matchProfileModal);
            matchProfileButton.addEventListener("click", () => {
                matchProfileModal.show();
            });
            matchProfileModal.addEventListener("match-profile-change", () => {
                this.#matchesData = null;
                this.#generateMatchesPromise = null;
                this.#matchesGeneration++;
                this.#selectElement();
            });
        });
    }

    #downloadButton = (format, label) =>
        bdoc.ele(
            "button",
            bdoc.attr("type", "button"),
            bdoc.attr("data-report-format", format),
            bdoc.class("download-report-button"),
            bdoc.eventListener("click", () => this.#downloadReport(format)),
            label
        );

    #showDownloadModal = async () => {
        await customElements.whenDefined("mm-modal");
        const modal = this.shadowRoot.getElementById("download-modal");
        this.#setDownloadStatus("");
        modal.show();
        modal.querySelector("#match-threshold").focus();
    };

    #downloadReport = async (format) => {
        const modal = this.shadowRoot.getElementById("download-modal");
        const thresholdInput = modal.querySelector("#match-threshold");
        if (!thresholdInput.reportValidity()) {
            return;
        }

        const threshold = Number(thresholdInput.value);
        if (!Number.isFinite(threshold)) {
            this.#setDownloadStatus("Enter a valid MatchIndex threshold.", true);
            return;
        }
        if (!this.#displayedElement) {
            this.#setDownloadStatus(
                "Select an anchored element before downloading a report.",
                true
            );
            return;
        }

        this.#setDownloadBusy(true);
        this.#setDownloadStatus("Preparing your report...");
        try {
            if (!this.#matchesData) {
                await this.#fetchSetsPromise;
                await this.#generateMatches();
            }
            if (!this.#matchesData) {
                throw new Error("No match report is available to download.");
            }

            const report = this.#buildDisplayedReport(threshold);
            const matchCount = report.result.reduce(
                (count, result) => count + result.matches.length,
                0
            );

            if (format === "json") {
                this.#saveReportFile(
                    JSON.stringify(report, null, 2),
                    "application/json",
                    "json"
                );
            } else {
                const rows = report.result.flatMap(({ item, matches }) =>
                    matches.map((match) => ({
                        ...match,
                        matchedTo: item?.id || "",
                    }))
                );
                this.#saveReportFile(
                    convertJsonToCsv(rows),
                    "text/csv;charset=utf-8",
                    "csv"
                );
            }

            this.#setDownloadStatus(
                `Downloaded ${matchCount} match${matchCount === 1 ? "" : "es"}.`
            );
        } catch (error) {
            this.#setDownloadStatus(
                error.message || "Unable to download the match report.",
                true
            );
        } finally {
            this.#setDownloadBusy(false);
        }
    };

    #buildDisplayedReport = (threshold) => {
        const displayedResult = (this.#matchesData.result || []).find(
            ({ item }) => item.id === this.#displayedElement.id
        );
        if (!displayedResult) {
            throw new Error(
                "No match results are available for the displayed element."
            );
        }

        const selectedType =
            this.shadowRoot.getElementById("type-select").value;
        const matches = (displayedResult.matches || []).filter(
            (match) =>
                (selectedType === "any" || match.eleType === selectedType) &&
                Number(match._matchIndex) >= threshold
        );

        return {
            ...this.#matchesData,
            result: [
                {
                    ...displayedResult,
                    matches,
                },
            ],
        };
    };

    #saveReportFile = (content, type, extension) => {
        const url = URL.createObjectURL(new Blob([content], { type }));
        const link = document.createElement("a");
        const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, "-");
        link.href = url;
        link.download = `match-report-${timestamp}.${extension}`;
        link.style.display = "none";
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    };

    #setDownloadBusy = (isBusy) => {
        this.shadowRoot
            .querySelectorAll("[data-report-format]")
            .forEach((button) => {
                button.disabled = isBusy;
            });
    };

    #setDownloadStatus = (message, isError = false) => {
        const status = this.shadowRoot.getElementById("download-status");
        status.textContent = message;
        status.classList.toggle("error", isError);
    };

    #fetchSets = async () => {
        this.#reqIds = {
            srcDescriptorIds: [],
            dstDescriptorIds: [],
        };
        this.#sets = {};
        this.#collectionElements = {};

        const rawSetIds = JSON.parse(
            localStorage.getItem("currentGenerateMatchesWorkflow")
        );
        const setIds = this.#normalizeWorkflowSetIds(rawSetIds);

        if (!setIds) {
            bdoc.append(
                this.shadowRoot,
                bdoc.ele(
                    "div",
                    "No anchored or responding sets selected. Please select sets to view matches."
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
            responding: "dstDescriptorIds",
            anchored: "srcDescriptorIds",
        };

        // build request ids
        for (const setCategory in this.#sets) {
            for (const setType in this.#sets[setCategory]) {
                const sets = this.#sets[setCategory][setType];
                switch (setType) {
                    case "custom-set":
                        for (const customSet of sets) {
                            Object.values(customSet?.descriptors || {}).forEach(
                                (descriptor) => {
                                    if (descriptor?.id) {
                                        this.#reqIds[
                                            categoryToTarget[setCategory]
                                        ].push(descriptor.id);
                                    }
                                }
                            );
                        }
                        break;
                    case "collections":
                        await Promise.all(sets.map(async (collection) => {
                            if (!collection?.id) {
                                return;
                            }
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
                                    (response.collection || []).map(
                                        (element) => element.id
                                    )
                                );
                        }));
                        break;
                }
            }
        }

        this.#dedupeReqIds();

        this.shadowRoot.getElementById("loading").hide();
        this.#matchDirectionsElement.style.display = "block";

        this.#render();
    };

    #normalizeWorkflowSetIds = (setIds) => {
        if (!setIds) {
            return null;
        }

        if (setIds.anchored || setIds.responding) {
            return setIds;
        }

        if (setIds.independent || setIds.dependent) {
            return {
                anchored: setIds.independent || {
                    ["custom-set"]: [],
                    collections: [],
                },
                responding: setIds.dependent || {
                    ["custom-set"]: [],
                    collections: [],
                },
            };
        }

        return setIds;
    };

    #dedupeReqIds = () => {
        this.#reqIds.srcDescriptorIds = [
            ...new Set(this.#reqIds.srcDescriptorIds.filter(Boolean)),
        ];
        this.#reqIds.dstDescriptorIds = [
            ...new Set(this.#reqIds.dstDescriptorIds.filter(Boolean)),
        ];
    };

    #generateMatches = async () => {
        if (this.#matchesData) {
            return this.#matchesData;
        }
        if (this.#generateMatchesPromise) {
            return this.#generateMatchesPromise;
        }

        const matchesGeneration = this.#matchesGeneration;
        this.#generateMatchesPromise = this.#fetchMatches();
        try {
            const matchesData = await this.#generateMatchesPromise;
            if (matchesGeneration !== this.#matchesGeneration) {
                return null;
            }
            this.#matchesData = matchesData;
            return this.#matchesData;
        } finally {
            if (matchesGeneration === this.#matchesGeneration) {
                this.#generateMatchesPromise = null;
            }
        }
    };

    #fetchMatches = async () => {
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

        if (!response.ok) {
            throw new Error(`Unable to generate matches: ${response.status}`);
        }

        const responseJson = await response.json();

        return responseJson;
    };

    #selectElement = () => {
        if (!this.#currentlySelectedElement) {
            return;
        }
        const { selectedElement, elementObj } = this.#currentlySelectedElement;
        const getSelectedLi = (element) => {
            if (element.tagName === "LI") {
                return element;
            }
            return getSelectedLi(element.parentElement);
        };
        const selectedElementLi = getSelectedLi(selectedElement);
        const selectedElementButton = selectedElementLi.querySelector("button");

        if (
            !selectedElementButton.classList.contains("mmb_leaf") ||
            !selectedElementButton.classList.contains("mmb_desc")
        ) {
            return;
        }

        this.#displayedElement = elementObj;

        const matchesContainer = this.shadowRoot.getElementById("matches");

        matchesContainer.innerHTML = "";

        this.#matchDirectionsElement.style.display = "none";

        if (!this.#matchesData) {
            const selectedElementId = elementObj.id;
            this.#generateMatches().then((matchesData) => {
                if (
                    matchesData &&
                    this.#currentlySelectedElement?.elementObj?.id ===
                        selectedElementId
                ) {
                    this.#selectElement();
                }
            }).catch((err) => {
                matchesContainer.innerHTML = "";
                bdoc.append(
                    matchesContainer,
                    bdoc.ele("p", err.message || "Unable to load matches.")
                );
            });
            bdoc.append(
                matchesContainer,
                bdoc.ele(
                    "mm-loading",
                    bdoc.attr("message", "Loading matches..."),
                    bdoc.attr("style", "display: flex; margin: 2em auto;")
                )
            );
            return;
        }

        const elementMatches = this.#matchesData.result.find(
            ({ item }) => item.id === elementObj.id
        );

        if (!elementMatches) {
            bdoc.append(
                matchesContainer,
                bdoc.ele("p", "No match results are available for this element.")
            );
            return;
        }

        const typeSelect = this.shadowRoot.getElementById("type-select");
        const selectedType = typeSelect.value;

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
            (a, b) => b._matchIndex - a._matchIndex
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
        const tooltipButton = bdoc.ele(
            "div",
            bdoc.class("info-button"),
            "i",

            bdoc.attr("style", "display: inline-block;  "),
            bdoc.attr("slot", "tooltip-button")
        );

        const tooltip = bdoc.ele(
            "mm-tooltip",

            bdoc.attr("style", "display: inline-block; vertical-align: top;"),
            tooltipButton,
            bdoc.ele(
                "span",
                bdoc.attr("slot", "tooltip-content"),
                "View element descriptor"
            )
        );

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

            tooltipButton.addEventListener("click", () => {
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
        let seq = 0;
        const anchoredSetsContainer =
            this.shadowRoot.getElementById("anchored-sets");
        const anchoredSets = this.#sets.anchored || {};

        const generateDisplaySet = (setName, descriptors, setId, idx) => {
            const collectionDisplay = bdoc.ele("mm-collection");
            collectionDisplay.numOnPage = idx;

            const collectionContainer = bdoc.ele(
                "div",
                bdoc.class("collection-container")
            );

            customElements.whenDefined("mm-collection").then(() => {
                const expandContractButtons = bdoc.ele(
                    "div",
                    bdoc.id("expand-contract-buttons"),
                    bdoc.ele(
                        "button",
                        bdoc.class("expand-contract-button"),
                        bdoc.id("expand-btn" + idx),
                        bdoc.eventListener(
                            "click",
                            collectionDisplay.expandAll
                        ),
                        "Expand"
                    ),
                    bdoc.ele(
                        "button",
                        bdoc.class("expand-contract-button"),
                        bdoc.id("contract-btn" + idx),
                        bdoc.attr("disabled", "true"),
                        bdoc.eventListener("click", () => {
                            if (!collectionDisplay.contractAll()) {
                                collectionHeaderButton.click();
                            }
                        }),
                        "Collapse"
                    )
                );

                const collectionHeaderButton = bdoc.ele(
                    "button",
                    bdoc.class("mmb_tri mmb_partial"),
                    bdoc.eventListener("click", ({ target }) => {
                        collectionContainer.classList.toggle("show");
                        expandContractButtons.classList.toggle("show");
                        target.classList.toggle("mmb_expanded");
                    })
                );

                const collectionHeaderContainer = bdoc.ele(
                    "div",
                    bdoc.class("collection-header-container"),
                    collectionHeaderButton,
                    bdoc.ele("p", bdoc.class("collection-header"), setName),
                    expandContractButtons
                );
                bdoc.append(
                    collectionContainer,
                    collectionHeaderContainer,
                    bdoc.ele(
                        "div",
                        bdoc.class("collection-display-container"),
                        collectionDisplay
                    )
                );

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

            return collectionContainer;
        };

        Object.keys(anchoredSets).forEach((setType) => {
            const sets = anchoredSets[setType];
            if (Object.keys(sets).length > 0) {
                const displaySets = [];

                switch (setType) {
                    case "custom-set":
                        for (const customSet of sets) {
                            const idx = seq++;
                            displaySets.push(
                                generateDisplaySet(
                                    customSet.name,
                                    Object.values(customSet.descriptors),
                                    undefined,
                                    idx
                                )
                            );
                        }
                        break;
                    case "collections":
                        for (const collection of sets) {
                            const elements =
                                this.#collectionElements[collection.id];
                            const idx = seq++;
                            displaySets.push(
                                generateDisplaySet(
                                    collection.name,
                                    elements,
                                    collection.id,
                                    idx
                                )
                            );
                        }
                        break;
                }

                bdoc.append(anchoredSetsContainer, ...displaySets);
            }
        });
    };
}

customElements.define("mm-generate-matches", MmGenerateMatches);

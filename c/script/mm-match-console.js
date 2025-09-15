import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import config from "../../config.js";
import MmMatchProfileModal from "./mm-match-profile-modal.js";
import MmMatchProfileSelect from "./mm-match-profile-select.js";

export default class MmMatchConsole extends HTMLElement {
    matchProfiles = null;

    static session = new bsession(config.backEndUrl, config.sessionTag);

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
            )
        );

        const container = bdoc.ele(
            "div",
            bdoc.attr("class", "mm_flex_vert"),
            bdoc.attr("style", "width:800px; margin: 0 auto;")
        );

        // Header Section
        const header = bdoc.ele(
            "div",
            bdoc.attr(
                "style",
                "display: flex; align-items: center; justify-content: space-between;"
            )
        );
        bdoc.append(header, bdoc.ele("h2", null, "Match Console"));

        const profileSelectWrapper = bdoc.ele(
            "div",
            bdoc.attr("style", "display: flex; align-items: center;")
        );
        bdoc.append(
            profileSelectWrapper,
            bdoc.ele(
                "label",
                bdoc.attr("for", "profile"),
                bdoc.attr("style", "margin-right: 10px;"),
                "Display Match Profile"
            )
        );

        const profileSelect = bdoc.ele("mm-match-profile-select");
        profileSelect.onSelectAction = (profileName) => {
            this.updateWeightsVisual(this.matchProfiles[profileName]);
        };
        bdoc.append(profileSelectWrapper, profileSelect);
        bdoc.append(header, profileSelectWrapper);
        bdoc.append(container, header);

        // const tooltipButton = bdoc.ele(
        //             "div",
        //             bdoc.class("info-button"),
        //             "i",

        //             bdoc.attr("style", "display: inline-block;"),
        //             bdoc.attr("slot", "tooltip-button")
        //         );

        //         const tooltip = bdoc.ele(
        //             "mm-tooltip",
        //             bdoc.attr("style", "display: inline-block; vertical-align: top;"),
        //             tooltipButton,
        //             bdoc.ele("span", bdoc.attr("slot", "tooltip-content"), tooltipText)
        //         );

        // Form Section
        const form = bdoc.ele(
            "form",
            bdoc.attr("id", "algForm"),
            bdoc.attr("class", "con_algForm")
        );

        const addRow = (col1, col2, col3) => {
            const row = bdoc.ele("div", bdoc.attr("class", "con-row"));
            if (col1) bdoc.append(row, col1);
            if (col2) bdoc.append(row, col2);
            if (col3) {
                col2.style.marginRight = "0.5em";
                bdoc.append(row, col3);
            }
            bdoc.append(form, row);
        };

        // Form Header
        addRow(
            bdoc.ele(
                "span",
                bdoc.attr("class", "con-col1 con-heading"),
                "Match Type"
            ),
            bdoc.ele(
                "span",
                bdoc.attr("class", "con-col2 con-heading"),
                "Weight"
            ),
            bdoc.ele(
                "span",
                bdoc.attr("class", "con-col3 con-heading"),
                "Threshold"
            )
        );

        // Match Rows
        const matchTypes = [
            {
                name: "Central-Central",
                weight: "alg-w-cc",
                threshold: "alg-t-cc",
            },
            {
                name: "Central-Peripheral",
                weight: "alg-w-cp",
                threshold: "alg-t-cp",
            },
            {
                name: "Peripheral-Central",
                weight: "alg-w-pc",
                threshold: "alg-t-pc",
            },
            {
                name: "Peripheral-Peripheral",
                weight: "alg-w-pp",
                threshold: "alg-t-pp",
            },
        ];

        matchTypes.forEach(({ name, weight, threshold }) => {
            addRow(
                bdoc.ele("span", bdoc.attr("class", "con-col1"), name),

                bdoc.ele(
                    "mm-range",
                    bdoc.attr("name", weight),
                    bdoc.attr("class", "con-col2"),
                    bdoc.attr("min", "0"),
                    bdoc.attr("max", "2"),
                    bdoc.attr("step", "0.01"),
                    bdoc.attr("value", "0"),
                    bdoc.eventListener("change", () => {
                        this.updateApplyButtonState();
                    })
                ),
                bdoc.ele(
                    "mm-range",
                    bdoc.attr("name", threshold),
                    bdoc.attr("class", "con-col3"),
                    bdoc.attr("min", "0"),
                    bdoc.attr("max", "1"),
                    bdoc.attr("step", "0.01"),
                    bdoc.attr("value", "0"),
                    bdoc.eventListener("change", () => {
                        this.updateApplyButtonState();
                    })
                )
            );
        });

        // Statement Type Header
        bdoc.append(
            form,
            bdoc.ele(
                "div",
                bdoc.attr("class", "con-row"),
                bdoc.attr("style", "margin-top: 0.75em;"),
                bdoc.ele(
                    "span",
                    bdoc.attr("class", "con-col1 con-heading"),
                    "Statement Type"
                ),
                bdoc.ele(
                    "span",
                    bdoc.attr("class", "con-col2 con-heading"),
                    "Weight",
                    bdoc.attr("style", "margin-right: 0.5em;")
                ),
                bdoc.ele(
                    "span",
                    bdoc.attr("class", "con-col3 con-heading"),
                    "Threshold"
                )
            )
        );

        // Statement Type Rows
        const statementTypes = [
            {
                name: "Knowledge (STFk)",
                weight: "alg-w-k",
                threshold: "alg-t-k",
            },
            {
                name: "Conceptual Understanding",
                weight: "alg-w-c",
                threshold: "alg-t-c",
            },
            { name: "Process", weight: "alg-w-p", threshold: "alg-t-p" },
            { name: "Pedagogy", weight: "alg-w-d", threshold: "alg-t-d" },
        ];

        statementTypes.forEach(({ name, weight, threshold }) => {
            addRow(
                bdoc.ele("span", bdoc.attr("class", "con-col1"), name),
                bdoc.ele(
                    "mm-range",
                    bdoc.attr("name", weight),
                    bdoc.attr("class", "con-col2"),
                    bdoc.attr("min", "0"),
                    bdoc.attr("max", "2"),
                    bdoc.attr("step", "0.01"),
                    bdoc.attr("value", "0"),
                    bdoc.eventListener("change", () => {
                        this.updateApplyButtonState();
                    })
                ),
                bdoc.ele(
                    "mm-range",
                    bdoc.attr("name", threshold),
                    bdoc.attr("class", "con-col3"),
                    bdoc.attr("min", "0"),
                    bdoc.attr("max", "1"),
                    bdoc.attr("step", "0.01"),
                    bdoc.attr("value", "0"),
                    bdoc.eventListener("change", () => {
                        this.updateApplyButtonState();
                    })
                )
            );
        });

        // Alternative Anchor Row
        addRow(
            bdoc.ele(
                "span",
                bdoc.attr("class", "con-col1"),
                "Alternative Anchor"
            ),
            bdoc.ele(
                "input",
                bdoc.attr("type", "checkbox"),
                bdoc.attr("name", "alg-self-anchor")
            )
        );

        // Apply Match Settings Button
        bdoc.append(
            form,
            bdoc.ele(
                "div",
                bdoc.attr("class", "con-row"),
                bdoc.attr("style", "margin-top: 0.75em;"),
                bdoc.ele(
                    "span",
                    bdoc.attr("class", "con-colspan"),
                    bdoc.ele(
                        "button",
                        "Apply Match Settings",
                        bdoc.attr("disabled"),
                        bdoc.id("apply-match-settings-button"),
                        bdoc.attr("style", "cursor: not-allowed;"),
                        bdoc.eventListener("click", (e) => {
                            e.preventDefault();
                            this.updateMatches();
                        })
                    ),
                    bdoc.ele(
                        "div",
                        bdoc.attr("class", "info-button-wrapper"),
                        bdoc.attr("style", "margin-left: 0.5em;"),
                        bdoc.ele(
                            "div",
                            bdoc.attr("class", "info-button"),
                            "i",
                            bdoc.ele(
                                "span",
                                bdoc.attr("class", "info-tooltip"),
                                'Profile settings are only applied to the matching workflow after clicking "Apply Match Settings"'
                            )
                        )
                    )
                )
            )
        );

        bdoc.append(container, form);

        // Buttons Section
        const buttonSpan = bdoc.ele(
            "span",
            bdoc.attr("id", "buttonspan"),
            bdoc.attr(
                "style",
                "display: flex; justify-content: center; align-items: center; padding: 0.5em; gap: 0.5em;"
            )
        );
        const buttons = [
            {
                id: "view-profile",
                text: "View Active Settings",
                onClick: () => {
                    const matchWeightsObj =
                        MmMatchProfileModal.getMatchWeights();
                    this.updateWeightsVisual(matchWeightsObj);
                },
            },
            {
                id: "add-profile",
                text: "Add New Match Profile",
                onClick: () => {
                    this.addMatchProfile();
                },
            },
            {
                id: "update-profile",
                text: "Update Selected Profile",
                onClick: () => {
                    this.updateMatchProfile();
                },
            },
            {
                id: "delete-profile",
                text: "Delete Selected Profile",
                onClick: () => {
                    this.deleteMatchProfile();
                },
            },
        ];

        buttons.forEach(({ id, text, onClick }) => {
            bdoc.append(
                buttonSpan,
                bdoc.ele(
                    "button",
                    bdoc.id(id),
                    text,
                    bdoc.eventListener("click", onClick),
                    bdoc.attr("style", "cursor: pointer;")
                )
            );
        });

        bdoc.append(container, buttonSpan);

        // Match Results Section
        bdoc.append(container, bdoc.ele("hr"));
        bdoc.append(
            container,
            bdoc.ele("b", bdoc.attr("id", "matches-from-header"))
        );
        bdoc.append(
            container,
            bdoc.ele(
                "p",
                bdoc.ele("span", bdoc.id("matchKeyDetails")),
                bdoc.ele("br"),
                bdoc.ele("span", bdoc.id("paletKeyHeading")),
                bdoc.ele("span", bdoc.id("matchKey"))
            )
        );
        bdoc.append(container, bdoc.ele("div", bdoc.attr("id", "matchResult")));

        bdoc.append(this.shadowRoot, container, bdoc.script("mm-range.js"));

        this.onLoad();
    }

    async onLoad() {
        const form = this.shadowRoot.getElementById("algForm");

        this.matchProfiles = await MmMatchProfileSelect.getMatchProfiles();

        const matchWeightsObj = MmMatchProfileModal.getMatchWeights();
        // console.log(matchWeightsObj);
        this.updateWeightsVisual(matchWeightsObj);

        const searchParams = new URLSearchParams(window.location.search);

        const key = searchParams.get("matchKey");

        const id = searchParams.get("id");

        if (id) {
            const response = await MmMatchConsole.session.fetch(
                `/api/descriptors/${id}`
            );
            if (response.status === 200) {
                const result = await response.json();

                if (
                    result &&
                    result.descriptors[0] &&
                    result.descriptors[0].key
                ) {
                    const descriptor = result.descriptors[0];
                    this.shadowRoot.getElementById("matchKey").textContent =
                        this.stripKeyPrefix(descriptor.key);

                    this.shadowRoot.getElementById(
                        "matchKeyDetails"
                    ).innerHTML = `${descriptor.name} - ${descriptor.provenance}<br/>${descriptor.description}`;
                    this.shadowRoot.getElementById(
                        "matches-from-header"
                    ).textContent = "Matches from";
                    this.updateMatches();
                }
            }
        } else if (key) {
            this.shadowRoot.getElementById("matchKey").textContent = key;
            this.shadowRoot.getElementById("matches-from-header").textContent =
                "Matches from";
            this.updateMatches();
        }
    }

    updateApplyButtonState() {
        const [matchWeightsObj, weights] = this.getFormMatchWeights();
        const currentWeights = MmMatchProfileModal.getMatchWeights();
        const applyButton = this.shadowRoot.getElementById(
            "apply-match-settings-button"
        );
        if (
            JSON.stringify(matchWeightsObj) !== JSON.stringify(currentWeights)
        ) {
            applyButton.disabled = false;
            applyButton.style.cursor = "pointer";
        } else {
            applyButton.disabled = true;
            applyButton.style.cursor = "not-allowed";
        }
    }

    getFormMatchWeights() {
        const form = this.shadowRoot.getElementById("algForm");

        const weights = new URLSearchParams(new FormData(form)).toString();
        const matchWeightsJSON = this.extractQueryParams(weights);
        const matchWeightsObj = JSON.parse(matchWeightsJSON);
        return [matchWeightsObj, weights];
    }

    async updateMatches() {
        const [matchWeightsObj, weights] = this.getFormMatchWeights();

        MmMatchProfileModal.setMatchWeights(matchWeightsObj);

        this.updateApplyButtonState();

        const key = this.shadowRoot.getElementById("matchKey").textContent;

        const id = new URLSearchParams(window.location.search).get("id");

        if (!key) {
            return;
        }

        this.shadowRoot.getElementById("paletKeyHeading").textContent =
            "Palet Key: ";

        const eleType = "any";
        const url = `/descriptors?searchKey=${encodeURIComponent(
            key
        )}&eleType=${eleType}&${weights}`;

        const response = await MmMatchConsole.session.fetch(url);
        const result = await response.json();

        result.descriptors = result.descriptors.filter(
            (desc) => desc.id !== id
        );

        let ele = this.shadowRoot.getElementById("matchResult");

        while (ele.nextElementSibling) {
            ele.nextElementSibling.remove();
        }

        ele = ele.parentElement;

        if (result.descriptors.length === 0) {
            console.log(ele);
            bdoc.append(ele, bdoc.ele("p", "No matches found."));
            // ele.textContent = "No matches found.";
            return;
        }
        ele.appendChild(
            bdoc.ele(
                "div",
                bdoc.class("con_matchHead"),
                bdoc.ele("span", bdoc.class("con_matchIndex"), "Index"),
                bdoc.ele(
                    "span",
                    bdoc.class("con_matchKey"),
                    "Name - Provenance - Description"
                )
            )
        );

        ele.appendChild(bdoc.ele("hr", bdoc.class("mm_listHr")));

        const matches = bdoc.ele("div", bdoc.class("con_matches"));

        for (const desc of result.descriptors) {
            matches.appendChild(
                bdoc.ele(
                    "div",
                    bdoc.class("con_match"),
                    bdoc.ele(
                        "span",
                        bdoc.class("con_matchIndex"),
                        desc._matchIndex
                    ),
                    bdoc.ele(
                        "span",
                        bdoc.class("con_matchKey"),
                        desc.name + " - " + desc.provenance
                    ),
                    bdoc.ele("span", bdoc.class("con_matchIndex")),
                    bdoc.ele(
                        "span",
                        bdoc.class("con_matchKey"),
                        desc.description
                    ),
                    bdoc.ele("span", bdoc.class("con_matchIndex")),
                    bdoc.ele(
                        "span",
                        bdoc.class("con_matchKey"),
                        "Palet Key: " + this.stripKeyPrefix(desc.key)
                    )
                )
            );
        }

        ele.appendChild(matches);
    }

    extractQueryParams(url) {
        const params = new URLSearchParams(url.substring(url.indexOf("?")));
        const queryParams = {};
        for (const param of params.entries()) {
            if (param[0] !== "searchKey" && param[0] !== "eleType") {
                queryParams[param[0]] = param[1];
            }
        }
        return JSON.stringify(queryParams);
    }

    stripKeyPrefix(key) {
        const slash = key.lastIndexOf("/");
        return slash >= 0 ? key.substring(slash + 1) : key;
    }

    updateWeightsVisual(weightsObject) {
        console.log(weightsObject);
        const mmRanges = this.shadowRoot.querySelectorAll("mm-range");
        mmRanges.forEach((mmRange) => {
            const name = mmRange.getAttribute("name");
            mmRange.updateValue(weightsObject[name]);
        });
    }

    updateMatchProfile() {
        const currentMatchProfileName =
            MmMatchProfileSelect.getCurrentMatchProfileName();
        if (currentMatchProfileName === "MM Default") {
            alert("Cannot update MM Default Match Profile.");
        } else if (currentMatchProfileName === "--") {
            alert("No match profile selected.");
        } else {
            const weightsObject = this.getFormMatchWeights()[0];

            MmMatchProfileSelect.updateMatchProfile(
                currentMatchProfileName,
                weightsObject
            );
        }
    }

    addMatchProfile() {
        const matchProfileSelect = this.shadowRoot.querySelector(
            "mm-match-profile-select"
        );

        const weightsObject = this.getFormMatchWeights()[0];

        const profileName = prompt(
            "Please provide a name for this match profile:"
        );
        if (profileName !== null && profileName !== "") {
            const oldMatchProfileName =
                MmMatchProfileSelect.getCurrentMatchProfileName();

            MmMatchProfileSelect.setCurrentMatchProfileName(profileName);

            matchProfileSelect
                .addNewMatchProfile(profileName, weightsObject)
                .then(
                    () => {},
                    () => {
                        MmMatchProfileSelect.setCurrentMatchProfileName(
                            oldMatchProfileName
                        );
                    }
                );
        }
    }

    selectMatchProfile(event) {
        const selected = event.target.value;
        if (selected !== "--") {
            const matchProfiles = JSON.parse(
                localStorage.getItem("matchProfiles")
            );
            this.updateWeightsVisual(matchProfiles[selected]);
        }
    }

    deleteMatchProfile() {
        const profileToDelete =
            MmMatchProfileSelect.getCurrentMatchProfileName();

        if (profileToDelete === "--") {
            alert("No match profile selected.");
            return;
        }
        if (profileToDelete === "MM Default") {
            alert("Cannot delete MM Default Match Profile");
        } else {
            const matchProfileSelect = this.shadowRoot.querySelector(
                "mm-match-profile-select"
            );
            matchProfileSelect.deleteMatchProfile(profileToDelete);
        }
    }

    removeOption(value) {
        const shadowRoot = this.shadowRoot;
        const selectElement = shadowRoot.getElementById("match-profiles");
        const options = selectElement.options;

        for (let i = 0; i < options.length; i++) {
            if (options[i].value === value) {
                selectElement.removeChild(options[i]);
                break;
            }
        }
    }
}

customElements.define("mm-match-console", MmMatchConsole);

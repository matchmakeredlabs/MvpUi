import bdoc from "./bdoc.js";
import "./mm-loading.js";
import {
    matchSettings,
    defaultMatchWeights,
    normalizeMatchWeights,
    getMatchWeights,
    setMatchWeights,
} from "./mm-match-profile-state.js";

export default class MmMatchProfileModal extends HTMLElement {
    static observedAttributes = ["descriptorId"];

    descriptorId = null;
    #profileSelectPromise;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "descriptorId") {
            this.descriptorId = newValue;
        }
    }

    static matchSettings = matchSettings;

    static defaultMatchWeights = defaultMatchWeights;

    static normalizeMatchWeights(matchWeightsObj) {
        return normalizeMatchWeights(matchWeightsObj);
    }

    static getMatchWeights() {
        return getMatchWeights();
    }

    static setMatchWeights(matchWeightsObj) {
        setMatchWeights(matchWeightsObj);
    }

    #renderWeights(matchWeightsObj) {
        const normalizedMatchWeights =
            MmMatchProfileModal.normalizeMatchWeights(matchWeightsObj);
        for (const property of MmMatchProfileModal.matchSettings) {
            const item = this.shadowRoot.getElementById(property);
            if (item) item.textContent = normalizedMatchWeights[property];
        }
    }

    async show() {
        this.shadowRoot.getElementById("match-modal").style.display = "block";
        this.#renderWeights(MmMatchProfileModal.getMatchWeights());
        await this.#ensureProfileSelect();
    }

    hide() {
        this.shadowRoot.getElementById("match-modal").style.display = "none";
    }

    #ensureProfileSelect() {
        if (this.#profileSelectPromise) return this.#profileSelectPromise;

        this.#profileSelectPromise = import(
            "./mm-match-profile-select.js"
        ).then(() => {
            const selectorContainer = this.shadowRoot.getElementById(
                "match-profile-selector-container"
            );
            const loading = bdoc.ele(
                "mm-loading",
                bdoc.attr("message", "Loading profiles...")
            );
            const profileSelect = bdoc.ele("mm-match-profile-select");
            profileSelect.hidden = true;
            profileSelect.onRenderAction = (_, matchWeights) => {
                this.#renderWeights(matchWeights);
            };
            profileSelect.onSelectAction = (profileName, matchWeights) => {
                this.#renderWeights(matchWeights);
                this.dispatchEvent(
                    new CustomEvent("match-profile-change", {
                        bubbles: true,
                        composed: true,
                        detail: { profileName, matchWeights },
                    })
                );
            };
            profileSelect.onLoadAction = (error) => {
                loading.remove();
                if (!error) profileSelect.hidden = false;
            };
            bdoc.append(selectorContainer, loading, profileSelect);
        });

        return this.#profileSelectPromise;
    }

    connectedCallback() {
        bdoc.append(
            this.shadowRoot,
            bdoc.ele(
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/mm-table.css")
            ),
            bdoc.ele(
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/styles.css")
            ),
            bdoc.ele(
                "div",
                bdoc.id("match-modal"),
                bdoc.class("modal_console"),
                bdoc.eventListener("click", (event) => {
                    if (
                        event.target ===
                        this.shadowRoot.getElementById("match-modal")
                    ) {
                        this.hide();
                    }
                }),
                bdoc.ele(
                    "div",
                    bdoc.class("modal-content_console"),
                    bdoc.ele(
                        "span",
                        bdoc.class("close_console"),
                        "×",
                        bdoc.eventListener("click", () => this.hide())
                    ),
                    bdoc.ele(
                        "h2",
                        bdoc.attr("style", "text-align: center;"),
                        "Match Settings"
                    ),
                    bdoc.ele(
                        "div",
                        bdoc.id("match-profile-selector-container"),
                        bdoc.attr(
                            "style",
                            "display: flex; justify-content: center; align-items: center; gap: 0.75rem; margin-bottom: 1rem;"
                        ),
                        bdoc.ele("label", "Match Profile")
                    ),
                    bdoc.ele("br"),
                    // First table
                    bdoc.ele(
                        "table",
                        bdoc.class("data-table_console"),
                        bdoc.ele(
                            "tr",
                            bdoc.ele("th"),
                            ...[
                                "Central-Central",
                                "Central-Peripheral",
                                "Peripheral-Central",
                                "Peripheral-Peripheral",
                            ].map((header) =>
                                bdoc.ele(
                                    "th",
                                    bdoc.class("header_console"),
                                    bdoc.attr("style", "white-space: normal;"),
                                    header
                                )
                            )
                        ),
                        bdoc.ele(
                            "tr",
                            bdoc.ele(
                                "td",
                                bdoc.class("row-label_console"),
                                "Weight"
                            ),
                            ...[
                                "alg-w-cc",
                                "alg-w-cp",
                                "alg-w-pc",
                                "alg-w-pp",
                            ].map((id) =>
                                bdoc.ele(
                                    "td",
                                    bdoc.class("data_console"),
                                    bdoc.id(id),
                                    "0"
                                )
                            )
                        ),
                        bdoc.ele(
                            "tr",
                            bdoc.ele(
                                "td",
                                bdoc.class("row-label_console"),
                                "Threshold"
                            ),
                            ...[
                                "alg-t-cc",
                                "alg-t-cp",
                                "alg-t-pc",
                                "alg-t-pp",
                            ].map((id) =>
                                bdoc.ele(
                                    "td",
                                    bdoc.class("data_console"),
                                    bdoc.id(id),
                                    "0"
                                )
                            )
                        )
                    ),
                    bdoc.ele("br"),
                    // Second table
                    bdoc.ele(
                        "table",
                        bdoc.class("data-table_console"),
                        bdoc.ele(
                            "tr",
                            bdoc.ele("th"),
                            ...[
                                "Knowledge (STFK)",
                                "Conceptual Understanding",
                                "Process",
                                "Pedagogy",
                                "Time and Location",
                            ].map((header) =>
                                bdoc.ele(
                                    "th",
                                    bdoc.class("header_console"),
                                    bdoc.attr("style", "white-space: normal;"),
                                    header
                                )
                            )
                        ),
                        bdoc.ele(
                            "tr",
                            bdoc.ele(
                                "td",
                                bdoc.class("row-label_console"),
                                "Weight"
                            ),
                            ...["alg-w-k", "alg-w-c", "alg-w-p", "alg-w-d", "alg-w-tl"].map(
                                (id) =>
                                    bdoc.ele(
                                        "td",
                                        bdoc.class("data_console"),
                                        bdoc.id(id),
                                        "0"
                                    )
                            )
                        ),
                        bdoc.ele(
                            "tr",
                            bdoc.ele(
                                "td",
                                bdoc.class("row-label_console"),
                                "Threshold"
                            ),
                            ...["alg-t-k", "alg-t-c", "alg-t-p", "alg-t-d", "alg-t-tl"].map(
                                (id) =>
                                    bdoc.ele(
                                        "td",
                                        bdoc.class("data_console"),
                                        bdoc.id(id),
                                        "0"
                                    )
                            )
                        )
                    ),
                    // Button container
                    bdoc.ele(
                        "div",
                        bdoc.class("button-container_console"),
                        bdoc.ele(
                            "button",
                            bdoc.class("modify-btn_console"),
                            "Modify",
                            bdoc.eventListener("click", () => {
                                window.location.href =
                                    "/c/MatchConsole" +
                                    (this.descriptorId
                                        ? `?id=${this.descriptorId}`
                                        : "");
                            })
                        )
                    )
                )
            )
        );

        this.style.position = "absolute";
        this.hide();
    }
}
customElements.define("mm-match-profile-modal", MmMatchProfileModal);

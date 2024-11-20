import bdoc from "./bdoc.js";

export default class MmMatchProfileModal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    static matchSettings = [
        "alg-w-cc",
        "alg-w-cp",
        "alg-w-pc",
        "alg-w-pp",
        "alg-t-cc",
        "alg-t-cp",
        "alg-t-pc",
        "alg-t-pp",
        "alg-w-k",
        "alg-t-k",
        "alg-w-c",
        "alg-t-c",
        "alg-w-p",
        "alg-t-p",
        "alg-w-d",
        "alg-t-d",
    ];

    static defaultMatchWeights = {
        "alg-w-cc": "2",
        "alg-t-cc": "0",
        "alg-w-cp": "1",
        "alg-t-cp": "0",
        "alg-w-pc": "0.5",
        "alg-t-pc": "0",
        "alg-w-pp": "0.25",
        "alg-t-pp": "0",
        "alg-w-k": "1",
        "alg-t-k": "0",
        "alg-w-c": "1",
        "alg-t-c": "0",
        "alg-w-p": "1",
        "alg-t-p": "0",
        "alg-w-d": "0",
        "alg-t-d": "0",
    };

    static getMatchWeights() {
        let matchWeightsObj = JSON.parse(
            localStorage.getItem("matchWeightsObj")
        );
        if (!matchWeightsObj) {
            matchWeightsObj = MmMatchProfileModal.defaultMatchWeights;
        }
        return matchWeightsObj;
    }

    static setMatchWeights(matchWeightsObj) {
        localStorage.setItem(
            "matchWeightsObj",
            JSON.stringify(matchWeightsObj)
        );
    }

    show() {
        this.shadowRoot.getElementById("match-modal").style.display = "block";
        const matchWeightsObj = MmMatchProfileModal.getMatchWeights();
        for (let property of MmMatchProfileModal.matchSettings) {
            let item = this.shadowRoot.getElementById(property);
            item.innerHTML = matchWeightsObj[property];
        }
    }

    hide() {
        this.shadowRoot.getElementById("match-modal").style.display = "none";
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
                            ].map((header) =>
                                bdoc.ele(
                                    "th",
                                    bdoc.class("header_console"),
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
                            ...["alg-w-k", "alg-w-c", "alg-w-p", "alg-w-d"].map(
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
                            ...["alg-t-k", "alg-t-c", "alg-t-p", "alg-t-d"].map(
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
                                window.location.href = "/c/MatchConsole";
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

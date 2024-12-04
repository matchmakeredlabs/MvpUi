import bdoc from "./bdoc.js";

export default class MmElementCard extends HTMLElement {
    static observedAttributes = ["value"];

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "value") {
            this.#renderCardElement(JSON.parse(newValue));
        }
    }

    static StripKeyPrefix(key) {
        let slash = key.lastIndexOf("/");
        return slash >= 0 ? key.substring(slash + 1) : key;
    }

    static EleTypeTranslate = {
        any: "Any",
        lr: "Learning Resource",
        cs: "Competency Statement",
        c: "Curriculum",
        o: "Other",
    };

    static keyLinkPrefix = "/c/Palet?key=";

    static renderElement = (val, eleContainer, cornerButton) => {
        const addRow = (dl, label, value) => {
            if (!value) return;
            dl.appendChild(
                bdoc.ele("div", bdoc.ele("dt", label), bdoc.ele("dd", value))
            );
        };
        eleContainer.innerHTML = "";

        eleContainer.mmxId = val.id;
        eleContainer.mmxKey = MmElementCard.StripKeyPrefix(val.key);

        const annotation = bdoc.ele("div", bdoc.class("annotation"));

        if (val.matchIndex != undefined) {
            annotation.appendChild(
                bdoc.ele(
                    "div",
                    bdoc.class("mmc_matchindex"),
                    "MatchIndex: " + val.matchIndex
                )
            );
        }

        if (cornerButton != undefined) {
            annotation.appendChild(cornerButton);
        }

        if (annotation.children.length > 0) {
            eleContainer.appendChild(annotation);
        }

        if (val.eleType) {
            eleContainer.appendChild(
                bdoc.ele("h3", MmElementCard.EleTypeTranslate[val.eleType])
            );
        }
        if (val.name) {
            eleContainer.appendChild(bdoc.ele("h2", val.name));
        } else {
            eleContainer.appendChild(bdoc.ele("h2", "Unnamed"));
        }
        if (val.description) {
            eleContainer.appendChild(
                bdoc.ele("section", bdoc.preText(val.description))
            );
        }
        eleContainer.appendChild(bdoc.ele("h3", "Detail"));

        const dl = bdoc.ele("dl");

        if (val.url) {
            addRow(
                dl,
                "URL",
                bdoc.ele(
                    "a",
                    bdoc.attr("href", val.url),
                    bdoc.attr("target", "_blank"),
                    val.url
                )
            );
        }
        addRow(dl, "Subject", val.subject);
        addRow(dl, "Identifier", val.identifier);
        addRow(dl, "Ed. Level", val.educationalLevel);
        addRow(dl, "Creator", val.creator);
        addRow(dl, "Provenance", val.provenance);
        addRow(dl, "Date Published", val.datePublishefd);
        addRow(dl, "Repository Date", val.sdDatePublished);

        if (val.key) {
            addRow(
                dl,
                "Key",
                bdoc.ele(
                    "a",
                    bdoc.attr(
                        "href",
                        MmElementCard.keyLinkPrefix +
                            MmElementCard.StripKeyPrefix(val.key)
                    ),
                    MmElementCard.StripKeyPrefix(val.key)
                )
            );
        }
        eleContainer.appendChild(dl);
    };

    #renderCardElement = (val) => {
        let eleContainer = this.shadowRoot.querySelector(".mmc_descriptor");
        if (!eleContainer) {
            eleContainer = bdoc.ele("div", bdoc.class("mmc_descriptor"));
            this.shadowRoot.appendChild(eleContainer);
        }
        MmElementCard.renderElement(val, eleContainer);
    };

    connectedCallback() {
        bdoc.append(
            this.shadowRoot,
            bdoc.ele(
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/styles.css")
            )
        );
    }
}
customElements.define("mm-element-card", MmElementCard);

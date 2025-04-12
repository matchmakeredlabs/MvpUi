import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

export default class MmPreviewCustomSet extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    handleError = async (response) => {
        try {
            const body = await response.json();
            if (body.error) alert(body.error);
            if (body.log) alert(body.log[0].message);
        } catch (e) {
            alert("An error occurred");
        }
    };

    #collection;

    static fetchCollection = async () => {
        let currentCustomSet = JSON.parse(localStorage.getItem("currentCustomSet"));
        console.log(currentCustomSet);
        window.currentCollection = currentCustomSet.descriptors;

        return Object.values(currentCustomSet.descriptors);
    };

    saveCustomSet = () => {
        let name = prompt("Provide a name for this custom set") 
        let customSets = JSON.parse(localStorage.getItem("customSets"));
        let currentCustomSet = JSON.parse(localStorage.getItem("currentCustomSet"));

        if (customSets == undefined) {
            customSets = {}
        }

        if (name !== null) {
            customSets[name] =currentCustomSet;

            localStorage.setItem("customSets", JSON.stringify(customSets));

            alert(`Custom set ${name} has been saved!`)
            window.location.href = "./GenerateReport"
        }
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
                bdoc.attr("href", "/c/res/mm-edit-collection.css")
            ),
            bdoc.ele(
                "main",
                bdoc.class("mm_columns"),
                bdoc.ele(
                    "div",
                    bdoc.ele(
                        "article",
                        bdoc.id("mmx_browse_tree"),
                        bdoc.ele("h3", "Collection")
                    )
                ),
                bdoc.ele(
                    "div",
                    bdoc.id("descriptor-container"),
                    bdoc.ele(
                        "div",
                        bdoc.class("export-buttons"),
                        bdoc.ele(
                            "button",
                            bdoc.id("match-collections-button"),
                            "Save Custom Set",
                            bdoc.eventListener(
                                "click",
                                this.saveCustomSet
                            )
                        )
                    ),

                    bdoc.ele(
                        "mm-element-card",
                        bdoc.id("descriptor-card"), 
                        bdoc.attr("style", "display: block; margin-top: 50px"),
                        bdoc.attr("show-describe-links")
                    )
                )
            ),

            bdoc.script("mm-collection.js"),
            bdoc.script("mm-element-card.js"),
        );
        this.#renderCollection();
    };

    #renderCollection = async () => {
        this.#collection = await MmPreviewCustomSet.fetchCollection().catch((response) => {
            if (response.status === 404) {
                alert("Collection not found");
            } else {
                this.handleError(response);
            }
            window.location.href = "/c/Collections";
        });

        const browseTree = this.shadowRoot.querySelector("#mmx_browse_tree");

        const topLevelEle = this.#collection[0];

        const topLevelButtons = bdoc.ele(
            "div",
            bdoc.class("top-level-buttons")
        );

        const headerContainer = bdoc.ele(
            "div",
            bdoc.class("top-level-container"),
            bdoc.ele("h2", topLevelEle.name),
            topLevelButtons
        );

        bdoc.append(browseTree, headerContainer);
        const collectionEle = bdoc.ele("mm-collection");
        bdoc.append(browseTree, collectionEle);
        Promise.all([
            customElements.whenDefined("mm-collection"),
            customElements.whenDefined("mm-element-card"),
        ]).then(() => {
            collectionEle.select = (descriptorEle, elementObj) => {
                const descriptorCard =
                    this.shadowRoot.getElementById("descriptor-card");
                bdoc.append(
                    descriptorCard,
                    bdoc.attr("value", JSON.stringify(elementObj))
                );
            };

            bdoc.append(headerContainer, collectionEle.expandContractButtons);

            collectionEle.loadDescriptors(this.#collection);
        });
    };
}
customElements.define("mm-preview-custom-set", MmPreviewCustomSet);
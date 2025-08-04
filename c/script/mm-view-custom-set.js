import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";
import MmViewCustomSets from "./mm-view-custom-sets.js";
import MmMatchProfileSelect from "./mm-match-profile-select.js";

export default class MmViewCustomSet extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    #currentCustomSetName;

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

    fetchCustomSet = async () => {
        if (!this.#currentCustomSetName) {
            const currentCustomSet = JSON.parse(
                localStorage.getItem("currentCustomSet")
            );
            console.log(currentCustomSet);
            return Object.values(currentCustomSet.descriptors);
        } else {
            const customSets = await MmViewCustomSets.fetchCustomSets();
            if (this.#currentCustomSetName in customSets) {
                return customSets[this.#currentCustomSetName].descriptors;
            }
            throw new Error(
                `Custom set with name "${
                    this.#currentCustomSetName
                }" not found.`
            );
        }
    };

    saveCustomSet = async () => {
        const name = prompt("Provide a name for this custom set.").trim();

        const settings = await MmMatchProfileSelect.getSettings();
        const customSets = settings.customSets || {};

        const currentCustomSet = JSON.parse(
            localStorage.getItem("currentCustomSet")
        );

        if (name in customSets) {
            if (
                !confirm(
                    `A custom set with the name "${name}" already exists. Do you want to overwrite it?`
                )
            ) {
                return;
            }
        }

        if (name !== null && name !== "") {
            customSets[name] = currentCustomSet;
            const newSettings = {
                ...settings,
                customSets: customSets,
            };

            MmMatchProfileSelect.updateSettings(settings, newSettings).then(
                (response) => {
                    if (!response.ok) {
                        this.handleError(response);
                        return;
                    }
                    alert(`Custom set ${name} has been saved!`);
                    window.location.href = "./GenerateReport";
                }
            );
        }
    };

    connectedCallback() {
        const query = new URLSearchParams(window.location.search);
        const customSetName = query.get("key");
        const keyPresent = customSetName !== null && customSetName !== "";
        if (keyPresent) {
            this.#currentCustomSetName = customSetName;
        }

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

                    keyPresent ? null : bdoc.ele("h2", "Preview Custom Set"),
                    bdoc.ele(
                        "article",
                        bdoc.id("mmx_browse_tree"),
                        bdoc.ele("h3", "Custom Set")
                    )
                ),
                bdoc.ele(
                    "div",
                    bdoc.id("descriptor-container"),

                    keyPresent
                        ? null
                        : bdoc.ele(
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
            bdoc.script("mm-element-card.js")
        );
        this.#renderCollection();
    }

    #renderCollection = async () => {
        this.#collection = await this.fetchCustomSet().catch((response) => {
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
customElements.define("mm-view-custom-set", MmViewCustomSet);

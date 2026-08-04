import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";
import MmViewCustomSets from "./mm-view-custom-sets.js";
import MmMatchProfileSelect from "./mm-match-profile-select.js";
import "./mm-prompt-modal.js";
import { confirmMessage, showMessage } from "./mm-message-modal.js";
import "./mm-loading.js";

export default class MmViewCustomSet extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    #currentCustomSetName;

    handleError = async (response) => {
        let message = "An error occurred.";
        try {
            const body = await response.json();
            message =
                body.log?.[0]?.message ||
                body.error ||
                body.message ||
                body.Message ||
                body.title ||
                message;
        } catch (e) {}
        await showMessage({ title: "Save Error", message });
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
        const name = await this.shadowRoot
            .querySelector("mm-prompt-modal")
            .ask({
                title: "Save Custom Set",
                message: "Provide a name for this custom set.",
                label: "Custom set name",
                confirmText: "Save",
            });
        if (name === null) return;

        const loading = this.shadowRoot.querySelector("mm-loading");
        loading.show("Loading settings...");

        let settings;
        try {
            settings = await MmMatchProfileSelect.getSettings();
        } catch (error) {
            loading.hide();
            return;
        }
        loading.hide();
        const customSets = settings.customSets || {};

        const currentCustomSet = JSON.parse(
            localStorage.getItem("currentCustomSet")
        );

        if (name in customSets) {
            const shouldOverwrite = await confirmMessage({
                title: "Overwrite Custom Set",
                message: `A custom set named "${name}" already exists.`,
                confirmText: "Overwrite",
            });
            if (!shouldOverwrite) {
                return;
            }
        }

        customSets[name] = currentCustomSet;
        const newSettings = {
            ...settings,
            customSets: customSets,
        };

        loading.show("Saving custom set...");
        try {
            const response = await MmMatchProfileSelect.updateSettings(
                settings,
                newSettings
            );
            loading.hide();
            if (!response.ok) {
                await this.handleError(response);
                return;
            }
            await showMessage({
                title: "Custom Set Saved",
                message: `Custom set ${name} has been saved.`,
            });
            window.location.href = "./GenerateReport";
        } catch (error) {
            loading.hide();
            await showMessage({
                title: "Save Error",
                message: error?.message || "Unable to save the custom set.",
            });
        } finally {
            loading.hide();
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
                        bdoc.attr("show-describe-links"),
                        bdoc.attr("suppress-description-edit")
                    )
                )
            ),
            bdoc.ele("mm-prompt-modal"),
            bdoc.ele("mm-loading", bdoc.attr("overlay"), bdoc.attr("hidden")),

            bdoc.script("mm-collection.js"),
            bdoc.script("mm-element-card.js")
        );
        this.#renderCollection();
    }

    #renderCollection = async () => {
        try {
            this.#collection = await this.fetchCustomSet();
        } catch (error) {
            await showMessage({
                title: "Custom Set Error",
                message: error?.message || "Unable to load the custom set.",
            });
            window.location.href = "/c/Collections";
            return;
        }

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
        collectionEle.numOnPage = 0;
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

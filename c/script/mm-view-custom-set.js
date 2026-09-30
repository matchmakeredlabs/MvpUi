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

    handleError = async (response, title = "Error") => {
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
        await showMessage({ title, message });
    };

    #collection;

    static getStoredCustomSet = () => {
        const stored = localStorage.getItem("currentCustomSet");
        if (!stored) {
            throw new Error("No custom-set selection was found. Select at least one element before previewing the set.");
        }

        const customSet = JSON.parse(stored);
        if (!customSet?.descriptors) {
            throw new Error("The saved custom-set selection is invalid.");
        }

        return customSet;
    };

    static fetchCollection = async (collectionId) => {
        const response = await MmViewCustomSet.session.fetch(
            `/api/collections/${collectionId}`
        );
        if (response.status !== 200) {
            return Promise.reject(response);
        }
        return (await response.json()).collection;
    };

    static getCustomSetDescriptors = (customSet) =>
        Array.isArray(customSet?.descriptors)
            ? customSet.descriptors
            : Object.values(customSet?.descriptors || {});

    fetchCustomSet = async () => {
        if (!this.#currentCustomSetName) {
            const currentCustomSet = MmViewCustomSet.getStoredCustomSet();
            return MmViewCustomSet.getCustomSetDescriptors(currentCustomSet);
        } else {
            const customSets = await MmViewCustomSets.fetchCustomSets();
            if (this.#currentCustomSetName in customSets) {
                return MmViewCustomSet.getCustomSetDescriptors(
                    customSets[this.#currentCustomSetName]
                );
            }
            throw new Error(
                `Custom set with name "${
                    this.#currentCustomSetName
                }" not found.`
            );
        }
    };

    updateCustomSet = async () => {
        if (!this.#currentCustomSetName) {
            return;
        }

        const loading = this.shadowRoot.querySelector("mm-loading");
        loading.show("Loading settings...");

        let settings;
        try {
            settings = await MmMatchProfileSelect.getSettings();
        } catch (error) {
            loading.hide();
            return;
        }

        const customSets = settings.customSets || {};
        const customSet = customSets[this.#currentCustomSetName];
        if (!customSet) {
            loading.hide();
            await showMessage({
                title: "Update Error",
                message: `Custom set "${this.#currentCustomSetName}" not found.`,
            });
            return;
        }

        const collectionId = customSet.associatedCollectionId;
        if (!collectionId) {
            loading.hide();
            await showMessage({
                title: "Update Error",
                message:
                    "This custom set has no associated source collection to refresh from.",
            });
            return;
        }

        loading.show("Refreshing from source collection...");
        let sourceCollection;
        try {
            sourceCollection =
                await MmViewCustomSet.fetchCollection(collectionId);
        } catch (response) {
            loading.hide();
            if (response?.status === 404) {
                await showMessage({
                    title: "Update Error",
                    message: "Source collection not found.",
                });
            } else {
                await this.handleError(response, "Update Error");
            }
            return;
        }

        const existingDescriptors =
            MmViewCustomSet.getCustomSetDescriptors(customSet);
        const selectedIds = new Set(
            existingDescriptors.map((descriptor) => descriptor.id)
        );
        const refreshedDescriptors = sourceCollection.filter((descriptor) =>
            selectedIds.has(descriptor.id)
        );

        if (refreshedDescriptors.length === 0) {
            loading.hide();
            await showMessage({
                title: "Update Error",
                message:
                    "None of this custom set's elements were found in the source collection.",
            });
            return;
        }

        const newSettings = {
            ...settings,
            customSets: {
                ...customSets,
                [this.#currentCustomSetName]: {
                    ...customSet,
                    descriptors: refreshedDescriptors,
                },
            },
        };

        loading.show("Saving updated custom set...");
        try {
            const response = await MmMatchProfileSelect.updateSettings(
                settings,
                newSettings
            );
            loading.hide();
            if (!response.ok) {
                await this.handleError(response, "Update Error");
                return;
            }
            await showMessage({
                title: "Custom Set Updated",
                message: `Custom set "${this.#currentCustomSetName}" has been refreshed from its source collection.`,
            });
            window.location.reload();
        } catch (error) {
            loading.hide();
            await showMessage({
                title: "Update Error",
                message: error?.message || "Unable to update the custom set.",
            });
        } finally {
            loading.hide();
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

        let currentCustomSet;
        try {
            currentCustomSet = MmViewCustomSet.getStoredCustomSet();
        } catch (error) {
            await showMessage({
                title: "Custom Set Error",
                message: error.message,
            });
            return;
        }

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
                await this.handleError(response, "Save Error");
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

                    bdoc.ele(
                        "div",
                        bdoc.class("export-buttons"),
                        keyPresent
                            ? bdoc.ele(
                                  "button",
                                  bdoc.id("update-custom-set-button"),
                                  "Update",
                                  bdoc.eventListener(
                                      "click",
                                      this.updateCustomSet
                                  )
                              )
                            : bdoc.ele(
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
        if (!topLevelEle) {
            await showMessage({
                title: "Custom Set Error",
                message: "This custom set does not contain any elements.",
            });
            return;
        }

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

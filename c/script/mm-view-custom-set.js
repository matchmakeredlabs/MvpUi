import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";
import MmViewCustomSets from "./mm-view-custom-sets.js";
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
    #savedCustomSet;

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
            throw new Error(
                "No custom-set selection was found. Select at least one element before previewing the set."
            );
        }

        const customSet = JSON.parse(stored);
        if (
            !customSet?.descriptors &&
            !(
                Array.isArray(customSet?.descriptorIds) &&
                customSet.descriptorIds.length > 0
            )
        ) {
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

    fetchCustomSet = async () => {
        if (!this.#currentCustomSetName) {
            const currentCustomSet = MmViewCustomSet.getStoredCustomSet();
            this.#savedCustomSet = null;
            if (currentCustomSet?.descriptors) {
                const descriptors = currentCustomSet.descriptors;
                return Array.isArray(descriptors)
                    ? descriptors
                    : Object.values(descriptors);
            }
            return MmViewCustomSets.resolveDescriptors(currentCustomSet || {});
        }

        const customSets = await MmViewCustomSets.fetchCustomSets();
        const customSet = customSets[this.#currentCustomSetName];
        if (!customSet) {
            throw new Error(
                `Custom set with name "${this.#currentCustomSetName}" not found.`
            );
        }
        this.#savedCustomSet = customSet;
        return MmViewCustomSets.resolveDescriptors(customSet);
    };

    updateCustomSet = async () => {
        if (!this.#currentCustomSetName || !this.#savedCustomSet?.id) {
            return;
        }

        const loading = this.shadowRoot.querySelector("mm-loading");
        loading.show("Refreshing from source collection...");

        const collectionId = MmViewCustomSets.collectionIdOf(
            this.#savedCustomSet
        );
        if (!collectionId) {
            loading.hide();
            await showMessage({
                title: "Update Error",
                message:
                    "This custom set has no associated source collection to refresh from.",
            });
            return;
        }

        let sourceCollection;
        try {
            sourceCollection =
                await MmViewCustomSets.fetchCollection(collectionId);
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

        const descriptorIds = MmViewCustomSets.refreshDescriptorIds(
            this.#savedCustomSet,
            sourceCollection
        );
        if (descriptorIds.length === 0) {
            loading.hide();
            await showMessage({
                title: "Update Error",
                message:
                    "None of this custom set's elements were found in the source collection.",
            });
            return;
        }

        loading.show("Saving updated custom set...");
        try {
            const response = await MmViewCustomSets.session.fetch(
                `/api/customSets/${encodeURIComponent(this.#savedCustomSet.id)}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: this.#savedCustomSet.id,
                        name: this.#currentCustomSetName,
                        collectionId,
                        descriptorIds,
                    }),
                }
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

        const collectionId = MmViewCustomSets.collectionIdOf(currentCustomSet);
        const descriptorIds =
            MmViewCustomSets.descriptorIdsOf(currentCustomSet);
        if (!collectionId) {
            await showMessage({
                title: "Custom Set Error",
                message:
                    "This custom set is missing its collection. Select the subset again.",
            });
            return;
        }
        if (descriptorIds.length === 0) {
            await showMessage({
                title: "Custom Set Error",
                message: "Select at least one element before saving a custom set.",
            });
            return;
        }

        loading.show("Loading custom sets...");
        let customSets;
        try {
            customSets = await MmViewCustomSets.fetchCustomSets();
        } catch (error) {
            loading.hide();
            await showMessage({
                title: "Save Error",
                message: error?.message || "Unable to load custom sets.",
            });
            return;
        }
        loading.hide();

        const existing = customSets[name];
        if (existing) {
            const shouldOverwrite = await confirmMessage({
                title: "Overwrite Custom Set",
                message: `A custom set named "${name}" already exists.`,
                confirmText: "Overwrite",
            });
            if (!shouldOverwrite) {
                return;
            }
        }

        const body = {
            name,
            collectionId,
            descriptorIds,
        };
        const isUpdate = Boolean(existing?.id);
        if (isUpdate) body.id = existing.id;

        loading.show("Saving custom set...");
        try {
            const response = await MmViewCustomSets.session.fetch(
                isUpdate
                    ? `/api/customSets/${encodeURIComponent(existing.id)}`
                    : "/api/customSets",
                {
                    method: isUpdate ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                }
            );
            loading.hide();
            if (!response.ok) {
                await this.handleError(response, "Save Error");
                return;
            }
            const saved = await response.json();
            await showMessage({
                title: "Custom Set Saved",
                message: `Custom set ${name} has been saved (${MmViewCustomSets.formatTimestamp(
                    saved.created
                )}).`,
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

        const createdLabel = this.#savedCustomSet?.created
            ? bdoc.ele(
                  "p",
                  bdoc.class("custom-set-date"),
                  `Created ${MmViewCustomSets.formatTimestamp(
                      this.#savedCustomSet.created
                  )}`
              )
            : null;

        const headerContainer = bdoc.ele(
            "div",
            bdoc.class("top-level-container"),
            bdoc.ele("div", bdoc.ele("h2", topLevelEle.name), createdLabel),
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

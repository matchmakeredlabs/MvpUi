import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";
import MmElementCard from "./mm-element-card.js";
import "./mm-prompt-modal.js";
import { confirmMessage, showMessage } from "./mm-message-modal.js";
import "./mm-loading.js";

export default class EditCollection extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    #lastSelectedElement = null;

    handleError = async (response) => {
        console.log(response);
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
        await showMessage({ title: "Request Error", message });
    };

    static fetchCollection = async (collectionId) => {
        const response = await EditCollection.session.fetch(
            `/api/collections/${collectionId}`
        );
        if (response.status !== 200) {
            return Promise.reject(response);
        }
        return (await response.json()).collection;
    };

    static deleteElement = async (elementId) => {
        const response = await EditCollection.session.fetch(
            `/api/descriptors/${elementId}`,
            {
                method: "DELETE",
            }
        );
        if (!response.ok) {
            return Promise.reject(response);
        }
        return response;
    };

    loadingElement;

    connectedCallback() {
        this.loadingElement = bdoc.ele(
            "mm-loading",
            bdoc.attr("message", "Loading collection...")
        );

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

                        bdoc.ele(
                            "div",
                            bdoc.class("expand-public-buttons"),
                            bdoc.ele("h3", "Edit Collection"),
                            bdoc.ele(
                                "div",
                                bdoc.class("public-checkbox-container")
                            )
                        ),
                        this.loadingElement
                    )
                ),
                bdoc.ele(
                    "div",
                    bdoc.id("descriptor-container"),
                    bdoc.ele("mm-element-card", bdoc.id("descriptor-card"))
                )
            ),
            bdoc.ele("mm-create-element-modal"),
            bdoc.ele("mm-prompt-modal"),
            bdoc.ele("mm-loading", bdoc.attr("overlay"), bdoc.attr("hidden")),
            bdoc.script("mm-collection.js"),
            bdoc.script("mm-element-card.js"),
            bdoc.script("mm-create-element-modal.js")
        );
        this.#renderCollection();
    }

    #renderCollection = async () => {
        const collectionId = new URLSearchParams(window.location.search).get(
            "id"
        );

        if (!collectionId) {
            window.location.href = "/c/ManageCollections";
        }

        let loadedCollection;
        try {
            loadedCollection = await EditCollection.fetchCollection(
                collectionId
            );
        } catch (response) {
            this.loadingElement.hide();
            if (response.status === 404) {
                await showMessage({
                    title: "Collection Not Found",
                    message: "The requested collection could not be found.",
                });
            } else {
                await this.handleError(response);
            }
            window.location.href = "/c/ManageCollections";
            return;
        }

        this.loadingElement.hide();

        const browseTree = this.shadowRoot.querySelector("#mmx_browse_tree");

        const topLevelEle = loadedCollection[0];

        console.log(topLevelEle);

        bdoc.append(
            this.shadowRoot.querySelector(".public-checkbox-container"),
            bdoc.ele(
                "input",
                bdoc.attr("type", "checkbox"),
                bdoc.class("custom-checkbox"),
                bdoc.id("public-checkbox"),
                topLevelEle._public ? bdoc.attr("checked") : "",
                bdoc.eventListener("change", async (e) => {
                    const isPublic = e.target.checked;
                    const loading = this.shadowRoot.querySelector(
                        "mm-loading[overlay]"
                    );
                    loading.show("Updating collection...");
                    try {
                        await MmElementCard.updateElement({
                            ...topLevelEle,
                            _public: isPublic,
                        });
                    } catch (response) {
                        e.target.checked = !isPublic;
                        loading.hide();
                        await this.handleError(response);
                    } finally {
                        loading.hide();
                    }
                })
            ),
            bdoc.ele("span", "Public")
        );

        const topLevelButtons = bdoc.ele(
            "div",
            bdoc.class("top-level-buttons")
        );

        const headerContainer = bdoc.ele(
            "div",
            bdoc.class("top-level-container"),
            bdoc.ele(
                "div",
                bdoc.class("top-level-header"),
                bdoc.ele("h2", topLevelEle.name, topLevelButtons),
                topLevelButtons
            )
        );

        bdoc.append(browseTree, headerContainer);
        const collectionEle = bdoc.ele("mm-collection");
        collectionEle.numOnPage = 0;

        bdoc.append(browseTree, collectionEle);
        Promise.all([
            customElements.whenDefined("mm-collection"),
            customElements.whenDefined("mm-element-card"),
            customElements.whenDefined("mm-create-element-modal"),
        ]).then(() => {
            const select = (descriptorEle, elementObj) => {
                const descriptorCard =
                    this.shadowRoot.getElementById("descriptor-card");

                descriptorCard.onSuccess = (
                    descriptor,
                    response,
                    propagate
                ) => {
                    if (descriptor.id === topLevelEle.id) {
                        headerContainer.querySelector("h2").innerText =
                            descriptor.name;
                    }
                    collectionEle.updateDescriptor(descriptor, propagate);
                };
                bdoc.append(
                    descriptorCard,
                    bdoc.attr("editable"),
                    bdoc.attr("value", JSON.stringify(elementObj))
                );
            };
            const generateCustomDescriptorElement = (element, isRoot) => {
                const addElementButton = bdoc.ele(
                    "button",
                    "+",
                    bdoc.attr(
                        "style",
                        "cursor: pointer; background-image: none; width: auto; height: auto; background-color: #E8E8E8; border: 1px solid gray; border-radius: 2px;  "
                    ),
                    bdoc.eventListener("click", () => {
                        const createModal = this.shadowRoot.querySelector(
                            "mm-create-element-modal"
                        );

                        const otherChildren = element.intHasPart.map(
                            (intId) => collectionEle.descriptors[intId]
                        );
                        let highestChildUrlEnding = 1;
                        for (const child of otherChildren) {
                            if (child.url) {
                                const urlEnding = parseInt(
                                    child.url.split("/").pop()
                                );

                                if (
                                    !isNaN(urlEnding) &&
                                    urlEnding >= highestChildUrlEnding
                                ) {
                                    highestChildUrlEnding = urlEnding + 1;
                                }
                            }
                        }

                        createModal.onSuccess = (variables, response) => {
                            const descriptor = response.descriptors[0];
                            collectionEle.addNewDescriptor(descriptor, element);
                        };

                        const newUrl = `${element.url}${
                            element.url.endsWith("/") ? "" : "/"
                        }${highestChildUrlEnding}`;

                        bdoc.append(
                            createModal,
                            bdoc.attr(
                                "parent-element",
                                JSON.stringify({
                                    ...element,
                                    urlDefault: newUrl,
                                })
                            )
                        );
                        createModal.show();
                    })
                );
                const removeElementButton = bdoc.ele(
                    "button",
                    "⨉",
                    bdoc.attr(
                        "style",
                        "background-color: #D32F2F; color: white; cursor: pointer; border: none; border-radius: 2px; background-image: none; width: auto; height: auto; "
                    ),
                    bdoc.eventListener("click", async () => {
                        const isLeaf = element.intHasPart.length === 0;
                        let canDelete;
                        const promptModal = this.shadowRoot.querySelector(
                            "mm-prompt-modal"
                        );
                        if (isRoot) {
                            canDelete =
                                (await promptModal.ask({
                                    title: "Delete Collection",
                                    message:
                                        "This deletes every element in the collection and cannot be undone.",
                                    label: 'Type "collectionDelete" to confirm',
                                    placeholder: "collectionDelete",
                                    confirmText: "Delete collection",
                                    expectedValue: "collectionDelete",
                                })) !== null;
                        } else if (isLeaf) {
                            canDelete = await confirmMessage({
                                title: "Delete Element",
                                message:
                                    "Are you sure you want to delete this element?",
                                confirmText: "Delete element",
                            });
                        } else {
                            canDelete =
                                (await promptModal.ask({
                                    title: "Delete Element",
                                    message:
                                        "This deletes the element and all of its children.",
                                    label: 'Type "yes" to confirm',
                                    placeholder: "yes",
                                    confirmText: "Delete element",
                                    expectedValue: "yes",
                                })) !== null;
                        }
                        if (!canDelete) return;

                        console.log(element);

                        const loading = this.shadowRoot.querySelector(
                            "mm-loading[overlay]"
                        );
                        loading.show(
                            isRoot
                                ? "Deleting collection..."
                                : "Deleting element..."
                        );
                        try {
                            await EditCollection.deleteElement(element.id);
                            if (isRoot) {
                                window.location.href = "/c/ManageCollections";
                                return;
                            }
                            collectionEle.deleteDescriptor(element);
                        } catch (response) {
                            loading.hide();
                            await this.handleError(response);
                        } finally {
                            loading.hide();
                        }
                    })
                );
                return bdoc.ele(
                    "div",
                    bdoc.id(`add-remove-buttons-${element.id}`),
                    bdoc.attr(
                        "style",
                        "display: inline-flex; gap: 0.5em; margin-left: 0.5em;"
                    ),
                    addElementButton,
                    removeElementButton
                );
            };
            bdoc.append(
                topLevelButtons,
                generateCustomDescriptorElement(topLevelEle, true)
            );

            headerContainer
                .querySelector("h2")
                .addEventListener("click", () => {
                    collectionEle.clearSelections();

                    select(null, topLevelEle);
                });

            collectionEle.customDescriptorEleOptions = {
                generateCustomDescriptorElement,
                renderInline: false,
            };

            collectionEle.select = select;

            bdoc.ele("div");

            bdoc.append(headerContainer, collectionEle.expandContractButtons);

            collectionEle.loadDescriptors(loadedCollection);
        });
    };
}
customElements.define("mm-edit-collection", EditCollection);

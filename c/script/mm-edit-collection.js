import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";
import MmElementCard from "./mm-element-card.js";

export default class EditCollection extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    #lastSelectedElement = null;

    handleError = async (response) => {
        console.log(response);
        try {
            const body = await response.json();
            if (body.error) alert(body.error);
            if (body.log) alert(body.log[0].message);
        } catch (e) {
            alert("An error occurred");
        }
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
        if (response.status !== 200) {
            return Promise.reject(response);
        }
        return response;
    };

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

                        bdoc.ele(
                            "div",
                            bdoc.class("expand-public-buttons"),
                            bdoc.ele("h3", "Edit Collection"),
                            bdoc.ele(
                                "div",
                                bdoc.class("public-checkbox-container")
                            )
                        )
                    )
                ),
                bdoc.ele(
                    "div",
                    bdoc.id("descriptor-container"),
                    bdoc.ele("mm-element-card", bdoc.id("descriptor-card"))
                )
            ),
            bdoc.ele("mm-create-element-modal"),
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

        const loadedCollection = await EditCollection.fetchCollection(
            collectionId
        ).catch((response) => {
            if (response.status === 404) {
                alert("Collection not found");
            } else {
                this.handleError(response);
            }
            window.location.href = "/c/ManageCollections";
        });

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
                bdoc.eventListener("change", (e) => {
                    const isPublic = e.target.checked;
                    MmElementCard.updateElement({
                        ...topLevelEle,
                        _public: isPublic,
                    }).then(
                        () => {},
                        (response) => {
                            e.target.checked = !isPublic;
                            this.handleError(response);
                        }
                    );
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
                        createModal.onSuccess = (variables, response) => {
                            const descriptor = response.descriptors[0];
                            collectionEle.addNewDescriptor(descriptor, element);
                        };
                        bdoc.append(
                            createModal,
                            bdoc.attr("parent-element", JSON.stringify(element))
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
                    bdoc.eventListener("click", () => {
                        const isLeaf = element.intHasPart.length === 0;
                        let canDelete;
                        if (isRoot) {
                            canDelete =
                                prompt(
                                    'Are you sure you want to delete the collection? This will delete every element in the collection, and is irreversible. Type "collectionDelete" to confirm.'
                                ) === "collectionDelete";
                        } else if (isLeaf) {
                            canDelete = confirm(
                                "Are you sure you want to delete this element?"
                            );
                        } else {
                            canDelete =
                                prompt(
                                    "Are you sure you want to delete this element? This will delete all of its children. Type 'yes' to confirm."
                                ) === "yes";
                        }
                        if (!canDelete) return;

                        console.log(element);

                        EditCollection.deleteElement(element.id)
                            .then(() => {
                                if (isRoot) {
                                    window.location.href =
                                        "/c/ManageCollections";
                                }
                                collectionEle.deleteDescriptor(element);
                            })
                            .catch(this.handleError);
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
                generateCustomDescriptorElement(topLevelEle)
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

import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

export default class EditCollection extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    #lastSelectedElement = null;

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

    static deleteElement = async (element) => {};

    static fetchCollection = async (collectionId) => {
        const response = await EditCollection.session.fetch(
            `/api/collections/${collectionId}`
        );
        if (response.status !== 200) {
            return Promise.reject(response);
        }
        return (await response.json()).collection;
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
                        bdoc.ele("h3", "Edit Collection")
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
        const collectionId = new URL(window.location.href).pathname
            .split("/")
            .pop();

        if (!collectionId) {
            window.location.href = "/c/ManageCollections";
        }

        this.#collection = await EditCollection.fetchCollection(
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
            customElements.whenDefined("mm-create-element-modal"),
        ]).then(() => {
            const generateCustomDescriptorElement = (element) => {
                const addElementButton = bdoc.ele(
                    "button",
                    "+",
                    bdoc.attr("style", "cursor: pointer;"),
                    bdoc.eventListener("click", () => {
                        const createModal = this.shadowRoot.querySelector(
                            "mm-create-element-modal"
                        );
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
                        "background-color: #D32F2F; color: white; cursor: pointer; border: none; border-radius: 2px;"
                    ),
                    bdoc.eventListener("click", () => {
                        const isLeaf = element.intHasPart.length === 0;
                        let canDelete;
                        if (isLeaf) {
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

            collectionEle.customDescriptorEleOptions = {
                generateCustomDescriptorElement,
                renderInline: false,
            };

            collectionEle.select = (descriptorEle, elementObj) => {
                const descriptorCard =
                    this.shadowRoot.getElementById("descriptor-card");

                descriptorCard.onSave = async (data, propagate) => {
                    const currentElementObj = elementObj;
                    console.log(
                        propagate
                            ? "Propagating changes to children"
                            : "Not propagating",
                        { ...currentElementObj, ...data }
                    );
                };
                bdoc.append(
                    descriptorCard,
                    bdoc.attr("editable"),
                    bdoc.attr("value", JSON.stringify(elementObj))
                );
            };

            bdoc.append(headerContainer, collectionEle.expandContractButtons);

            collectionEle.loadDescriptors(this.#collection);
        });
    };
}
customElements.define("mm-edit-collection", EditCollection);

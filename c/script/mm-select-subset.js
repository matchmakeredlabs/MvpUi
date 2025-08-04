import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

export default class MmSelectSubset extends HTMLElement {
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

    loadingElement;

    static fetchCollection = async (collectionId) => {
        const response = await MmSelectSubset.session.fetch(
            `/api/collections/${collectionId}`
        );
        if (response.status !== 200) {
            return Promise.reject(response);
        }
        return (await response.json()).collection;
    };

    savePreviewCustomSet = () => {
        // Get the mm-collection element instance from the shadow DOM.
        const collectionEle = this.shadowRoot.querySelector("mm-collection");
        if (!collectionEle) {
            console.error("Collection element not found");
            return;
        }
        customElements.whenDefined("mm-collection").then(() => {
            // Retrieve the descriptors
            const descriptors = collectionEle.descriptors;

            // Get all descriptors with checked === true; the parent descriptors should already be checked
            // if any of their children are checked.
            const customSetDescriptors = Object.values(descriptors).filter(
                (desc) => desc.checked === true
            );
            const previewButton = this.shadowRoot.getElementById(
                "match-collections-button"
            );

            if (customSetDescriptors.length === 0) {
                previewButton.setAttribute("disabled", "true");
                return;
            }

            previewButton.removeAttribute("disabled");
            const customSet = {};
            customSet.descriptors = customSetDescriptors;

            localStorage.setItem("currentCustomSet", JSON.stringify(customSet));
        });

        // // Filter the checked descriptors to only those that have no children
        // // (i.e. leaf descriptors).
        // const checkedLeafDescriptors = checkedDescriptors.filter(
        //     (desc) => !desc.intHasPart || desc.intHasPart.length === 0
        // );

        // // Initialize customSet with the leaf node intIds.
        // const customSet = {};
        // customSet.leafNodes = checkedLeafDescriptors.map((leaf) => leaf.intId);

        // // The root descriptor (intId === 0) is used to set the associatedCollectionId.
        // const rootDescriptor = descriptors[0];
        // if (!rootDescriptor) {
        //     console.error("Root descriptor not found");
        //     return;
        // }
        // customSet.associatedCollectionId = rootDescriptor.id;

        // // Build a parentMap from intId to its parent intId.
        // // collectionEle.idToIntId is assumed to map the original descriptor IDs to intIds.
        // const parentMap = {};
        // Object.values(descriptors).forEach((desc) => {
        //     // If the descriptor defines a parent via the isPartOfId property, map it.
        //     if (desc.isPartOfId !== undefined && desc.isPartOfId !== null) {
        //         // Convert the parent's regular id to its internal intId using the mapping.
        //         const parentIntId = collectionEle.idToIntId[desc.isPartOfId];
        //         parentMap[desc.intId] = parentIntId;
        //     }
        // });

        // // Helper function: Given an array of leaf node intIds and a parentMap,
        // // recursively collect all ancestor intIds.
        // const getAncestors = (leafNodeIds, parentMap) => {
        //     const ancestors = new Set();
        //     leafNodeIds.forEach((nodeId) => {
        //         let current = parentMap[nodeId];
        //         while (current !== undefined && current !== null) {
        //             // Add the ancestor if not already processed.
        //             if (!ancestors.has(current)) {
        //                 ancestors.add(current);
        //             }
        //             // Move up one level.
        //             current = parentMap[current];
        //         }
        //     });
        //     return Array.from(ancestors);
        // };

        // // Retrieve all ancestors of the checked leaf nodes.
        // const allAncestors = getAncestors(customSet.leafNodes, parentMap);

        // // Create a final set: all unique intIds that are either checked leaf nodes or ancestors.
        // const finalDescriptorsArr = Array.from(
        //     new Set([...customSet.leafNodes, ...allAncestors])
        // );

        // // Build a descriptor object that maps each intId to its descriptor,
        // // augmented with the `parent` (from our parentMap) and `checked` state.
        // const descriptorObj = {};
        // finalDescriptorsArr.forEach((intId) => {
        //     let currentDescriptor = descriptors[intId];
        //     // Attach the parent's intId (or set to null if not present).
        //     currentDescriptor.parent =
        //         parentMap[intId] !== undefined ? parentMap[intId] : null;
        //     // The descriptor should already have the `checked` property in sync with the UI.
        //     descriptorObj[intId] = currentDescriptor;
        // });
        // customSet.descriptors = descriptorObj;
    };

    connectedCallback() {
        this.loadingElement = bdoc.ele("h2", "Loading...");

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
                    bdoc.ele("h2", "Select Subset"),
                    bdoc.ele(
                        "article",
                        bdoc.id("mmx_browse_tree"),
                        bdoc.ele("h3", "Collection"),
                        this.loadingElement
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
                            bdoc.attr("disabled"),
                            bdoc.id("match-collections-button"),
                            "Preview Custom Set",
                            bdoc.eventListener("click", () => {
                                window.location.href = "/c/PreviewCustomSet";
                            })
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
        const collectionId = new URLSearchParams(window.location.search).get(
            "id"
        );

        if (!collectionId) {
            window.location.href = "/c/Collections";
        }

        this.#collection = await MmSelectSubset.fetchCollection(
            collectionId
        ).catch((response) => {
            if (response.status === 404) {
                alert("Collection not found");
            } else {
                this.handleError(response);
            }
            window.location.href = "/c/Collections";
        });

        this.loadingElement.style.display = "none";

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
                    bdoc.attr("value", JSON.stringify(elementObj))
                );
            };

            bdoc.append(headerContainer, collectionEle.expandContractButtons);

            const generateCustomDescriptorElement = (element) => {
                const checkbox = bdoc.ele(
                    "input",
                    bdoc.attr("type", "checkbox"),
                    bdoc.attr("style", "cursor: pointer;")
                );

                checkbox.checked = element.checked || false;

                const descriptorsMap = collectionEle.descriptors;

                checkbox.addEventListener("change", (e) => {
                    const isChecked = e.target.checked;
                    // Helper functions
                    const updateDescendants = (descriptor) => {
                        descriptor.checked = isChecked;

                        if (descriptor.intHasPart) {
                            descriptor.intHasPart.forEach((childId) => {
                                const child = descriptorsMap[childId];
                                if (child) {
                                    updateDescendants(child);
                                }
                            });
                        }
                    };

                    const areLeafNodesUnchecked = (descriptor) => {
                        // true if descriptor isn't checked and is a leaf node
                        if (
                            !descriptor.intHasPart ||
                            descriptor.intHasPart.length === 0
                        ) {
                            return !descriptor.checked;
                        }

                        // otherwise, check all children and return true only if all are unchecked
                        return descriptor.intHasPart.every((childId) =>
                            areLeafNodesUnchecked(descriptorsMap[childId])
                        );
                    };

                    const updateAncestors = (descriptor) => {
                        // If the descriptor has a parent, uncheck the parent.
                        if (descriptor.isPartOfId) {
                            const parent = Object.values(descriptorsMap).find(
                                (desc) => desc.id === descriptor.isPartOfId
                            );

                            if (parent) {
                                parent.checked = !areLeafNodesUnchecked(parent);

                                // Recursively move to the next parent.
                                updateAncestors(parent);
                            }
                        }
                    };

                    // If you check (or uncheck) something, check all of its descendants
                    updateDescendants(element);

                    // update the checkbox state in the descriptors map
                    updateAncestors(element);

                    //Update the UI for rendered elements:
                    const li = e.target.closest("li");
                    if (li) {
                        // Update descendant checkboxes that are in the DOM:
                        li.querySelectorAll("input[type='checkbox']").forEach(
                            (cb) => {
                                cb.checked = isChecked;
                            }
                        );

                        // And update any ancestors currently in the DOM:
                        let parentLI = li.parentElement.closest("li");
                        while (parentLI) {
                            const ancestorCheckbox = parentLI.querySelector(
                                "input[type='checkbox']"
                            );
                            if (ancestorCheckbox) {
                                ancestorCheckbox.checked =
                                    descriptorsMap[parentLI.feid].checked ||
                                    false;
                            }
                            parentLI = parentLI.parentElement.closest("li");
                        }
                    }

                    this.savePreviewCustomSet();
                });

                return bdoc.ele(
                    "div",
                    bdoc.id(`checkbox-${element.id}`),
                    bdoc.attr(
                        "style",
                        "display: inline-flex; gap: 0.5em; margin-right:0.25em;"
                    ),
                    checkbox
                );
            };

            headerContainer
                .querySelector("h2")
                .addEventListener("click", () => {
                    collectionEle.clearSelections();

                    select(null, topLevelEle);
                });

            collectionEle.customDescriptorEleOptions = {
                generateCustomDescriptorElement,
                visibleUnselected: true,
                placeLeft: true,
            };

            collectionEle.select = select;

            collectionEle.loadDescriptors(this.#collection);
        });
    };
}
customElements.define("mm-select-subset", MmSelectSubset);

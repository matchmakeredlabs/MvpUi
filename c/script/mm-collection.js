import bdoc from "./bdoc.js";

class MmCollection extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    descriptors = {};
    idToIntId = {};

    loadingElement;

    maxIntId = 0;

    // deprecated, use customDescriptorEleOptions instead
    set generateCustomDescriptorElement(callback) {
        this.customDescriptorEleOptions.generateCustomDescriptorElement =
            callback;
    }

    customDescriptorEleOptions = {
        visibleUnselected: false,
        renderInline: true,
        placeLeft: false,
        generateCustomDescriptorElement: () => {},
    };
    originalDescriptorEleDisplayStyle;

    includeStylesheet = (link) => {
        bdoc.append(
            this.shadowRoot,
            bdoc.ele(
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("type", "text/css"),
                bdoc.attr("href", link)
            )
        );
    };

    connectedCallback() {
        (this.loadingElement = bdoc.ele("div", "Loading...")),
            bdoc.append(
                this.shadowRoot,
                this.loadingElement,
                bdoc.ele(
                    "link",
                    bdoc.attr("rel", "stylesheet"),
                    bdoc.attr("type", "text/css"),
                    bdoc.attr("href", "/c/res/mm-collection.css")
                )
            );
    }

    loadDescriptors(collection) {
        this.loadingElement.style.display = "none";
        for (let desc of collection) {
            this.descriptors[desc.intId] = desc;
            this.idToIntId[desc.id] = desc.intId;
            if (desc.intId > this.maxIntId) {
                this.maxIntId = desc.intId;
            }
        }
        MmCollection.expand(0, this.shadowRoot, this);
    }

    dfsWithPostfixCallback = (intId, callback) => {
        const descriptor = this.descriptors[intId];
        if (!descriptor) {
            return;
        }
        for (const childId of descriptor.intHasPart) {
            this.dfsWithPostfixCallback(childId, callback);
        }
        callback(descriptor);
    };

    static updateFields = [
        "subject",
        "eleType",
        "identifier",
        "educationalLevel",
        "creator",
        "provenance",
        "datePublished",
        "sdDatePublished",
        "key",
    ];

    updateDescriptor(descriptor, propagate = false) {
        const referencedDescriptor =
            this.descriptors[this.idToIntId[descriptor.id]];

        const oldValues = { ...referencedDescriptor };
        for (const key in descriptor) {
            referencedDescriptor[key] = descriptor[key];
        }

        const descriptorEle = this.shadowRoot.querySelector(
            `li[feid="${referencedDescriptor.intId}"]`
        );
        if (descriptorEle) {
            const span = descriptorEle.querySelector("span");
            span.innerText =
                MmCollection.generateDescriptorText(referencedDescriptor);
        }
        const keysToUpdate = [];
        for (const key of MmCollection.updateFields) {
            if (oldValues[key] !== referencedDescriptor[key]) {
                keysToUpdate.push(key);
            }
        }

        if (propagate && keysToUpdate.length > 0) {
            for (const childId of referencedDescriptor.intHasPart) {
                this.dfsWithPostfixCallback(childId, (desc) => {
                    for (const key of keysToUpdate) {
                        desc[key] = referencedDescriptor[key];
                    }
                });
            }
        }
    }

    deleteDescriptor(descriptor) {
        const parentDescriptor =
            this.descriptors[this.idToIntId[descriptor.isPartOfId]];

        const parentDescriptorEle = this.shadowRoot.querySelector(
            `li[feid="${parentDescriptor.intId}"]`
        );

        const described = !!(descriptor.key && descriptor.key.length > 0);
        const parentDescribed = !!(
            parentDescriptor.key && parentDescriptor.key.length > 0
        );

        let leafCountToDecrement = descriptor.leafCount;
        let describedLeafCountToDecrement = descriptor.leafWithKeyCount;

        const decrementLeafCounts = (descriptorEle, intId) => {
            if (!descriptorEle || intId === 0) {
                // if no parent, remove from root
                this.descriptors[0].leafCount -= leafCountToDecrement;
                if (described) {
                    this.descriptors[0].leafWithKeyCount -=
                        leafCountToDecrement;
                }
                return;
            }

            const descriptorLi = this.#getLi(descriptorEle);
            const currentDescriptor = this.descriptors[descriptorLi.feid];
            currentDescriptor.leafCount -= leafCountToDecrement;
            if (described) {
                currentDescriptor.leafWithKeyCount -=
                    describedLeafCountToDecrement;
            }
            const descButton = descriptorLi.querySelector("button.mmb_tri");

            if (
                currentDescriptor.leafCount ===
                currentDescriptor.leafWithKeyCount
            ) {
                descButton.classList.remove("mmb_partial");
                descButton.classList.add("mmb_desc");
            }

            decrementLeafCounts(
                descriptorLi.parentElement,
                this.idToIntId[currentDescriptor.isPartOfId]
            );
        };
        // if parent only has this descriptor, parent will become leaf, so leaf count increases by one
        if (parentDescriptor.intHasPart.length === 1) {
            leafCountToDecrement--;
            if (parentDescribed) {
                describedLeafCountToDecrement--;
            }
            if (parentDescriptorEle) {
                const descButton =
                    parentDescriptorEle.querySelector("button.mmb_tri");
                descButton.classList.remove("mmb_expanded");
                descButton.classList.add("mmb_leaf");
                bdoc.append(
                    descButton,
                    bdoc.eventListener("click", this.clickSelect(this))
                );
            }
        }
        decrementLeafCounts(parentDescriptorEle, parentDescriptor.intId);

        const descriptorEle = this.shadowRoot.querySelector(
            `li[feid="${descriptor.intId}"]`
        );
        const parentUl = descriptorEle.parentElement;
        parentUl.removeChild(descriptorEle);

        parentDescriptor.intHasPart = parentDescriptor.intHasPart.filter(
            (id) => id !== descriptor.intId
        );
        this.dfsWithPostfixCallback(descriptor.intId, (desc) => {
            delete this.descriptors[desc.intId];
            delete this.idToIntId[desc.id];
        });

        console.log(this.descriptors);
    }

    addNewDescriptor(descriptor) {
        descriptor.intId = ++this.maxIntId;
        descriptor.intHasPart = [];
        descriptor.leafCount = 1;
        descriptor.leafWithKeyCount = 0;

        const parentDescriptor =
            this.descriptors[this.idToIntId[descriptor.isPartOfId]];

        const parentDescriptorEle = this.shadowRoot.querySelector(
            `li[feid="${parentDescriptor.intId}"]`
        );

        const incrementLeafCounts = (descriptorEle) => {
            if (!descriptorEle) {
                // if no parent, add to root
                this.descriptors[0].leafCount++;
                return;
            }

            const descriptorLi = this.#getLi(descriptorEle);
            const currentDescriptor = this.descriptors[descriptorLi.feid];
            currentDescriptor.leafCount++;

            const descButton = descriptorLi.querySelector("button.mmb_tri");

            if (
                currentDescriptor.leafWithKeyCount !== 0 &&
                currentDescriptor.leafCount > currentDescriptor.leafWithKeyCount
            ) {
                descButton.classList.remove("mmb_desc");
                descButton.classList.add("mmb_partial");
            }
            if (this.idToIntId[currentDescriptor.isPartOfId] !== 0) {
                incrementLeafCounts(descriptorLi.parentElement);
            }
        };
        // if parent was leaf, do not increment leaf counts (parent is no longer a leaf)
        if (parentDescriptor.intHasPart.length > 0) {
            incrementLeafCounts(parentDescriptorEle);
        } else {
            if (parentDescriptorEle) {
                const descButton =
                    parentDescriptorEle.querySelector("button.mmb_tri");
                if (descButton.classList.contains("mmb_leaf")) {
                    descButton.classList.remove("mmb_leaf");
                    bdoc.append(
                        descButton,
                        bdoc.eventListener("click", this.clickExpand(this))
                    );
                }
            }
        }

        parentDescriptor.intHasPart.push(descriptor.intId);

        this.descriptors[descriptor.intId] = descriptor;
        this.idToIntId[descriptor.id] = descriptor.intId;

        if (!parentDescriptorEle) {
            // if no parent, add to root
            const ul = this.shadowRoot.querySelector("ul");
            const li = MmCollection.makeElement(descriptor, this);
            ul.appendChild(li);
        } else if (parentDescriptorEle.expanded) {
            const ul = parentDescriptorEle.querySelector("ul");
            const li = MmCollection.makeElement(descriptor, this);
            ul.appendChild(li);
        } else {
            MmCollection.expand(
                parentDescriptor.intId,
                parentDescriptorEle,
                this
            );
        }
    }

    clearSelections = () => {
        const spans = this.shadowRoot.querySelectorAll("span");
        spans.forEach((span) => {
            span.style.fontWeight = "normal";
        });
        const customElements = this.shadowRoot.querySelectorAll("[custom-ele]");

        if (!this.customDescriptorEleOptions.visibleUnselected) {
            customElements.forEach((customEle) => {
                customEle.style.display = "none";
            });
        }
    };

    clickSelect =
        (origin) =>
        ({ target }) => {
            this.clearSelections();

            const eleLi = this.#getLi(target);

            const selectedSpan = eleLi.querySelector("span");
            selectedSpan.style.fontWeight = "bold";

            const selectedCustomEle = eleLi.querySelector("[custom-ele]");
            if (selectedCustomEle) {
                selectedCustomEle.style.display =
                    this.originalDescriptorEleDisplayStyle || "block";
            }

            origin.select(target, this.descriptors[eleLi.feid]);
        };

    select = () => {};

    #getLi = (ele) => {
        if (ele.tagName === "LI") {
            return ele;
        } else {
            return this.#getLi(ele.parentElement);
        }
    };

    get expandAll() {
        return () => {
            const listEles = this.shadowRoot.querySelectorAll("li");
            listEles.forEach((ele) => {
                if (ele.expanded === false) {
                    MmCollection.expand(ele.feid, ele, this);
                }
            });
        };
    }

    get contractAll() {
        return () => {
            let contracted = false;
            const listEles = this.shadowRoot.querySelectorAll("li");
            listEles.forEach((ele) => {
                if (ele.expanded === true) {
                    const childLists = ele.querySelectorAll("li");
                    for (const childList of childLists) {
                        if (childList.expanded === true) {
                            return;
                        }
                    }
                    MmCollection.contract(ele);
                    contracted = true;
                }
            });
            return contracted;
        };
    }

    get expandContractButtons() {
        return bdoc.ele(
            "div",
            bdoc.id("expand-contract-buttons"),
            bdoc.ele(
                "button",
                bdoc.class("expand-contract-button"),
                bdoc.eventListener("click", this.expandAll),
                "Expand"
            ),
            bdoc.ele(
                "button",
                bdoc.class("expand-contract-button"),
                bdoc.eventListener("click", this.contractAll),
                "Collapse"
            )
        );
    }

    clickExpand =
        (origin) =>
        ({ target }) => {
            const li = this.#getLi(target);
            if (li.expanded) {
                MmCollection.contract(li);
            } else {
                MmCollection.expand(li.feid, li, origin);
            }
            this.clickSelect(origin)({ target: li.querySelector("span") });
            // origin.select(target, this.descriptors[target.parentElement.feid]);
        };

    static generateDescriptorText = (descriptor) => {
        const abstr =
            descriptor.description.length < 50
                ? descriptor.description
                : descriptor.description.substring(0, 50) + "...";

        let spanText = descriptor.name;
        if (descriptor.datePublished) {
            spanText += ", " + descriptor.datePublished;
        }
        if (abstr.length > 0) {
            spanText += " - " + abstr;
        }

        return spanText;
    };

    static makeElement = (cn, origin) => {
        let li = document.createElement("li");
        const buttonContainer = bdoc.ele("div", bdoc.class("button-container"));
        const descContainer = bdoc.ele("div", bdoc.class("desc-container"));
        // descContainer.expanded = false;
        // descContainer.feid = cid; // Framework Element ID
        const cid = cn.intId;
        li.expanded = false;
        li.feid = cid; // Framework Element ID

        bdoc.append(li, bdoc.attr("feid", cid));

        const button = bdoc.ele(
            "button",
            bdoc.attr("type", "button"),
            bdoc.class("mmb_tri")
        );

        if (cn.intHasPart && cn.intHasPart.length > 0) {
            bdoc.append(
                button,
                bdoc.eventListener("click", origin.clickExpand(origin))
            );

            if (cn.leafWithKeyCount >= cn.leafCount) {
                button.classList.add("mmb_desc");
            } else if (cn.leafWithKeyCount > 0) {
                button.classList.add("mmb_partial");
            }
        } else {
            button.classList.add("mmb_leaf");
            bdoc.append(
                button,
                bdoc.eventListener("click", origin.clickSelect(origin))
            );
            if (cn.leafWithKeyCount > 0) {
                button.classList.add("mmb_desc");
            }
        }
        // li.appendChild(button);
        bdoc.append(buttonContainer, button);

        const span = bdoc.ele(
            "span",
            bdoc.eventListener("click", origin.clickSelect(origin)),
            MmCollection.generateDescriptorText(cn)
        );
        const customDescriptorEle =
            origin.customDescriptorEleOptions.generateCustomDescriptorElement(
                cn
            );
        if (customDescriptorEle) {
            bdoc.append(customDescriptorEle, bdoc.attr("custom-ele"));
            if (!origin.customDescriptorEleOptions.visibleUnselected) {
                origin.originalDescriptorEleDisplayStyle =
                    customDescriptorEle.style.display;
                customDescriptorEle.style.display = "none";
            }
            if (origin.customDescriptorEleOptions.renderInline) {
                descContainer.style.display = "inline";
            }

            if (origin.customDescriptorEleOptions.placeLeft) {
                bdoc.append(descContainer, customDescriptorEle, span);
            } else {
                bdoc.append(descContainer, span, customDescriptorEle);
            }
        } else {
            bdoc.append(descContainer, span);
        }

        bdoc.append(buttonContainer, descContainer);
        bdoc.append(li, buttonContainer);
        return li;
    };

    static expand(id, parentEle, origin) {
        let node = origin.descriptors[id];

        const expandButton = parentEle.querySelector("button");
        if (expandButton) {
            expandButton.classList.add("mmb_expanded");
        }

        if (!node || (node.intHasPart.length == 0 && node.intId !== 0)) return;
        let ul = bdoc.ele("ul");
        if (id == 0) {
            ul.style.paddingLeft = "0px";
            ul.style.paddingRight = "1em";
        }
        for (let cid of node.intHasPart) {
            let cn = origin.descriptors[cid];
            if (cn) {
                const li = MmCollection.makeElement(cn, origin);
                bdoc.append(ul, li);
            }
        }
        parentEle.expanded = true;
        parentEle.appendChild(ul);
    }

    static contract(parentEle) {
        parentEle.querySelector("button").classList.remove("mmb_expanded");
        for (let ele of parentEle.children) {
            if (ele.tagName == "UL") {
                parentEle.removeChild(ele);
                break;
            }
        }
        parentEle.expanded = false;
    }
}

customElements.define("mm-collection", MmCollection);

import bdoc from "./bdoc.js";

class MmCollection extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    descriptors = {};

    // deprecated, use customDescriptorEleOptions instead
    set generateCustomDescriptorElement(callback) {
        this.customDescriptorEleOptions.generateCustomDescriptorElement =
            callback;
    }

    customDescriptorEleOptions = {
        visibleUnselected: false,
        renderInline: true,
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
        bdoc.append(
            this.shadowRoot,
            bdoc.ele(
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("type", "text/css"),
                bdoc.attr("href", "/c/res/mm-collection.css")
            )
        );
    }

    loadDescriptors(collection) {
        for (let desc of collection) {
            this.descriptors[desc.intId] = desc;
        }
        MmCollection.expand(0, this.shadowRoot, this);
    }

    clickSelect =
        (origin) =>
        ({ target }) => {
            const selectedSpan =
                this.#getParentLi(target).querySelector("span");
            const spans = this.shadowRoot.querySelectorAll("span");
            spans.forEach((span) => {
                if (span === selectedSpan) {
                    span.style.fontWeight = "bold";
                } else {
                    span.style.fontWeight = "normal";
                }
            });
            const selectedCustomEle =
                this.#getParentLi(target).querySelector("[custom-ele]");
            const customElements =
                this.shadowRoot.querySelectorAll("[custom-ele]");

            customElements.forEach((customEle) => {
                if (customEle === selectedCustomEle) {
                    customEle.style.display =
                        this.originalDescriptorEleDisplayStyle || "block";
                } else {
                    customEle.style.display = "none";
                }
            });

            origin.select(
                target,
                this.descriptors[this.#getParentLi(target).feid]
            );
        };

    select = () => {};

    #getParentLi = (ele) => {
        if (ele.tagName === "LI") {
            return ele;
        } else {
            return this.#getParentLi(ele.parentElement);
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
                "Close"
            )
        );
    }

    clickExpand =
        (origin) =>
        ({ target }) => {
            const li = this.#getParentLi(target);
            if (li.expanded) {
                MmCollection.contract(li);
            } else {
                MmCollection.expand(li.feid, li, origin);
            }
            this.clickSelect(origin)({ target: li.querySelector("span") });
            // origin.select(target, this.descriptors[target.parentElement.feid]);
        };

    static expand(id, parentEle, origin) {
        let node = origin.descriptors[id];

        const expandButton = parentEle.querySelector("button");
        if (expandButton) {
            expandButton.classList.add("mmb_expanded");
        }

        if (!node || node.intHasPart.length == 0) return;
        let ul = bdoc.ele("ul");
        if (id == 0) {
            ul.style.paddingLeft = "0px";
        }
        for (let cid of node.intHasPart) {
            let cn = origin.descriptors[cid];
            if (cn) {
                let li = document.createElement("li");
                const buttonContainer = bdoc.ele(
                    "div",
                    bdoc.class("button-container")
                );
                const descContainer = bdoc.ele(
                    "div",
                    bdoc.class("desc-container")
                );
                // descContainer.expanded = false;
                // descContainer.feid = cid; // Framework Element ID

                li.expanded = false;
                li.feid = cid; // Framework Element ID

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

                const abstr =
                    cn.description.length < 50
                        ? cn.description
                        : cn.description.substring(0, 50) + "...";

                let spanText = cn.name;
                if (cn.datePublished) {
                    spanText += ", " + cn.datePublished;
                }
                spanText += " - " + abstr;

                const span = bdoc.ele(
                    "span",
                    bdoc.eventListener("click", origin.clickSelect(origin)),
                    spanText
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
                }
                bdoc.append(descContainer, span, customDescriptorEle);
                bdoc.append(buttonContainer, descContainer);
                bdoc.append(li, buttonContainer);
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

import bdoc from "./bdoc.js";

class MmCollection extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    descriptors = {};

    generateCustomDescriptorElement = () => {};

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
            const selectedSpan = target.parentElement.querySelector("span");
            const spans = this.shadowRoot.querySelectorAll("li span");
            spans.forEach((span) => {
                // Check if the clicked span is the same as the currently highlighted one
                if (span === selectedSpan) {
                    // Toggle the bold style
                    span.style.fontWeight = "bold"; // Set to bold
                } else {
                    // Reset the font weight for other spans
                    span.style.fontWeight = "normal";
                }
            });
            origin.select(target, this.descriptors[target.parentElement.feid]);
        };

    select = () => {};

    clickExpand =
        (origin) =>
        ({ target }) => {
            let li = target.parentElement;
            if (li.expanded) {
                MmCollection.contract(li);
            } else {
                MmCollection.expand(li.feid, li, origin);
                target.classList.add("mmb_expanded");
            }
            origin.select(target, this.descriptors[target.parentElement.feid]);
        };

    static expand(id, parentEle, origin) {
        let node = origin.descriptors[id];

        if (!node || node.intHasPart.length == 0) return;
        let ul = bdoc.ele("ul");
        for (let cid of node.intHasPart) {
            let cn = origin.descriptors[cid];
            if (cn) {
                let li = document.createElement("li");
                li.expanded = false;
                li.feid = cid; // Framework Element ID

                const button = bdoc.ele("button", bdoc.attr("type", "button"));

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
                    button.className = "mmb_leaf";
                    bdoc.append(
                        button,
                        bdoc.eventListener("click", origin.clickSelect(origin))
                    );
                    if (cn.leafWithKeyCount > 0) {
                        button.classList.add("mmb_desc");
                    }
                }
                li.appendChild(button);

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
                bdoc.append(
                    li,
                    span,
                    origin.generateCustomDescriptorElement(cn)
                );

                bdoc.append(ul, li);
            }
        }
        parentEle.expanded = true;
        parentEle.appendChild(ul);
    }

    static contract(parentEle) {
        for (let ele of parentEle.children) {
            if (ele.classList.contains("mmb_expanded")) {
                ele.classList.remove("mmb_expanded");
            } else if (ele.tagName == "UL") {
                parentEle.removeChild(ele);
                break;
            }
        }
        parentEle.expanded = false;
    }
}

customElements.define("mm-collection", MmCollection);

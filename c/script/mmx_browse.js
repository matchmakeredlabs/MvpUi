import bdoc from './bdoc.js';

class MmCollection {

    static thisCollection;

    static async load(id) {
        let response = await fetch("/api/collections/" + id);
        let data = await response.json();
        return new MmCollection(data.collection);
    }

    constructor(collection) {

        // Descriptors with root
        let descriptors = [];

        // Load up the statements
        for (let desc of collection) {
            descriptors[desc.intId] = desc;
        }

        this.descriptors = descriptors;
    }

    select(ele) {
        function addRow(dl, label, value) {
            if (!(value)) return;

            let val;
            if (label == "URL" && value.startsWith("http")) {
                val = bdoc.ele("a", bdoc.attr("href", value), value);
            }
            else {
                val = value;
            }

            dl.appendChild(bdoc.ele("div",
                bdoc.ele("dt", label),
                bdoc.ele("dd", val)));
        }

        while (ele && ele.feid == undefined) {
            ele = ele.parentElement;
        }

        if (!ele) return;

        let desc = this.descriptors[ele.feid];
        if (!desc) return;

        // Save the selected statement
        this.selDesc = desc;

        let detail = document.getElementById("mmx_browse_detail");
        if (!detail) return;

        // Clear the existing detail
        detail.innerHTML = "";
        detail.className = "mmc_competency";

        detail.appendChild(bdoc.ele("h3", "Descriptor"));
        detail.appendChild(bdoc.ele("h2", desc.name));
        detail.appendChild(bdoc.ele("section", bdoc.preText(desc.abstract)));
        detail.appendChild(bdoc.ele("h3", "Detail"));

        let dl = document.createElement("dl");
        addRow(dl, "Identifier", desc.identifier);
        addRow(dl, "About", desc.about);
        addRow(dl, "EducationLevel", desc.educationLevel);
        addRow(dl, "URL", desc.url);
        detail.appendChild(dl);

        detail.appendChild(bdoc.ele("h3", "Links"));

        detail.appendChild(bdoc.ele("div", bdoc.ele("a",
            bdoc.attr("href", "/c/Describe?id=" + encodeURIComponent(desc.id)),
            bdoc.attr("target", "_blank"),
            "Edit Description")));

        if (desc.key) {
            detail.appendChild(bdoc.ele("div", bdoc.ele("a",
                bdoc.attr("href", "/c/Match?stmtId=" + encodeURIComponent(desc.id)),
                bdoc.attr("target", "_blank"),
                "View descriptor and matches")));
        }
    }

    expand(id, parentEle) {
        let node = this.descriptors[id];
        if (!node || node.intHasPart.length == 0) return;
        let ul = document.createElement("ul");
        for (let cid of node.intHasPart) {
            let cn = this.descriptors[cid];
            if (cn) {
                let li = document.createElement("li");
                li.expanded = false;
                li.feid = cid; // Framework Element ID

                let button = document.createElement("button");
                button.type = "button";

                if (cn.intHasPart && cn.intHasPart.length > 0) {
                    button.onclick = MmCollection.clickExpand;
                    if (cn.leafWithKeyCount >= cn.leafCount) {
                        button.classList.add("mmb_desc");
                    }
                    else if (cn.leafWithKeyCount > 0) {
                        button.classList.add("mmb_partial");
                    }
                }
                else {
                    button.className = "mmb_leaf";
                    button.onclick = MmCollection.clickSelect;
                    if (cn.leafWithKeyCount > 0) {
                        button.classList.add("mmb_desc");
                    }
                }
                li.appendChild(button);

                let span = document.createElement("span");
                span.onclick = MmCollection.clickSelect;
                span.textContent = cn.name;
                li.appendChild(span);
                ul.appendChild(li);
            }
        }
        parentEle.expanded = true;
        parentEle.appendChild(ul);
    }

    contract(parentEle) {
        for (let ele of parentEle.children) {
            if (ele.classList.contains("mmb_expanded")) {
                ele.classList.remove("mmb_expanded");
            }
            else if (ele.tagName == "UL") {
                parentEle.removeChild(ele);
                break;
            }
        }
        parentEle.expanded = false;
    }

    attachTo(element) {
        MmCollection.thisCollection = this;

        element.innerHTML = ""; // Erase any existing content
        element.appendChild(bdoc.ele("h3", "Collection"));

        let stmt = this.descriptors[0];
        console.log(stmt.name);
        if (stmt && stmt.name) {
            let h2 = bdoc.ele("h2",
                bdoc.attr("feid", 0),
                bdoc.attr("onclick", MmCollection.clickSelect),
                stmt.name);
            element.appendChild(h2);
            this.select(h2);
        }
        this.expand(0, element);
    }

    static clickExpand() {
        let li = this.parentElement;
        console.log(li.feid);
        if (li.expanded) {
            MmCollection.thisCollection.contract(li);
        }
        else {
            MmCollection.thisCollection.expand(li.feid, li);
            this.classList.add("mmb_expanded");
        }
        MmCollection.thisCollection.select(this);
    }

    static clickSelect() {
        const spans = document.querySelectorAll('li span');
        spans.forEach(span => {
            // Check if the clicked span is the same as the currently highlighted one
                if (span === this) {
                // Toggle the bold style
                if (span.style.fontWeight === 'bold') {
                    span.style.fontWeight = 'normal'; // Set to normal weight
                } else {
                    span.style.fontWeight = 'bold'; // Set to bold
                }
                } else {
                // Reset the font weight for other spans
                span.style.fontWeight = 'normal';
                }
            }
        )
        MmCollection.thisCollection.select(this);
    }
}

async function loadFramework(url) {
    let query = new URLSearchParams(window.location.search);
    let fw = query.get("id");

    const collection = await MmCollection.load(fw);
    collection.attachTo(document.getElementById("mmx_browse_tree"));
}

loadFramework();

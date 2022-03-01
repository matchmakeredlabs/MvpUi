import bdoc from './bdoc.js';

class MmFramework {

    static thisFramework;

    static async load(url) {
        let response = await fetch(url);
        let data = await response.json();
        return new MmFramework(data.statements);
    }

    constructor(statements) {

        // Statements with root
        let stmts = [];

        // Load up the statements
        for (let stmt of statements) {
            stmts[stmt.id] = stmt;
        }

        this.stmts = stmts;
    }

    insert(ele) {

        for (let stmt in this.stmts) {
            let div = document.createElement("div");
            div.textContent = stmt + ": " + JSON.stringify(this.stmts[stmt]);
            ele.appendChild(div);
        }

    }

    select(ele) {
        function addRow(dl, label, value) {
            if (!(value)) return;

            let val;
            if (label == "URI" && value.startsWith("http")) {
                val = bdoc.newEle("a", bdoc.newAttr("href", value), value);
            }
            else {
                val = value;
            }

            dl.appendChild(bdoc.newEle("div",
                bdoc.newEle("dt", label),
                bdoc.newEle("dd", val)));
        }

        while (ele && ele.feid == undefined) {
            ele = ele.parentElement;
        }

        if (!ele) return;

        let stmt = this.stmts[ele.feid];
        if (!stmt) return;

        // Save the selected statement
        this.selStmt = stmt;

        let detail = document.getElementById("mmx_browse_detail");
        if (!detail) return;

        // Clear the existing detail
        detail.innerHTML = "";
        detail.className = "mmc_competency";

        detail.appendChild(bdoc.newEle("h3", "Competency Statement"));
        detail.appendChild(bdoc.newEle("h2", stmt.name));
        detail.appendChild(bdoc.newEle("section", bdoc.newPreText(stmt.abstract)));
        detail.appendChild(bdoc.newEle("h3", "Detail"));

        let dl = document.createElement("dl");
        addRow(dl, "Identifier", stmt.identifier);
        addRow(dl, "About", stmt.about);
        addRow(dl, "EducationLevel", stmt.educationLevel);
        addRow(dl, "URI", stmt.url);
        detail.appendChild(dl);

        detail.appendChild(bdoc.newEle("h3", "Links"));

        if (stmt.url) {
            fetch("/descriptors?uriExists=" + encodeURIComponent(stmt.url))
                .then(this.onUriExists);
        }
    }

    async onUriExists(response) {
        let json = await response.json();

        let detail = document.getElementById("mmx_browse_detail");
        if (!detail) return;

        let div = document.createElement("div");
        div.className = "mmb_descriptor_link";
        if (json.exists) {
            let a = document.createElement("a");
            a.href = "/c/Match.htm?stmtId=" + encodeURIComponent(json.stmtId);
            a.target = "_blank";
            a.textContent = "View descriptor and matches";
            div.appendChild(a);
        }
        else {
            let a = document.createElement("a");
            a.href = "javascript:void(0);";
            a.onclick = MmFramework.clickDescribe;
            a.textContent = "Create descriptor";
            div.appendChild(a);
        }
        detail.appendChild(div);
    }

    expand(id, parentEle) {
        let node = this.stmts[id];
        if (!node || node.intHasPart.length == 0) return;
        let ul = document.createElement("ul");
        for (let cid of node.intHasPart) {
            let cn = this.stmts[cid];
            if (cn) {
                let li = document.createElement("li");
                li.expanded = false;
                li.feid = cid; // Framework Element ID

                let button = document.createElement("button");
                button.type = "button";

                if (cn.intHasPart && cn.intHasPart.length > 0) {
                    button.onclick = MmFramework.clickExpand;
                }
                else {
                    button.className = "mmb_leaf";
                    button.onclick = MmFramework.clickSelect;
                }
                li.appendChild(button);

                let span = document.createElement("span");
                span.onclick = MmFramework.clickSelect;
                span.textContent = cn.name;
                li.appendChild(span);

                ul.appendChild(li);

                if (cn.url) {
                    console.log("uriExists: " + cn.url);
                    fetch("/descriptors?uriExists=" + encodeURIComponent(cn.url))
                        .then((response) => this.onDescriptorExists(response, button));
                }
            }
        }
        parentEle.expanded = true;
        parentEle.appendChild(ul);
    }

    async onDescriptorExists(response, button) {
        let json = await response.json();
        if (json.exists) {
            console.log("uriExists: true");
            button.classList.add("mmb_desc");
        }
    }

    contract(parentEle) {
        for (let ele of parentEle.children) {
            if (ele.classList.contains("mmb_expanded")) {
                ele.classList.remove("mmb_expanded");
            }
            else if (ele.classList.contains("mmb_list")) {
                parentEle.removeChild(ele);
                break;
            }
        }
        parentEle.expanded = false;
    }

    attachTo(element) {
        MmFramework.thisFramework = this;

        element.appendChild(bdoc.newEle("h3", "Framework"));

        let stmt = this.stmts[0];
        if (stmt && stmt.name) {
            let h2 = bdoc.newEle("h2",
                bdoc.newAttr("feid", 0),
                bdoc.newAttr("onclick", MmFramework.clickSelect),
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
            MmFramework.thisFramework.contract(li);
        }
        else {
            MmFramework.thisFramework.expand(li.feid, li);
            this.classList.add("mmb_expanded");
        }
        MmFramework.thisFramework.select(this);
    }

    static clickSelect() {
        MmFramework.thisFramework.select(this);
    }

    static clickDescribe() {
        sessionStorage.describeStmt = JSON.stringify(MmFramework.thisFramework.selStmt);
        window.open("/c/TagItem.htm", "_blank");
    }
}

async function loadFramework(url) {
    let query = new URLSearchParams(window.location.search);
    let fw = query.get("fwname");
    if (fw) {
        fw = "/c/" + fw + ".json"
    }
    if (!fw) {
        fw = query.get("fwsrc");
        if (fw) {
            fw = "/frameworks?src=" + encodeURIComponent(fw);
        }
    }
    if (!fw) {
        fw = "/c/root-framework.json";
    }

    let framework = await MmFramework.load(fw);
    framework.attachTo(document.getElementById("mmx_browse_tree"));

    console.log("sessionStorage=" + JSON.stringify(sessionStorage.phred));
}

loadFramework();

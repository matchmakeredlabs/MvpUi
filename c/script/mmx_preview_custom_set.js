import bdoc from './bdoc.js';
import config from '/config.js';
import bsession from './bsession.js';
import { convertJsonToCsv, convertJsonToCsvNoHeader } from './downloadhelper.js';

const session = new bsession(config.backEndUrl, config.sessionTag);

window.closelevel = 0;
window.currentCollection = {};

// Function to visually update the status of all checkboxes
function updateVisualStatus() {
    // Grab all checkboxes on the screen
    const checkboxes = document.querySelectorAll('.custom-checkbox');

    checkboxes.forEach(checkbox => {
        const inputElement = checkbox
        const nodeId = Number(inputElement.id); // The ID of the input element corresponds to the node ID

        // Update the checkbox's visual state based on MmCollection.checkStatus
        let status = MmCollection.thisCollection.descriptors[nodeId].checked;
        inputElement.previousElementSibling.checked = status || false;
    });
}

function saveCustomSet() {
    let name = prompt("Provide a name for this custom set") 
    let customSets = JSON.parse(localStorage.getItem("customSets"));
    let currentCustomSet = JSON.parse(localStorage.getItem("currentCustomSet"));

    if (customSets == undefined) {
        customSets = {}
    }
    customSets[name] =currentCustomSet;

    localStorage.setItem("customSets", JSON.stringify(customSets));

    alert(`Custom set ${name} has been saved!`)

    window.location.href = "./GenerateReport"
}

export default class MmCollection {

    static adjacencyList;
    static parentMap; 
    static checkStatus = new Map();

    static thisCollection;

    static async LoadFromSessionStorage(id) {
        // let response = await session.fetch("/api/collections/" + id);
        // let data = await response.json();

        let currentCustomSet = JSON.parse(localStorage.getItem("currentCustomSet"));
        console.log(currentCustomSet);
        window.currentCollection = currentCustomSet.descriptors;

        return new MmCollection(Object.values(currentCustomSet.descriptors));
    }

    static async LoadFromExternalUrl(url) {
        const reqUrl = "/api/convert?url=" + encodeURIComponent(url);
        const response = await session.fetch(reqUrl, {
            headers: {
                "Accept": "application/json"
            }
        });
        if (response.status >= 400) {
            let text = await response.text();
            throw new Error(`${response.status} ${response.statusText}: ${text}`);
        }
        const data = await response.json();
        return new MmCollection(data.collection);    
    }

    static async LoadFromFile(file) {
        const reqUrl = "/api/convert";
        const response = await session.fetch(reqUrl, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": file.type
            },
            body: file
        });
        if (response.status >= 400) {
            let text = await response.text();
            throw new Error(`${response.status} ${response.statusText}: ${text}`);
        }
        const data = await response.json();
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

        // let collectionMatches = document.createElement("button")
        // collectionMatches.textContent = "View Collection Matches"
        // collectionMatches.id = "match-console-button"
        // detail.appendChild(collectionMatches);

        detail.appendChild(bdoc.ele("h3", "Descriptor"));
        detail.appendChild(bdoc.ele("h2", desc.name));
        let sect = document.createElement("section");
        sect.innerHTML = desc.description;
        detail.appendChild(sect); 
        detail.appendChild(bdoc.ele("h3", "Detail"));

        let dl = document.createElement("dl");
        addRow(dl, "Identifier", desc.identifier);
        addRow(dl, "Subject", desc.subject);
        addRow(dl, "EducationLevel", desc.educationLevel);
        addRow(dl, "URL", desc.url);
        detail.appendChild(dl);

        if (!desc.id) return; // No edit description or view descriptor on preview

        if ((desc.intHasPart && desc.intHasPart.length === 0) || desc.key){
            detail.appendChild(bdoc.ele("h3", "Links"));
        }
        if (desc.intHasPart && desc.intHasPart.length === 0) {
            detail.appendChild(bdoc.ele("div", bdoc.ele("a",
                bdoc.attr("href", "/c/Describe?id=" + encodeURIComponent(desc.id)),
                bdoc.attr("target", "_blank"),
                "Edit Description")));
        }

        if (desc.key) {
            detail.appendChild(bdoc.ele("div", bdoc.ele("a",
                bdoc.attr("href", "/c/Match?stmtId=" + encodeURIComponent(desc.id)),
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


                // Create the input element
                let checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = 'checkbox3';

                // Create the span element for the custom checkbox
                let customCheckbox = document.createElement('span');
                customCheckbox.className = 'custom-checkbox';
                customCheckbox.id = cn.intId;

                let span = document.createElement("span");
                span.onclick = MmCollection.clickSelect;

                let abstr = cn.description.substring(0,50)
                if (cn.description.length > 50) {
                    abstr +="..."
                }
            
                span.textContent += cn.name 
                if (cn.datePublished) {
                    span.textContent += ", " + cn.datePublished 
                }
                span.textContent += " - " + abstr;
                li.appendChild(checkbox);
                li.appendChild(customCheckbox);
                li.appendChild(span);
                ul.appendChild(li);
            }
        }
        parentEle.expanded = true;
        parentEle.appendChild(ul);    
            
        updateVisualStatus();
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

        // let buttonGroup = document.createElement("div")
        // buttonGroup.classList.add("button-group");

        document.getElementById('match-collections-button').onclick = saveCustomSet;
        
        let expandElement = document.createElement("span");
        expandElement.innerText = "Expand";
        expandElement.classList.add("button-div");
        

        function expandli() {
            let mmx_browse_detail = document.getElementById("mmx_browse_detail")
            let preActionHTML = mmx_browse_detail.outerHTML;
            window.closelevel += 1;

            // Select all li elements
            let allLis = document.querySelectorAll('li');

            // Filter to get only the leaf-level li elements
            let leafLevelLis = Array.from(allLis).filter(function(li) {
                return li.querySelector('li') === null;
            });

            // Iterate over the NodeList of leaf-level li elements and perform actions
            leafLevelLis.forEach(function(li) {
                li.firstChild.click()
            });
            mmx_browse_detail.outerHTML = preActionHTML;
        }
        function closeli() {
            let mmx_browse_detail = document.getElementById("mmx_browse_detail")
            let preActionHTML = mmx_browse_detail.outerHTML;
            if (window.closelevel >= 0) {
                clickOnLevel(window.closelevel);
                window.closelevel -= 1;
            }
            mmx_browse_detail.outerHTML = preActionHTML;
        }
        
        function clickOnLevel(level) {
            // Helper function to recursively find and click on li elements at the given level
            function clickLevel(liElements, currentLevel) {
                if (currentLevel === level) {
                    // If the current level matches the target level, click on all li elements
                    liElements.forEach(function(li) {
                        if (li.firstChild) {
                            li.firstChild.click();
                        }
                    });
                } else {
                    // Otherwise, go deeper into the DOM tree
                    liElements.forEach(function(li) {
                        let childUl = li.querySelector('ul');
                        if (childUl) {
                            clickLevel(Array.from(childUl.children).filter(child => child.tagName === 'LI'), currentLevel + 1);
                        }
                    });
                }
            }
        
            // Start with top level li elements
            let topLevelLis = Array.from(document.querySelectorAll('ul > li'));
            clickLevel(topLevelLis, 0);
        }
        
        let shrinkElement = document.createElement("span");
        shrinkElement.innerText = "Close";
        shrinkElement.classList.add("button-div");
        expandElement.onclick = expandli;
        shrinkElement.onclick = closeli;

        element.appendChild(shrinkElement)
        element.appendChild(expandElement)

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

        updateVisualStatus();
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
                 span.style.fontWeight = 'bold'; // Set to bold 
                } else {
                // Reset the font weight for other spans
                span.style.fontWeight = 'normal';
                }
            }
        )
        MmCollection.thisCollection.select(this);
    }
    
}




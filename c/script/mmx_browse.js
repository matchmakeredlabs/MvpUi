import bdoc from './bdoc.js';
import config from '/config.js';
import bsession from './bsession.js';
import { convertJsonToCsv, convertJsonToCsvNoHeader } from './downloadhelper.js';

const session = new bsession(config.backEndUrl, config.sessionTag);

window.closelevel = 0;
window.currentCollection = {};

function jsonToQueryString(jsonString) {
    // Parse the JSON string into an object
    let jsonObject = JSON.parse(jsonString);
  
    // Create an array of key-value pairs
    let queryParams = [];
    for (let key in jsonObject) {
      if (jsonObject.hasOwnProperty(key)) {
        queryParams.push(`${key}=${jsonObject[key]}`);
      }
    }
  
    // Join the array into a single string with '&' separator
    return queryParams.join('&');
  }

export default class MmCollection {

    static thisCollection;

    static async LoadFromId(id) {
        let response = await session.fetch("/api/collections/" + id);
        let data = await response.json();

        window.currentCollection = data.collection;

        return new MmCollection(data.collection);
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
            console.log(desc.intHasPart)
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

        // let buttonGroup = document.createElement("div")
        // buttonGroup.classList.add("button-group");

        let downloadMatchButton = document.getElementById("match-collections-button")

        async function downloadMatches() {
            let currentCollection = window.currentCollection;

            let leafDescriptors = [];
            console.log(currentCollection);
            
            for (let i = 0; i < currentCollection.length; i++) {
                if (currentCollection[i].intHasPart.length === 0) {
                    let paletKey = currentCollection[i].key
                    if (paletKey != "") {
                        paletKey = paletKey.split('/')
                        paletKey = paletKey[paletKey.length - 1];
                        currentCollection[i]['requestURL'] = `/descriptors?searchKey=${paletKey}&eleType=any&${jsonToQueryString(localStorage.getItem("matchWeightsObj"))}`
                        leafDescriptors.push(currentCollection[i]);
                    }                    
                }
            }

            console.log(leafDescriptors);
            let allDescriptors = {}

            for (let leaf of leafDescriptors) {
                let response = await session.fetch(leaf.requestURL)
                response = await response.json();
                allDescriptors[leaf.id] = response;
            }

            let descriptorKeys = Object.keys(allDescriptors);

            for (let key of descriptorKeys) {
                let matches = allDescriptors[key].descriptors; 
                for (let i = 0; i < matches.length; i++) {
                    matches[i]['matchedTo'] = key;
                }
                allDescriptors[key].descriptors = matches;
            }
        
            let jsonform = false;
            
            let query = new URLSearchParams(window.location.search);
            let id = query.get("id");
            if (jsonform) {
                const dataUrl = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allDescriptors));
                const element = document.createElement('a');
                element.setAttribute('href', dataUrl);
                element.setAttribute('download', `collection-matches-${id}` + '.json');
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
            }
            else {
                let finalCSV = "";
                for (let key of descriptorKeys) {
                    let matches = allDescriptors[key].descriptors; 
                    if (finalCSV == "") {
                        finalCSV += convertJsonToCsv(matches);
                    } else {
                        finalCSV += convertJsonToCsvNoHeader(matches);
                    }
                }

                const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(finalCSV);
                const element = document.createElement('a');
                element.setAttribute('href', dataUrl);
                element.setAttribute('download', `collection-matches-${id}` + '.csv');
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
            }
        }

        downloadMatchButton.onclick = downloadMatches

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


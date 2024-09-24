import bdoc from './bdoc.js';
import config from '/config.js';
import bsession from './bsession.js';
import { convertJsonToCsv, convertJsonToCsvNoHeader } from './downloadhelper.js';

const session = new bsession(config.backEndUrl, config.sessionTag);

window.closelevel = 0;
window.currentCollection = {};

function createParentMap(data) {
    const parentMap = {};

    // Populate the parent map
    data.forEach(node => {
        if (node.isPartOfId) {
            // Find the parent node by matching the isPartOfId with the parent's id
            const parent = data.find(parentNode => parentNode.id === node.isPartOfId);
            if (parent) {
                parentMap[node.intId] = parent.intId;
            }
        } else {
            // Root node (no parent)
            parentMap[node.intId] = null;
        }
    });

    return parentMap;
}

function createAdjacencyList(data) {
    const adjacencyList = {};

    // Initialize the adjacency list with empty arrays for each node
    data.forEach(node => {
        adjacencyList[node.intId] = [];
    });

    // Populate the adjacency list
    data.forEach(node => {
        if (node.isPartOfId) {
            // Find the parent node by matching the isPartOfId with its intId
            const parent = data.find(parentNode => parentNode.id === node.isPartOfId);
            if (parent) {
                adjacencyList[parent.intId].push(node.intId);
            }
        }
    });

    return adjacencyList;
}

// Function to handle checkbox click event
function checkBoxOnClick(currentNodeId) {
    if (MmCollection.checkStatus.get(Number(currentNodeId))) {
        // If the current node is checked, uncheck it and all its children
        uncheckAllChildren(currentNodeId, MmCollection.adjacencyList);
        uncheckAllParents(currentNodeId);
    } else {
        // If the current node is unchecked, check it and all its children
        checkAllChildren(currentNodeId, MmCollection.adjacencyList);
    }
    // Visually update the nodes (implementation depends on your UI framework)
    updateVisualStatus();
}

// Function to check all children of a given node
function checkAllChildren(nodeId, adjacencyList) {
    // console.log(adjacencyList);
    // console.log(nodeId);
    
    // Set the status of the current node to true (checked)
    MmCollection.checkStatus.set(Number(nodeId), true);

    // Get the list of children from the adjacency list
    const children = adjacencyList[Number(nodeId)];
    // console.log("children", children);

    // Recursively check all children
    children.forEach(childId => {
        checkAllChildren(childId, adjacencyList);
    });
}


// Function to uncheck all children of a given node
function uncheckAllChildren(nodeId, adjacencyList) {
    // Set the status of the current node to false (unchecked)
    MmCollection.checkStatus.set(Number(nodeId), false);

    // Get the list of children from the adjacency list
    const children = adjacencyList[Number(nodeId)];

    // Recursively uncheck all children
    children.forEach(childId => {
        uncheckAllChildren(childId, adjacencyList);
    });
}

function checkParents(depthParentSiblingMap, checkStatus) {

    let depths = Object.keys(depthParentSiblingMap).map(item => Number(item));
    let deepestDepth = Math.max(...depths);
    for (let i = deepestDepth; i > 0; i--) {
        let currentDepth = depthParentSiblingMap[i]
        let currentDepthKeys = Object.keys(currentDepth);
        let currentDepthValues = Object.values(currentDepth);
    
        for (let j = 0; j < currentDepthValues.length; j++) {
            let arrOfChildren = currentDepthValues[j];
    
            let counter = 0;
            for (let child of arrOfChildren) {
                let currentNode = checkStatus.get(child);
                if (currentNode !== null && currentNode !== undefined) {
                    if (currentNode == true) {
                        counter +=1 
                    }
                }
            }
            if (counter == arrOfChildren.length){ 
                checkStatus.set(Number(currentDepthKeys[j]), true);
            }
        }
    }    
    return checkStatus;
}

// Function to uncheck all parent nodes up the tree
function uncheckAllParents(currentNodeId) {
    let parentNode =  MmCollection.parentMap[currentNodeId];
    while (parentNode) {
        MmCollection.checkStatus.set(parentNode, false);
        parentNode =  MmCollection.parentMap[parentNode];
    }
    // Visually update the parent nodes (implementation depends on your UI framework)
    updateVisualStatus();
}

// Function to visually update the status of all checkboxes
function updateVisualStatus() {
    // Grab all checkboxes on the screen
    const checkboxes = document.querySelectorAll('.custom-checkbox');

    MmCollection.checkStatus = checkParents(MmCollection.depthParentSiblingMap, MmCollection.checkStatus);

    // Iterate over each checkbox
    checkboxes.forEach(checkbox => {
        const inputElement = checkbox
        const nodeId = Number(inputElement.id); // The ID of the input element corresponds to the node ID

        // Update the checkbox's visual state based on MmCollection.checkStatus
        console.log(MmCollection.checkStatus.get(Number(nodeId))); // Should output true or false
        inputElement.previousElementSibling.checked = MmCollection.checkStatus.get(Number(nodeId)) || false;
        // inputElement.dispatchEvent(new Event('change'));
    });

    console.log(MmCollection.checkStatus);
}

function createDepthParentSiblingMapFromParentMap(parentMap) {
    const childMap = {};

    // Convert the parentMap to a childMap
    for (const [child, parent] of Object.entries(parentMap)) {
        if (parent !== null) {
            if (!childMap[parent]) {
                childMap[parent] = [];
            }
            childMap[parent].push(parseInt(child));
        }
    }

    const depthParentSiblingMap = {};
    const queue = [{ node: 0, depth: 0 }]; // Start with the root node at depth 0

    while (queue.length > 0) {
        const { node, depth } = queue.shift(); // Dequeue the next node

        // Check if the current node has children
        if (childMap[node]) {
            // Initialize the depth level in the map if it doesn't exist
            if (!depthParentSiblingMap[depth + 1]) {
                depthParentSiblingMap[depth + 1] = {};
            }
            
            // Add the parent node with its children (siblings) at the current depth
            depthParentSiblingMap[depth + 1][node] = childMap[node];

            // Enqueue the children with incremented depth
            childMap[node].forEach(child => {
                queue.push({ node: child, depth: depth + 1 });
            });
        }
    }

    return depthParentSiblingMap;
}

function getAncestors(leafNodes, parentMap) {
    const ancestors = new Set(); // Using a Set to avoid duplicates

    // Helper function to recursively find all ancestors
    function findAncestors(node) {
        if (parentMap[node] !== undefined) { // If there's a parent for the node
            const parent = parentMap[node];
            if (parent !== null && !ancestors.has(parent)) { // Avoid adding null and duplicates
                ancestors.add(parent); // Add the parent to the list of ancestors
                findAncestors(parent); // Recursively find the parent's ancestors
            }
        }
    }

    // For each leaf node, find all its ancestors
    leafNodes.forEach(leafNode => {
        ancestors.add(leafNode); // Include the leaf itself in the set
        findAncestors(leafNode); // Find its ancestors
    });

    return Array.from(ancestors); // Convert the Set to an array before returning
}

function previewCustomSet() { 
    let customSet = {}; 
    let checkedDescriptors = []; // Array to store the descriptors corresponding to checked items

    MmCollection.checkStatus.forEach((isChecked, nodeId) => {
        if (isChecked) {
            // Assuming nodeId is 1-based, so we need to subtract 1 to match the array's zero-index
            let descriptor = MmCollection.thisCollection.descriptors[nodeId];
            checkedDescriptors.push(descriptor);
        }
    });

    let checkedLeafDescriptors  = checkedDescriptors.filter(descriptor => descriptor.intHasPart.length === 0);

    customSet['leafNodes'] = [];
    for (let leaf of checkedLeafDescriptors) {
        customSet['leafNodes'].push(leaf.intId)
    }
    customSet['associatedCollectionId'] = MmCollection.thisCollection.descriptors[0].id;

    let allAncestors = getAncestors(customSet['leafNodes'], MmCollection.parentMap);

    let finalDescriptorsArr = [...new Set([...allAncestors, ...customSet['leafNodes']])];

    // console.log(finalDescriptorsArr.sort());
    let descriptorObj = {};

    for (let intId of finalDescriptorsArr) {
        let currentDescriptor = MmCollection.thisCollection.descriptors[intId];
        currentDescriptor['parent'] = MmCollection.parentMap[intId];
        currentDescriptor['checked'] = MmCollection.checkStatus.get(intId);

        descriptorObj[intId] = currentDescriptor;
    }
    customSet['descriptors'] = descriptorObj;
    console.log(customSet);

    localStorage.setItem("currentCustomSet", JSON.stringify(customSet));
    window.location.href = `./PreviewCustomSet`

}

export default class MmCollection {

    static adjacencyList;
    static parentMap; 
    static checkStatus = new Map();

    static thisCollection;

    static async LoadFromId(id) {
        let response = await session.fetch("/api/collections/" + id);
        let data = await response.json();

        window.currentCollection = data.collection;

        MmCollection.adjacencyList = createAdjacencyList(data.collection);
        MmCollection.parentMap = createParentMap(data.collection);
        MmCollection.depthParentSiblingMap = createDepthParentSiblingMapFromParentMap(MmCollection.parentMap);

        data.collection.forEach(num => {
            MmCollection.checkStatus.set(num['intId'], false);
        });

        console.log("data.collection", data.collection);
        return new MmCollection(data.collection);
    }

    static async LoadFromSessionStorage(id) {
        window.currentCollection = sessionStorage.get("currentCustomSet");

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

        // document.querySelectorAll('.custom-checkbox').forEach(checkbox => {
        //     if (!checkbox._hasClickListener) {
        //         checkbox.addEventListener('click', function() {
        //             var input = this.previousElementSibling;
        //             input.checked = !input.checked;
        //             checkBoxOnClick(input); // Call the hierarchical check/uncheck logic
        //             input.dispatchEvent(new Event('change')); // Trigger any event listeners
        //         });
        //         checkbox._hasClickListener = true; // Mark that the listener has been added
        //     }
        // });      
        
        document.querySelectorAll('.custom-checkbox').forEach(checkbox => {
            if (!checkbox._hasClickListener) {
                checkbox.addEventListener('click', function() {
                    const inputElement = this //.previousElementSibling;
                    inputElement.checked = !inputElement.checked;
                    checkBoxOnClick(inputElement.id); // Pass the nodeId to the checkBoxOnClick function
                    inputElement.dispatchEvent(new Event('change')); // Trigger any event listeners
                });
                checkbox._hasClickListener = true; // Mark that the listener has been added
            }
        });
        
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
        
        let expandElement = document.createElement("span");
        expandElement.innerText = "Expand";
        expandElement.classList.add("button-div");
        
        document.getElementById('match-collections-button').onclick = previewCustomSet;

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

        let currentCustomSet = JSON.parse(localStorage.getItem("currentCustomSet"));

        console.log(currentCustomSet);

        if (currentCustomSet && currentCustomSet.associatedCollectionId == MmCollection.thisCollection.descriptors[0].id) {
            for (let descriptor of Object.values(currentCustomSet.descriptors)) {
                MmCollection.checkStatus.set(Number(descriptor.intId), descriptor.checked)
            }
        }
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

        document.querySelectorAll('.custom-checkbox').forEach(checkbox => {
            if (!checkbox._hasClickListener) {
                checkbox.addEventListener('click', function() {
                    const inputElement = this.previousElementSibling;
                    inputElement.checked = !inputElement.checked;
                    checkBoxOnClick(inputElement.id); // Pass the nodeId to the checkBoxOnClick function
                    inputElement.dispatchEvent(new Event('change')); // Trigger any event listeners
                });
                checkbox._hasClickListener = true; // Mark that the listener has been added
            }
        });

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




import config from '/config.js';
import bsession from './bsession.js';
import bdoc from './bdoc.js';

const session = new bsession(config.backEndUrl, config.sessionTag);

// Get references to the select element and filter container

const addKeyword = document.getElementById('addKeyword');
const keywordElement = document.getElementById('keywordElement');
const keywordContainer = document.getElementById('keywordContainer');
const tableBody = document.getElementById("table-body");

let filterDropdowns = document.getElementById('filterDropdowns');
let filterContainers = document.getElementById('filterContainers');
let sortDropdown = document.getElementById("sortDropdown");

let selectedOptions = {};
let searchKeywords = [];
let collectionHTML = {};
let allCollections = {};

function sortByIndex(array, index) {
    return array.sort((a, b) => {
        const itemA = a[index];
        const itemB = b[index];

        if (itemA < itemB) {
            return -1;
        }
        if (itemA > itemB) {
            return 1;
        }
        return 0;
    });
}

window.selectOption = function(filter) {
    console.log("here", window.data);
    // console.log(filter);
    let filterContainer = document.getElementById(`${filter}-container`);
    let filterDropdown = document.getElementById(`${filter}-dropdown`);
    let selectedOption = filterDropdown.options[filterDropdown.selectedIndex];

    console.log("selectedOption", selectedOption);
    selectedOption = selectedOption.value
    console.log("selectedOption", selectedOption);

    if (selectedOption) {
      // Check if the selected option is not already in the list
      if (selectedOptions[filter][selectedOption] == false && selectedOption.value !== "--") {

        // Change to be true
        selectedOptions[filter][selectedOption] = true;
  
        // Create a filter element and add it to the container
        const filterElement = document.createElement('div');
        filterElement.classList.add('filter'); // You can style this class with CSS
        filterElement.textContent = selectedOption;
  
        // Add a close button to remove the filter
        const closeButton = document.createElement('span');
        closeButton.classList.add('close');
        closeButton.innerHTML = '&times;'; // Display a "x" for closing
        closeButton.addEventListener('click', function () {
          // Remove the filter element from the container
          filterContainer.removeChild(filterElement);
          
          // Remove the option from the selectedOptions array
          selectedOptions[filter][String(selectedOption)] = false;
          reload();
        });
  
        filterElement.appendChild(closeButton);
        filterContainer.appendChild(filterElement);
      }
    }
    reload()
}

function sortByIdAttribute(attribute) {
    let titles = document.getElementById("table-titles");
    let title_th = titles.getElementsByTagName("th");
    
    let column = 0
    console.log(attribute);
    for (let i = 0; i < title_th.length; i++){
        console.log(title_th[i].textContent);
        if (title_th[i].textContent == attribute) {
            column = i;
            break;
        }
    }
    console.log(column);

    let rows = tableBody.getElementsByTagName("tr");
    let allRows = []
    for (let row of rows) {
        console.log(row.id);
        let cells = row.getElementsByTagName("td");
        let currentRow = []
        for (let cell of cells) {
            currentRow.push(cell.textContent.trim());
        }
        let collectionId = cells[0].lastChild.getAttribute('href').split("=")[1];
        currentRow.push(collectionId);

        allRows.push(currentRow);
    }
    let sortedRows = sortByIndex(allRows, column);
    console.log(sortedRows);

    tableBody.innerHTML = "";
    for (let row of sortedRows) {
        tableBody.innerHTML += collectionHTML[row[row.length - 1]]
    }

}

// ex. listOfFilters = ['subject', 'publisher']
async function initialLoad(listToFilter, listToSort, displayProperties) {

    let response = await session.fetch("/api/collections");
    let data = await response.json();
    window.data = data;
    let table = document.getElementById("table-titles")

    addKeyword.addEventListener('click', function() {
        let newKeyword = keywordElement.value;
        keywordElement.value = "";
   
        // Create a filter element and add it to the container
        const searchElement = document.createElement('div');
        searchElement.classList.add('filter'); 
        searchElement.textContent = newKeyword;
   
        // Add element to keywords list 
        searchKeywords.push(newKeyword);
   
        // Create delete button
        const closeButton = document.createElement('span');
        closeButton.classList.add('close');
        closeButton.innerHTML = '&times;'; // Display a "x" for closing
        closeButton.addEventListener('click', function () {
           // Remove the filter element from the container
           keywordContainer.removeChild(searchElement);
   
           // Remove the option from the keywords array
           searchKeywords = searchKeywords.filter(item => item !== newKeyword);
   
           reload();
        });
        searchElement.appendChild(closeButton);
        keywordContainer.appendChild(searchElement);
        reload();
   })

   sortDropdown.addEventListener('change', function() {
        const selectedOption = sortDropdown.options[sortDropdown.selectedIndex];
        if (selectedOption.value !== "--") {
            console.log(`'${selectedOption.value}'`)
            sortByIdAttribute(selectedOption.value);
        }
        else {
            reload();
        }
    })


    for (let property of displayProperties) {
        property = property.charAt(0).toUpperCase() + property.slice(1);
        table.innerHTML += (`<th>${property}</th>`)
    }


    for (let filter of listToFilter) {
        const oneFilterDropdown = document.createElement('select');

        // Set attributes for the select element
        oneFilterDropdown.setAttribute("id", `${filter}-dropdown`);
        oneFilterDropdown.setAttribute("style", "width: 100px;");

        // Create and append the default option
        let defaultOption = document.createElement("option");
        defaultOption.setAttribute("value", "--");
        defaultOption.textContent = "--";
        oneFilterDropdown.appendChild(defaultOption);

        // Append filtering dropdown
        let filterUppercase = filter.charAt(0).toUpperCase() + filter.slice(1);
        filterDropdowns.innerHTML += " " + filterUppercase + " ";
        filterDropdowns.appendChild(oneFilterDropdown);

        // Append container for filter container
        let spanElement = document.createElement("span");
        spanElement.setAttribute("id", `${filter}-container`);
        filterContainers.appendChild(spanElement);
        
        // Create object to keep track of what is selected in selectedOptions
        selectedOptions[filter] = []
    }

    for (let sortItem of listToSort) {
        let sortItemUppercase = sortItem.charAt(0).toUpperCase() + sortItem.slice(1);

        // Create option element
        let optionElement = document.createElement("option");
        optionElement.setAttribute("value", sortItemUppercase);
        optionElement.textContent = sortItemUppercase;

        // Append to sort dropdown menu
        sortDropdown.appendChild(optionElement);
    }

    // Render table data with properties
    for (const collection of data.collections) {
        let elementId = "";
        let elementData = "";
        // Grab values for filter
        for (let filter of listToFilter) {
            let currentValue = collection[filter];
            
            if (currentValue === null || currentValue === "" || currentValue === undefined) {
                currentValue = 'Null';
            }
            if (!Object.keys(selectedOptions[filter]).includes(currentValue)) {
                selectedOptions[filter][currentValue] = false;
                // Inner option
                document.getElementById(`${filter}-dropdown`).innerHTML += `<option value="${currentValue}">${currentValue}</option>`
            }

            elementId += `${filter}=${currentValue},`;
        }
        
        // Grab data for table
        for (let property of displayProperties) {
            let currentValue = collection[property]
            if (currentValue === null || currentValue === "" || currentValue === undefined) {
                currentValue = 'Null';
            }
            elementData += `<td>${currentValue}</td>`;
        }
        console.log(elementId);
        elementId = elementId.slice(0, -1);
        console.log(elementId);
        // Generate HTML
        let htmlCode = `<tr id=${elementId}>
        <td><a href="Browse?id=${collection.id}">
        ${collection.name}</a></td>${elementData}</tr>`

        // Append and store for later
        tableBody.innerHTML += htmlCode;
        collectionHTML[collection.id] = htmlCode;
        allCollections[collection.id] = collection;
    }
    

    const selectNodes = Array.from(filterDropdowns.childNodes).filter(node => node.tagName === 'SELECT');
    for (let node of selectNodes) {
        let filter = node.id.split("-")[0];
        node = document.getElementById(node.id);
        node.setAttribute("onchange", `selectOption("${node.id.split("-")[0]
    }")`);
    }

    console.log(selectedOptions);
}


async function reload() {
    let data = window.data;
    console.log(data);

    tableBody.innerHTML = "";

    let collectionsContainsKeyword = [];
    console.log("selectedOptions", selectedOptions);

    if (searchKeywords.length > 0) {
        for (const collection of data.collections) {
            let stringifiedCollection = JSON.stringify(collection.name);
            let keywordCount = 0;
            // If the collection contains all keywords, then add it
            for (let keyword of searchKeywords) {
                if(stringifiedCollection.toLowerCase().includes(keyword.toLowerCase())){
                    keywordCount += 1;
                }
            }
            if (keywordCount == searchKeywords.length) {
                collectionsContainsKeyword.push(collection);
            }
        }
    } else {
        collectionsContainsKeyword = data.collections
    }

    let filterNeeded = false;
    let filters = Object.keys(selectedOptions) 

    for (let filter of filters) {
        let set = new Set(Array.from(Object.values(selectedOptions[filter])));
        if (set.size > 1) {
            filterNeeded = true;
        }
    }

    let finalIds = [];
    if (filterNeeded) {
        // filters = [subject, publisher, etc.]
        let collectionsForEachFilter = {}
        for (let filter of filters) {
            collectionsForEachFilter[filter] = [] 
        }
        for (const collection of collectionsContainsKeyword) {
            // filter will be a filtering option, such as "subject"
            for (let filter of filters) {
                // options = [Math, Science, etc.] for "subject" filter
                let options = Object.keys(selectedOptions[filter]);

                // If there is at least oneTrue for all of the options for this filter
                let oneTrue = false;
                for (let option of options) {
                    if (selectedOptions[filter][option] == true) {
                        oneTrue = true;
                    }
                }
                if (oneTrue) {
                    // option will be an option of filter, such as "Math"
                    for (let option of options) {
                        // If user selected that option to filter on
                        if (selectedOptions[filter][option]) {
                            // Make sure that this collection matches the selected option
                            if (option === collection[filter]) {
                                collectionsForEachFilter[filter].push(collection.id);
                            }
                            else if (option == "Null" && collection[filter] == undefined) {
                                collectionsForEachFilter[filter].push(collection.id);
                            }
                        }
                    }
                }
                else {
                    collectionsForEachFilter[filter].push(collection.id);
                }
            }
        }
        console.log(collectionsForEachFilter);
        finalIds = collectionsForEachFilter[filters[0]]
        for (let filter of filters.slice(1)) {
            finalIds = finalIds.filter(subject => collectionsForEachFilter[filter].includes(String(subject)));
        }

    } else {
        for (let collection of collectionsContainsKeyword) {
            finalIds.push(collection['id'])
        }
    }

    let newFilters = {}
    for (const collectionId of finalIds) {
        tableBody.innerHTML += collectionHTML[collectionId];
        for (let filter of filters) {
            if(newFilters[filter] !== undefined) {
                newFilters[filter].push(allCollections[collectionId][filter]);
            } else {
                newFilters[filter] = [allCollections[collectionId][filter]];
            }
        }
    }

    for (let filter of filters) {
        newFilters[filter] = Array.from(new Set(newFilters[filter]));
        document.getElementById(`${filter}-dropdown`).innerHTML = `<option value="--">--</option>`
    }
    console.log("newFilters", newFilters);
    for (let filter of filters) {
        for (let currentValue of newFilters[filter]) {
            if (currentValue === null || currentValue === "" || currentValue === undefined) {
                currentValue = 'Null';
            }
            document.getElementById(`${filter}-dropdown`).innerHTML += `<option value="${currentValue}">${currentValue}</option>`
        }
    }

    const selectedOption = sortDropdown.options[sortDropdown.selectedIndex];
    if (selectedOption.value !== "--") {
        console.log(`'${selectedOption.value}'`)
        sortByIdAttribute(selectedOption.value);
    }

}

let listToFilter = ['subject', 'publisher']
let listToSort = ['subject', 'publisher']
let displayProperties = ['subject', 'publisher']
initialLoad(listToFilter, listToSort, displayProperties);


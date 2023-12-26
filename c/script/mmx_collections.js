import config from './config.js';
import bsession from './bsession.js';
import bdoc from './bdoc.js';

const session = new bsession(config.backEndUrl, config.sessionTag);

// Get references to the select element and filter container
const filterDropdown1 = document.getElementById('filterDropdown1');
const filterContainer1 = document.getElementById('filterContainer1');
const filterDropdown2 = document.getElementById('filterDropdown2');
const filterContainer2 = document.getElementById('filterContainer2');
const sortDropdown = document.getElementById('sortDropdown');
const selectedOptions1 = [];
const selectedOptions2 = [];
let about = []
let creator = []



async function loadFiltersAndAllCollections() {
    let response = await session.fetch("/api/collections");
    let data = await response.json();

    const list = document.getElementById("mmx_collections");
    for (const collection of data.collections) {
        // console.log(JSON.stringify(collection));
        if (!about.includes(collection['about'])) {
            about.push(collection['about']);
            document.getElementById('filterDropdown1').innerHTML += `<option value="${collection['about']}">${collection['about']}</option>`
        }
        if (!creator.includes(collection['creator'])) {
            creator.push(collection['creator']);
            if (collection['creator'] !== null) {
                document.getElementById('filterDropdown2').innerHTML += `<option value="${collection['creator']}">${collection['creator']}</option>`
            }
        }
    }

    if (creator.includes(null)) {
        document.getElementById('filterDropdown2').innerHTML += `<option value="null">N/A</option>`
    }

    for (const collection of data.collections) {
        if (collection['creator'] === null) {
            list.append(bdoc.ele("li",
                bdoc.attr("id", `about=${collection['about']} creator=null`),
                bdoc.ele("a", bdoc.attr("href", "Browse2?id=" + collection.id),
                collection.name)));
        }
        else {
            list.append(bdoc.ele("li",
                bdoc.attr("id", `about=${collection['about']} creator=${collection['creator']}`),
                bdoc.ele("a", bdoc.attr("href", "Browse2?id=" + collection.id),
                collection.name)));
        }
    }
}

async function loadCollections() {
    let response = await session.fetch("/api/collections");
    let data = await response.json();

    const list = document.getElementById("mmx_collections");
    list.innerHTML = "";
    console.log(selectedOptions1, selectedOptions2);
    
    for (const collection of data.collections) {
        if (selectedOptions1.length === 0 && selectedOptions2.length === 0) {
            list.append(bdoc.ele("li",
                bdoc.attr("id", `about=${collection['about']} creator=${collection['creator']}`),
                bdoc.ele("a", bdoc.attr("href", "Browse2?id=" + collection.id),
                collection.name)));

        }
        else if(selectedOptions1.length === 0 && selectedOptions2.length !== 0) {
            for (const creator of selectedOptions2) { 
                if (collection['creator'] !== null && collection['creator'] === creator) {
                list.append(bdoc.ele("li",
                bdoc.attr("id", `about=${collection['about']} creator=${creator}`),
                bdoc.ele("a", bdoc.attr("href", "Browse2?id=" + collection.id),
                collection.name)));
                }
                if (collection['creator'] === null && creator === 'null') {
                    list.append(bdoc.ele("li",
                    bdoc.attr("id", `about=${collection['about']} creator=null`),
                    bdoc.ele("a", bdoc.attr("href", "Browse2?id=" + collection.id),
                    collection.name)));
                }
            }
        }
        else if(selectedOptions1.length !== 0 && selectedOptions2.length === 0) {
            for (const about of selectedOptions1) {
                if (collection['about'] === about){
                    list.append(bdoc.ele("li",
                    bdoc.attr("id", `about=${about} creator=${collection['creator']}`),
                    bdoc.ele("a", bdoc.attr("href", "Browse2?id=" + collection.id),
                    collection.name)));
                }
            }
        }
        else {
            for (const about of selectedOptions1) {
                for (const creator of selectedOptions2) {
                    if (collection['about'] === about && collection['creator'] !== null && collection['creator'] === creator) {
                        list.append(bdoc.ele("li", 
                            bdoc.attr("id", `about=${about} creator=${creator}`),
                            bdoc.ele("a", bdoc.attr("href", "Browse2?id=" + collection.id),
                        collection.name)));
                    }
                    if (collection['about'] === about && collection['creator'] === null && creator === 'null') {
                        list.append(
                            bdoc.ele("li",
                            bdoc.attr("id", `about=${about} creator=null`),
                            bdoc.ele("a", 
                                bdoc.attr("href", "Browse2?id=" + collection.id),
                                collection.name)));
                    }
                }
            }
        }
    }
}

function selectOption(selectedOptions, filterDropdown, filterContainer) {
    const selectedOption = filterDropdown.options[filterDropdown.selectedIndex];
  
    if (selectedOption.value) {
      // Check if the selected option is not in the list
      if (!selectedOptions.includes(selectedOption.value) && selectedOption.value !== "--") {
        selectedOptions.push(selectedOption.value);
  
        // Create a filter element and add it to the container
        const filterElement = document.createElement('div');
        filterElement.classList.add('filter'); // You can style this class with CSS
        filterElement.textContent = selectedOption.text;
  
        // Add a close button to remove the filter
        const closeButton = document.createElement('span');
        closeButton.classList.add('close');
        closeButton.innerHTML = '&times;'; // Display a "x" for closing
        closeButton.addEventListener('click', function () {
          // Remove the filter element from the container
          filterContainer.removeChild(filterElement);
          
          // Remove the option from the selectedOptions array
          const index = selectedOptions.indexOf(selectedOption.value);
          if (index !== -1) {
            selectedOptions.splice(index, 1);
          }
          loadCollections();
        });
  
        filterElement.appendChild(closeButton);
        filterContainer.appendChild(filterElement);
      }
    }
  }

  function sortByIdAttribute(attribute) {
    var listItems = document.querySelectorAll('#mmx_collections li');
    
    // Normalize the attribute to be lowercase for comparison
    attribute = attribute.toLowerCase();
  
    var sortedItems = Array.from(listItems).sort(function(a, b) {
        // Split the id by space and then by '=' to get key-value pairs
        var keyValuePairsA = a.id.split(' ').map(part => part.split('='));
        var keyValuePairsB = b.id.split(' ').map(part => part.split('='));
    
        // Find the pair with the key matching the attribute and get the value or 'null' if not present
        var valueA = (keyValuePairsA.find(pair => pair[0].toLowerCase() === attribute) || ['','null'])[1].toLowerCase();
        var valueB = (keyValuePairsB.find(pair => pair[0].toLowerCase() === attribute) || ['','null'])[1].toLowerCase();
    
        // Compare values, ensuring 'null' values are sorted to the end
        if (valueA === 'null') return 1; // A is 'null', B is not, A should come after B
        if (valueB === 'null') return -1; // B is 'null', A is not, A should come before B
    
        return valueA.localeCompare(valueB); // Compare the two non-'null' values
      });
    
    // Re-insert the sorted items into the DOM
    var list = document.getElementById('mmx_collections');
    list.innerHTML = ''; // Clear existing items
    sortedItems.forEach(function(item) {
      list.appendChild(item); // Append sorted items
    });
  }
  

loadFiltersAndAllCollections()

// Listen for changes in the dropdown and pass references to the function (not calling it)
filterDropdown1.addEventListener('change', function () {
    selectOption(selectedOptions1, filterDropdown1, filterContainer1);
    loadCollections();
});

filterDropdown2.addEventListener('change', function () {
    selectOption(selectedOptions2, filterDropdown2, filterContainer2);
    loadCollections();
});

sortDropdown.addEventListener('change', function() {
    const selectedOption = sortDropdown.options[sortDropdown.selectedIndex];
    if (selectedOption.value !== "--") {
        console.log(`'${selectedOption.value}'`)
        sortByIdAttribute(selectedOption.value);
    }
    else {
        loadCollections();
    }
})
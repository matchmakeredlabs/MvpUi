import config from './config.js';
import bsession from './bsession.js';
import bdoc from './bdoc.js';

const session = new bsession(config.backEndUrl, config.sessionTag);

// Get references to the select element and filter container
const filterDropdown1 = document.getElementById('filterDropdown1');
const filterContainer = document.getElementById('filterContainer');
const filterDropdown2 = document.getElementById('filterDropdown2');
const selectedOptions = [];
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
            document.getElementById('filterDropdown1').innerHTML += `<option value="${collection['about'].toLowerCase()}">${collection['about']}</option>`
        }
        if (!creator.includes(collection['creator'])) {
            creator.push(collection['creator']);
            if (collection['creator'] !== null) {
                document.getElementById('filterDropdown2').innerHTML += `<option value="${collection['creator'].toLowerCase()}">${collection['creator']}</option>`
            }
        }
    }

    if (creator.includes(null)) {
        document.getElementById('filterDropdown2').innerHTML += `<option value="null">N/A</option>`
    }

    for (const collection of data.collections) {
        list.append(bdoc.ele("li",
            bdoc.ele("a", bdoc.attr("href", "Browse2?id=" + collection.id),
            collection.name)));
    }

}

async function loadCollections() {
    let response = await session.fetch("/api/collections");
    let data = await response.json();

    const list = document.getElementById("mmx_collections");
    list.innerHTML = "";
    console.log(selectedOptions)
    
    for (const collection of data.collections) {
        if (selectedOptions.length === 0) {
            list.append(bdoc.ele("li",
                bdoc.ele("a", bdoc.attr("href", "Browse2?id=" + collection.id),
                collection.name)));

        }
        else {
            for (const option of selectedOptions) {
                if (collection['about'].toLowerCase() === option) {
                    list.append(bdoc.ele("li",
                    bdoc.ele("a", bdoc.attr("href", "Browse2?id=" + collection.id),
                    collection.name)));
                }
                else if (collection['creator'].toLowerCase() === option) {
                    list.append(bdoc.ele("li",
                    bdoc.ele("a", bdoc.attr("href", "Browse2?id=" + collection.id),
                    collection.name)));
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

loadFiltersAndAllCollections()

// Listen for changes in the dropdown and pass references to the function (not calling it)
filterDropdown1.addEventListener('change', function () {
    selectOption(selectedOptions, filterDropdown1, filterContainer);
loadCollections();
});

filterDropdown2.addEventListener('change', function () {
    selectOption(selectedOptions, filterDropdown2, filterContainer);
loadCollections();
});

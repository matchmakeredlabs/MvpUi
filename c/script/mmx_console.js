import bdoc from "/c/script/bdoc.js";
import config from '/config.js';
import bsession from '/c/script/bsession.js';
const session = new bsession(config.backEndUrl, config.sessionTag);

let defaultMatchWeightsObj = {
    'alg-w-cc': '2',
    'alg-t-cc': '0',
    'alg-w-cp': '1',
    'alg-t-cp': '0',
    'alg-w-pc': '0.5',
    'alg-t-pc': '0',
    'alg-w-pp': '0.25',
    'alg-t-pp': '0',
    'alg-w-k': '1',
    'alg-t-k': '0',
    'alg-w-c': '1',
    'alg-t-c': '0',
    'alg-w-p': '1',
    'alg-t-p': '0',
    'alg-w-d': '0',
    'alg-t-d': '0'
    }

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

function removeOption(value) {
    let selectElement = document.getElementById('match-profiles');
    let options = selectElement.options;

    for (let i = 0; i < options.length; i++) {
      if (options[i].value === value) {
        selectElement.removeChild(options[i]);
        break;
      }
    }
}


function on_load() {
    let form = document.getElementById("algForm");
    if (form) {
        form.onsubmit = on_alg_submit;
    }
    let profiles = document.getElementById("match-profiles")

    if (localStorage.getItem("matchProfiles") === null) {
        localStorage.setItem("matchProfiles", JSON.stringify({"MM Default": defaultMatchWeightsObj}));
    } 
    let matchProfiles = JSON.parse(localStorage.getItem("matchProfiles"));
    let matchProfileNames = Object.keys(matchProfiles);
    let matchProfileSettings = Object.values(matchProfiles);

    matchProfileNames.forEach(name => {
        let currentOption  = document.createElement("option");
        currentOption.textContent = name;
        currentOption.value = name;
        profiles.appendChild(currentOption);
    })

    let matchWeightsObj = JSON.parse(localStorage.getItem("matchWeightsObj"))

    for (let i = 0; i < matchProfileSettings.length; i++) {
        console.log(matchWeightsObj, matchProfileSettings[i])
        if (JSON.stringify(matchProfileSettings[i]) == JSON.stringify(matchWeightsObj)) {
            console.log(matchProfileNames[i]);
            profiles.value = matchProfileNames[i];
        }
    }
    
    // Selecting all mm-range elements
    let mmRanges = document.querySelectorAll('mm-range');
    if (!matchWeightsObj) {
        // Make deep copy
        matchWeightsObj = defaultMatchWeightsObj;
    } else {
        matchWeightsObj = matchWeightsObj;
    }

    // Looping through each mm-range element
    mmRanges.forEach((mmRange) => {
        // Change the value of each mm-range element
        let name = mmRange.getAttribute('name')
        mmRange.updateValue(matchWeightsObj[name]); 
        console.log(mmRange);
    });

    let key = new URLSearchParams(window.location.search).get("matchKey");
    if (key) {
        document.getElementById("matchKey").textContent = key;
        document.getElementById("matches-from-header").textContent = "Matches from";
        updateMatches(form);
    } 
}

async function on_alg_submit(event) {
    event.preventDefault();
    updateMatches(event.currentTarget);
}

function extractQueryParams(url) {
    let params = new URLSearchParams(url.substring(url.indexOf('?')));
    let queryParams = {};
    for (let param of params.entries()) {
        if (param[0] !== 'searchKey' && param[0] !== 'eleType') {
            queryParams[param[0]] = param[1];
        }
    }
    queryParams = JSON.stringify(queryParams);
    return queryParams;
}

async function updateMatches(formEle) {
    // Get the algorithm weights
    let weights = new URLSearchParams(new FormData(formEle)).toString();

    let matchWeightsObj = extractQueryParams(weights);
    localStorage.setItem("matchWeightsObj", matchWeightsObj)

    // Get the key
    let key = document.getElementById("matchKey").textContent;

    if (!key) {
        window.history.back();
        return;
    }

    let eleType = "any";
    let url = `/descriptors?searchKey=${encodeURIComponent(key)}&eleType=${eleType}&${weights}`;
    console.log(url);

    const response = await session.fetch(url);
    const result = await response.json();

    // document.getElementById("matchKey").innerHTML = `${result.descriptors[0].name} - ${result.descriptors[0].provenance} - ${result.descriptors[0].description} <br> Palet Key: ${key}`
    let ele = document.getElementById("matchResult");

    for (;;) {
        let next = ele.nextElementSibling;
        if (!next) break;
        next.parentElement.removeChild(next);
    }
    ele = ele.parentElement;

    ele.appendChild(bdoc.ele("div", bdoc.class("con_matchHead"),
        bdoc.ele("span", bdoc.class("con_matchIndex"), "Index"),
        bdoc.ele("span", bdoc.class("con_matchKey"), "Name - Provenance - Description")));

    ele.appendChild(bdoc.ele("hr", bdoc.class("mm_listHr")));

    if (result.descriptors.length == 0) {
        ele.textContent = "No matches found.";
        return;
    }

    let matches = bdoc.ele("div", bdoc.class("con_matches"));
   
    for (let desc of result.descriptors) {
        // let abstr = desc.description.substring(0,150)
        // if (desc.description.length > 150) {
        //     abstr +="..."
        // }
        matches.appendChild(bdoc.ele("div", bdoc.class("con_match"),
            bdoc.ele("span", bdoc.class("con_matchIndex"), desc.matchIndex),
            bdoc.ele("span", bdoc.class("con_matchKey"), desc.name + " - " + desc.provenance),
            bdoc.ele("span", bdoc.class("con_matchIndex")),
            bdoc.ele("span", bdoc.class("con_matchKey"),desc.description),
            bdoc.ele("span", bdoc.class("con_matchIndex")),
            bdoc.ele("span", bdoc.class("con_matchKey"), "Palet Key: " + StripKeyPrefix(desc.key))));
    }

    ele.appendChild(matches);
}

function StripKeyPrefix(key) {
    let slash = key.lastIndexOf("/");
    return (slash >= 0) ? key.substring(slash + 1) : key;
}


function updateWeightsVisual(weightsObject) {
    let mmRanges = document.querySelectorAll('mm-range');
    mmRanges.forEach((mmRange) => {
        // Change the value of each mm-range element
        let name = mmRange.getAttribute('name')
        mmRange.updateValue(weightsObject[name]); 
    });
}

function minimizeDisplay() {
    let arrow = document.getElementById("shrinker")
    let algForm = document.getElementById("algForm");
    let buttonSpan = document.getElementById("buttonspan");
    if(arrow.classList.contains("fa-angle-up")){
        algForm.style = "display: none;";
        buttonSpan.style = "display: none; justify-content: center; align-items: center; padding: 0.5em;";
        arrow.outerHTML = `<i id ="shrinker" class="fa-solid fa-angle-down" style=" cursor: pointer;float:right;"></i>`;
    }
    else {
        algForm.style = "";
        buttonSpan.style = "display: flex; justify-content: center; align-items: center; padding: 0.5em;";
        arrow.outerHTML = `<i id ="shrinker" class="fa-solid fa-angle-up" style=" cursor: pointer;float:right;"></i>`;
    }
    document.getElementById("shrinker").onclick = minimizeDisplay;
}

function updateMatchProfile() {
    let profiles = document.getElementById("match-profiles")
    if (profiles.value === "MM Default") {
        alert("Can not update MM Default Match Profile")
    } 
    else if (profiles.value === "--") {
        alert("Can not update null match profile.")
    }
    else {
        let matchProfiles = JSON.parse(localStorage.getItem("matchProfiles"));
        let weightsObject = getCurrentWeightValues();
        matchProfiles[profiles.value] = weightsObject;
        console.log(matchProfiles);
        localStorage.setItem("matchProfiles", JSON.stringify(matchProfiles));

    }
}

function getCurrentWeightValues() {
    let nameOfWeights = Object.keys(defaultMatchWeightsObj);
    let weightsObject = {};

    nameOfWeights.forEach(name => {
        const elements = document.getElementsByName(name);
        weightsObject[name] = elements[0].value;
    });
    return weightsObject;
}

function addMatchProfile() {
    let weightsObject = getCurrentWeightValues();

    let matchProfiles = JSON.parse(localStorage.getItem("matchProfiles"));
    let profileName = prompt("Please provide a name for this match profile:");
    if (profileName !== null) {
        matchProfiles[profileName] = weightsObject;
        localStorage.setItem("matchProfiles", JSON.stringify(matchProfiles));
        alert(`${profileName} has been saved as a Match Profile!`);
    }

    let profiles = document.getElementById("match-profiles")

    let currentOption  = document.createElement("option");
    currentOption.textContent = profileName;
    currentOption.value = profileName;
    profiles.appendChild(currentOption);
    profiles.value = profileName;
}

function selectMatchProfile(event)  {
   let selected = event.target.value;
   if (selected != "--") {
        let matchProfiles = JSON.parse(localStorage.getItem("matchProfiles"));
        console.log(matchProfiles[selected]);
    
        let nameOfWeights = Object.keys(defaultMatchWeightsObj);
        updateWeightsVisual(matchProfiles[selected]);
    }
}

function viewProfile() {
    let matchWeightsObj = JSON.parse(localStorage.getItem("matchWeightsObj"))
    updateWeightsVisual(matchWeightsObj);
}

function deleteMatchProfile () {
    let profiles = document.getElementById("match-profiles")
    let valueToDelete = profiles.value;
    if (valueToDelete == "MM Default") {
        alert("Cannot delete MM Default Match Profile")
    } else {
    removeOption(valueToDelete);

    let matchProfiles = JSON.parse(localStorage.getItem("matchProfiles"));
    delete matchProfiles[valueToDelete];
    localStorage.setItem("matchProfiles", JSON.stringify(matchProfiles))
    
    profiles.value = "--";
    }
}

document.getElementById("match-profiles").onchange = selectMatchProfile;
document.getElementById("view-profile").onclick = viewProfile;
document.getElementById("delete-profile").onclick = deleteMatchProfile;
document.getElementById("add-profile").onclick = addMatchProfile;
document.getElementById("update-profile").onclick = updateMatchProfile;
document.getElementById("shrinker").onclick = minimizeDisplay;
window.addEventListener("load", on_load);
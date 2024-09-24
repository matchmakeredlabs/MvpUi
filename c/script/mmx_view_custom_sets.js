let customSets = JSON.parse(localStorage.getItem("customSets"));


const mainElement = document.querySelector('main');

for (let key in customSets) {
    let pTag = document.createElement("h2")
    pTag.textContent = key;
    mainElement.appendChild(pTag);

    let pTag2 = document.createElement("p")
    pTag2.textContent = JSON.stringify(customSets[key]);    
    mainElement.appendChild(pTag2);
}


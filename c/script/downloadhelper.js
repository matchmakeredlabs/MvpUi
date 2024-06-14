export function filterDescriptorsByElementFilter(descriptorArr) {
    if(localStorage.getItem("matchFilter") !== "null") {
        descriptorArr = descriptorArr.filter(descriptor => descriptor.eleType == localStorage.getItem("matchFilter"));
    }
    return descriptorArr;
}

export function addMatchedToProperty(descriptorArr, matchedToId) {
    for (let i = 0; i < descriptorArr.length; i++) {
        descriptorArr[i]['matchedTo'] = matchedToId;
    }
    console.log("descriptorArr", descriptorArr);
    return descriptorArr;
}

export function downloadJsonSingleMatch(matchedToId, content) {
    content.descriptors = filterDescriptorsByElementFilter(content.descriptors);
    content.descriptors = addMatchedToProperty(content.descriptors, matchedToId);

    const dataUrl = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(content));
    const element = document.createElement('a');
    element.setAttribute('href', dataUrl);
    element.setAttribute('download', `matches-${matchedToId}` + '.json');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

export function downloadJsonMultipleMatch(matchedToId, content) {
    content.descriptors = filterDescriptorsByElementFilter(content.descriptors);
    content.descriptors = addMatchedToProperty(content.descriptors, matchedToId);

    const dataUrl = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(content));
    const element = document.createElement('a');
    element.setAttribute('href', dataUrl);
    element.setAttribute('download', `matches-${matchedToId}` + '.json');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}


export function downloadCsvSingleMatch(matchedToId, content) {
    content.descriptors = filterDescriptorsByElementFilter(content.descriptors);
    content.descriptors = addMatchedToProperty(content.descriptors, matchedToId);

    content = convertJsonToCsv(content.descriptors)

    const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(content);
    const element = document.createElement('a');
    element.setAttribute('href', dataUrl);
    element.setAttribute('download', `matches-${matchedToId}` + '.csv');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

export function convertJsonToCsv(data) {
    // Define the headers for the CSV
    const headers = [
        'id',
        'eleType',
        'name',
        'url',
        'subject',
        'description',
        'identifier',
        'educationalLevel',
        'creator',
        'provenance',
        'key',
        'mainEntity',
        'mainEntityId',
        'isPartOf',
        'isPartOfId',
        'datePublished',
        'sdDatePublished',
        'sdPublisher',
        'matchIndex',
        'matchedTo'
    ];

    // Initialize the CSV string with headers
    let csv = headers.join(',') + '\n';

    // Iterate through each descriptor and add its data to the CSV
    data.forEach(descriptor => {
        const row = headers.map(header => {
            // Replace any double quotes in the field with two double quotes to escape them
            const field = descriptor[header] || '';
            return `"${field.toString().replace(/"/g, '""')}"`;
        }).join(',');
        csv += row + '\n';
    });

    return csv;
}

export function convertJsonToCsvNoHeader(data) {
    // Define the headers for the CSV
    const headers = [
        'id',
        'eleType',
        'name',
        'url',
        'subject',
        'description',
        'identifier',
        'educationalLevel',
        'creator',
        'provenance',
        'key',
        'mainEntity',
        'mainEntityId',
        'isPartOf',
        'isPartOfId',
        'datePublished',
        'sdDatePublished',
        'sdPublisher',
        'matchIndex',
        'matchedTo'
    ];

    // Initialize the CSV string with headers
    let csv = "";

    // Iterate through each descriptor and add its data to the CSV
    data.forEach(descriptor => {
        const row = headers.map(header => {
            // Replace any double quotes in the field with two double quotes to escape them
            const field = descriptor[header] || '';
            return `"${field.toString().replace(/"/g, '""')}"`;
        }).join(',');
        csv += row + '\n';
    });

    return csv;
}

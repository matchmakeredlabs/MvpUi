/* MatchMaker Prototype Web Controls
 * Eventually this will likely become a proper JavaScript module.
 * which is a better way to isolate things than using the
 * objects like I've done here.
 */

import bdoc from './bdoc.js';
import config from '/config.js';
import bsession from './bsession.js';
import { downloadJsonSingleMatch, downloadCsvSingleMatch } from './downloadhelper.js';
const session = new bsession(config.backEndUrl, config.sessionTag);

// Container for MMX Globals
let mmx_dict = {};
window.searchProperty = "Text"

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

function toggleOneElement(element) {
    let currentElement = document.getElementById(element)
    if (currentElement.style.display === 'none') {
        currentElement.style.display = 'block';
    } else {
        currentElement.style.display = 'none';
    }
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

function extractStmtIDs() {
    const stmtIdElements = document.querySelectorAll('.mm_stmtId');
    const stmtIds = Array.from(stmtIdElements).map(element => element.textContent);
    return stmtIds;
}

function extractAfterSecondId(entries) {
    let secondIdIndex = entries.indexOf('Id', entries.indexOf('Id') + 1);
    if (secondIdIndex === -1) {
      return [];
    }
    return entries.slice(secondIdIndex + 1);
}
  
function extractAddedIds() {
    return extractAfterSecondId(extractStmtIDs())
}

// Using the class like a namespace. All members are static.
class Mmx {

    static keyPrefix = "https://palet.codes/key/";

    static descProps = [
        { label: "Type", prop: "eleType", inner: "<select name='eleType'><option value='o'>Other</option><option value='lr'>Learning Resource</option><option value='cs'>Competency Statement</option><option value='c'>Curriculum</option></select>" },
        { label: "Name", prop: "name" },
        { label: "URL", prop: "url" },
        { label: "Subject", prop: "subject" },
        { label: "Description", prop: "description" },
        { label: "Identifier", prop: "identifier" },
        { label: "Ed. Level", prop: "educationalLevel" },
        { label: "Creator", prop: "creator" },
        { label: "Provenance", prop: "provenance" },
        { label: "Date Published", prop: "datePublished"},
        { label: "Repository Date", prop: "sdDatePublished"}
    ];

    static keyLabel = "Key";
    static keyLinkPrefix = "/c/Palet?key=";

    // === Support Functions =======

    static EleTypeTranslate = {
        "any": "Any",
        "lr": "Learning Resource",
        "cs": "Competency Statement",
        "c": "Curriculum",
        "o": "Other"
    };

    static LoadJsonAsync(url, callback, arg) {
        session.fetch(url)
            .then(response => response.json())
            .then(json => callback(json, arg))
    }

    static StripKeyPrefix(key) {
        let slash = key.lastIndexOf("/");
        return (slash >= 0) ? key.substring(slash + 1) : key;
    }

    static CopyProperties(dst, src) {
        for (let attr in template) {
            let prop = template[attr];
            if (typeof prop === 'object' && !!prop) {
                dst[attr] = {};
                Mmx.CopyProperties(dst[attr], prop);
            }
            else {
                dst[attr] = prop;
            }
        }
    }

    static AddTh(r, cls, text) {
        let th = document.createElement("th");
        th.className = cls;
        th.textContent = text;
        r.appendChild(th);
    }

    static AddEle(parent, tag, template) {
        let ele = document.createElement(tag);
        CopyProperties(ele, template);
        parent.appendChild(ele);
    }

    // === Generate Controls =====

    // Render an intermediary key
    static RenderKey(key, element) {
        Mmx.LoadJsonAsync("/key/" + Mmx.StripKeyPrefix(key), Mmx.RenderKey_Callback, element)
    }

    static RenderKeyFromElement(ele) {
        let key = ele.dataset.mmxKey;
        if (!key) {
            return;
        }
        else {
            if (key == "urlKey") {
                let query = new URLSearchParams(window.location.search);
                key = query.get("key");
            }
            Mmx.RenderKey(key, ele);
        }
    }

    static RenderKey_Callback(jskey, element)
    {
        element.innerHTML = "";

        console.log("whatever");

        element.appendChild(bdoc.ele("div",
            bdoc.class("mm_stmtHead"),
            bdoc.ele("span", bdoc.class("mm_stmtId"), "Id"),
            bdoc.ele("span", bdoc.class("mm_stmtCentralWide"), "Rel"),
            bdoc.ele("span", bdoc.class("mm_stmtType"), "Type"),
            bdoc.ele("span", bdoc.class("mm_stmtWideText"), "Statement")));

        element.appendChild(bdoc.ele("hr", bdoc.class("mm_listHr")));

        for (let val of jskey.statements) {
           element.appendChild(
                bdoc.ele("div", bdoc.class("mm_stmt"),
                    bdoc.ele("span", bdoc.class("mm_stmtId"), val.id),
                    bdoc.ele("span", bdoc.class("mm_stmtCentralWide"), val.rel),
                    bdoc.ele("span", bdoc.class("mm_stmtType"), val.stmtType),
                    bdoc.ele("span", bdoc.class("mm_stmtWideText"), val.statement)));
        }
    }

    static setActive(event) {
        window.searchProperty = event.target.textContent;
        
        let element = event.target
        // Remove 'active' class from all buttons
        var buttons = document.querySelectorAll('.toggle-button');
        buttons.forEach(function(button){
            button.classList.remove('active');
        });

        let mmid_search = document.getElementById("mmid_search");
        let searchOneLiner = document.getElementById("searchOneLiner")
        let tooltip = `<div class="info-button-wrapper"> <div class="info-button">i <span class="info-tooltip">Palet statements are returned from most similar (as defined by the AI algorithm) to least similar</span> </div> </div>`;
        if (event.target.textContent === "Text") {
            mmid_search.placeholder = "Add key words to search";
            let text = document.createElement("span")
            text.style = "margin-right: 0.5em;"
            text.textContent = "Returned statements match one or more of the search keywords"
            searchOneLiner.innerHTML = "";
            searchOneLiner.appendChild(text);
            searchOneLiner.innerHTML += tooltip;
        } else {
            let keywords = document.getElementById("mmid_search").value;
            mmid_search.placeholder = "Add another term to augment the search";

            let requestBody = "";
            if (window.searchProperty == "AI") {
                requestBody += JSON.stringify({matchText: window.description + keywords});
                let text = document.createElement("span")
                text.style = "margin-right: 0.5em;"
                text.textContent = "Returned statements based on the descriptor abstract"
                searchOneLiner.innerHTML = "";
                searchOneLiner.appendChild(text);
                searchOneLiner.innerHTML += tooltip;
            } 
            else if (window.searchProperty == "AI + Context") {
                requestBody += JSON.stringify({matchText: window.descriptorContext + keywords});
                let text = document.createElement("span")
                text.style = "margin-right: 0.5em;"
                text.textContent = "Returned statements based on the descriptor abstract and associated context"
                searchOneLiner.innerHTML = "";
                searchOneLiner.appendChild(text);
                searchOneLiner.innerHTML += tooltip;
            }
            console.log(requestBody);
            let url = "/api/match/palet"
            let options = {
            method: "POST",
                body: JSON.stringify({matchText: requestBody}),
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                }
            };
            session.fetch(url, options)
            .then(response => response.json())
            .then(json => {
                console.log(json);
                Mmx.SearchStatements_Callback(json)
            })

        }

        // Add 'active' class to the clicked button
        element.classList.add('active');
    }

    static RenderStatementSearch(element) {
        // Search replaces this element rather than going into it
        // This won't work when we make search into a webElement
        // but we'll cross that bridge later.
        
        let parent = element.parentElement;
        parent.removeChild(element);
        parent.appendChild(bdoc.ele("div", 
            bdoc.attr("style", "display: flex; margin-left: 9.5rem;"),
            bdoc.ele("span", 
            bdoc.attr("innerHTML", "┌──Bionic──┐"))
        ))

        parent.appendChild(bdoc.ele("div",
            // bdoc.class("control"),
            bdoc.attr("style", "display: flex; flex-wrap: wrap; margin-bottom: 0.5rem;"),
            bdoc.class("toggle-container"),
            bdoc.ele("div",
            bdoc.attr("style","display: flex;"),
            bdoc.ele("span", 
                bdoc.attr("innerHTML", "Search Type:&nbsp;&nbsp;")),
            bdoc.ele("div",
                bdoc.class("toggle-button active"),
                bdoc.attr("onclick", Mmx.setActive),
                bdoc.attr("innerHTML", "Text")),
            bdoc.ele("div",
                bdoc.class("toggle-button"),
                bdoc.attr("onclick", Mmx.setActive),
                bdoc.attr("innerHTML", "AI")),
            bdoc.ele("div",
                bdoc.class("toggle-button"),
                bdoc.attr("onclick", Mmx.setActive),
                bdoc.attr("innerHTML", "AI + Context"),
                bdoc.attr("style", "margin-right: 10px;"))),
            bdoc.ele("div",
            bdoc.ele("span", 
                bdoc.attr("innerHTML", "AI Algorithm:&nbsp;&nbsp;")),
            bdoc.ele("select",
                bdoc.attr("style", "width: 70px;"),
                bdoc.ele("option", 
                    bdoc.attr("value", "Cosine Similarity"),
                    bdoc.attr("innerHTML", "Cosine Similarity")
                )))
        ))

        let searchOneLiner = document.createElement("div");
        searchOneLiner.id = "searchOneLiner"
        searchOneLiner.textContent = "Returned statements match one or more of the search keywords"
        let tooltip = `<div class="info-button-wrapper"> <div class="info-button">i <span class="info-tooltip">Palet statements are returned from most similar (as defined by the AI algorithm) to least similar</span> </div> </div>`;
        let text = document.createElement("span")
        text.style = "margin-right: 0.5em;"
        text.textContent = "Returned statements match one or more of the search keywords"
        searchOneLiner.innerHTML = "";
        searchOneLiner.appendChild(text);
        searchOneLiner.innerHTML += tooltip;
        searchOneLiner.style = `font-style: italic; font-size: 10px; margin-bottom: 0.5em;"`
        parent.appendChild(searchOneLiner)

        // Search bar
        parent.appendChild(bdoc.ele("div",
            bdoc.class("mmx_stmtSearchBar"),
            bdoc.ele("input",
                bdoc.attr("type", "search"),
                bdoc.attr("id", "mmid_search"),
                bdoc.class("mmc_stmtSearch"),
                bdoc.attr("onsearch", Mmx.SearchStatements)),
            bdoc.ele("input",
                bdoc.attr("type", "button"),
                bdoc.class("mmc_stmtSearchButton"),
                bdoc.attr("value", "\uD83D\uDD0D"),
                bdoc.attr("onclick", Mmx.SearchStatements))));

        // The remainder gets

        // Results header
        parent.appendChild(bdoc.ele("div",
            bdoc.class("mm_stmtHead"),
            bdoc.ele("span", bdoc.class("mm_stmtAdd"), "+"),
            bdoc.ele("span", bdoc.class("mm_stmtId"), "Id"),
            bdoc.ele("span", bdoc.class("mm_stmtType"), "Type"),
            bdoc.ele("span", bdoc.class("mm_stmtText"), "Statement")));

        parent.appendChild(bdoc.ele("hr", bdoc.class("mm_listHr")));

        mmx_dict.stmtSearchResult = bdoc.ele("div", bdoc.class("mmc_stmtSearchResult"));
        parent.appendChild(mmx_dict.stmtSearchResult);
    }

    static RenderKeyComposeForm(element) {
        // Clear existing contents
        element.innerHTML = "";

        let keyTable = document.createElement("table");
        keyTable.className = "mmx_table_statement";
        //mmx_dict.keyTable = keyTable;

        // Add header row
        let row = document.createElement("tr");
        Mmx.AddTh(row, "mmx_col_ctrl", "");
        Mmx.AddTh(row, "mmx_col_central", "Central (Peripheral)");
        Mmx.AddTh(row, "mmx_col_id", "Id");
        Mmx.AddTh(row, "mmx_col_type", "Type");
        Mmx.AddTh(row, "mmx_col_stmt", "Statement");
        keyTable.appendChild(row);

        element.appendChild(keyTable);
    }

    static RenderDescriptorSearchForm(element) {
        // Clear existing contents
        element.innerHTML = "";

        let typeSelect = bdoc.ele("select",
            bdoc.attr("name", "eleType"));
        for (let key in Mmx.EleTypeTranslate) {
            typeSelect.appendChild(bdoc.ele("option",
                bdoc.attr("value", key),
                bdoc.attr("textContent", Mmx.EleTypeTranslate[key])));
        }

        typeSelect.onchange = function (event) {
            if (mmx_dict.searchKeywords != null && mmx_dict.searchKeywordsEleType != event.target.value) {
                Mmx.SearchDescriptorsByKeywords();
            }
        }

        let search = bdoc.ele("input",
            bdoc.attr("type", "search"),
            bdoc.class("mmc_descSearch"),
            bdoc.attr("onsearch", Mmx.SearchDescriptorsByKeywords));
        
        // Search bar
        element.appendChild(bdoc.ele("div", bdoc.class("mmx_descSearchBar"),
            search,
            bdoc.ele("input",
                bdoc.attr("type", "button"),
                bdoc.attr("value", "\uD83D\uDD0D"),
                bdoc.class("mmc_descSearchButton"),
                bdoc.attr("onclick", Mmx.SearchDescriptorsByKeywords)),
            bdoc.ele("br"),
            typeSelect));

        mmx_dict.descriptorKeywords = search;   
        mmx_dict.descriptorType = typeSelect;   
    }

    static RenderDescriptorSearchDisplay(element) {
        // Clear existing contents
        element.innerHTML = "";

        // Search results
        let descriptorResults = document.createElement("div");
        descriptorResults.style.width = "100%";
        descriptorResults.className = "mmx_keywordSearchResult";
        mmx_dict.keywordSearchResult = descriptorResults;
        element.appendChild(descriptorResults);
    }

    static RenderDescriptorMatchFilter(element) {
       // Clear existing contents
        element.innerHTML = "";

        // Create flexbox container
        let container = document.createElement("div");
        container.style.display = "flex"; // Set display to flex
        container.style.alignItems = "center"; // Align items vertically in the center

        // Create typeSelect (first select element)
        let typeSelect = document.createElement("select");
        for (let key in Mmx.EleTypeTranslate) {
            let opt = document.createElement("option");
            opt.value = key;
            opt.textContent = Mmx.EleTypeTranslate[key];
            typeSelect.appendChild(opt);
        }

        typeSelect.onchange = function () {
            if (mmx_dict.searchKey != null && mmx_dict.searchEleType != mmx_dict.descriptorTypeFilter.value) {
                localStorage.setItem("matchFilter", mmx_dict.descriptorTypeFilter.value);
                Mmx.SearchDescriptorsByKey(mmx_dict.searchKey);
            }
        }

        let profiles = document.createElement("select");
        profiles.id = "match-profiles";
        profiles.style.marginLeft = "auto";

        mmx_dict.descriptorTypeFilter = typeSelect;
        container.appendChild(typeSelect);
        container.appendChild(profiles);

        // Append the flexbox container to the element
        element.appendChild(container);
    }


    static RenderDescriptorMatchDisplay(element) {
        // Clear existing contents
        element.innerHTML = "";

        let results = document.createElement("div");
        mmx_dict.descriptorMatchResults = results;
        element.appendChild(results);
    }

    static RenderLrmiForm(element) {

        function addRow(dl, label, id) {
            dl.appendChild(bdoc.ele("div",
                bdoc.attr("style", "align-items: flex-end;"),
                bdoc.ele("dt", label),
                bdoc.ele("dd",
                    bdoc.class("mmc_editable"),
                    bdoc.attr("contentEditable", "true"),
                    bdoc.attr("id", id))));
        }
        console.log(form);

        element.innerHTML = "";

        var form = bdoc.ele("div", bdoc.class("mmc_lrmiForm"), bdoc.attr("id", "p_lrmiForm"));

        {
            let controlsLeft = bdoc.ele("span", bdoc.class("controls_left"));
            let controlsRight = bdoc.ele("span", bdoc.class("controls_right"));
            let controls = bdoc.ele("div", bdoc.class("controls"), controlsLeft, controlsRight);
            controlsLeft.appendChild(bdoc.ele("button",
                bdoc.attr("onclick", Mmx.MatchDescriptor), "Match"));
            controlsLeft.appendChild(document.createTextNode(" "));
            controlsLeft.appendChild(bdoc.ele("button",
                bdoc.attr("onclick", Mmx.ClearLrmiForm), "Clear"));
            controlsLeft.appendChild(document.createTextNode(" "));
            controlsLeft.appendChild(bdoc.ele("button",
                bdoc.attr("onclick", Mmx.SaveDescriptor), "Save"));

            controlsRight.appendChild(bdoc.ele("span", bdoc.class("mm_toggleSurround"),
                document.createTextNode("All"),
                bdoc.ele("input", bdoc.attr("type", "checkbox"),
                    bdoc.attr("id", "input_nokey"),
                    bdoc.class("toggle-switch")),
                document.createTextNode("Keyless")
            ));
            controlsRight.appendChild(bdoc.ele("button",
                bdoc.attr("onclick", Mmx.PrevDescriptor), "←"));
            controlsRight.appendChild(document.createTextNode("\u00A0")); // Insert a non-breaking space
            controlsRight.appendChild(bdoc.ele("button",
                bdoc.attr("onclick", Mmx.NextDescriptor), "→"));
            form.appendChild(controls);
        }
        form.appendChild(bdoc.ele("p",
            bdoc.attr("id", "p_parent")));

        form.appendChild(bdoc.ele("h2", bdoc.class("mmc_editable"),
            bdoc.attr("id", "p_name"),
            bdoc.attr("contentEditable", "true")));
        
        form.appendChild(bdoc.ele("section", bdoc.class("mmc_editable"),
            bdoc.attr("id", "p_description"),
            bdoc.attr("contentEditable", "true")));

        form.appendChild(bdoc.ele("h3", "Detail"));

        let dl = document.createElement("dl");

        // Element type
        dl.appendChild(bdoc.ele("div",
            bdoc.attr("style", "align-items: flex-end;"),
            bdoc.ele("dt", "Element Type"),
            bdoc.attr("style", "align-items: flex-end;"),
            bdoc.ele("dd",
                bdoc.ele("select",
                bdoc.attr("name", "eleType"),
                bdoc.attr("id", "p_eleType"),
                bdoc.ele("option", bdoc.attr("value", ""), "(Element Type)"),
                bdoc.ele("option", bdoc.attr("value", "lr"), "Learning Resource"),
                bdoc.ele("option", bdoc.attr("value", "cs"), "Competency Statement"),
                bdoc.ele("option", bdoc.attr("value", "c"), "Curriculum"),
                bdoc.ele("option", bdoc.attr("value", "o"), "Other")))));

        addRow(dl, "URL", "p_url");

        addRow(dl, "Subject", "p_subject");
        addRow(dl, "Identifier", "p_identifier");
        addRow(dl, "Ed. Level", "p_educationalLevel");
        addRow(dl, "Creator", "p_creator");
        addRow(dl, "Published", "p_datePublished");
        addRow(dl, "Repository Date", "p_sdDatePublished");

        form.appendChild(dl);

        form.appendChild(bdoc.ele("h3", "Key"));
        let dl2 = document.createElement("dl");
        addRow(dl2, "Provenance", "p_provenance");
        form.appendChild(dl2);

        form.appendChild(bdoc.ele("div",
            bdoc.class("mm_stmtHead"),
            bdoc.ele("span", bdoc.class("mm_stmtAdd"), "\u2212"), // Minus sign
            bdoc.ele("span", bdoc.class("mm_stmtCentral"), "Cen"),
            bdoc.ele("span", bdoc.class("mm_stmtId"), "Id"),
            bdoc.ele("span", bdoc.class("mm_stmtType"), "Type"),
            bdoc.ele("span", bdoc.class("mm_stmtKeyText"), "Statement")));

        form.appendChild(bdoc.ele("hr", bdoc.class("mm_listHr")));

        mmx_dict.keyTable = bdoc.ele("div", bdoc.class("mmc_stmtKeyCompose"));
        form.appendChild(mmx_dict.keyTable);

        element.appendChild(form);
    }

    static RenderSearchButton(element) {
        element.innerHTML = "";

        let button = document.createElement("input");
        button.type = "button";
        button.value = "Match";
        button.onclick = Mmx.SearchDescriptorsByComposedKey;
        element.appendChild(button);
    }

    // Render an intermediary key into the key composition section
    static async LoadKeyIntoDescriptorSearchForm(key) {
        mmx_dict.keyTable.innerHTML = "";
        if (!key) return;
        const response = await session.fetch("/key/" + Mmx.StripKeyPrefix(key));
        const data = await response.json();

        for (let val of data.statements) {
            mmx_dict.keyTable.appendChild(bdoc.ele("div", bdoc.class("mm_stmt"),
                bdoc.ele("span", bdoc.class("mm_stmtAdd"), bdoc.ele("input", bdoc.attr("type", "button"),
                    bdoc.attr("value", "\u2212"),
                    bdoc.attr("onclick", Mmx.RemoveStatementFromKey))),
                bdoc.ele("span", bdoc.class("mm_stmtCentral"), bdoc.ele("input", bdoc.attr("type", "checkbox"),
                    bdoc.attr("checked", val.rel == "Central"))),
                bdoc.ele("span", bdoc.class("mm_stmtId"), val.id),
                bdoc.ele("span", bdoc.class("mm_stmtType"), val.stmtType),
                bdoc.ele("span", bdoc.class("mm_stmtKeyText"), val.statement)));
        }
    }

    // === Search Actions =======

    static SearchStatements() {
        let keywords = document.getElementById("mmid_search").value;
        if (window.searchProperty == "Text") {
            let url = "/statements?keywords=" + encodeURIComponent(keywords);
            Mmx.LoadJsonAsync(url, Mmx.SearchStatements_Callback);
        } else {
            let requestBody = "";
            if (window.searchProperty == "AI") {
                requestBody += JSON.stringify({matchText: window.description + keywords});
            } 
            else if (window.searchProperty == "AI + Context") {
                requestBody += JSON.stringify({matchText: window.descriptorContext + keywords});
            }
            console.log(requestBody);
            let url = "/api/match/palet"
            let options = {
            method: "POST",
                body: JSON.stringify({matchText: requestBody}),
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                }
            };
            session.fetch(url, options)
            .then(response => response.json())
            .then(json => {
                console.log(json);
                Mmx.SearchStatements_Callback(json)
            })
        }        
    }

    static SearchStatements_Callback(result) {
        // Clear existing contents
        mmx_dict.stmtSearchResult.innerHTML = "";

        let count = 0;
        for (let val of result.statements) {
            mmx_dict.stmtSearchResult.appendChild(
                bdoc.ele("div", bdoc.class("mm_stmt"),
                    bdoc.ele("span", bdoc.class("mm_stmtAdd"),
                        bdoc.ele("input",
                            bdoc.attr("type", "button"),
                            bdoc.attr("value", "+"),
                            bdoc.attr("onclick", Mmx.AddStatementToKey))),
                    bdoc.ele("span", bdoc.class("mm_stmtId"), val.id),
                    bdoc.ele("span", bdoc.class("mm_stmtType"), val.stmtType),
                    bdoc.ele("span", bdoc.class("mm_stmtText"), val.statement)));
            ++count;
        }

        if (count == 0) {
            mmx_dict.stmtSearchResult.appendChild(
                bdoc.ele("div", "No statements found to match search terms."));
        }
    }

    static SearchDescriptorsByComposedKey() {
        Mmx.SearchDescriptorsByKey(Mmx.GenerateKeyFromForm(), null);
    }

    static SearchDescriptorsByKey(key, suppressId) {
        let k = Mmx.StripKeyPrefix(key);

        let eleType = mmx_dict.descriptorTypeFilter.value;
        mmx_dict.searchKey = key;
        mmx_dict.searchEleType = eleType;
        if (suppressId !== undefined) mmx_dict.searchSuppressId = suppressId;
        
        let matchWeights = jsonToQueryString(localStorage.getItem("matchWeightsObj"));
        let url = `/descriptors?searchKey=${encodeURIComponent(key)}&eleType=${eleType}`;
        if(matchWeights) {
            url += `&${matchWeights}`
        }

        Mmx.LoadJsonAsync(url, Mmx.SearchDescriptorsByKey_Callback);
    }

    static SearchDescriptorsByKey_Callback(result) {
        if (mmx_dict.descriptorMatchResults == null) return;

        Mmx.RenderDescriptorSearchResult(result, mmx_dict.descriptorMatchResults, "newPage");
    }

    static SearchDescriptorsByKeywords() {
        let keywords = mmx_dict.descriptorKeywords.value;
        let eleType = mmx_dict.descriptorType.value;
        let url = "/descriptors?searchKeywords=" + encodeURIComponent(keywords) + "&eleType=" + encodeURIComponent(eleType);
        Mmx.LoadJsonAsync(url, Mmx.SearchDescriptorsByKeywords_Callback);
        mmx_dict.searchKeywords = keywords;
        mmx_dict.searchKeywordsEleType = eleType;
    }

    static SearchDescriptorsByKeywords_Callback(result) {
        if (mmx_dict.keywordSearchResult == undefined) return;

        Mmx.RenderDescriptorSearchResult(result, mmx_dict.keywordSearchResult, true);
    }

    static SearchDescriptorsById(stmtId) {
        let url = "/descriptors/" + encodeURIComponent(stmtId);
        Mmx.LoadJsonAsync(url, Mmx.SearchDescriptorsById_Callback);
    }

    static SearchDescriptorsById_Callback(result) {
        if (mmx_dict.keywordSearchResult == undefined) return;

        Mmx.RenderDescriptorSearchResult(result, mmx_dict.keywordSearchResult, true);
        mmx_dict.afterSearchDescriptorsById();
    }

    static RenderDescriptor(val, matchButton) {
        function addRow(dl, label, value) {
            if (!(value)) return;
            dl.appendChild(bdoc.ele("div",
                bdoc.ele("dt", label),
                bdoc.ele("dd", value)));
        }
        
        let descriptor = bdoc.ele("div", bdoc.class("mmc_descriptor"));
        descriptor.mmxId = val.id;
        descriptor.mmxKey = Mmx.StripKeyPrefix(val.key);

        if (val.matchIndex != undefined || matchButton) {
            let annotation = bdoc.ele("div", bdoc.class("annotation"));

            if (val.matchIndex != undefined) {
                annotation.appendChild(bdoc.ele("div",
                    bdoc.class("mmc_matchindex"),
                     "MatchIndex: " + val.matchIndex));
            }

            if (matchButton) {
                let button = bdoc.ele("button", "Find Matches");
                button.onclick = (matchButton == "newPage")
                    ? Mmx.OnClickFindMatchesToMatchResult
                    :  Mmx.OnClickFindMatchesToSearchResult;
                annotation.appendChild(button);
            }

            descriptor.appendChild(annotation);
        }

        if (val.eleType) {
            descriptor.appendChild(bdoc.ele("h3", this.EleTypeTranslate[val.eleType]));
        }
        if (val.name) {
            descriptor.appendChild(bdoc.ele("h2", val.name));
        }
        else {
            descriptor.appendChild(bdoc.ele("h2", "Unnamed"));
        }
        if (val.description) {
            descriptor.appendChild(bdoc.ele("section", bdoc.preText(val.description)));
        }
        descriptor.appendChild(bdoc.ele("h3", "Detail"));

        let dl = document.createElement("dl");

        if (val.url) {
            addRow(dl, "URL", bdoc.ele("a",
                bdoc.attr("href", val.url),
                bdoc.attr("target", "_blank"),
                val.url));
        }
        addRow(dl, "Subject", val.subject);
        addRow(dl, "Identifier", val.identifier);
        addRow(dl, "Ed. Level", val.educationalLevel);
        addRow(dl, "Creator", val.creator);
        addRow(dl, "Provenance", val.provenance);
        addRow(dl, "Date Published", val.datePublishefd);
        addRow(dl, "Repository Date", val.sdDatePublished);

        if (val.key) {
            addRow(dl, "Key", bdoc.ele("a",
                bdoc.attr("href", Mmx.keyLinkPrefix + Mmx.StripKeyPrefix(val.key)),
                Mmx.StripKeyPrefix(val.key)));
        }
        descriptor.appendChild(dl);

        return descriptor;
    }

    static RenderDescriptorSearchResult(result, ele, matchButton) {
        ele.innerHTML = "";

        let count = 0;
        for (let val of result.descriptors) {
            if (val.id != mmx_dict.searchSuppressId) {
                ele.appendChild(this.RenderDescriptor(val, matchButton));
                ++count;
            }
        }

        if (count == 0) {
            ele.appendChild(bdoc.ele("div", "No descriptions found to match search key."));
        }
    }

    static async LoadLrmiForm(value) {
        document.getElementById("mmx_status").textContent = "";
        //console.log(JSON.stringify(value));
        //console.log(value.id);
        var form = document.getElementById("p_lrmiForm");
        form.sourceData = value;
        console.log(value.mainEntityId)

        for (let p in value) {
            let ele = document.getElementById("p_" + p);
            if (ele) {
                if (ele instanceof HTMLSelectElement) {
                    ele.value = value[p];
                }
                else if (p == "url" && value[p].startsWith("http")) {
                    ele.contentEditable = false;
                    ele.innerHTML = "<a href='" + value["url"] + "' target='_blank'>" + value["url"] + "</a>";
                }
                else if (p === "description") {
                    ele.innerHTML = value[p];
                    window.description = value[p];
                }
                else {
                    ele.textContent = value[p];
                }
            }
        }

        function parentOf(id, collectionObject) {
            let keys = Object.keys(collectionObject)
            for (let i = 0; i < keys.length; i++) {
                if (collectionObject[keys[i]].includes(id)) {
                    return keys[i]
                }
            }
            return -1;
        }

        let data = await session.fetch("/api/collections/" + value.mainEntityId)
        data = await data.json();

        let collectionObject = {};
        let nodeParents = {};
        let nodes = [];
        let currentIntID;
        
        for (let i = 0; i < data['collection'].length; i++) {
            collectionObject[i] = data['collection'][i]['intHasPart'];
            nodeParents[i] = [];
            nodes.push(i);
            if (data['collection'][i].id === value.id) {
                currentIntID = i;
            }
        }
    
        let currentNode = nodes[currentIntID]
        let parentOfCurrentNode = parentOf(currentNode, collectionObject)
        while (parentOfCurrentNode !== -1) {
            nodeParents[currentNode].push(parentOfCurrentNode)
            parentOfCurrentNode = parentOf(parseInt(parentOfCurrentNode), collectionObject)
        }
        let parents = nodeParents[currentNode];
        parents.reverse();
        let parentText = ""
        
        let contextDescription = "";

        for (let i = 0; i < parents.length; i++) {
            let abstr = data['collection'][parents[i]].description.substring(0,100)
            if (data['collection'][parents[i]].description) {
                contextDescription += data['collection'][parents[i]].description + " ";
            }
            if (data['collection'][parents[i]].description.length > 100) {
                abstr += "..."
            }
            
            let spacing = 0;
            for (let j = 0; j < i; j++) {
                spacing += 0.5
            }
            parentText += `<div style = "margin-left: ${spacing}rem;">` + data['collection'][parents[i]].name + " - " + abstr + "</div>"
        }

        window.descriptorContext = contextDescription;
        let ele = document.getElementById("p_parent");
        ele.setAttribute('onclick', "document.getElementById('lineage_title').textContent  = (document.getElementById('lineage_title').textContent === '▼ Descriptor Context' ) ? '► Descriptor Context' : '▼ Descriptor Context'")
        ele.setAttribute("style", "style='cursor: pointer;'")
        ele.innerHTML = "";
        ele.innerHTML += `<span onclick="document.getElementById('descriptor_lineage').style.display = (document.getElementById('descriptor_lineage').style.display === 'none') ? 'block' : 'none';"><strong id='lineage_title'>► Descriptor Context</strong><br><span id="descriptor_lineage" style="display: none;">` + parentText + "</span>"
        
        // Load Key
        Mmx.LoadKeyIntoDescriptorSearchForm(value.key);
    }

    static LoadLrmiFormFromStorage() {
        if (sessionStorage.describeStmt) {
            console.log(sessionStorage.describeStmt);
            var stmt = JSON.parse(sessionStorage.describeStmt);
            //sessionStorage.removeItem('describeStmt');

            if (!(stmt.provenance)) {
                var provenance = sessionStorage.provenance;
                if (!provenance) provenance = "Demo";
                stmt.provenance = provenance;
            }

            Mmx.LoadLrmiForm(stmt);
        }
    }

    static async LoadLrmiFormFromDatabase(id) {
        let response = await session.fetch("/api/descriptors/" + id);
        let data = await response.json();
        let desc = data.descriptors[0];
        this.LoadLrmiForm(desc);
    }

    // === Form and Function ==============

    static AddStatementToKey(event) {
        let row = event.target.parentElement.parentElement.cloneNode(true);
        let cellAdd = row.firstElementChild;
        let cellId = cellAdd.nextElementSibling;
        let cellStmt = cellId.nextElementSibling.nextElementSibling;

        let addedIds = extractAddedIds();
        if (addedIds.includes(cellId.textContent)) {
            alert("Error: Palet Statement already selected");
        } else {

        // Convert first cell to remove
        cellAdd.innerHTML = "";
        cellAdd.appendChild(bdoc.ele("input", bdoc.attr("type", "button"),
            bdoc.attr("value", "\u2212"), // Minus sign
            bdoc.attr("onclick", Mmx.RemoveStatementFromKey)));

        // Insert central cell
        row.insertBefore(
            bdoc.ele("span", 
                bdoc.class("mm_stmtCentral"),
                bdoc.ele("input",
                    bdoc.attr("type", "checkbox"),
                    bdoc.attr("textContent", "Central"),
                    bdoc.attr("checked", true))),
            cellId);

        // Change class of last element
        cellStmt.className = "mm_stmtKeyText";        
        mmx_dict.keyTable.appendChild(row);

        }
    }

    static RemoveStatementFromKey(event) {
        let row = event.target.parentElement.parentElement;
        row.remove();
    }

    static OnClickFindMatchesToMatchResult(event) {
        let descriptor = event.target.parentElement.parentElement;
        window.location.href = `?stmtId=${descriptor.mmxId}`;
    }

    static OnClickFindMatchesToSearchResult(event) {
        Mmx.SelectAndMatchDescriptor(event.target.parentElement.parentElement);
    }

    static MatchFirstSearchResult() {
        Mmx.SelectAndMatchDescriptor(mmx_dict.keywordSearchResult.firstElementChild);
    }

    static SelectAndMatchDescriptor(descriptor) {
        // Deselect
        if (mmx_dict.selectedDescriptor) {
            mmx_dict.selectedDescriptor.classList.remove("mm_active")
        }

        // Select new
        mmx_dict.selectedDescriptor = descriptor;
        descriptor.classList.add("mm_active");

        // Search
        Mmx.SearchDescriptorsByKey(descriptor.mmxKey, descriptor.mmxId);
    }

    static GenerateLrmiFromForm() {
        var form = document.getElementById("p_lrmiForm");
        var lrmi = form.sourceData; // Load original data before overwriting attributes from the form.
        if (!lrmi) lrmi = {};

        for (let e of Mmx.descProps) {
            let ele = document.getElementById("p_" + e.prop);
            let val;
            if (ele instanceof HTMLSelectElement) {
                val = ele.value;
            }
            else {
                val = ele.textContent;
            }
            
            lrmi[e.prop] = val;
        }

        return lrmi;
    }

    static GenerateKeyFromForm() {
        let keyArray = [];
        let keyTable = mmx_dict.keyTable;
        let keyRow = keyTable.firstElementChild;
        while (keyRow != null) {
            let data = {
                rel: keyRow.children[1].firstElementChild.checked ? "C" : "P",
                id: Number(keyRow.children[2].textContent),
                stmtType: keyRow.children[3].textContent,
                statement: keyRow.children[4].textContent
            }
            keyArray.push(data);
            keyRow = keyRow.nextElementSibling;
        }

        if (keyArray.length == 0) return "";

        keyArray.sort(function (a, b) {
            if (a.rel > b.rel) return 1;
            if (a.rel < b.rel) return -1;
            return a.id - b.id;
        });

        let key = Mmx.keyPrefix;
        let first = true;
        for (let k of keyArray) {
            if (!first) key += "-";
            key += k.id;
            key += k.rel;
            first = false;
        }

        return key;
    }

    static ClearLrmiForm() {
        document.getElementById("mmx_status").textContent = "";

        var form = document.getElementById("p_lrmiForm");
        form.sourceData = undefined;

        for (let e of Mmx.descProps) {
            let ele = document.getElementById("p_" + e.prop);
            if (ele instanceof HTMLSelectElement) {
                ele.value = "o";
            }
            else if (ele) {
                ele.contentEditable = true;
                ele.textContent = "";
            }
            else {
                console.log(e.prop);
            }
        }

        mmx_dict.keyTable.innerHTML = "";
    }

    static async SaveDescriptor() {
        let record = Mmx.GenerateLrmiFromForm();
        record.key = Mmx.GenerateKeyFromForm();

        let json = JSON.stringify(record);

        let verb;
        let url;
        if (record.id) {
            verb = "PUT";
            url = "/api/descriptors/" + record.id;
        }
        else {
            verb = "POST";
            url = "/api/descriptors"
        }

        const response = await session.fetch(url, {
            method: verb,
            headers: {
                "Content-Type": "application/json"
            },
            body: json
        });
        if (response.ok) {
            alert("Saved!");
        }
        else {
            alert(`Save error: ${response.status} ${response.statusText}: ${text}`);
        }
    }

    static MatchDescriptor() {
        let record = Mmx.GenerateLrmiFromForm();
        record.key = Mmx.GenerateKeyFromForm();

        sessionStorage.matchDescriptor = JSON.stringify(record);
        window.open("/c/Match?src=dynamic", "_blank");
    }

    static NextDescriptor() {
        Mmx.NextPrevDescriptor(true);
    }

    static PrevDescriptor() {
        Mmx.NextPrevDescriptor(false);
    }

    static async NextPrevDescriptor(nextPrev) {
        const nokey = document.getElementById("input_nokey").checked;
        const form = document.getElementById("p_lrmiForm");
        if (!form) return;
        const sourceData = form.sourceData;
        if (!sourceData) return;
        const id = sourceData.id;
        if (!id) return;
        const response = await session.fetch("/api/collections/" + id + "/" + (nextPrev ? "next" : "prev") + (nokey ? "?skipWithKey" : ""));
        const data = await response.json();
        if (data.success) {
            Mmx.LoadLrmiFormFromDatabase(data.id);
        }
        else {
            if (nextPrev) {
                alert("No more descriptors.")
            } else {
                alert("No preceding descriptors.")
            }
        }
    }
 
    // === Initialization ===================

    static getCookie(cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i].trim();
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }

    static OnPageLoad(keyParent) {

        // Check for style override in the query string
        let query = new URLSearchParams(window.location.search);
        {
            let style = query.get("xstyle");
            if (style) {
                let ps = document.getElementById("principalStyle");
                if (ps) {
                    ps.setAttribute("href", "/c/res/" + style + ".css");
                }
            }
        }

        // Read options from the MMT token cookie
        let token = new URLSearchParams(Mmx.getCookie("MMT"));


        let hasFindDescriptor = false;
        let hasComposeKey = false;
        let ele;
        for (ele of document.getElementsByClassName("mmx_key")) {
            Mmx.RenderKeyFromElement(ele);
        }

        for (ele of document.getElementsByClassName("mmx_keyCompose")) {
            hasComposeKey = true;
            Mmx.RenderKeyComposeForm(ele);
        }

        for (ele of document.getElementsByClassName("mmx_statementSearch")) {
            Mmx.RenderStatementSearch(ele);
        }

        for (ele of document.getElementsByClassName("mmx_lrmiCompose")) {
            Mmx.RenderLrmiForm(ele);
            if (query.get("src") == "dynamic")
            {
                Mmx.LoadLrmiFormFromStorage();
            }
            else {
                const descId = query.get("id");
                if (descId) {
                    Mmx.LoadLrmiFormFromDatabase(descId);
                }
            }
        }

        for (ele of document.getElementsByClassName("mmx_descriptorSearchForm")) {
            hasFindDescriptor = true;
            Mmx.RenderDescriptorSearchForm(ele);
        }

        for (ele of document.getElementsByClassName("mmx_descriptorSearchDisplay")) {
            Mmx.RenderDescriptorSearchDisplay(ele);
        }

        for (ele of document.getElementsByClassName("mmx_searchButton")) {
            Mmx.RenderSearchButton(ele);
        }

        for (ele of document.getElementsByClassName("mmx_descriptorMatchFilter")) {
            Mmx.RenderDescriptorMatchFilter(ele);
        }

        for (ele of document.getElementsByClassName("mmx_descriptorMatchDisplay")) {
            Mmx.RenderDescriptorMatchDisplay(ele);
        }

    
        if (hasFindDescriptor) {
            let stmtId = query.get("stmtId");
            if (stmtId) {
                mmx_dict.afterSearchDescriptorsById = function () {
                    Mmx.MatchFirstSearchResult();
                    mmx_dict.afterSearchDescriptorsById = undefined;
                }

                Mmx.SearchDescriptorsById(stmtId);
            }
            else if (query.get("src") == "dynamic") {
                console.log("dynamic");
                if (sessionStorage.matchDescriptor) {
                    console.log(sessionStorage.matchDescriptor);
                    let val = JSON.parse(sessionStorage.matchDescriptor);
                    mmx_dict.keywordSearchResult.appendChild(
                        Mmx.RenderDescriptor(val, true));
                    Mmx.MatchFirstSearchResult();
                }
            }
        }

        if (hasComposeKey) {
            let query = new URLSearchParams(window.location.search);
            let key = query.get("key");
            if (key) {
                Mmx.LoadKeyIntoDescriptorSearchForm(key);
            }
        }

        // const mainElement = document.querySelector('main');
        // const bodyElement = document.querySelector('body');
        // if (mainElement) {
        //     bodyElement.innerHTML += mainElement.innerHTML;
        // }

        let downloadModal = document.getElementById("download-modal");
        let downloadButton = document.getElementById("download-matches");
        if (downloadButton) {
            downloadButton.onclick = function() {
                downloadModal.style.display = "block";
            }
        }

        let downloadJSONButton = document.getElementById("download-json")
        let downloadCSVButton = document.getElementById("download-csv")
        if (downloadJSONButton) {
            downloadJSONButton.onclick = function() {
                let url = `/descriptors?searchKey=${mmx_dict.searchKey}&eleType=${mmx_dict.searchEleType}&${jsonToQueryString(localStorage.getItem("matchWeightsObj"))}`
                Mmx.LoadJsonAsync(url, function(result) {
                    downloadJsonSingleMatch(mmx_dict.searchSuppressId, result);
                    }
                )
            }
        }
        if (downloadCSVButton) {
            downloadCSVButton.onclick = function() {
                let url = `/descriptors?searchKey=${mmx_dict.searchKey}&eleType=${mmx_dict.searchEleType}&${jsonToQueryString(localStorage.getItem("matchWeightsObj"))}`
                Mmx.LoadJsonAsync(url, (result) => {
                    downloadCsvSingleMatch(mmx_dict.searchSuppressId,result);
                    }
                )
            }
        }
        // Get the modal
        let match_modal = document.getElementById("match-modal");
        let matchSettings = ["alg-w-cc", "alg-w-cp", "alg-w-pc", "alg-w-pp", "alg-t-cc", "alg-t-cp", "alg-t-pc", "alg-t-pp", "alg-w-k", "alg-t-k", "alg-w-c", "alg-t-c", "alg-w-p", "alg-t-p", "alg-w-d", "alg-t-d"];

        // Get the button that opens the modal
        let match_console_button = document.getElementById("match-console-button");

        // Get the <span> element that closes the modal
        let close_console = document.getElementsByClassName("close_console");
        let modifyBtn = document.querySelector(".modify-btn_console");

        // When the user clicks on the button, open the modal
        if (match_console_button) { 
            match_console_button.onclick = function() {
                match_modal.style.display = "block";
                let matchWeightsObj = JSON.parse(localStorage.getItem("matchWeightsObj"))
                if (!matchWeightsObj) {
                    matchWeightsObj = {
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
                }
                for (let property of matchSettings) {
                    let item =  document.getElementById(property);
                    item.innerHTML = matchWeightsObj[property]
                }
            }
        }

        // When the user clicks on close_console(x), close the modal
        for (let close of close_console) {
            if (close) {
                close.onclick = function() {
                    match_modal.style.display = "none";
                    downloadModal.style.display = "none";
                }
            }
        }
        

        if (modifyBtn) {
            modifyBtn.onclick = function() {
                match_modal.style.display = "none";
                window.location.href = `/c/MatchConsole?matchKey=${mmx_dict.searchKey}`;
            }
        }

        // When the user clicks anywhere outside of the modal, close it
        window.onclick = function(event) {
            if (event.target == match_modal) {
                match_modal.style.display = "none";
            }
            if (event.target == downloadModal) {
                downloadModal.style.display = "none";
            }
        }

        localStorage.setItem("matchFilter", null)

        let profiles = document.getElementById("match-profiles");
        let matchProfiles = JSON.parse(localStorage.getItem("matchProfiles"));
        let matchProfileNames = Object.keys(matchProfiles);
        let matchProfileSettings = Object.values(matchProfiles);

        matchProfileNames = ["--"].concat(matchProfileNames);
    
        matchProfileNames.forEach(name => {
            let currentOption  = document.createElement("option");
            currentOption.textContent = name;
            currentOption.value = name;
            profiles.appendChild(currentOption);
        })

        matchProfileNames = matchProfileNames.slice(1);
        let matchWeightsObj = JSON.parse(localStorage.getItem("matchWeightsObj"))
    
        for (let i = 0; i < matchProfileSettings.length; i++) {
            console.log(matchWeightsObj, matchProfileSettings[i])
            if (JSON.stringify(matchProfileSettings[i]) == JSON.stringify(matchWeightsObj)) {
                console.log(matchProfileNames[i]);
                profiles.value = matchProfileNames[i];
            }
        }

        profiles.onchange = function () {
            let updatedWeights = matchProfiles[profiles.value];
            localStorage.setItem("matchWeightsObj", JSON.stringify(updatedWeights));

            Mmx.SearchDescriptorsByKey(mmx_dict.searchKey);
        }

    }

}




window.addEventListener("load", Mmx.OnPageLoad);
window.addEventListener('popstate', (event) => {location.reload();});

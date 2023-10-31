﻿/* MatchMaker Prototype Web Controls
 * Eventually this will likely become a proper JavaScript module.
 * which is a better way to isolate things than using the
 * objects like I've done here.
 */

import bdoc from './bdoc.js';
import config from './config.js';
import bsession from './bsession.js';
const session = new bsession(config.backEndUrl, config.sessionTag);

// Container for MMX Globals
let mmx_dict = {};

// Using the class like a namespace. All members are static.
class Mmx {

    static keyPrefix = "https://palet.codes/key/";

    static descProps = [
        { label: "Type", prop: "eleType", inner: "<select name='eleType'><option value='o'>Other</option><option value='lr'>Learning Resource</option><option value='cs'>Competency Statement</option><option value='c'>Curriculum</option></select>" },
        { label: "Name", prop: "name" },
        { label: "URL", prop: "url" },
        { label: "About", prop: "about" },
        { label: "Abstract", prop: "abstract" },
        { label: "Identifier", prop: "identifier" },
        { label: "Ed. Level", prop: "educationalLevel" },
        { label: "Creator", prop: "creator" },
        { label: "Provenance", prop: "provenance" }
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

    static RenderStatementSearch(element) {
        // Search replaces this element rather than going into it
        // This won't work when we make search into a webElement
        // but we'll cross that bridge later.
        
        let parent = element.parentElement;
        parent.removeChild(element);

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

        let typeSelect = document.createElement("select");
        for (let key in Mmx.EleTypeTranslate) {
            let opt = document.createElement("option");
            opt.value = key;
            opt.textContent = Mmx.EleTypeTranslate[key];
            typeSelect.appendChild(opt);
        }

        typeSelect.onchange = function () {
            if (mmx_dict.searchKey != null && mmx_dict.searchEleType != mmx_dict.descriptorTypeFilter.value) {
                Mmx.SearchDescriptorsByKey(mmx_dict.searchKey);
            }
        }

        mmx_dict.descriptorTypeFilter = typeSelect;

        let searchbar = document.createElement("div");
        searchbar.className = "mmx_searchBar";
        searchbar.appendChild(typeSelect);
        element.appendChild(searchbar);
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
                bdoc.ele("dt", label),
                bdoc.ele("dd",
                    bdoc.class("mmc_editable"),
                    bdoc.attr("contentEditable", "true"),
                    bdoc.attr("id", id))));
        }

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

        form.appendChild(bdoc.ele("h2", bdoc.class("mmc_editable"),
            bdoc.attr("id", "p_name"),
            bdoc.attr("contentEditable", "true")));
        
        form.appendChild(bdoc.ele("section", bdoc.class("mmc_editable"),
            bdoc.attr("id", "p_abstract"),
            bdoc.attr("contentEditable", "true")));

        form.appendChild(bdoc.ele("h3", "Detail"));

        let dl = document.createElement("dl");

        // Element type
        dl.appendChild(bdoc.ele("div",
            bdoc.ele("dt", "Element Type"),
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
        addRow(dl, "About", "p_about");
        addRow(dl, "Identifier", "p_identifier");
        addRow(dl, "Ed. Level", "p_educationalLevel");
        addRow(dl, "Creator", "p_creator");
        addRow(dl, "Provenance", "p_provenance");
        form.appendChild(dl);

        form.appendChild(bdoc.ele("h3", "Key"));

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
        let url = "/statements?keywords=" + encodeURIComponent(keywords);
        Mmx.LoadJsonAsync(url, Mmx.SearchStatements_Callback);
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
        let url = `/descriptors?searchKey=${encodeURIComponent(key)}&eleType=${eleType}`;
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
        if (val.abstract) {
            descriptor.appendChild(bdoc.ele("section", bdoc.preText(val.abstract)));
        }
        descriptor.appendChild(bdoc.ele("h3", "Detail"));

        let dl = document.createElement("dl");

        if (val.url) {
            addRow(dl, "URL", bdoc.ele("a",
                bdoc.attr("href", val.url),
                bdoc.attr("target", "_blank"),
                val.url));
        }

        addRow(dl, "About", val.about);
        addRow(dl, "Identifier", val.identifier);
        addRow(dl, "Ed. Level", val.educationalLevel);
        addRow(dl, "Creator", val.creator);
        addRow(dl, "Provenance", val.provenance);

        if (val.key) {
            addRow(dl, "Key", bdoc.ele("a",
                bdoc.attr("href", Mmx.keyLinkPrefix + Mmx.StripKeyPrefix(val.key)),
                bdoc.attr("target", "_blank"),
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

    static LoadLrmiForm(value) {
        document.getElementById("mmx_status").textContent = "";
        //console.log(JSON.stringify(value));
        //console.log(value.id);
        var form = document.getElementById("p_lrmiForm");
        form.sourceData = value;

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
                else if (p === "abstract") {
                    ele.innerHTML = value[p];
                }
                else {
                    ele.textContent = value[p];
                }
            }
        }

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

        /*
        input = document.createElement("input");
        input.type = "checkbox";
        input.textContent = "Central";
        input.checked = true;
        input.style.height = "1.5em";
        input.style.width = "1.5em";
        cell2.style.textAlign = "center";
        cell2.append(input);
        mmx_dict.keyTable.appendChild(row);
        */
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
            const status = document.getElementById("mmx_status");
            if (!status) return;
            status.style.color = "darkred";
            status.textContent = nextPrev ? "No more descriptors." : "No preceding descriptors.";
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

        // Extra styles
        {
            let s = document.createElement('link');
            s.rel = "stylesheet";
            s.type = "text/css";
            s.href = "/c/res/" + token.get("st") + ".css";
            document.head.appendChild(s);
        }

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

    }

}

window.addEventListener("load", Mmx.OnPageLoad);

/* MatchMaker Prototype Web Controls
 * Eventually this will likely become a JavaScript module.
 * which is a better way to isolate things than using the
 * objects like I've done here.
 */

import bdoc from './bdoc.js';

// Container for MMX Globals
let mmx_dict = {};

// Using the class like a namespace. All members are static.
class Mmx {

    static keyPrefix = "https://mm.dicax.org/key/";

    static descProps = [
        { label: "Type", prop: "eleType", inner: "<select name='eleType'><option value='o'>Other</option><option value='lr'>Learning Resource</option><option value='cs'>Competency Statement</option><option value='c'>Curriculum</option></select>" },
        { label: "Name", prop: "name" },
        { label: "URL", prop: "url" },
        { label: "About", prop: "about" },
        { label: "Abstract", prop: "abstract" },
        { label: "Identifier", prop: "identifier" },
        { label: "Educational Level", prop: "educationalLevel" },
        { label: "Creator", prop: "creator" },
        { label: "Provenance", prop: "provenance" }
    ];

    static keyLabel = "Key";
    static keyLinkPrefix = "/c/ShowKey?key=";

    // === Support Functions =======

    static EleTypeTranslate = {
        "any": "Any",
        "lr": "Learning Resource",
        "cs": "Competency Statement",
        "c": "Curriculum",
        "o": "Other"
    };

    static LoadJsonAsync(url, callback, arg) {
        let xhr = new XMLHttpRequest();
        xhr.overrideMimeType("application/json");
        xhr.open('GET', url, true);
        xhr.withCredentials = true;
        xhr.onreadystatechange = function () {
            console.log("readystate: " + xhr.readyState);
            if (xhr.readyState == 4 && xhr.status == "200") {
                // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
                let json = JSON.parse(xhr.responseText);
                callback(json, arg);
            }
        }
        console.log("sending...");
        xhr.send(null);
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

        let table = document.createElement("table");
        table.className = "mmx_table_key";
        let row = document.createElement("tr");
        Mmx.AddTh(row, "mmx_col_id", "Id");
        Mmx.AddTh(row, "mmx_col_central", "Rel");
        Mmx.AddTh(row, "mmx_col_type", "Type");
        Mmx.AddTh(row, "mmx_col_stmt", "Statement");
        table.appendChild(row);
        element.appendChild(table);

        function addTd(row, cls, value) {
            let td = document.createElement("td");
            td.className = cls;
            td.textContent = value;
            row.appendChild(td);
        }

        for (let val of jskey.statements) {
            row = document.createElement("tr");
            addTd(row, "mmx_col_id", val.id);
            addTd(row, "mmx_col_central", val.rel);
            addTd(row, "mmx_col_type", val.stmtType);
            addTd(row, "mmx_col_stmt", val.statement);
            table.appendChild(row);
        }
    }

    static RenderStatementSearch(element) {
        // Clear existing contents
        element.innerHTML = "";

        // Search bar
        element.appendChild(bdoc.newEle("div",
            bdoc.class("mmx_searchBar"),
            bdoc.newEle("input",
                bdoc.attr("type", "search"),
                bdoc.attr("id", "mmid_search"),
                bdoc.class("mmc_stmtSearch"),
                bdoc.attr("onsearch", Mmx.SearchStatements)),
            bdoc.newEle("input",
                bdoc.attr("type", "button"),
                bdoc.class("mmc_stmtSearchButton"),
                bdoc.attr("value", "\uD83D\uDD0D"),
                bdoc.attr("onclick", Mmx.SearchStatements))));

        // Results header
        element.appendChild(bdoc.newEle("div",
            bdoc.class("mm_stmtHead"),
            bdoc.newEle("span", bdoc.class("mm_stmtAdd"), "Add"),
            bdoc.newEle("span", bdoc.class("mm_stmtId"), "Id"),
            bdoc.newEle("span", bdoc.class("mm_stmtType"), "Type"),
            bdoc.newEle("span", bdoc.class("mm_stmtText"), "Statement")));

        element.appendChild(bdoc.newEle("hr", bdoc.class("mm_listHr")));

        // Search results
        {
            let resultsTable = document.createElement("table");
            resultsTable.className = "mmx_table_statement";
            mmx_dict.resultsTable = resultsTable;
            Mmx.ResetStatementSearchResult();
            element.appendChild(resultsTable);
        }
    }

    static ResetStatementSearchResult() {
        // Clear existing contents
        mmx_dict.resultsTable.innerHTML = "";

        // Add header row
        let row = document.createElement("tr");
        Mmx.AddTh(row, "mmx_col_ctrl", "");
        Mmx.AddTh(row, "mmx_col_central", "");
        Mmx.AddTh(row, "mmx_col_id", "Id");
        Mmx.AddTh(row, "mmx_col_type", "Type");
        Mmx.AddTh(row, "mmx_col_stmt", "Statement");
        mmx_dict.resultsTable.appendChild(row);
    }

    static RenderKeyComposeForm(element) {
        // Clear existing contents
        element.innerHTML = "";

        let keyTable = document.createElement("table");
        keyTable.className = "mmx_table_statement";
        mmx_dict.keyTable = keyTable;

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

        // Search bar
        let searchBar = document.createElement("div");
        searchBar.className = "mmx_searchBar";

        let search = document.createElement("input");
        search.type = "search";
        search.style.width = "90%";
        search.onsearch = Mmx.SearchDescriptorsByKeywords;
        searchBar.appendChild(search);

        let button = document.createElement("input");
        button.type = "button";
        button.value = "\uD83D\uDD0D";
        button.onclick = Mmx.SearchDescriptorsByKeywords;
        searchBar.appendChild(button);

        searchBar.appendChild(document.createElement("br"));

        let typeSelect = document.createElement("select");
        typeSelect.name = "eleType";
        for (let key in Mmx.EleTypeTranslate) {
            let opt = document.createElement("option");
            opt.value = key;
            opt.textContent = Mmx.EleTypeTranslate[key];
            typeSelect.appendChild(opt);
        }
        typeSelect.onchange = function (event) {
            if (mmx_dict.searchKeywords != null && mmx_dict.searchKeywordsEleType != event.target.value) {
                Mmx.SearchDescriptorsByKeywords();
            }
        }

        searchBar.appendChild(typeSelect);

        mmx_dict.descriptorKeywords = search;
        mmx_dict.descriptorType = typeSelect;

        element.appendChild(searchBar);
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
        element.innerHTML = "";

        let lrmiTable = document.createElement("table");
        lrmiTable.className = "mmx_table_lrmi";
        mmx_dict.lrmiTable = lrmiTable;

        // Set up column styles so that we can manage width
        {
            let cg = document.createElement("colgroup");
            let col = document.createElement("col");
            col.className = "mmx_col_lrmiLabel";
            cg.appendChild(col);

            col = document.createElement("col");
            col.className = "mmx_col_lrmiValue";
            cg.appendChild(col);

            lrmiTable.appendChild(cg);
        }


        for (let e of Mmx.descProps) {
            let row = document.createElement("tr");
            let cell = document.createElement("td");
            cell.className = "mmx_cell_lrmiLabel";
            cell.textContent = e.label;
            row.appendChild(cell);

            cell = document.createElement("td");
            cell.className = "mmx_cell_lrmiValue";
            if (e.inner == undefined) {
                cell.contentEditable = true;
                cell.id = "p_" + e.prop;
            }
            else {
                cell.innerHTML = e.inner;
                cell.firstElementChild.id = "p_" + e.prop;
            }
            row.appendChild(cell);

            lrmiTable.appendChild(row);
        }

        element.appendChild(lrmiTable);
    }

    static RenderSaveButton(element) {
        element.innerHTML = "";

        let button = document.createElement("input");
        button.type = "button";
        button.value = "Save";
        button.onclick = Mmx.SaveDescriptor;
        element.appendChild(button);
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
    static LoadKeyIntoDescriptorSearchForm(key) {
        console.log("LoadKeyIntoDescriptorSearchForm");
        Mmx.LoadJsonAsync("/key/" + Mmx.StripKeyPrefix(key), Mmx.LoadKey_Callback)
    }

    static LoadKey_Callback(jskey) {

        function addTd(row, cls, value) {
            let td = document.createElement("td");
            td.className = cls;
            td.textContent = value;
            row.appendChild(td);
        }

        for (let val of jskey.statements) {
            let row = document.createElement("tr");

            // "Remove" button in first column
            {
                let cell = document.createElement("td");
                cell.className = "mmx_col_select";

                let input = document.createElement("input");
                input.type = "button";
                input.value = "\u2212";
                input.onclick = Mmx.RemoveStatementFromKey;
                cell.appendChild(input);
                row.appendChild(cell);
            }

            // "Central/Peripheral" in second column
            {
                let cell = document.createElement("td");
                cell.className = "mmx_col_central";

                let input = document.createElement("input");
                input.type = "checkbox";
                input.textContent = "Central";
                input.checked = val.rel == "Central";
                input.style.height = "1.5em";
                input.style.width = "1.5em";
                cell.style.textAlign = "center";
                cell.appendChild(input);
                row.appendChild(cell);
            }

            addTd(row, "mmx_col_id", val.id);
            addTd(row, "mmx_col_type", val.stmtType);
            addTd(row, "mmx_col_stmt", val.statement);

            mmx_dict.keyTable.appendChild(row);
        }


        element.innerHTML = "";

        let table = document.createElement("table");
        table.className = "mmx_table_key";
        let row = document.createElement("tr");
        Mmx.AddTh(row, "mmx_col_id", "Id");
        Mmx.AddTh(row, "mmx_col_central", "Rel");
        Mmx.AddTh(row, "mmx_col_type", "Type");
        Mmx.AddTh(row, "mmx_col_stmt", "Statement");
        table.appendChild(row);
        element.appendChild(table);
    }



    // === Search Actions =======

    static SearchStatements() {
        let keywords = document.getElementById("mmid_search").value;
        let url = "/statements?keywords=" + encodeURIComponent(keywords);
        Mmx.LoadJsonAsync(url, Mmx.SearchStatements_Callback);
    }

    static SearchStatements_Callback(result) {
        Mmx.ResetStatementSearchResult();

        let count = 0;
        let val;
        for (val of result.statements) {
            let row = document.createElement("tr");

            {
                let cell = document.createElement("td");
                cell.className = "mmx_col_select";
                let button = document.createElement("input");
                button.type = "button";
                button.value = "+";
                button.onclick = Mmx.AddStatementToKey;
                cell.appendChild(button);
                row.appendChild(cell);
            }

            function addTd(row, cls, value) {
                let td = document.createElement("td");
                td.className = cls;
                td.textContent = value;
                row.appendChild(td);
            }

            addTd(row, "mmx_col_central", "");
            addTd(row, "mmx_col_id", val.id);
            addTd(row, "mmx_col_type", val.stmtType);
            addTd(row, "mmx_col_stmt", val.statement);

            mmx_dict.resultsTable.appendChild(row);
            ++count;
        }

        if (count == 0) {
            let row = document.createElement("tr");
            let cell = document.createElement("td");
            cell.colSpan = 5;
            cell.textContent = "No statements found to match search terms.";
            row.appendChild(cell);
            mmx_dict.resultsTable.appendChild(row);
        }
    }

    static SearchDescriptorsByComposedKey() {
        Mmx.SearchDescriptorsByKey(Mmx.GenerateKeyFromForm());
    }

    static SearchDescriptorsByKey(key) {
        let k = Mmx.StripKeyPrefix(key);

        for (let ele of document.getElementsByClassName("mmx_descriptorMatchKey")) {
            let a = document.createElement("a");
            a.href = `/c/ShowKey?key=${k}`;
            a.target = "_blank";
            a.textContent = k;
            ele.appendChild(a);
        }

        for (let ele of document.getElementsByClassName("mmx_matchConsoleLink")) {
            let a = document.createElement("a");
            a.href = `/c/MatchConsole?matchKey=${k}`;
            a.textContent = "Match Console";
            ele.appendChild(a);
        }

        let eleType = mmx_dict.descriptorTypeFilter.value;
        mmx_dict.searchKey = key;
        mmx_dict.searchEleType = eleType;
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
            dl.appendChild(bdoc.newEle("div",
                bdoc.newEle("dt", label),
                bdoc.newEle("dd", value)));
        }

        let descriptor = bdoc.newEle("div", bdoc.class("mmc_descriptor"));
        descriptor.mmxId = val.id;
        descriptor.mmxKey = Mmx.StripKeyPrefix(val.key);

        if (val.matchIndex != undefined || matchButton) {
            let annotation = bdoc.newEle("div", bdoc.class("annotation"));

            if (val.matchIndex != undefined) {
                annotation.appendChild(bdoc.newEle("div",
                    bdoc.class("mmc_matchindex"),
                     "MatchIndex: " + val.matchIndex));
            }

            if (matchButton) {
                let button = bdoc.newEle("button", "Find Matches");
                button.onclick = (matchButton == "newPage")
                    ? Mmx.OnClickFindMatchesToMatchResult
                    :  Mmx.OnClickFindMatchesToSearchResult;
                annotation.appendChild(button);
            }

            descriptor.appendChild(annotation);
        }

        if (val.eleType) {
            descriptor.appendChild(bdoc.newEle("h3", this.EleTypeTranslate[val.eleType]));
        }
        descriptor.appendChild(bdoc.newEle("h2", val.name));
        if (val.abstract) {
            descriptor.appendChild(bdoc.newEle("section", bdoc.preText(val.abstract)));
        }
        descriptor.appendChild(bdoc.newEle("h3", "Detail"));

        let dl = document.createElement("dl");

        if (val.url) {
            addRow(dl, "URL", bdoc.newEle("a",
                bdoc.attr("href", val.url),
                bdoc.attr("target", "_blank"),
                val.url));
        }

        addRow(dl, "About", val.about);
        addRow(dl, "Identifier", val.identifier);
        addRow(dl, "Educational Level", val.educationalLevel);
        addRow(dl, "Creator", val.creator);
        addRow(dl, "Provenance", val.provenance);

        if (val.key) {
            addRow(dl, "Key", bdoc.newEle("a",
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
            ele.appendChild(this.RenderDescriptor(val, matchButton));
            ++count;
        }

        if (count == 0) {
            ele.appendChild(bdoc.newEle("div", "No descriptions found to match search key."));
        }
    }

    static LoadDescriptorFormFromSearchResult(result) {
        Mmx.ClearDescriptor();

        if (result.descriptors.length > 0) {
            let descriptor = result.descriptors[0];

            for (let p of Mmx.descProps) {
                let ele = document.getElementById("p_" + p.prop);
                if (ele instanceof HTMLSelectElement) {
                    ele.value = descriptor[p.prop];
                }
                else if (p.prop == "url")
                {
                    ele.contentEditable = false;
                    ele.innerHTML = "<a href='" + descriptor["url"] + "' target='_blank'>" + descriptor["url"] + "</a>";
                }
                else {
                    ele.textContent = descriptor[p.prop];
                }
            }
        }
        else {
            document.getElementById("mmx_status").textContent = "Queue is empty.";
        }
    }

    static LoadLrmiForm(value) {
        console.log(JSON.stringify(value));
        console.log(value.id);
        for (let p in value) {
            let ele = document.getElementById("p_" + p);
            if (ele) {
                if (ele instanceof HTMLSelectElement) {
                    ele.value = value[p];
                }
                else if (p == "url") {
                    ele.contentEditable = false;
                    ele.innerHTML = "<a href='" + value["url"] + "' target='_blank'>" + value["url"] + "</a>";
                }
                else {
                    ele.textContent = value[p];
                }
            }
        }
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


    // === Form and Function ==============

    static AddStatementToKey(event) {
        let row = event.target.parentElement.parentElement.cloneNode(true);
        let cell1 = row.firstElementChild;
        let cell2 = cell1.nextElementSibling;

        cell1.innerHTML = "";
        let input = document.createElement("input");
        input.type = "button";
        input.value = "\u2212";
        input.onclick = Mmx.RemoveStatementFromKey;
        cell1.append(input);

        input = document.createElement("input");
        input.type = "checkbox";
        input.textContent = "Central";
        input.checked = true;
        input.style.height = "1.5em";
        input.style.width = "1.5em";
        cell2.style.textAlign = "center";
        cell2.append(input);
        mmx_dict.keyTable.appendChild(row);
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
        Mmx.SearchDescriptorsByKey(descriptor.mmxKey);
    }

    static GenerateLrmiFromForm() {
        let lrmi = {};

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
        keyRow = keyRow.nextElementSibling;
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

    static LoadDescriptorFromQueue() {
        let urlQuery = new URLSearchParams(window.location.search);
        let eleType = urlQuery.get('eletype');
        let url = "/descriptors?nextFromQueue";
        if (eleType) {
            url += "&eletype=" + eleType;
        }
        Mmx.LoadJsonAsync(url, Mmx.LoadDescriptorFormFromSearchResult);
    }

    static ClearDescriptor() {

        document.getElementById("mmx_status").textContent = "";

        for (let e of Mmx.descProps) {
            let ele = document.getElementById("p_" + e.prop);
            let val;
            if (ele instanceof HTMLSelectElement) {
                ele.value = "o";
            }
            else {
                ele.contentEditable = true;
                ele.textContent = "";
            }
        }

        {
            let headerRow = mmx_dict.keyTable.firstElementChild;
            for (; ;) {
                let keyRow = headerRow.nextElementSibling;
                if (keyRow == null) break;
                mmx_dict.keyTable.removeChild(keyRow);
            }
        }

    }

    static SaveDescriptor() {
        let record = Mmx.GenerateLrmiFromForm();
        record.key = Mmx.GenerateKeyFromForm();

        if (record.key == Mmx.keyPrefix) {
            let status = document.getElementById("mmx_status");
            status.textContent = "Please select at least one statement for the key.";
            status.style.color = "darkred";
            return;
        }

        let json = JSON.stringify(record);

        let xhr = new XMLHttpRequest();
        xhr.open('POST', "/descriptors");
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.onreadystatechange = function () {
            console.log("post-readyState: " + xhr.readyState);
            if (xhr.readyState == 4) {
                if (xhr.status == "200") {
                    document.getElementById("mmx_status").textContent = "Saved!";
                    console.log("Saved!");
                }
                else {
                    document.getElementById("mmx_status").textContent = "Error: " + xhr.responseText;
                    console.log("Error: " + xhr.responseText);
                }
            }
        }
        console.log("Posting Description");
        xhr.send(json);
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
            Mmx.LoadLrmiFormFromStorage();
        }

        for (ele of document.getElementsByClassName("mmx_descriptorSearchForm")) {
            hasFindDescriptor = true;
            Mmx.RenderDescriptorSearchForm(ele);
        }

        for (ele of document.getElementsByClassName("mmx_descriptorSearchDisplay")) {
            Mmx.RenderDescriptorSearchDisplay(ele);
        }

        for (ele of document.getElementsByClassName("mmx_saveButton")) {
            Mmx.RenderSaveButton(ele);
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
            let query = new URLSearchParams(window.location.search);
            let stmtId = query.get("stmtId");
            if (stmtId) {

                mmx_dict.afterSearchDescriptorsById = function () {
                    Mmx.MatchFirstSearchResult();
                    mmx_dict.afterSearchDescriptorsById = undefined;
                }

                Mmx.SearchDescriptorsById(stmtId);
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

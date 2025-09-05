/* MatchMaker Prototype Web Controls
 * Eventually this will likely become a proper JavaScript module.
 * which is a better way to isolate things than using the
 * objects like I've done here.
 */

import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";
const session = new bsession(config.backEndUrl, config.sessionTag);

// Container for MMX Globals
let mmx_dict = {};
window.searchProperty = "Text";
mmx_dict.searchToken = 0;
mmx_dict.inFlight = false;

function extractStmtIDs() {
    const stmtIdElements = document.querySelectorAll(".mm_stmtId");
    const stmtIds = Array.from(stmtIdElements).map(
        (element) => element.textContent
    );
    return stmtIds;
}

function extractAfterSecondId(entries) {
    let secondIdIndex = entries.indexOf("Id", entries.indexOf("Id") + 1);
    if (secondIdIndex === -1) {
        return [];
    }
    return entries.slice(secondIdIndex + 1);
}

function extractAddedIds() {
    return extractAfterSecondId(extractStmtIDs());
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
    return queryParams.join("&");
}

// Using the class like a namespace. All members are static.
class Mmx {
    static keyPrefix = "https://palet.codes/key/";

    static descProps = [
        {
            label: "Type",
            prop: "eleType",
            inner: "<select name='eleType'><option value='o'>Other</option><option value='lr'>Learning Resource</option><option value='cs'>Competency Statement</option><option value='c'>Curriculum</option></select>",
        },
        { label: "Name", prop: "name" },
        { label: "URL", prop: "url" },
        { label: "Subject", prop: "subject" },
        { label: "Description", prop: "description" },
        { label: "Identifier", prop: "identifier" },
        { label: "Ed. Level", prop: "educationalLevel" },
        { label: "Creator", prop: "creator" },
        { label: "Provenance", prop: "provenance" },
        { label: "Date Published", prop: "datePublished" },
        { label: "Repository Date", prop: "sdDatePublished" },
    ];

    static keyLabel = "Key";
    static keyLinkPrefix = "/c/Palet?key=";

    // === Support Functions =======

    static EleTypeTranslate = {
        any: "Any",
        lr: "Learning Resource",
        cs: "Competency Statement",
        c: "Curriculum",
        o: "Other",
    };

    static selectedStatements = [];

    static descriptor;

    static LoadJsonAsync(url, callback, arg) {
        session
            .fetch(url)
            .then((response) => response.json())
            .then((json) => callback(json, arg));
    }

    static StripKeyPrefix(key) {
        let slash = key.lastIndexOf("/");
        return slash >= 0 ? key.substring(slash + 1) : key;
    }

    static CopyProperties(dst, src) {
        for (let attr in template) {
            let prop = template[attr];
            if (typeof prop === "object" && !!prop) {
                dst[attr] = {};
                Mmx.CopyProperties(dst[attr], prop);
            } else {
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
        Mmx.LoadJsonAsync(
            "/key/" + Mmx.StripKeyPrefix(key),
            Mmx.RenderKey_Callback,
            element
        );
    }

    static RenderKeyFromElement(ele) {
        let key = ele.dataset.mmxKey;
        if (!key) {
            return;
        } else {
            if (key == "urlKey") {
                let query = new URLSearchParams(window.location.search);
                key = query.get("key");
            }
            Mmx.RenderKey(key, ele);
        }
    }

    static RenderKey_Callback(jskey, element) {
        element.innerHTML = "";

        element.appendChild(
            bdoc.ele(
                "div",
                bdoc.class("mm_stmtHead"),
                bdoc.ele("span", bdoc.class("mm_stmtId"), "Id"),
                bdoc.ele("span", bdoc.class("mm_stmtCentralWide"), "Rel"),
                bdoc.ele("span", bdoc.class("mm_stmtType"), "Type"),
                bdoc.ele("span", bdoc.class("mm_stmtWideText"), "Statement")
            )
        );

        element.appendChild(bdoc.ele("hr", bdoc.class("mm_listHr")));

        for (let val of jskey.statements) {
            element.appendChild(
                bdoc.ele(
                    "div",
                    bdoc.class("mm_stmt"),
                    bdoc.ele("span", bdoc.class("mm_stmtId"), val.id),
                    bdoc.ele("span", bdoc.class("mm_stmtCentralWide"), val.rel),
                    bdoc.ele("span", bdoc.class("mm_stmtType"), val.stmtType),
                    bdoc.ele(
                        "span",
                        bdoc.class("mm_stmtWideText"),
                        val.statement
                    )
                )
            );
        }
    }

    static setActive(event) {
        window.searchProperty = event.target.textContent;

        let element = event.target;
        // Remove 'active' class from all buttons
        var buttons = document.querySelectorAll(".toggle-button");
        buttons.forEach(function (button) {
            button.classList.remove("active");
        });

        let mmid_search = document.getElementById("mmid_search");
        mmid_search.value = "";
        let mmid_search_btn = document.getElementById("mmid_search_btn")
        let searchOneLiner = document.getElementById("searchOneLiner");

        const searchResults = document.querySelector(".mmc_stmtSearchResult");

        let tooltip = `<div class="info-button-wrapper"> <div class="info-button">i <span class="info-tooltip">Palet statements are returned from most similar (as defined by the AI algorithm) to least similar</span> </div> </div>`;
        if (event.target.textContent === "Text") {
            mmid_search.placeholder = "Add key words to search";
            let text = document.createElement("span");
            text.style = "margin-right: 0.5em;";
            text.textContent =
                "Returned statements match one or more of the search keywords";
            document
                .querySelectorAll(".mmc_stmtSearchResult")
                .forEach((element) => {
                    element.innerHTML = "";
                });
            searchOneLiner.innerHTML = "";
            searchOneLiner.appendChild(text);
            searchOneLiner.innerHTML += tooltip;

            searchResults.textContent =
                "To search for Palet statements, try entering keywords above or clicking one of the AI search options.";
        } else {
            mmid_search.placeholder = "Add another term to augment the search";

            if (window.searchProperty == "AI") {
                let text = document.createElement("span");
                text.style = "margin-right: 0.5em;";
                text.textContent =
                    "Returned statements based on the descriptor abstract";
                searchOneLiner.innerHTML = "";
                searchOneLiner.appendChild(text);
                searchOneLiner.innerHTML += tooltip;
            } else if (window.searchProperty == "AI + Context") {
                let text = document.createElement("span");
                text.style = "margin-right: 0.5em;";
                text.textContent =
                    "Returned statements based on the descriptor abstract and associated context";
                searchOneLiner.innerHTML = "";
                searchOneLiner.appendChild(text);
                searchOneLiner.innerHTML += tooltip;
            }
            Mmx.SearchStatements();
        }

        // Add 'active' class to the clicked button
        element.classList.add("active");
    }

    static RenderStatementSearch(element) {
        // Search replaces this element rather than going into it
        // This won't work when we make search into a webElement
        // but we'll cross that bridge later.

        let parent = element.parentElement;
        parent.removeChild(element);

        parent.appendChild(
            bdoc.ele(
                "div",
                // bdoc.class("control"),
                bdoc.attr(
                    "style",
                    "display: flex; flex-wrap: wrap; margin-bottom: 0.5rem; align-items: flex-end;"
                ),
                bdoc.class("toggle-container"),
                bdoc.ele(
                    "div",
                    bdoc.attr(
                        "style",
                        "display: flex; align-items: flex-end; margin-right: 10px;"
                    ),
                    bdoc.ele(
                        "span",
                        "Search Type:",
                        bdoc.attr(
                            "style",
                            "margin-right: 0.5em; margin-bottom: 0.25em;"
                        )
                    ),
                    bdoc.ele(
                        "div",
                        bdoc.class("toggle-button active"),
                        bdoc.eventListener("click", Mmx.setActive),
                        "Text"
                    ),
                    bdoc.ele(
                        "div",
                        bdoc.class("toggle-button-bionic-container"),
                        "Bionic",
                        bdoc.ele(
                            "div",
                            bdoc.class("toggle-button-container"),
                            bdoc.ele(
                                "div",
                                bdoc.class("toggle-button"),
                                bdoc.eventListener("click", Mmx.setActive),
                                "AI"
                            ),
                            bdoc.ele(
                                "div",
                                bdoc.class("toggle-button"),
                                bdoc.eventListener("click", Mmx.setActive),
                                "AI + Context"
                            )
                        )
                    )
                )
                // bdoc.ele(
                //     "div",
                //     bdoc.attr(
                //         "style",
                //         "display: flex; align-items: flex-end; padding-bottom: 0.25em; gap: 0.5em;"
                //     ),
                //     bdoc.ele("span", "AI Algorithm:  "),
                //     bdoc.ele(
                //         "select",
                //         bdoc.attr("style", "width: 70px;"),
                //         bdoc.ele(
                //             "option",
                //             bdoc.attr("value", "Cosine Similarity"),
                //             "Cosine Similarity"
                //         )
                //     )
                // )
            )
        );

        let searchOneLiner = document.createElement("div");
        searchOneLiner.id = "searchOneLiner";
        searchOneLiner.textContent =
            "Returned statements match one or more of the search keywords";
        let tooltip = `<div class="info-button-wrapper"> <div class="info-button">i <span class="info-tooltip">Palet statements are returned from most similar (as defined by the AI algorithm) to least similar</span> </div> </div>`;
        let text = document.createElement("span");
        text.style = "margin-right: 0.5em;";
        text.textContent =
            "Returned statements match one or more of the search keywords";
        searchOneLiner.innerHTML = "";
        searchOneLiner.appendChild(text);
        searchOneLiner.innerHTML += tooltip;
        searchOneLiner.style = `font-style: italic; font-size: 10px; margin-bottom: 0.5em;"`;
        parent.appendChild(searchOneLiner);

        // Search bar
        parent.appendChild(
            bdoc.ele(
                "div",
                bdoc.class("mmx_stmtSearchBar"),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "search"),
                    bdoc.attr("id", "mmid_search"),
                    bdoc.class("mmc_stmtSearch"),
                    bdoc.attr("placeholder", "Enter search keywords..."),
                    bdoc.eventListener("keydown", (e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            Mmx.SearchStatements(e);
                        }
                    })
                ),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "button"),
                    bdoc.attr("id", "mmid_search_btn"),
                    bdoc.class("mmc_stmtSearchButton"),
                    bdoc.attr("value", "\uD83D\uDD0D"),
                    bdoc.eventListener("click", Mmx.SearchStatements)
                )
            )
        );

        // The remainder gets

        // Results header
        parent.appendChild(
            bdoc.ele(
                "div",
                bdoc.class("mm_stmtHead"),
                bdoc.ele("span", bdoc.class("mm_stmtAdd"), "+"),
                bdoc.ele("span", bdoc.class("mm_stmtId"), "Id"),
                bdoc.ele("span", bdoc.class("mm_stmtType"), "Type"),
                bdoc.ele("span", bdoc.class("mm_stmtText"), "Statement")
            )
        );

        parent.appendChild(bdoc.ele("hr", bdoc.class("mm_listHr")));

        const throttle = (fn, delay) => {
            let last = Date.now();
            return (...args) => {
                if (Date.now() - last >= delay) {
                    fn(...args);
                    last = Date.now();
                }
            };
        };

        const scrollHandler = throttle(({ target }) => {
            const searchProperty = window.searchProperty;

            // guard 1: don’t paginate while a request is in flight
            if (mmx_dict.inFlight) return;

            if (target.scrollTop + target.clientHeight < target.scrollHeight - 1200) return;

            // guard 2: must have a result set for this tab
            const entry = mmx_dict.stmtSearchResultsDict[searchProperty];
            if (!entry || !entry.result) return;

            // guard 3: make sure this is still the latest search
            if (entry.token !== mmx_dict.searchToken) return;

            const loadingMore = document.getElementById("loading-more-results");
            if (loadingMore) loadingMore.style.display = "block";

            mmx_dict.inFlight = true;

            const requestBody = JSON.stringify({
                generatedEmbedding: entry.result.generatedEmbedding,
                offset: entry.offset,
            });

            session.fetch("/api/match/palet", { method: "POST", body: requestBody })
                .then(r => r.json())
                .then(({ statements }) => {
                    // stale? bail silently
                    if (entry.token !== mmx_dict.searchToken) { mmx_dict.inFlight = false; return; }

                    for (const stmt of statements) {
                        if (window.searchProperty === searchProperty) {
                        bdoc.append(
                            mmx_dict.stmtSearchResult,
                            Mmx.GetStatementSearchResultElement(stmt)
                        );
                        }
                        entry.result.statements.push(stmt);
                    }
                    entry.offset += 1;
                })
                .finally(() => {
                    mmx_dict.inFlight = false;
                    const loadingMore = document.getElementById("loading-more-results");
                    if (loadingMore) loadingMore.style.display = "none";
                });
        }, 50);


        mmx_dict.stmtSearchResult = bdoc.ele(
            "div",
            bdoc.class("mmc_stmtSearchResult"),
            "To search for Palet statements, try entering keywords above or clicking one of the AI search options.",
            bdoc.eventListener("scroll", scrollHandler)
        );
        mmx_dict.stmtSearchResultsDict = {
            Text: { offset: 0 },
            AI: { offset: 0 },
            ["AI + Context"]: { offset: 0 },
        };
        mmx_dict.loadingSearch = false;
        parent.appendChild(mmx_dict.stmtSearchResult);
        bdoc.append(
            parent,
            bdoc.ele(
                "span",
                "Loading more results...",
                bdoc.id("loading-more-results"),
                bdoc.attr("style", "display: none; text-align: center;")
            )
        );
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

    static RenderDescriptorMatchDisplay(element) {
        // Clear existing contents
        element.innerHTML = "";

        let results = document.createElement("div");
        mmx_dict.descriptorMatchResults = results;
        element.appendChild(results);
    }

    static OpenCommentModal() {
        const commentModal = document.querySelector("mm-create-comment-modal");
        customElements.whenDefined("mm-create-comment-modal").then(() => {
            commentModal.setCommentFormValues = (commentForm) => {
                commentForm.descriptor = Mmx.descriptor;
                commentForm.statements = Mmx.selectedStatements;

                commentForm.renderFormGroups();
            };
            commentModal.show();
        });
    }

    static ToggleStatementInComment({ target }) {
        const checkbox = target;
        checkbox.stmt.rel =
            checkbox.stmt.rel || (checkbox.checked ? "Central" : "Peripheral");
        if (checkbox.checked) {
            Mmx.selectedStatements.push(checkbox.stmt);
        } else {
            const index = Mmx.selectedStatements.indexOf(checkbox.stmt);
            if (index > -1) {
                Mmx.selectedStatements.splice(index, 1);
            }
        }
    }

    static GenerateRelationshipCommentToggle =
        (stmt) =>
        ({ target }) => {
            stmt.rel = target.checked ? "Central" : "Peripheral";
        };

    static ToggleCommentsView(e) {
        const findAndSelect = document.getElementById("mmx_find_and_select");
        const describeElement = document.getElementById("mmx_describe_element");

        const shouldShowFindAndSelect =
            findAndSelect.classList.contains("transparent");

        findAndSelect.classList.toggle("transparent");
        describeElement.classList.toggle("expanded");

        const stmtRemoveButtons = document.querySelectorAll(".mm_stmtRemove");

        const stmtAddSpans = document.querySelectorAll(".mm_stmtAdd");
        stmtAddSpans.forEach((span) => {
            span.classList.toggle("expanded");
        });

        const stmtKeySpans = document.querySelectorAll(".mm_stmtKeyText");
        stmtKeySpans.forEach((span) => {
            span.classList.toggle("expanded");
        });

        stmtRemoveButtons.forEach((input) => {
            if (shouldShowFindAndSelect) {
                input.value = "\u2212";
                input.type = "button";
                input.removeEventListener(
                    "click",
                    Mmx.ToggleStatementInComment
                );
                bdoc.append(
                    input,
                    bdoc.eventListener("click", Mmx.RemoveStatementFromKey)
                );
            } else {
                input.value = "Comment";
                input.type = "checkbox";
                input.removeEventListener("click", Mmx.RemoveStatementFromKey);
                bdoc.append(
                    input,
                    bdoc.eventListener("click", Mmx.ToggleStatementInComment)
                );
            }
        });

        const keyTableFirstCol = document.getElementById("keyTableFirstCol");
        const commentButton = document.getElementById("mmx_comment_button");
        const toggleButton = e.target;
        if (shouldShowFindAndSelect) {
            keyTableFirstCol.innerHTML = "\u2212"; // Minus sign;
            toggleButton.innerHTML = "Comment on Palet Statements";
            commentButton.style.display = "none";
        } else {
            keyTableFirstCol.innerHTML = "Comment On";
            toggleButton.innerHTML = "Edit Palet Key";
            commentButton.style.display = "inline-block";
        }
    }

    static RenderLrmiForm(element) {
        function addRow(dl, label, id) {
            dl.appendChild(
                bdoc.ele(
                    "div",
                    bdoc.attr("style", "align-items: flex-end;"),
                    bdoc.ele("dt", label),
                    bdoc.ele(
                        "dd",
                        bdoc.class("mmc_editable"),
                        bdoc.attr("contentEditable", "true"),
                        bdoc.attr("id", id)
                    )
                )
            );
        }
        console.log(form);

        element.innerHTML = "";

        var form = bdoc.ele(
            "div",
            bdoc.class("mmc_lrmiForm"),
            bdoc.attr("id", "p_lrmiForm")
        );

        {
            let controlsLeft = bdoc.ele("span", bdoc.class("controls_left"));
            let controlsRight = bdoc.ele("span", bdoc.class("controls_right"));
            let controls = bdoc.ele(
                "div",
                bdoc.class("controls"),
                controlsLeft,
                controlsRight
            );
            controlsLeft.appendChild(
                bdoc.ele(
                    "button",
                    bdoc.eventListener("click", Mmx.MatchDescriptor),
                    bdoc.attr("style", "cursor: pointer;"),
                    "Match"
                )
            );
            controlsLeft.appendChild(document.createTextNode(" "));
            controlsLeft.appendChild(
                bdoc.ele(
                    "button",
                    bdoc.eventListener("click", Mmx.ClearLrmiForm),
                    bdoc.attr("style", "cursor: pointer;"),
                    "Clear"
                )
            );
            controlsLeft.appendChild(document.createTextNode(" "));
            controlsLeft.appendChild(
                bdoc.ele(
                    "button",
                    bdoc.eventListener("click", Mmx.SaveDescriptor),
                    bdoc.attr("style", "cursor: pointer;"),
                    "Save"
                )
            );

            controlsRight.appendChild(
                bdoc.ele(
                    "span",
                    bdoc.class("mm_toggleSurround"),
                    document.createTextNode("All"),
                    bdoc.ele(
                        "input",
                        bdoc.attr("type", "checkbox"),
                        bdoc.attr("id", "input_nokey"),
                        bdoc.class("toggle-switch")
                    ),
                    document.createTextNode("Keyless")
                )
            );
            controlsRight.appendChild(
                bdoc.ele(
                    "button",
                    bdoc.eventListener("click", Mmx.PrevDescriptor),
                    bdoc.attr("style", "cursor: pointer;"),
                    "←"
                )
            );
            controlsRight.appendChild(document.createTextNode("\u00A0")); // Insert a non-breaking space
            controlsRight.appendChild(
                bdoc.ele(
                    "button",
                    bdoc.eventListener("click", Mmx.NextDescriptor),
                    bdoc.attr("style", "cursor: pointer;"),
                    "→"
                )
            );
            form.appendChild(controls);
        }
        form.appendChild(bdoc.ele("p", bdoc.attr("id", "p_parent")));

        form.appendChild(
            bdoc.ele(
                "h2",
                bdoc.class("mmc_editable"),
                bdoc.attr("id", "p_name"),
                bdoc.attr("contentEditable", "true")
            )
        );

        form.appendChild(
            bdoc.ele(
                "section",
                bdoc.class("mmc_editable"),
                bdoc.attr("id", "p_description"),
                bdoc.attr("contentEditable", "true")
            )
        );

        form.appendChild(bdoc.ele("h3", "Detail"));

        let dl = document.createElement("dl");

        // Element type
        dl.appendChild(
            bdoc.ele(
                "div",
                bdoc.attr("style", "align-items: flex-end;"),
                bdoc.ele("dt", "Element Type"),
                bdoc.attr("style", "align-items: flex-end;"),
                bdoc.ele(
                    "dd",
                    bdoc.ele(
                        "select",
                        bdoc.attr("name", "eleType"),
                        bdoc.attr("id", "p_eleType"),
                        bdoc.ele(
                            "option",
                            bdoc.attr("value", ""),
                            "(Element Type)"
                        ),
                        bdoc.ele(
                            "option",
                            bdoc.attr("value", "lr"),
                            "Learning Resource"
                        ),
                        bdoc.ele(
                            "option",
                            bdoc.attr("value", "cs"),
                            "Competency Statement"
                        ),
                        bdoc.ele(
                            "option",
                            bdoc.attr("value", "c"),
                            "Curriculum"
                        ),
                        bdoc.ele("option", bdoc.attr("value", "o"), "Other")
                    )
                )
            )
        );

        addRow(dl, "URL", "p_url");

        addRow(dl, "Subject", "p_subject");
        addRow(dl, "Identifier", "p_identifier");
        addRow(dl, "Ed. Level", "p_educationalLevel");
        addRow(dl, "Creator", "p_creator");
        addRow(dl, "Published", "p_datePublished");
        addRow(dl, "Repository Date", "p_sdDatePublished");
        addRow(dl, "Provenance", "p_provenance");

        form.appendChild(dl);

        const keyDiv = bdoc.ele(
            "div",
            bdoc.attr(
                "style",
                "display: flex; justify-content: space-between; margin-bottom: 0.5em; align-items: center;"
            ),
            bdoc.ele("h3", "Key"),
            bdoc.ele(
                "div",
                bdoc.attr(
                    "style",
                    "margin-top: 0.7em; display: flex; gap: 0.5em;"
                ),
                bdoc.ele(
                    "button",
                    bdoc.attr("style", "cursor: pointer; display: none;"),
                    "Comment",
                    bdoc.id("mmx_comment_button"),
                    bdoc.eventListener("click", Mmx.OpenCommentModal)
                ),
                bdoc.ele(
                    "button",
                    "Comment on Palet Statements",
                    bdoc.attr("style", "cursor: pointer;"),
                    bdoc.eventListener("click", Mmx.ToggleCommentsView)
                )
            )
        );

        form.appendChild(keyDiv);

        form.appendChild(
            bdoc.ele(
                "div",
                bdoc.class("mm_stmtHead"),
                bdoc.ele(
                    "span",
                    bdoc.class("mm_stmtAdd"),
                    "\u2212",
                    bdoc.id("keyTableFirstCol"),
                    bdoc.attr("style", "text-align: left;")
                ), // Minus sign
                bdoc.ele("span", bdoc.class("mm_stmtCentral"), "Cen"),
                bdoc.ele("span", bdoc.class("mm_stmtId"), "Id"),
                bdoc.ele("span", bdoc.class("mm_stmtType"), "Type"),
                bdoc.ele("span", bdoc.class("mm_stmtKeyText"), "Statement")
            )
        );

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
        button.addEventListener("click", Mmx.SearchDescriptorsByKeywords);
        element.appendChild(button);
    }

    // Render an intermediary key into the key composition section
    static async LoadKeyIntoDescriptorSearchForm(key) {
        mmx_dict.keyTable.innerHTML = "";
        if (!key) return;
        const response = await session.fetch("/key/" + Mmx.StripKeyPrefix(key));
        const data = await response.json();

        for (let val of data.statements) {
            const stmtRemoveInput = bdoc.ele(
                "input",
                bdoc.attr("type", "button"),
                bdoc.attr("value", "\u2212"),
                bdoc.eventListener("click", Mmx.RemoveStatementFromKey),
                bdoc.class("mm_stmtRemove")
            );
            stmtRemoveInput.stmt = val;

            mmx_dict.keyTable.appendChild(
                bdoc.ele(
                    "div",
                    bdoc.class("mm_stmt"),
                    bdoc.ele("span", bdoc.class("mm_stmtAdd"), stmtRemoveInput),
                    bdoc.ele(
                        "span",
                        bdoc.class("mm_stmtCentral"),
                        bdoc.ele(
                            "input",
                            bdoc.attr("type", "checkbox"),
                            val.rel === "Central" ? bdoc.attr("checked") : null,
                            bdoc.attr("style", "cursor: pointer;"),
                            bdoc.eventListener(
                                "click",
                                Mmx.GenerateRelationshipCommentToggle(val)
                            )
                        )
                    ),
                    bdoc.ele("span", bdoc.class("mm_stmtId"), val.id),
                    bdoc.ele("span", bdoc.class("mm_stmtType"), val.stmtType),
                    bdoc.ele(
                        "span",
                        bdoc.class("mm_stmtKeyText"),
                        val.statement
                    )
                )
            );
        }
    }

    // === Search Actions =======

    static GetSearchText() {
        const keywords = document.getElementById("mmid_search").value;
        if (window.searchProperty === "AI") {
            return window.description
                ? window.description + keywords
                : undefined;
        } else if (window.searchProperty === "AI + Context") {
            return window.descriptorContext
                ? window.descriptorContext + keywords
                : undefined;
        }
        return keywords;
    }

    static SearchStatements() {
        // claim a new search token
        const token = ++mmx_dict.searchToken;

        // reset UI
        const loadingMore = document.getElementById("loading-more-results");
        if (loadingMore) loadingMore.style.display = "none";

        const searchResults = document.querySelector(".mmc_stmtSearchResult");
        if (searchResults) {
            searchResults.textContent = "Loading...";
            searchResults.style.textAlign = "center";
            searchResults.scrollTop = 0;
        }

        mmx_dict.inFlight = true;

        const keywords = document.getElementById("mmid_search").value;
        if (window.searchProperty === "Text") {
            const keywords = document.getElementById("mmid_search").value;
            const url = "/statements?keywords=" + encodeURIComponent(keywords);
            Mmx.LoadJsonAsync(url, (json) => {
            // stale? ignore
            if (token !== mmx_dict.searchToken) return;

            // cache & render as you already do…
            mmx_dict.inFlight = false;
            if (loadingMore) loadingMore.style.display = "none";
            Mmx.SearchStatements_Callback(json);
            });
            return;
        }

        // AI / AI + Context path
        const text = Mmx.GetSearchText();
        if (!text) { 
            mmx_dict.inFlight = false;
            return;
        }

        const requestBody = JSON.stringify({ matchText: text });

        // cache lookup
        const entry = mmx_dict.stmtSearchResultsDict[window.searchProperty];
        if (entry?.prevSearch === requestBody && entry?.result) {
            // refresh token association for this result set
            entry.token = token;
            entry.offset = 0;            // start pagination fresh
            mmx_dict.inFlight = false;
            if (loadingMore) loadingMore.style.display = "none";
            return Mmx.SearchStatements_Callback(entry.result);
        }

        session.fetch("/api/match/palet", {
            method: "POST",
            body: requestBody,
            headers: { "Content-Type": "application/json; charset=UTF-8" },
        })
        .then(r => r.json())
        .then((json) => {
            if (token !== mmx_dict.searchToken) return; // stale

            mmx_dict.stmtSearchResultsDict[window.searchProperty] = {
            token,                // bind this cache to the latest search
            offset: 0,
            prevSearch: requestBody,
            result: json,
            };

            Mmx.SearchStatements_Callback(json);
        })
        .finally(() => {
            // only the current search clears inFlight
            if (token === mmx_dict.searchToken) {
            mmx_dict.inFlight = false;
            const loadingMore = document.getElementById("loading-more-results");
            if (loadingMore) loadingMore.style.display = "none";
            }
        });
    }

    static GetStatementSearchResultElement(statement) {
        const addStmtButton = bdoc.ele(
            "input",
            bdoc.attr("type", "button"),
            bdoc.attr("value", "+"),
            bdoc.eventListener("click", Mmx.AddStatementToKey)
        );
        addStmtButton.stmt = statement;

        return bdoc.ele(
            "div",
            bdoc.class("mm_stmt"),
            bdoc.ele("span", bdoc.class("mm_stmtAdd"), addStmtButton),
            bdoc.ele("span", bdoc.class("mm_stmtId"), statement.id),
            bdoc.ele("span", bdoc.class("mm_stmtType"), statement.stmtType),
            bdoc.ele("span", bdoc.class("mm_stmtText"), statement.statement)
        );
    }

    static SearchStatements_Callback(result) {
        // Clear existing contents
        mmx_dict.stmtSearchResult.innerHTML = "";
        mmx_dict.stmtSearchResult.style.textAlign = "left";

        let count = 0;
        for (let val of result.statements) {
            mmx_dict.stmtSearchResult.appendChild(
                Mmx.GetStatementSearchResultElement(val)
            );
            ++count;
        }

        if (count == 0) {
            mmx_dict.stmtSearchResult.appendChild(
                bdoc.ele("div", "No statements found to match search terms.")
            );
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

        let matchWeights = jsonToQueryString(
            localStorage.getItem("matchWeightsObj")
        );
        let url = `/descriptors?searchKey=${encodeURIComponent(
            key
        )}&eleType=${eleType}`;
        if (matchWeights) {
            url += `&${matchWeights}`;
        }

        Mmx.LoadJsonAsync(url, Mmx.SearchDescriptorsByKey_Callback);
    }

    static SearchDescriptorsByKey_Callback(result) {
        if (mmx_dict.descriptorMatchResults == null) return;

        Mmx.RenderDescriptorSearchResult(
            result,
            mmx_dict.descriptorMatchResults,
            "newPage"
        );
    }

    static SearchDescriptorsByKeywords() {
        let keywords = mmx_dict.descriptorKeywords.value;
        let eleType = mmx_dict.descriptorType.value;
        let url =
            "/descriptors?searchKeywords=" +
            encodeURIComponent(keywords) +
            "&eleType=" +
            encodeURIComponent(eleType);
        Mmx.LoadJsonAsync(url, Mmx.SearchDescriptorsByKeywords_Callback);
        mmx_dict.searchKeywords = keywords;
        mmx_dict.searchKeywordsEleType = eleType;
    }

    static SearchDescriptorsByKeywords_Callback(result) {
        if (mmx_dict.keywordSearchResult == undefined) return;

        Mmx.RenderDescriptorSearchResult(
            result,
            mmx_dict.keywordSearchResult,
            true
        );
    }

    static SearchDescriptorsById(stmtId) {
        let url = "/descriptors/" + encodeURIComponent(stmtId);
        Mmx.LoadJsonAsync(url, Mmx.SearchDescriptorsById_Callback);
    }

    static SearchDescriptorsById_Callback(result) {
        if (mmx_dict.keywordSearchResult == undefined) return;

        Mmx.RenderDescriptorSearchResult(
            result,
            mmx_dict.keywordSearchResult,
            true
        );
        mmx_dict.afterSearchDescriptorsById();
    }

    static RenderDescriptor(val, matchButton) {
        function addRow(dl, label, value) {
            if (!value) return;
            dl.appendChild(
                bdoc.ele("div", bdoc.ele("dt", label), bdoc.ele("dd", value))
            );
        }

        let descriptor = bdoc.ele("div", bdoc.class("mmc_descriptor"));
        descriptor.mmxId = val.id;
        descriptor.mmxKey = Mmx.StripKeyPrefix(val.key);

        if (val._matchIndex != undefined || matchButton) {
            let annotation = bdoc.ele("div", bdoc.class("annotation"));

            if (val._matchIndex != undefined) {
                annotation.appendChild(
                    bdoc.ele(
                        "div",
                        bdoc.class("mmc_matchindex"),
                        "MatchIndex: " + val._matchIndex
                    )
                );
            }

            if (matchButton) {
                let button = bdoc.ele("button", "Find Matches");
                button.addEventListener(
                    "click",
                    matchButton === "newPage"
                        ? Mmx.OnClickFindMatchesToMatchResult
                        : Mmx.OnClickFindMatchesToSearchResult
                );
                annotation.appendChild(button);
            }

            descriptor.appendChild(annotation);
        }

        if (val.eleType) {
            descriptor.appendChild(
                bdoc.ele("h3", this.EleTypeTranslate[val.eleType])
            );
        }
        if (val.name) {
            descriptor.appendChild(bdoc.ele("h2", val.name));
        } else {
            descriptor.appendChild(bdoc.ele("h2", "Unnamed"));
        }
        if (val.description) {
            descriptor.appendChild(
                bdoc.ele("section", bdoc.preText(val.description))
            );
        }
        descriptor.appendChild(bdoc.ele("h3", "Detail"));

        let dl = document.createElement("dl");

        if (val.url) {
            addRow(
                dl,
                "URL",
                bdoc.ele(
                    "a",
                    bdoc.attr("href", val.url),
                    bdoc.attr("target", "_blank"),
                    val.url
                )
            );
        }
        addRow(dl, "Subject", val.subject);
        addRow(dl, "Identifier", val.identifier);
        addRow(dl, "Ed. Level", val.educationalLevel);
        addRow(dl, "Creator", val.creator);
        addRow(dl, "Provenance", val.provenance);
        addRow(dl, "Date Published", val.datePublishefd);
        addRow(dl, "Repository Date", val.sdDatePublished);

        if (val.key) {
            addRow(
                dl,
                "Key",
                bdoc.ele(
                    "a",
                    bdoc.attr(
                        "href",
                        Mmx.keyLinkPrefix + Mmx.StripKeyPrefix(val.key)
                    ),
                    Mmx.StripKeyPrefix(val.key)
                )
            );
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
            ele.appendChild(
                bdoc.ele("div", "No descriptions found to match search key.")
            );
        }
    }

    static async LoadLrmiForm(value) {
        document.getElementById("mmx_status").textContent = "";
        //console.log(JSON.stringify(value));
        //console.log(value.id);
        var form = document.getElementById("p_lrmiForm");
        form.sourceData = value;
        console.log(value.mainEntityId);

        for (let p in value) {
            let ele = document.getElementById("p_" + p);
            if (ele) {
                if (ele instanceof HTMLSelectElement) {
                    ele.value = value[p];
                } else if (p == "url" && value[p].startsWith("http")) {
                    ele.contentEditable = false;
                    ele.innerHTML =
                        "<a href='" +
                        value["url"] +
                        "' target='_blank'>" +
                        value["url"] +
                        "</a>";
                } else if (p === "description") {
                    ele.innerHTML = value[p];
                    window.description = value[p];
                } else {
                    ele.textContent = value[p];
                }
            }
        }

        function parentOf(id, collectionObject) {
            let keys = Object.keys(collectionObject);
            for (let i = 0; i < keys.length; i++) {
                if (collectionObject[keys[i]].includes(id)) {
                    return keys[i];
                }
            }
            return -1;
        }

        let data = await session.fetch(
            "/api/collections/" + value.mainEntityId
        );
        data = await data.json();

        let collectionObject = {};
        let nodeParents = {};
        let nodes = [];
        let currentIntID;

        for (let i = 0; i < data["collection"].length; i++) {
            collectionObject[i] = data["collection"][i]["intHasPart"];
            nodeParents[i] = [];
            nodes.push(i);
            if (data["collection"][i].id === value.id) {
                currentIntID = i;
            }
        }

        let currentNode = nodes[currentIntID];
        let parentOfCurrentNode = parentOf(currentNode, collectionObject);
        while (parentOfCurrentNode !== -1) {
            nodeParents[currentNode].push(parentOfCurrentNode);
            parentOfCurrentNode = parentOf(
                parseInt(parentOfCurrentNode),
                collectionObject
            );
        }
        let parents = nodeParents[currentNode];
        parents.reverse();
        let parentText = "";

        let contextDescription = "";

        for (let i = 0; i < parents.length; i++) {
            let abstr = data["collection"][parents[i]].description.substring(
                0,
                100
            );
            if (data["collection"][parents[i]].description) {
                contextDescription +=
                    data["collection"][parents[i]].description + " ";
            }
            if (data["collection"][parents[i]].description.length > 100) {
                abstr += "...";
            }

            let spacing = 0;
            for (let j = 0; j < i; j++) {
                spacing += 0.5;
            }
            parentText +=
                `<div style = "margin-left: ${spacing}rem;">` +
                data["collection"][parents[i]].name +
                " - " +
                abstr +
                "</div>";
        }

        window.descriptorContext = contextDescription;
        let ele = document.getElementById("p_parent");
        ele.addEventListener("click", () => {
            document.getElementById("lineage_title").textContent =
                document.getElementById("lineage_title").textContent ===
                "▼ Descriptor Context"
                    ? "► Descriptor Context"
                    : "▼ Descriptor Context";
        });

        ele.setAttribute("style", "style='cursor: pointer;'");

        ele.innerHTML = "";

        const descriptorLineageSpan = bdoc.ele(
            "span",
            bdoc.attr("id", "descriptor_lineage"),
            bdoc.attr("style", "display: none;"),
            parentText
        );
        descriptorLineageSpan.innerHTML = parentText;
        ele.appendChild(
            bdoc.ele(
                "span",
                bdoc.eventListener("click", () => {
                    document.getElementById(
                        "descriptor_lineage"
                    ).style.display =
                        document.getElementById("descriptor_lineage").style
                            .display === "none"
                            ? "block"
                            : "none";
                }),
                bdoc.ele(
                    "strong",
                    bdoc.attr("id", "lineage_title"),
                    "► Descriptor Context"
                ),
                bdoc.ele("br"),
                descriptorLineageSpan
            )
        );

        // Load Key
        Mmx.LoadKeyIntoDescriptorSearchForm(value.key);
    }

    static LoadLrmiFormFromStorage() {
        if (sessionStorage.describeStmt) {
            console.log(sessionStorage.describeStmt);
            var stmt = JSON.parse(sessionStorage.describeStmt);
            //sessionStorage.removeItem('describeStmt');

            if (!stmt.provenance) {
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

        Mmx.descriptor = desc;
        this.LoadLrmiForm(desc);
    }

    // === Form and Function ==============

    static AddStatementToKey(event) {
        let row = event.target.parentElement.parentElement.cloneNode(true);
        const stmt = event.target.stmt;
        let cellAdd = row.firstElementChild;
        let cellId = cellAdd.nextElementSibling;
        let cellStmt = cellId.nextElementSibling.nextElementSibling;

        let addedIds = extractAddedIds();
        if (addedIds.includes(cellId.textContent)) {
            alert("Error: Palet Statement already selected");
        } else {
            // Convert first cell to remove
            cellAdd.innerHTML = "";
            const stmtRemoveInput = bdoc.ele(
                "input",
                bdoc.attr("type", "button"),
                bdoc.attr("value", "\u2212"), // Minus sign
                bdoc.eventListener("click", Mmx.RemoveStatementFromKey),
                bdoc.class("mm_stmtRemove")
            );
            stmtRemoveInput.stmt = stmt;
            cellAdd.appendChild(stmtRemoveInput);

            // Insert central cell
            row.insertBefore(
                bdoc.ele(
                    "span",
                    bdoc.class("mm_stmtCentral"),
                    bdoc.ele(
                        "input",
                        bdoc.attr("type", "checkbox"),
                        bdoc.attr("textContent", "Central"),
                        bdoc.attr("checked"),
                        bdoc.attr("style", "cursor: pointer;"),
                        bdoc.eventListener(
                            "click",
                            Mmx.GenerateRelationshipCommentToggle(stmt)
                        )
                    )
                ),
                cellId
            );

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
        Mmx.SelectAndMatchDescriptor(
            mmx_dict.keywordSearchResult.firstElementChild
        );
    }

    static SelectAndMatchDescriptor(descriptor) {
        // Deselect
        if (mmx_dict.selectedDescriptor) {
            mmx_dict.selectedDescriptor.classList.remove("mm_active");
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
            } else {
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
                statement: keyRow.children[4].textContent,
            };
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
            } else if (ele) {
                ele.contentEditable = true;
                ele.textContent = "";
            } else {
                console.log(e.prop);
            }
        }

        mmx_dict.keyTable.innerHTML = "";
    }

    static async SaveDescriptor() {
        console.log("saving");
        let record = Mmx.GenerateLrmiFromForm();
        record.key = Mmx.GenerateKeyFromForm();

        let json = JSON.stringify(record);

        let verb;
        let url;
        if (record.id) {
            verb = "PUT";
            url = "/api/descriptors";
        }
        // else {
        //     verb = "POST";
        //     url = "/api/descriptors";
        // }

        const response = await session.fetch(url, {
            method: verb,
            headers: {
                "Content-Type": "application/json",
            },
            body: json,
        });
        if (response.ok) {
            alert("Saved!");
        } else {
            try {
                alert(
                    `Save error: ${response.status} ${response.statusText}: ${text}`
                );
            } catch (error) {
                alert("Save error");
                console.log(error);
            }
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
        const response = await session.fetch(
            "/api/collections/" +
                id +
                "/" +
                (nextPrev ? "next" : "prev") +
                (nokey ? "?skipWithKey" : "")
        );
        const data = await response.json();
        if (data.success) {
            await Mmx.LoadLrmiFormFromDatabase(data.id);

            let mmid_search = document.getElementById("mmid_search");
            mmid_search.value = "";

            if (window.searchProperty !== "Text") {
                Mmx.SearchStatements();
            } else {
                const searchResults = document.querySelector(".mmc_stmtSearchResult");
                searchResults.textContent =
                "To search for Palet statements, try entering keywords above or clicking one of the AI search options.";
            }
        } else {
            if (nextPrev) {
                alert("No more descriptors.");
            } else {
                alert("No preceding descriptors.");
            }
        }
    }

    // === Initialization ===================

    static getCookie(cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(";");
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
            if (query.get("src") == "dynamic") {
                Mmx.LoadLrmiFormFromStorage();
            } else {
                const descId = query.get("id");
                if (descId) {
                    Mmx.LoadLrmiFormFromDatabase(descId);
                }
            }
        }

        for (ele of document.getElementsByClassName(
            "mmx_descriptorSearchForm"
        )) {
            hasFindDescriptor = true;
            Mmx.RenderDescriptorSearchForm(ele);
        }

        for (ele of document.getElementsByClassName(
            "mmx_descriptorSearchDisplay"
        )) {
            Mmx.RenderDescriptorSearchDisplay(ele);
        }

        for (ele of document.getElementsByClassName("mmx_searchButton")) {
            Mmx.RenderSearchButton(ele);
        }

        for (ele of document.getElementsByClassName(
            "mmx_descriptorMatchFilter"
        )) {
            Mmx.RenderDescriptorMatchFilter(ele);
        }

        for (ele of document.getElementsByClassName(
            "mmx_descriptorMatchDisplay"
        )) {
            Mmx.RenderDescriptorMatchDisplay(ele);
        }

        if (hasFindDescriptor) {
            let stmtId = query.get("stmtId");
            if (stmtId) {
                mmx_dict.afterSearchDescriptorsById = function () {
                    Mmx.MatchFirstSearchResult();
                    mmx_dict.afterSearchDescriptorsById = undefined;
                };

                Mmx.SearchDescriptorsById(stmtId);
            } else if (query.get("src") == "dynamic") {
                console.log("dynamic");
                if (sessionStorage.matchDescriptor) {
                    console.log(sessionStorage.matchDescriptor);
                    let val = JSON.parse(sessionStorage.matchDescriptor);
                    mmx_dict.keywordSearchResult.appendChild(
                        Mmx.RenderDescriptor(val, true)
                    );
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

        const mainElement = document.querySelector("main");
        if (mainElement) {
            mainElement.classList.add("mm_descColumns");
        }
    }
}

window.addEventListener("load", Mmx.OnPageLoad);
window.addEventListener("popstate", (event) => {
    location.reload();
});

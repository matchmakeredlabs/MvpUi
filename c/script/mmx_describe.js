/* MatchMaker Prototype Web Controls
 * Eventually this will likely become a proper JavaScript module.
 * which is a better way to isolate things than using the
 * objects like I've done here.
 */

import bdoc from "./bdoc.js";
import "./mm-loading.js";
import config from "/config.js";
import bsession from "./bsession.js";
import MmMatchProfileSelect from "./mm-match-profile-select.js";
import {
    composeStatementSearchText,
    getStatementSearchEndpoint,
    normalizeStatementSearchTypeForMode,
    statementSearchTypes,
    statementSearchUsesAI,
    transitionStatementSearchType,
} from "./mm-statement-search-text.js";
const session = new bsession(config.backEndUrl, config.sessionTag);

// Container for MMX Globals
let mmx_dict = {};
window.searchProperty = "Text";
mmx_dict.searchToken = 0;
mmx_dict.inFlight = false;
mmx_dict.statementSearchController = null;
mmx_dict.paginationRequest = null;
mmx_dict.descriptorInFlight = false;

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

    static UpdateSearchExplanation(searchType) {
        const searchOneLiner = document.getElementById("searchOneLiner");
        if (!searchOneLiner) return;
        let tooltip = `<div class="info-button-wrapper"> <div class="info-button">i <span class="info-tooltip">Palet statements are returned from most similar (as defined by the AI algorithm) to least similar</span> </div> </div>`;
        const descriptions = {
            [statementSearchTypes.text]:
                "Returned statements match one or more of the search keywords",
            [statementSearchTypes.descriptor]:
                "Returned statements are based on the search text and descriptor abstract",
            [statementSearchTypes.context]:
                "Returned statements are based on the search text, descriptor abstract, and associated context",
        };
        const text = document.createElement("span");
        text.style.marginRight = "0.5em";
        text.textContent = descriptions[searchType];
        searchOneLiner.replaceChildren(text);
        searchOneLiner.innerHTML += tooltip;
    }

    static ApplyStatementSearchType(
        searchType,
        { runSearch = true } = {}
    ) {
        const buttons = {
            [statementSearchTypes.text]:
                document.getElementById("search_text"),
            [statementSearchTypes.descriptor]:
                document.getElementById("search_desc"),
            [statementSearchTypes.context]:
                document.getElementById("search_context"),
        };

        Object.values(buttons).forEach((button) =>
            button?.classList.remove("active")
        );
        buttons[statementSearchTypes.text]?.classList.add("active");
        if (searchType !== statementSearchTypes.text) {
            buttons[statementSearchTypes.descriptor]?.classList.add("active");
        }
        if (searchType === statementSearchTypes.context) {
            buttons[statementSearchTypes.context]?.classList.add("active");
        }

        const useAI = statementSearchUsesAI(searchType);
        const modeToggle = document.getElementById("search_eco");
        if (modeToggle) modeToggle.checked = useAI;

        const searchInput = document.getElementById("mmid_search");
        if (searchInput) {
            searchInput.placeholder = useAI
                ? "Add another term to augment the search"
                : "Add key words to search";
        }

        window.searchProperty = searchType;
        localStorage.setItem("preferredSearch", searchType);
        localStorage.setItem("useAIPaletSearch", useAI);
        Mmx.UpdateSearchExplanation(searchType);

        if (runSearch && !mmx_dict.descriptorInFlight) {
            Mmx.SearchStatements();
        }
    }

    static SelectStatementSearchType(event) {
        const selectedType = event.currentTarget.dataset.searchType;
        const nextType = transitionStatementSearchType(
            window.searchProperty,
            selectedType
        );
        Mmx.ApplyStatementSearchType(nextType);
    }

    static async RenderStatementSearch(element) {
        // Load eco mode setting
        if (localStorage.getItem("useAIPaletSearch") === null) {
            // Default to Eco search until the user selects AI.
            localStorage.setItem("useAIPaletSearch", false);
            localStorage.setItem("preferredSearch", "Text");
        }

        // Search replaces this element rather than going into it
        // This won't work when we make search into a webElement
        // but we'll cross that bridge later.

        let parent = element.parentElement;
        parent.removeChild(element);

        parent.appendChild(
            bdoc.ele(
                "div",
                bdoc.attr(
                    "style",
                    "flex-wrap: wrap; margin-bottom: 0.5rem; align-items: flex-end; justify-content: space-between"
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
                        bdoc.class(
                            "toggle-button active search-type-text-option"
                        ),
                        bdoc.attr("id", "search_text"),
                        bdoc.attr("data-search-type", statementSearchTypes.text),
                        bdoc.eventListener(
                            "click",
                            Mmx.SelectStatementSearchType
                        ),
                        "Text"
                    ),
                    bdoc.ele(
                        "div",
                        bdoc.class("search-type-ai-options"),
                        bdoc.ele(
                            "div",
                            bdoc.class("toggle-button"),
                            bdoc.attr("id", "search_desc"),
                            bdoc.attr(
                                "data-search-type",
                                statementSearchTypes.descriptor
                            ),
                            bdoc.eventListener(
                                "click",
                                Mmx.SelectStatementSearchType
                            ),
                            "+ Descriptor"
                        ),
                        bdoc.ele(
                            "div",
                            bdoc.class("toggle-button"),
                            bdoc.attr("id", "search_context"),
                            bdoc.attr(
                                "data-search-type",
                                statementSearchTypes.context
                            ),
                            bdoc.eventListener(
                                "click",
                                Mmx.SelectStatementSearchType
                            ),
                            "+ Context"
                        )
                    )
                ),
                bdoc.ele(
                    "div",
                    bdoc.attr(
                        "style",
                        "display: flex; flex-direction: column; align-items: center;"
                    ),
                    bdoc.attr("id", "search_mode_container"),
                    bdoc.ele(
                        "span",
                        "Search Mode",
                        bdoc.ele(
                            "div",
                            bdoc.class("info-button-wrapper"),
                            bdoc.attr(
                                "style",
                                "margin-left: 0.25em; vertical-align: top;"
                            ),
                            bdoc.ele(
                                "div",
                                bdoc.class("info-button"),
                                "i",
                                bdoc.ele(
                                    "span",
                                    bdoc.class("info-tooltip"),
                                    bdoc.attr("style", "width: 250px;"),
                                    "Eco search mode uses keyword matching to return results, while AI search mode uses a vector space model for semantic matching. Eco search mode uses less energy than AI search mode."
                                )
                            )
                        )
                    ),

                    bdoc.ele(
                        "span",
                        document.createTextNode("Eco"),
                        bdoc.ele(
                            "input",
                            bdoc.attr("type", "checkbox"),
                            bdoc.attr("id", "search_eco"),
                            bdoc.class("toggle-switch"),
                            bdoc.eventListener("click", Mmx.ToggleEco)
                        ),
                        document.createTextNode("AI")
                    )
                )
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

        parent.appendChild(
            bdoc.ele(
                "div",
                bdoc.class("mmx_stmtSearchBar"),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "search"),
                    bdoc.attr("id", "mmid_search"),
                    bdoc.class("mmc_stmtSearch"),
                    bdoc.attr("placeholder", "Add key words to search"),
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

            // Initial searches and pagination have separate request state. A
            // stale page request must never unlock a newer descriptor search.
            if (mmx_dict.inFlight || mmx_dict.paginationRequest) return;

            if (
                target.scrollTop + target.clientHeight <
                target.scrollHeight - 200
            )
                return;

            // guard 2: must have a result set for this tab
            const entry = mmx_dict.stmtSearchResultsDict[searchProperty];
            if (!entry || !entry.result) return;

            // guard 3: make sure this is still the latest search
            if (entry.token !== mmx_dict.searchToken) return;

            // Vector search is the only mode that supports paging. Offset 0
            // means there is no next page, and hasMore is cleared after a
            // short/empty page is returned.
            if (!entry.offset || entry.hasMore === false) return;

            if (localStorage.getItem("useAIPaletSearch") === "false") {
                return;
            }

            const loadingMore = document.getElementById("loading-more-results");
            if (loadingMore) loadingMore.show();

            const paginationController = new AbortController();
            const paginationRequest = {
                token: entry.token,
                entry,
                offset: entry.offset,
                controller: paginationController,
            };
            mmx_dict.paginationRequest = paginationRequest;

            const requestBody = JSON.stringify({
                generatedEmbedding: entry.result.generatedEmbedding,
                offset: paginationRequest.offset,
            });

            session
                .fetch("/api/match/palet?useVectorSearch", {
                    method: "POST",
                    body: requestBody,
                    headers: {
                        "Content-Type": "application/json; charset=UTF-8",
                    },
                    signal: paginationController.signal,
                })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(
                            `Statement pagination failed (${response.status}).`
                        );
                    }
                    return response.json();
                })
                .then(({ statements, nextOffset }) => {
                    if (
                        mmx_dict.paginationRequest !== paginationRequest ||
                        entry.token !== mmx_dict.searchToken
                    )
                        return;

                    const pageStatements = Array.isArray(statements)
                        ? statements
                        : [];
                    const knownStatementIds = new Set(
                        entry.result.statements.map((statement) => statement.id)
                    );

                    for (const stmt of pageStatements) {
                        if (knownStatementIds.has(stmt.id)) continue;
                        knownStatementIds.add(stmt.id);
                        if (window.searchProperty === searchProperty) {
                            bdoc.append(
                                mmx_dict.stmtSearchResult,
                                Mmx.GetStatementSearchResultElement(stmt)
                            );
                        }
                        entry.result.statements.push(stmt);
                    }
                    entry.offset = nextOffset;
                    entry.hasMore =
                        pageStatements.length === 100 &&
                        Number.isInteger(nextOffset) &&
                        nextOffset > paginationRequest.offset;
                })
                .catch((error) => {
                    if (
                        error.name !== "AbortError" &&
                        mmx_dict.paginationRequest === paginationRequest
                    ) {
                        console.error(error);
                    }
                })
                .finally(() => {
                    if (mmx_dict.paginationRequest !== paginationRequest) {
                        return;
                    }
                    mmx_dict.paginationRequest = null;
                    const loadingMore = document.getElementById(
                        "loading-more-results"
                    );
                    if (loadingMore) loadingMore.hide();
                });
        }, 50);

        mmx_dict.stmtSearchResult = bdoc.ele(
            "div",
            bdoc.class("mmc_stmtSearchResult"),
            "Enter keywords to search for Palet statements.",
            bdoc.eventListener("scroll", scrollHandler)
        );
        mmx_dict.stmtSearchResult.style.textAlign = "center";
        mmx_dict.stmtSearchResultsDict = {};
        parent.appendChild(mmx_dict.stmtSearchResult);
        bdoc.append(
            parent,
            bdoc.ele(
                "mm-loading",
                bdoc.id("loading-more-results"),
                bdoc.attr("message", "Loading more results..."),
                bdoc.attr("hidden", "")
            )
        );

        const useAI =
            localStorage.getItem("useAIPaletSearch") === "true";
        let preferredSearch =
            localStorage.getItem("preferredSearch") || "Text";
        preferredSearch = normalizeStatementSearchTypeForMode(
            preferredSearch,
            useAI
        );
        // Selecting the initial mode only configures the controls. The
        // descriptor refresh owns the page's one automatic statement load.
        Mmx.ApplyStatementSearchType(preferredSearch, { runSearch: false });
    }

    static ToggleEco() {
        const useAI = document.getElementById("search_eco").checked;
        const searchType = normalizeStatementSearchTypeForMode(
            window.searchProperty,
            useAI
        );
        Mmx.ApplyStatementSearchType(searchType);
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
                bdoc.attr(
                    "style",
                    "position: sticky; top: 0; z-index: 20; background: white; padding-bottom: 0.35em;"
                ),
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
                    bdoc.class("arrow_button"),
                    bdoc.attr("id", "left_arrow"),
                    bdoc.attr("disabled", "true"),
                    "←"
                )
            );
            controlsRight.appendChild(document.createTextNode("\u00A0")); // Insert a non-breaking space
            controlsRight.appendChild(
                bdoc.ele(
                    "button",
                    bdoc.eventListener("click", Mmx.NextDescriptor),
                    bdoc.class("arrow_button"),
                    bdoc.attr("id", "right_arrow"),
                    bdoc.attr("disabled", "true"),
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
        if (!response.ok) {
            throw new Error(`Palet key request failed (${response.status}).`);
        }
        const data = await response.json();
        if (!Array.isArray(data.statements)) {
            throw new Error("Palet key response did not contain statements.");
        }

        for (let val of data.statements) {
            const renderedInSearch = document.getElementById("stmt_" + val.id);
            if (renderedInSearch) {
                renderedInSearch.style.display = "none";
            }

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
                    bdoc.id("stmt_key_" + val.id),
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

    static NormalizeSearchPart(value) {
        if (!value) return "";
        const element = document.createElement("div");
        element.innerHTML = value;
        return (element.textContent || "").replace(/\s+/g, " ").trim();
    }

    static GetSearchText({ auto = false } = {}) {
        const keywords = document.getElementById("mmid_search")?.value || "";
        const descriptor = document.getElementById("p_description")?.textContent;
        const normalizedKeywords = Mmx.NormalizeSearchPart(keywords);
        const normalizedDescriptor = Mmx.NormalizeSearchPart(descriptor);

        return composeStatementSearchText({
            searchProperty: window.searchProperty,
            keywords: normalizedKeywords,
            descriptor: normalizedDescriptor,
            context: Mmx.NormalizeSearchPart(window.descriptorContext),
            auto,
        });
    }

    static SetNavigationButtonState(disabled) {
        const leftArrow = document.getElementById("left_arrow");
        const rightArrow = document.getElementById("right_arrow");
        if (!leftArrow || !rightArrow) return;
        if (disabled) {
            leftArrow.setAttribute("disabled", "true");
            rightArrow.setAttribute("disabled", "true");
        } else {
            leftArrow.removeAttribute("disabled");
            rightArrow.removeAttribute("disabled");
        }
    }

    static ShowStatementSearchLoading() {
        const searchResults = document.querySelector(
            ".mmc_stmtSearchResult"
        );
        if (!searchResults) return null;

        const loadingState = {
            container: searchResults,
            previousChildren: Array.from(searchResults.childNodes),
            previousTextAlign: searchResults.style.textAlign,
            previousScrollTop: searchResults.scrollTop,
        };

        searchResults.replaceChildren(
            bdoc.ele(
                "mm-loading",
                bdoc.attr("message", "Loading search results..."),
                bdoc.attr("style", "display: flex; margin: 2em auto;")
            )
        );
        searchResults.style.textAlign = "center";
        searchResults.scrollTop = 0;
        return loadingState;
    }

    static RestoreStatementSearch(loadingState) {
        if (!loadingState) return;
        loadingState.container.replaceChildren(
            ...loadingState.previousChildren
        );
        loadingState.container.style.textAlign =
            loadingState.previousTextAlign;
        loadingState.container.scrollTop = loadingState.previousScrollTop;
    }

    static CancelStatementRequests() {
        ++mmx_dict.searchToken;
        mmx_dict.statementSearchController?.abort();
        mmx_dict.statementSearchController = null;
        mmx_dict.paginationRequest?.controller?.abort();
        mmx_dict.paginationRequest = null;
        mmx_dict.inFlight = false;

        const loadingMore = document.getElementById("loading-more-results");
        if (loadingMore) loadingMore.hide();

        return mmx_dict.searchToken;
    }

    static SearchStatements(options = {}) {
        // Every user or descriptor refresh starts a new request. There is no
        // result cache here: each search-mode change and descriptor change must
        // reload its statements exactly once.
        const token = Mmx.CancelStatementRequests();
        const searchProperty = window.searchProperty;

        const text = Mmx.GetSearchText(options);
        const searchResults = document.querySelector(".mmc_stmtSearchResult");
        if (!text || text.trim().length === 0) {
            Mmx.SetNavigationButtonState(false);

            if (
                searchProperty === statementSearchTypes.text &&
                searchResults
            ) {
                searchResults.textContent =
                    "Enter keywords to search for Palet statements.";
                searchResults.style.textAlign = "center";
                searchResults.scrollTop = 0;
            }

            return Promise.resolve(null);
        }

        if (searchResults && options.showLoading !== false) {
            Mmx.ShowStatementSearchLoading();
        }

        Mmx.SetNavigationButtonState(true);
        mmx_dict.inFlight = true;

        const controller = new AbortController();
        mmx_dict.statementSearchController = controller;
        const requestBody = JSON.stringify({ matchText: text });
        const useAI = localStorage.getItem("useAIPaletSearch") === "true";
        const url = getStatementSearchEndpoint(useAI);

        return session
            .fetch(url, {
                method: "POST",
                body: requestBody,
                headers: {
                    "Content-Type": "application/json; charset=UTF-8",
                },
                signal: controller.signal,
            })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        `Statement search failed (${response.status}).`
                    );
                }
                return response.json();
            })
            .then((json) => {
                if (
                    token !== mmx_dict.searchToken ||
                    mmx_dict.statementSearchController !== controller
                )
                    return null;

                const entry = {
                    token,
                    offset: json.nextOffset,
                    hasMore:
                        useAI &&
                        Array.isArray(json.statements) &&
                        json.statements.length === 100 &&
                        Number.isInteger(json.nextOffset) &&
                        json.nextOffset > 0,
                    prevSearch: requestBody,
                    result: json,
                };
                mmx_dict.stmtSearchResultsDict[searchProperty] = entry;

                Mmx.SearchStatements_Callback(json);
                return json;
            })
            .catch((error) => {
                if (
                    error.name !== "AbortError" &&
                    token === mmx_dict.searchToken &&
                    mmx_dict.statementSearchController === controller &&
                    searchResults
                ) {
                    console.error(error);
                    searchResults.textContent =
                        "Unable to load statement search results.";
                    searchResults.style.textAlign = "left";
                }
                return null;
            })
            .finally(() => {
                if (
                    token !== mmx_dict.searchToken ||
                    mmx_dict.statementSearchController !== controller
                )
                    return;
                mmx_dict.statementSearchController = null;
                mmx_dict.inFlight = false;
                Mmx.SetNavigationButtonState(false);
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

        const stmtDiv = bdoc.ele(
            "div",
            bdoc.class("mm_stmt"),
            bdoc.id("stmt_" + statement.id),
            bdoc.ele("span", bdoc.class("mm_stmtAdd"), addStmtButton),
            bdoc.ele("span", bdoc.class("mm_stmtId"), statement.id),
            bdoc.ele("span", bdoc.class("mm_stmtType"), statement.stmtType),
            bdoc.ele("span", bdoc.class("mm_stmtText"), statement.statement)
        );

        return stmtDiv;
    }

    static SearchStatements_Callback(result) {
        // Clear existing contents
        mmx_dict.stmtSearchResult.innerHTML = "";
        mmx_dict.stmtSearchResult.style.textAlign = "left";

        let count = 0;
        for (let val of result.statements) {
            const renderedInKey = document.getElementById("stmt_key_" + val.id);
            if (!renderedInKey) {
                mmx_dict.stmtSearchResult.appendChild(
                    Mmx.GetStatementSearchResultElement(val)
                );
                ++count;
            }
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
        window.description = "";
        window.descriptorContext = "";

        var form = document.getElementById("p_lrmiForm");
        form.sourceData = value;
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

        const keyPromise = Mmx.LoadKeyIntoDescriptorSearchForm(value.key).catch(
            (error) => {
                console.error(error);
                mmx_dict.keyTable.replaceChildren(
                    bdoc.ele("p", "Unable to load the descriptor's Palet key.")
                );
            }
        );
        function parentOf(id, collectionObject) {
            let keys = Object.keys(collectionObject);
            for (let i = 0; i < keys.length; i++) {
                if (collectionObject[keys[i]].includes(id)) {
                    return keys[i];
                }
            }
            return -1;
        }

        let data = { collection: [] };
        if (value.mainEntityId) {
            try {
                const response = await session.fetch(
                    "/api/collections/" + value.mainEntityId
                );
                if (response.ok) {
                    const collectionData = await response.json();
                    if (Array.isArray(collectionData.collection)) {
                        data = collectionData;
                    }
                } else {
                    console.error(
                        `Descriptor context request failed (${response.status}).`
                    );
                }
            } catch (error) {
                // Collection context is supplementary. A failure here should not
                // prevent the descriptor itself from being displayed or edited.
                console.error("Unable to load descriptor context.", error);
            }
        }

        let collectionObject = {};
        let nodeParents = {};
        let nodes = [];
        let currentIntID;

        for (let i = 0; i < data.collection.length; i++) {
            collectionObject[i] = data.collection[i]._intHasPart || [];
            nodeParents[i] = [];
            nodes.push(i);
            if (data.collection[i].id === value.id) {
                currentIntID = i;
            }
        }

        const currentNode = nodes[currentIntID];
        if (currentNode !== undefined) {
            let parentOfCurrentNode = parentOf(
                currentNode,
                collectionObject
            );
            while (parentOfCurrentNode !== -1) {
                nodeParents[currentNode].push(parentOfCurrentNode);
                parentOfCurrentNode = parentOf(
                    parseInt(parentOfCurrentNode),
                    collectionObject
                );
            }
        }

        let parents = nodeParents[currentNode] || [];
        parents.reverse();
        let parentText = "";

        let contextDescription = "";

        for (let i = 0; i < parents.length; i++) {
            const parent = data.collection[parents[i]];
            const description = parent.description || "";
            let abstr = description.substring(0, 100);
            if (description) {
                contextDescription += description + " ";
            }
            if (description.length > 100) {
                abstr += "...";
            }

            let spacing = 0;
            for (let j = 0; j < i; j++) {
                spacing += 0.5;
            }
            parentText +=
                `<div style = "margin-left: ${spacing}rem;">` +
                parent.name +
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

        await keyPromise;
    }

    static ShowDescriptorLoading(container) {
        const previousChildren = Array.from(container.childNodes);
        const loading = bdoc.ele(
            "mm-loading",
            bdoc.attr("message", "Loading descriptor..."),
            bdoc.attr("style", "display: flex; margin: 2em auto;")
        );
        container.replaceChildren(loading);
        return { container, loading, previousChildren };
    }

    static RestoreDescriptor({ container, previousChildren }) {
        container.replaceChildren(...previousChildren);
    }

    static async DisplayLrmiForm(value, container, loading) {
        Mmx.RenderLrmiForm(container);
        const form = container.querySelector("#p_lrmiForm");
        form.hidden = true;
        container.prepend(loading);

        try {
            await Mmx.LoadLrmiForm(value);
            loading.remove();
            form.hidden = false;
            mmx_dict.descriptorInFlight = false;

            // The outer descriptor refresh already put the statement panel in
            // its one loading state. Start exactly one automatic search without
            // replacing that loader a second time.
            void Mmx.SearchStatements({ auto: true, showLoading: false });
        } catch (error) {
            mmx_dict.descriptorInFlight = false;
            console.error(error);
            container.replaceChildren(
                bdoc.ele("p", "Unable to load the descriptor.")
            );
            throw error;
        }
    }

    static async LoadLrmiFormFromStorage(container, loading) {
        if (sessionStorage.describeStmt) {
            console.log(sessionStorage.describeStmt);
            var stmt = JSON.parse(sessionStorage.describeStmt);
            //sessionStorage.removeItem('describeStmt');

            if (!stmt.provenance) {
                var provenance = sessionStorage.provenance;
                if (!provenance) provenance = "Demo";
                stmt.provenance = provenance;
            }

            return Mmx.DisplayLrmiForm(stmt, container, loading);
        }
        mmx_dict.descriptorInFlight = false;
        Mmx.RenderLrmiForm(container);
    }

    static async LoadLrmiFormFromDatabase(id, container, loading) {
        try {
            const response = await session.fetch("/api/descriptors/" + id);
            if (!response.ok) {
                throw new Error(
                    `Descriptor request failed (${response.status}).`
                );
            }
            const data = await response.json();
            const desc = data.descriptors?.[0];
            if (!desc) throw new Error("Descriptor response was empty.");

            Mmx.descriptor = desc;
            await Mmx.DisplayLrmiForm(desc, container, loading);
        } catch (error) {
            mmx_dict.descriptorInFlight = false;
            console.error(error);
            container.replaceChildren(
                bdoc.ele("p", "Unable to load the descriptor.")
            );
            throw error;
        }
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
            bdoc.append(row, bdoc.id("stmt_key_" + cellId.textContent));

            // Change class of last element
            cellStmt.className = "mm_stmtKeyText";
            mmx_dict.keyTable.appendChild(row);

            event.target.parentElement.parentElement.style.display = "none";
        }
    }

    static RemoveStatementFromKey(event) {
        let row = event.target.parentElement.parentElement;

        console.log(row.id);
        if (row.id) {
            let stmtId = row.id.substring("stmt_key_".length);
            let renderedInSearch = document.getElementById("stmt_" + stmtId);
            if (renderedInSearch) {
                renderedInSearch.style.display = "block";
            }
        }
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
            await Mmx.SearchStatements();
        } else {
            try {
                const text = await response.text();
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
        Mmx.SetNavigationButtonState(true);

        // Invalidate any search still completing for the old descriptor, then
        // clear both columns before beginning navigation. This prevents the old
        // statement list from lingering beside the new descriptor's loader.
        mmx_dict.descriptorInFlight = true;
        Mmx.CancelStatementRequests();
        const statementLoadingState = Mmx.ShowStatementSearchLoading();
        const loadingState = Mmx.ShowDescriptorLoading(
            document.querySelector(".mmx_lrmiCompose")
        );
        try {
            const response = await session.fetch(
                "/api/collections/" +
                    id +
                    "/" +
                    (nextPrev ? "next" : "prev") +
                    (nokey ? "?skipWithKey" : "")
            );
            const data = await response.json();
            if (data.success) {
                document.getElementById("mmid_search").value = "";
                mmx_dict.stmtSearchResultsDict = {};
                await Mmx.LoadLrmiFormFromDatabase(
                    data.id,
                    loadingState.container,
                    loadingState.loading
                );
            } else if (nextPrev) {
                mmx_dict.descriptorInFlight = false;
                Mmx.RestoreDescriptor(loadingState);
                Mmx.RestoreStatementSearch(statementLoadingState);
                alert("No more descriptors.");
            } else {
                mmx_dict.descriptorInFlight = false;
                Mmx.RestoreDescriptor(loadingState);
                Mmx.RestoreStatementSearch(statementLoadingState);
                alert("No preceding descriptors.");
            }
        } catch (error) {
            mmx_dict.descriptorInFlight = false;
            if (loadingState.loading.isConnected) {
                Mmx.RestoreDescriptor(loadingState);
            }
            Mmx.RestoreStatementSearch(statementLoadingState);
            throw error;
        } finally {
            Mmx.SetNavigationButtonState(false);
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

    static async OnPageLoad(keyParent) {
        const query = new URLSearchParams(window.location.search);
        const hasInitialDescriptor =
            (query.get("src") === "dynamic" &&
                Boolean(sessionStorage.describeStmt)) ||
            Boolean(query.get("id"));
        // Check for style override in the query string
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

        const lrmiComposeElements = Array.from(
            document.getElementsByClassName("mmx_lrmiCompose")
        );

        for (ele of document.getElementsByClassName("mmx_statementSearch")) {
            await Mmx.RenderStatementSearch(ele);
        }
        if (hasInitialDescriptor) {
            mmx_dict.descriptorInFlight = true;
            Mmx.CancelStatementRequests();
            Mmx.ShowStatementSearchLoading();
        }

        for (ele of lrmiComposeElements) {
            if (query.get("src") == "dynamic") {
                const loadingState = Mmx.ShowDescriptorLoading(ele);
                await Mmx.LoadLrmiFormFromStorage(
                    ele,
                    loadingState.loading
                );
            } else {
                const descId = query.get("id");
                if (descId) {
                    const loadingState = Mmx.ShowDescriptorLoading(ele);
                    await Mmx.LoadLrmiFormFromDatabase(
                        descId,
                        ele,
                        loadingState.loading
                    );
                } else {
                    Mmx.RenderLrmiForm(ele);
                }
            }
        }

        Mmx.SetNavigationButtonState(false);

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

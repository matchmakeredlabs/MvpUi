import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

export default class MmCollections extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    static fetchCollections = async () => {
        const response = await MmCollections.session.fetch("/api/collections");
        const collections = (await response.json()).collections || [];
        return MmCollections.normalizeProjectIds(collections);
    };

    static getProjectValues = (item) => {
        const projectFields = [
            "_projectId",
            "projectId",
            "project",
            "_orgId",
            "orgId",
            "organizationId",
            "organization",
        ];
        const values = [];

        for (const field of projectFields) {
            const value = item?.[field];
            const fieldValues =
                value instanceof Set
                    ? Array.from(value)
                    : Array.isArray(value)
                      ? value
                      : [value];

            for (const fieldValue of fieldValues) {
                if (
                    fieldValue !== null &&
                    fieldValue !== "" &&
                    fieldValue !== undefined &&
                    !values.includes(fieldValue)
                ) {
                    values.push(fieldValue);
                }
            }
        }

        return values;
    };

    static getProjectId = (item) => MmCollections.getProjectValues(item)[0] || "";

    static normalizeProjectId = (item) => {
        if (!item) return item;

        item._projectId = MmCollections.getProjectId(item);
        return item;
    };

    static normalizeProjectIds = (items) => {
        items.forEach(MmCollections.normalizeProjectId);
        return items;
    };

    static normalizeProjectIdSet = (item) => {
        if (!item) return item;

        const values = MmCollections.getProjectValues(item);
        if (values.length > 0) {
            item._projectId = new Set(values);
        }
        return item;
    };

    connectedCallback() {
        bdoc.append(
            this.shadowRoot,
            bdoc.ele(
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/styles.css")
            ),
            bdoc.ele(
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/mm-collections.css")
            ),
            bdoc.ele(
                "div",
                bdoc.attr("style", "padding-left:2em;"),

                bdoc.ele("h2", "Collections")
            ),
            bdoc.ele(
                "mm-filter-table",
                bdoc.attr("filter-properties", "subject,publisher,_projectId,note"),
                bdoc.attr(
                    "filter-display-names",
                    JSON.stringify({
                        ["_projectId"]: "Project",
                    })
                ),
                bdoc.attr(
                    "sort-properties",
                    "Name,Subject,Publisher,Project,Described,Note"
                ),
                bdoc.attr("display-properties", "subject,publisher,note")
            ),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-filter-table.js")
            )
        );
        this.#renderCollections();
    }

    #renderCollections = async () => {
        const collections = await MmCollections.fetchCollections();
        for (const collection of collections) {
            const leafWithKeyCount = collection._leafWithKeyCount;
            const leafCount = collection._leafCount;
            if (
                leafWithKeyCount === null ||
                leafCount === null ||
                leafCount === 0
            ) {
                // default to 0described
                collection.percentDescribed = 0;
                continue;
            }

            if (leafCount < 0 || leafWithKeyCount < 0) {
                const negativeCounts = [];
                if (leafCount < 0) {
                    negativeCounts.push(`leafCount (${leafCount})`);
                }
                if (leafWithKeyCount < 0) {
                    negativeCounts.push(`leafWithKeyCount (${leafWithKeyCount})`);
                }
                const negativeDetails = negativeCounts.join(" and ");
                alert(
                    `Error: Collection "${collection.name}" contains invalid negative values for ${negativeDetails}.`
                );
                collection.percentDescribed = 0;
                continue;
            }
            collection.percentDescribed = Math.round(
                (leafWithKeyCount / leafCount) * 100
            );
        }

        customElements.whenDefined("mm-filter-table").then(() => {
            const filterTable =
                this.shadowRoot.querySelector("mm-filter-table");

            const attrOrNull = (attr) => (collection) => {
                let currentValue = collection[attr];
                if (
                    currentValue === null ||
                    currentValue === "" ||
                    currentValue === undefined
                ) {
                    currentValue = "Null";
                }
                return currentValue;
            };

            filterTable.generateCols = (displayProperties) => ({
                ["Name"]: (collection) =>
                    bdoc.ele(
                        "a",
                        bdoc.attr("href", "/c/Browse?id=" + collection.id),
                        collection.name
                    ),
                ...displayProperties.reduce((acc, property) => {
                    acc[property] = (item) => {
                        let currentValue = item[property];
                        if (
                            currentValue === null ||
                            currentValue === "" ||
                            currentValue === undefined
                        ) {
                            currentValue = "Null";
                        }

                        if (property === "note") {
                            if (currentValue.length > 30) {
                                return currentValue.slice(0, 27) + "...";
                            }
                            return currentValue;
                        }

                        if (currentValue.length > 15 && !currentValue.includes(" ")) {
                            return currentValue.slice(0, 12) + "...";
                        }
                        return currentValue;
                    };
                    return acc;
                }, {}),
                ["Project"]: (collection) => collection._projectId || "Null",
                ["Described"]: (collection) => {
                    const percent = collection.percentDescribed;
                    return bdoc.ele(
                        "td",
                        bdoc.attr("style", "text-align: center;"),
                        `${percent}%`
                    );
                },
            });

            const sortPotentiallyNull = (attr) => (a, b) => {
                const aValue = a[attr] || "Null";
                const bValue = b[attr] || "Null";
                if (aValue === bValue) {
                    return 0;
                }
                return aValue.localeCompare(bValue);
            };

            filterTable.customSorts = {
                ["Name"]: sortPotentiallyNull("name"),
                ["Subject"]: sortPotentiallyNull("subject"),
                ["Publisher"]: sortPotentiallyNull("publisher"),
                ["Project"]: (a, b) => (a._projectId < b._projectId ? -1 : 1),
                ["Described"]: (a, b) => {
                    return a.percentDescribed - b.percentDescribed;
                },
                ["Note"]: (a, b) => {
                    const aNote = a.note || "";
                    const bNote = b.note || "";
                    return aNote.localeCompare(bNote);
                },
            };

            filterTable.generateFilterOptions = (_displayElements, filters, selectedOptions, root) => {
                collections.forEach((collection) => {
                    filters.forEach((filter) => {
                        if (!(filter in collection)) {
                            const currentValue = "Null";
                            if (!(currentValue in selectedOptions[filter])) {
                                selectedOptions[filter][currentValue] = false;
                                bdoc.append(
                                    root.getElementById(`${filter}-dropdown`),
                                    bdoc.ele(
                                        "option",
                                        currentValue,
                                        bdoc.attr("value", currentValue)
                                    )
                                );
                            }
                        } else {
                            // Handle note field as a string, other fields as Sets
                            if (filter === "note") {
                                const currentValue = collection[filter];
                                if (
                                    currentValue === null ||
                                    currentValue === "" ||
                                    currentValue === undefined
                                ) {
                                    const nullValue = "Null";
                                    if (!(nullValue in selectedOptions[filter])) {
                                        selectedOptions[filter][nullValue] = false;
                                        bdoc.append(
                                            root.getElementById(`${filter}-dropdown`),
                                            bdoc.ele(
                                                "option",
                                                nullValue,
                                                bdoc.attr("value", nullValue)
                                            )
                                        );
                                    }
                                } else if (!(currentValue in selectedOptions[filter])) {
                                    selectedOptions[filter][currentValue] = false;
                                    bdoc.append(
                                        root.getElementById(`${filter}-dropdown`),
                                        bdoc.ele(
                                            "option",
                                            currentValue,
                                            bdoc.attr("value", currentValue)
                                        )
                                    );
                                }
                            } else {
                                const currentValue = collection[filter];
                                if (
                                    currentValue === null ||
                                    currentValue === "" ||
                                    currentValue === undefined
                                ) {
                                    const nullValue = "Null";
                                    if (!(nullValue in selectedOptions[filter])) {
                                        selectedOptions[filter][nullValue] = false;
                                        bdoc.append(
                                            root.getElementById(`${filter}-dropdown`),
                                            bdoc.ele(
                                                "option",
                                                nullValue,
                                                bdoc.attr("value", nullValue)
                                            )
                                        );
                                    }
                                } else if (!(currentValue in selectedOptions[filter])) {
                                    selectedOptions[filter][currentValue] = false;
                                    bdoc.append(
                                        root.getElementById(`${filter}-dropdown`),
                                        bdoc.ele(
                                            "option",
                                            currentValue,
                                            bdoc.attr("value", currentValue)
                                        )
                                    );
                                }
                            }
                        }
                    });
                });
            };

            filterTable.dataFilteredByFilterOptions = (filteredBySearch, filters) =>
                filteredBySearch
                    .filter((item) =>
                        Object.keys(filters).every((filter) =>
                            Object.keys(filters[filter]).some(
                                (selected) => filters[filter][selected]
                            )
                                ? Object.keys(filters[filter]).some((selected) =>
                                    filters[filter][selected]
                                        ? filter === "note"
                                            ? (item[filter] === selected) ||
                                              (selected === "Null" &&
                                                  (item[filter] === undefined ||
                                                      item[filter] === null ||
                                                      item[filter] === ""))
                                            : (item[filter] === selected) ||
                                              (selected === "Null" &&
                                                  (item[filter] === undefined ||
                                                      item[filter] === null ||
                                                      item[filter] === ""))
                                        : false
                                )
                                : true
                        )
                    );

            filterTable.loadData(collections);
        });
    };
}
customElements.define("mm-collections", MmCollections);

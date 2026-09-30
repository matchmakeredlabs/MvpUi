import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import config from "/config.js";
import MmMatchProfileSelect from "./mm-match-profile-select.js";
import MmCollections from "./mm-collections.js";
import "./mm-loading.js";

export default class MmViewCustomSets extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);
    static #legacyMigration;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    loadingElement;

    connectedCallback() {
        this.loadingElement = bdoc.ele(
            "mm-loading",
            bdoc.attr("message", "Loading custom sets..."),
            bdoc.attr("style", "display: flex; margin: 2em auto;")
        );

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
                bdoc.attr("href", "/c/res/mm-view-custom-sets.css")
            ),
            bdoc.ele(
                "div",
                bdoc.attr("style", "padding-left:2em;"),

                bdoc.ele("h2", "Custom Sets")
            ),
            bdoc.ele(
                "div",
                bdoc.id("custom-sets-filter-table-container"),
                this.loadingElement
            ),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-filter-table.js")
            )
        );
        this.#renderCustomSets();
    }

    static collectionIdOf = (customSet) => {
        if (customSet?.collectionId) return customSet.collectionId;
        if (customSet?.associatedCollectionId)
            return customSet.associatedCollectionId;
        return "";
    };

    static descriptorIdsOf = (customSet) => {
        if (
            Array.isArray(customSet?.descriptorIds) &&
            customSet.descriptorIds.length > 0
        ) {
            return customSet.descriptorIds.filter(
                (id) => typeof id === "string" && id
            );
        }
        const descriptors = Array.isArray(customSet?.descriptors)
            ? customSet.descriptors
            : Object.values(customSet?.descriptors || {});
        return descriptors
            .map((descriptor) => descriptor?.id)
            .filter((id) => typeof id === "string" && id);
    };

    static formatTimestamp = (iso) => {
        if (!iso) return "";
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return String(iso);
        return date.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    static #collectionCache = new Map();

    static fetchCollection = async (collectionId) => {
        if (!collectionId) return null;
        if (MmViewCustomSets.#collectionCache.has(collectionId)) {
            return MmViewCustomSets.#collectionCache.get(collectionId);
        }
        const response = await MmViewCustomSets.session.fetch(
            `/api/collections/${encodeURIComponent(collectionId)}`
        );
        if (!response.ok) return Promise.reject(response);
        const collection = (await response.json()).collection;
        MmViewCustomSets.#collectionCache.set(collectionId, collection);
        return collection;
    };

    static async #migrateLegacyCustomSets() {
        let settings;
        try {
            settings = await MmMatchProfileSelect.getSettings();
        } catch {
            return;
        }
        const legacy = settings?.customSets;
        if (
            !legacy ||
            typeof legacy !== "object" ||
            Object.keys(legacy).length === 0
        )
            return;

        const response = await MmViewCustomSets.session.fetch("/api/customSets");
        if (!response.ok) return;
        const existing = (await response.json()).items || [];
        const names = new Set(existing.map((set) => set.name));

        for (const [name, set] of Object.entries(legacy)) {
            if (names.has(name)) continue;
            const collectionId = MmViewCustomSets.collectionIdOf(set);
            const descriptorIds = MmViewCustomSets.descriptorIdsOf(set);
            if (!collectionId || descriptorIds.length === 0) continue;
            const createResponse = await MmViewCustomSets.session.fetch(
                "/api/customSets",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        collectionId,
                        descriptorIds,
                    }),
                }
            );
            if (!createResponse.ok) return;
        }

        const cleared = { ...settings };
        delete cleared.customSets;
        await MmMatchProfileSelect.updateSettings(cleared, {});
    }

    static fetchCustomSets = async () => {
        if (!MmViewCustomSets.#legacyMigration) {
            MmViewCustomSets.#legacyMigration =
                MmViewCustomSets.#migrateLegacyCustomSets().catch((error) => {
                    MmViewCustomSets.#legacyMigration = null;
                    throw error;
                });
        }
        await MmViewCustomSets.#legacyMigration;

        const response = await MmViewCustomSets.session.fetch("/api/customSets");
        if (!response.ok) return Promise.reject(response);
        const items = (await response.json()).items || [];
        const customSets = {};
        for (const item of items) {
            if (item?.name) customSets[item.name] = item;
        }
        return customSets;
    };

    // Keep ids that still exist in the live collection, always including the root.
    static refreshDescriptorIds = (customSet, liveCollection) => {
        const liveIds = new Set(
            (liveCollection || []).map((descriptor) => descriptor?.id).filter(Boolean)
        );
        const rootId =
            MmViewCustomSets.collectionIdOf(customSet) || liveCollection?.[0]?.id;
        if (!rootId || !liveIds.has(rootId)) return [];

        const kept = [];
        const seen = new Set();
        for (const id of MmViewCustomSets.descriptorIdsOf(customSet)) {
            if (liveIds.has(id) && !seen.has(id)) {
                kept.push(id);
                seen.add(id);
            }
        }
        if (!seen.has(rootId)) kept.unshift(rootId);
        return kept;
    };

    // Resolve referenced ids against the live source collection for display/matching.
    static resolveDescriptors = async (customSet, liveCollection = null) => {
        const collectionId = MmViewCustomSets.collectionIdOf(customSet);
        const live =
            liveCollection ||
            (collectionId
                ? await MmViewCustomSets.fetchCollection(collectionId)
                : null);
        if (!live || live.length === 0) return [];

        const keptIds = new Set(
            MmViewCustomSets.refreshDescriptorIds(customSet, live)
        );
        if (keptIds.size === 0) return [];

        const liveById = new Map();
        for (const descriptor of live) {
            if (descriptor?.id) liveById.set(descriptor.id, descriptor);
        }
        const root = liveById.get(collectionId) || live[0];
        if (!root || !keptIds.has(root.id)) return [];

        const byId = new Map();
        for (const id of keptIds) {
            const liveNode = liveById.get(id);
            if (liveNode) byId.set(id, { ...liveNode });
        }

        const children = new Map();
        for (const node of byId.values()) {
            if (node.id === root.id) {
                delete node.isPartOfId;
                continue;
            }
            let parentId = node.isPartOfId;
            while (parentId && !byId.has(parentId)) {
                parentId = liveById.get(parentId)?.isPartOfId;
            }
            if (!parentId || parentId === node.id || !byId.has(parentId))
                parentId = root.id;
            node.isPartOfId = parentId;
            if (!children.has(parentId)) children.set(parentId, []);
            children.get(parentId).push(node);
        }

        const sortNodes = (a, b) => {
            const byIdentifier = (a.identifier || "").localeCompare(
                b.identifier || ""
            );
            if (byIdentifier) return byIdentifier;
            const byUrl = (a.url || "").localeCompare(b.url || "");
            if (byUrl) return byUrl;
            return (a.name || "").localeCompare(b.name || "");
        };

        let nextIntId = 0;
        const ordered = [];
        const walk = (node, rank, position) => {
            node.intId = nextIntId++;
            node.rank = rank;
            node.position = position;
            ordered.push(node);
            const kids = (children.get(node.id) || []).slice().sort(sortNodes);
            const intHasPart = [];
            let leafCount = 0;
            let leafWithKeyCount = 0;
            if (kids.length === 0) {
                node._isLeaf = true;
                leafCount = 1;
                leafWithKeyCount = node.key ? 1 : 0;
            } else {
                node._isLeaf = false;
                kids.forEach((kid, index) => {
                    walk(kid, rank + 1, index);
                    intHasPart.push(kid.intId);
                    leafCount += kid._leafCount || 0;
                    leafWithKeyCount += kid._leafWithKeyCount || 0;
                });
            }
            node.intHasPart = intHasPart;
            node._leafCount = leafCount;
            node._leafWithKeyCount = leafWithKeyCount;
            node.leafCount = leafCount;
            node.leafWithKeyCount = leafWithKeyCount;
        };

        walk(byId.get(root.id), 0, 0);
        return ordered;
    };

    static resolveCustomSets = async (customSetsData) => {
        const resolved = {};
        const names = Object.keys(customSetsData || {});
        await Promise.all(
            names.map(async (name) => {
                const customSet = customSetsData[name];
                const descriptors = await MmViewCustomSets.resolveDescriptors(
                    customSet
                ).catch(() => []);
                resolved[name] = { ...customSet, descriptors };
            })
        );
        return resolved;
    };

    static generateSummarizedAndDisplayCustomSets = (customSetsData) => {
        const summarizedCustomSets = [];

        Object.keys(customSetsData).forEach((customSetName) => {
            const customSet = customSetsData[customSetName];

            let leafCount = 0;
            let leafWithKeyCount = 0;
            for (const descriptor of customSet.descriptors || []) {
                if (descriptor._isLeaf) {
                    leafCount++;
                    if (descriptor.key && descriptor.key !== "") {
                        leafWithKeyCount++;
                    }
                }
            }

            if (leafCount < 0 || leafWithKeyCount < 0) {
                const negativeCounts = [];
                if (leafCount < 0) {
                    negativeCounts.push(`leafCount (${leafCount})`);
                }
                if (leafWithKeyCount < 0) {
                    negativeCounts.push(
                        `leafWithKeyCount (${leafWithKeyCount})`
                    );
                }
                const negativeDetails = negativeCounts.join(" and ");
                alert(
                    `Error: Custom set "${customSetName}" contains invalid negative values for ${negativeDetails}.`
                );
                leafCount = Math.max(leafCount, 0);
                leafWithKeyCount = Math.max(leafWithKeyCount, 0);
            }

            let summarizedCustomSet = {};

            summarizedCustomSet.percentDescribed =
                leafCount > 0
                    ? Math.round((leafWithKeyCount / leafCount) * 100)
                    : 0;

            summarizedCustomSet.name = customSetName;

            Object.values(customSet.descriptors || {}).forEach((descriptor) => {
                Object.keys(descriptor).forEach((key) => {
                    if (key === "name") {
                        return;
                    }
                    if (!(key in summarizedCustomSet)) {
                        summarizedCustomSet[key] = new Set();
                    }
                    summarizedCustomSet[key].add(descriptor[key]);
                });
            });

            MmCollections.normalizeProjectIdSet(summarizedCustomSet);
            summarizedCustomSet.created = customSet.created || "";
            summarizedCustomSet.updated = customSet.updated || "";
            summarizedCustomSet.id = customSet.id || "";
            summarizedCustomSet.collectionId =
                MmViewCustomSets.collectionIdOf(customSet);

            summarizedCustomSets.push(summarizedCustomSet);
        });

        const displayCustomSets = {};

        summarizedCustomSets.forEach((summarizedCustomSet) => {
            displayCustomSets[summarizedCustomSet.name] = {};
            Object.keys(summarizedCustomSet).forEach((key) => {
                let displayValue = "";
                if (summarizedCustomSet[key] instanceof Set) {
                    const uniqueValues = Array.from(summarizedCustomSet[key]);
                    uniqueValues.forEach((value, i) => {
                        displayValue += value;
                        if (i < uniqueValues.length - 1) {
                            displayValue += ", ";
                        }
                    });
                } else {
                    displayValue = summarizedCustomSet[key];
                }
                displayCustomSets[summarizedCustomSet.name][key] = displayValue;
            });
        });

        return [summarizedCustomSets, displayCustomSets];
    };

    static generateFilterOptionsCallback =
        (summarizedCustomSets) =>
        (_displayElements, filters, selectedOptions, root) => {
            summarizedCustomSets.forEach((summarizedCustomSet) => {
                filters.forEach((filter) => {
                    if (!(filter in summarizedCustomSet)) {
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
                        summarizedCustomSet[filter].forEach((currentValue) => {
                            if (
                                currentValue === null ||
                                currentValue === "" ||
                                currentValue === undefined
                            ) {
                                currentValue = "Null";
                            }

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
                        });
                    }
                });
            });
        };

    static generateDataFilteredBySearchKeywordsCallback =
        (summarizedCustomSets) => (_displayData, keywords) =>
            keywords.length > 0
                ? summarizedCustomSets.filter((summarizedCustomSet) =>
                      keywords.some((keyword) =>
                          JSON.stringify(summarizedCustomSet.name)
                              .toLowerCase()
                              .includes(keyword.toLowerCase())
                      )
                  )
                : summarizedCustomSets;

    static generateDataFilteredByFilterOptionsCallback =
        (displayCustomSets) => (filteredBySearch, filters) =>
            filteredBySearch
                .filter((item) =>
                    Object.keys(filters).every((filter) =>
                        Object.keys(filters[filter]).some(
                            (selected) => filters[filter][selected]
                        )
                            ? Object.keys(filters[filter]).some((selected) =>
                                  filters[filter][selected]
                                      ? (item[filter] &&
                                            item[filter].has(selected)) ||
                                        (selected === "Null" &&
                                            (item[filter] === undefined ||
                                                item[filter] === null ||
                                                item[filter] === "" ||
                                                item[filter].size === 0 ||
                                                item[filter].has("")))
                                      : false
                              )
                            : true
                    )
                )
                .map(
                    (summarizedCustomSet) =>
                        displayCustomSets[summarizedCustomSet.name]
                );

    static nameElementCallback = (customSet) =>
        bdoc.ele(
            "a",
            bdoc.attr("href", `/c/ViewCustomSet?key=${customSet.name}`),
            customSet.name
        );

    #renderCustomSets = async () => {
        let customSetsData;
        try {
            customSetsData = await MmViewCustomSets.fetchCustomSets();
            customSetsData = await MmViewCustomSets.resolveCustomSets(
                customSetsData
            );
        } catch {
            this.loadingElement.hide();
            const customSetsFilterTableContainer =
                this.shadowRoot.querySelector(
                    "#custom-sets-filter-table-container"
                );
            bdoc.append(
                customSetsFilterTableContainer,
                bdoc.ele(
                    "div",
                    bdoc.attr("style", "margin: 2em;"),
                    bdoc.ele("p", "Unable to load custom sets.")
                )
            );
            return;
        }

        let summarizedCustomSets, displayCustomSets;
        try {
            [summarizedCustomSets, displayCustomSets] =
                MmViewCustomSets.generateSummarizedAndDisplayCustomSets(
                    customSetsData
                );
        } catch {
            summarizedCustomSets = [];
            displayCustomSets = {};
        }

        this.loadingElement.hide();

        customElements.whenDefined("mm-filter-table").then(() => {
            const customSetsFilterTableContainer =
                this.shadowRoot.querySelector(
                    "#custom-sets-filter-table-container"
                );

            if (!summarizedCustomSets || summarizedCustomSets.length === 0) {
                bdoc.append(
                    customSetsFilterTableContainer,
                    bdoc.ele(
                        "div",
                        bdoc.attr("style", "margin: 2em;"),
                        bdoc.ele("p", "No custom sets found."),
                        bdoc.ele(
                            "a",
                            bdoc.attr("href", "/c/CreateSets"),
                            "Create a custom set"
                        )
                    )
                );
            } else {
                const filterTable = bdoc.ele(
                    "mm-filter-table",
                    bdoc.attr(
                        "filter-properties",
                        "subject,publisher,_projectId"
                    ),
                    bdoc.attr(
                        "filter-display-names",
                        JSON.stringify({
                            ["_projectId"]: "Project",
                        })
                    ),
                    bdoc.attr(
                        "sort-properties",
                        "name,Created,subject,publisher,Project,Described"
                    ),
                    bdoc.attr("display-properties", "subject,publisher")
                );

                bdoc.append(customSetsFilterTableContainer, filterTable);

                filterTable.generateFilterOptions =
                    MmViewCustomSets.generateFilterOptionsCallback(
                        summarizedCustomSets
                    );
                filterTable.dataFilteredBySearchKeywords =
                    MmViewCustomSets.generateDataFilteredBySearchKeywordsCallback(
                        summarizedCustomSets
                    );
                filterTable.dataFilteredByFilterOptions =
                    MmViewCustomSets.generateDataFilteredByFilterOptionsCallback(
                        displayCustomSets
                    );

                filterTable.nameElementCallback =
                    MmViewCustomSets.nameElementCallback;

                filterTable.generateCols = (displayProperties) => ({
                    name: MmViewCustomSets.nameElementCallback,
                    Created: (customSet) =>
                        MmViewCustomSets.formatTimestamp(customSet.created),
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
                            return currentValue;
                        };
                        return acc;
                    }, {}),
                    Project: (collection) => collection._projectId || "Null",

                    ["Described"]: (customSet) =>
                        bdoc.ele(
                            "td",
                            bdoc.attr("style", "text-align: center;"),
                            `${customSet.percentDescribed}%`
                        ),
                });

                filterTable.customSorts = {
                    Created: (a, b) => {
                        if (!a.created) return 1;
                        if (!b.created) return -1;
                        if (a.created < b.created) return -1;
                        if (a.created > b.created) return 1;
                        return 0;
                    },
                    ["Described"]: (a, b) => {
                        return a.percentDescribed - b.percentDescribed;
                    },
                    Project: (a, b) => (a._projectId < b._projectId ? -1 : 1),
                };

                filterTable.loadData(Object.values(displayCustomSets));
            }
        });
    };
}
customElements.define("mm-view-custom-sets", MmViewCustomSets);

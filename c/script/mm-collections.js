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
        return (await response.json()).collections;
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
                bdoc.attr("filter-properties", "subject,publisher,_orgId"),
                bdoc.attr(
                    "filter-display-names",
                    JSON.stringify({
                        ["_orgId"]: "Organization",
                    })
                ),
                bdoc.attr(
                    "sort-properties",
                    "Name,Subject,Publisher,Organization,Described"
                )
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

            filterTable.generateCols = () => ({
                ["Name"]: (collection) =>
                    bdoc.ele(
                        "a",
                        bdoc.attr("href", "/c/Browse?id=" + collection.id),
                        collection.name
                    ),
                ["Subject"]: attrOrNull("subject"),
                ["Publisher"]: attrOrNull("publisher"),
                Organization: (collection) => collection._orgId || "Null",
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
                Organization: (a, b) => (a._orgId < b._orgId ? -1 : 1),
                ["Described"]: (a, b) => {
                    return a.percentDescribed - b.percentDescribed;
                },
            };

            filterTable.loadData(collections);
        });
    };
}
customElements.define("mm-collections", MmCollections);

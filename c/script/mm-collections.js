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
                bdoc.attr("filter-properties", "subject,publisher"),
                bdoc.attr("sort-properties", "name,subject,publisher"),
                bdoc.attr("display-properties", "subject,publisher")
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

        customElements.whenDefined("mm-filter-table").then(() => {
            this.shadowRoot
                .querySelector("mm-filter-table")
                .loadData(collections);
        });
    };
}
customElements.define("mm-collections", MmCollections);

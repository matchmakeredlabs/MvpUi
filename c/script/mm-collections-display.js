import bdoc from "./bdoc.js";

class MmCollectionsDisplay extends HTMLElement {
    static observedAttributes = [
        "display-properties",
        "on-collection-click-url",
    ];

    #collections = [];
    #displayProperties = [];
    #onCollectionClickUrl = "";

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    set collections(collections) {
        this.#collections = collections;

        this.render();
    }

    connectedCallback() {
        const table = bdoc.ele("mm-table");

        bdoc.append(
            this.shadowRoot,
            table,
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-table.js")
            )
        );
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case "display-properties":
                this.#displayProperties = newValue.split(",");
                break;
            case "on-collection-click-url":
                this.#onCollectionClickUrl = newValue;
                break;
        }
    }

    render() {
        const table = this.shadowRoot.querySelector("mm-table");

        customElements.whenDefined("mm-table").then(() => {
            table.cols = {
                name: (collection) =>
                    bdoc.ele(
                        "a",
                        bdoc.attr(
                            "href",
                            `${this.#onCollectionClickUrl}?id=${collection.id}`
                        ),
                        collection.name
                    ),
                ...this.#displayProperties.reduce((acc, property) => {
                    acc[property] = (collection) => {
                        let currentValue = collection[property];
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
            };
            table.data = this.#collections;
        });
    }
}
customElements.define("mm-collections-display", MmCollectionsDisplay);

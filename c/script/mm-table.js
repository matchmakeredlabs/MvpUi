import bdoc from "./bdoc.js";

class MmTable extends HTMLElement {
    static observedAttributes = [
        "first-col-width",
        "sort-properties",
        "last-col-width",
    ];

    #data = [];

    #cols = {};

    #firstColWidth = "60%";

    #sortProperties = [];

    #sortBy = {};

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "first-col-width") {
            this.#firstColWidth = newValue;
        }

        if (name === "sort-properties") {
            this.#sortProperties = newValue.split(",");
            for (const sortProperty of this.#sortProperties) {
                if (!this.#sortBy[sortProperty]) {
                    this.#sortBy[sortProperty] = "none";
                }
            }
            this.render();
        }
    }

    onRendered = () => {};

    customSorts = {};

    customColStyles = {};

    loadingText;

    set data(data) {
        this.#data = data;

        this.render();
    }

    set cols(cols) {
        this.#cols = cols;
    }

    get cols() {
        return this.#cols;
    }

    connectedCallback() {
        this.loadingText = bdoc.ele(
            "h3",
            "Loading...",
            bdoc.attr("style", "text-align: center; font-size: 20px;")
        );

        bdoc.append(
            this.shadowRoot,
            bdoc.ele(
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/mm-table.css")
            ),
            bdoc.ele(
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/styles.css")
            ),
            bdoc.ele(
                "div",
                bdoc.class("table-container"),
                this.loadingText,
                bdoc.ele(
                    "div",
                    bdoc.ele(
                        "table",
                        bdoc.ele(
                            "thead",
                            bdoc.ele(
                                "tr",
                                bdoc.id("table-titles")
                                // bdoc.ele(
                                //     "h3",
                                //     "Loading...",
                                //     bdoc.attr(
                                //         "style",
                                //         "text-align: center; font-size: 20px;"
                                //     )
                                // )
                                // ...Object.keys(this.#cols).map((colKey, i) => {
                                //     const heading = bdoc.ele(
                                //         "th",
                                //         colKey.charAt(0).toUpperCase() +
                                //             colKey.slice(1)
                                //     );
                                //     if (i == 0 && this.#firstColWidth) {
                                //         heading.style.width =
                                //             this.#firstColWidth;
                                //     }
                                //     if (colKey in this.customColStyles) {
                                //         bdoc.append(
                                //             heading,
                                //             bdoc.attr(
                                //                 "style",
                                //                 this.customColStyles[colKey]
                                //             )
                                //         );
                                //     }

                                //     return heading;
                                // })
                            )
                        ),
                        bdoc.ele("tbody", bdoc.id("table-body"))
                    )
                )
            )
        );
    }

    getShadowRoot() {
        return this.shadowRoot;
    }

    render() {
        if (this.loadingText) {
            this.loadingText.style.display = "none";
        }

        const tableHead = this.shadowRoot.getElementById("table-titles");
        if (!tableHead) return;
        tableHead.innerHTML = "";
        let activeSortProperty = Object.keys(this.#sortBy).find(
            (key) => this.#sortBy[key] !== "none"
        );
        bdoc.append(
            tableHead,
            ...Object.keys(this.#cols).map((colKey, i) => {
                const heading = bdoc.ele(
                    "th",
                    colKey.charAt(0).toUpperCase() + colKey.slice(1)
                );
                if (this.#sortProperties.includes(colKey)) {
                    if (!activeSortProperty) {
                        this.#sortBy[colKey] = "asc";
                        activeSortProperty = colKey;
                        this.#data.sort((a, b) => {
                            if (this.customSorts[colKey]) {
                                return this.customSorts[colKey](a, b);
                            }
                            return a[colKey] > b[colKey] ? 1 : -1;
                        });
                    }
                    const sortIcon = bdoc.ele(
                        "div",
                        bdoc.class(`chevron ${this.#sortBy[colKey]}`)
                    );

                    bdoc.append(
                        heading,
                        sortIcon,
                        bdoc.class("sort-header"),
                        bdoc.eventListener("click", () => {
                            const sortDirection = this.#sortBy[colKey];
                            this.#sortProperties.forEach((key) => {
                                this.#sortBy[key] = "none";
                            });
                            this.#sortBy[colKey] =
                                sortDirection === "asc" ? "desc" : "asc";
                            this.#data.sort((a, b) => {
                                if (sortDirection === "asc") {
                                    if (this.customSorts[colKey]) {
                                        return this.customSorts[colKey](a, b);
                                    }
                                    if (!a[colKey]) {
                                        return 1;
                                    }
                                    if (!b[colKey]) {
                                        return -1;
                                    }
                                    return a[colKey] > b[colKey] ? 1 : -1;
                                } else {
                                    if (this.customSorts[colKey]) {
                                        return this.customSorts[colKey](b, a);
                                    }
                                    return a[colKey] < b[colKey] ? 1 : -1;
                                }
                            });
                            this.render();
                        })
                    );
                }
                if (i == 0 && this.#firstColWidth) {
                    heading.style.width = this.#firstColWidth;
                }
                if (colKey in this.customColStyles) {
                    bdoc.append(
                        heading,
                        bdoc.attr("style", this.customColStyles[colKey])
                    );
                }
                return heading;
            })
        );

        const tableBody = this.shadowRoot.getElementById("table-body");
        if (!tableBody) return;

        tableBody.innerHTML = "";
        bdoc.append(
            tableBody,
            ...this.#data.map((item) =>
                bdoc.ele(
                    "tr",
                    ...Object.values(this.#cols).map((col) => {
                        let element;
                        switch (typeof col) {
                            case "object":
                                element = col;
                                element.item = item;
                            case "function":
                                element = col(item, this.shadowRoot);
                        }
                        return element.tagName === "TD"
                            ? element
                            : bdoc.ele("td", element);
                    })
                )
            )
        );
        this.onRendered(this);
    }
}
customElements.define("mm-table", MmTable);

import bdoc from "./bdoc.js";

class MmTable extends HTMLElement {
    #data = [];

    #cols = {};

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

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
        bdoc.append(
            this.shadowRoot,
            bdoc.ele(
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/mm-collections.css")
            ),
            bdoc.ele(
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/styles.css")
            ),
            bdoc.ele(
                "div",
                bdoc.class("table-container"),
                bdoc.ele(
                    "div",
                    bdoc.ele(
                        "table",
                        bdoc.ele(
                            "thead",
                            bdoc.ele(
                                "tr",
                                bdoc.id("table-titles"),
                                ...Object.keys(this.#cols).map((colKey, i) => {
                                    const heading = bdoc.ele(
                                        "th",
                                        colKey.charAt(0).toUpperCase() +
                                            colKey.slice(1)
                                    );
                                    if (i == 0) {
                                        bdoc.append(
                                            heading,
                                            bdoc.class("table-name")
                                        );
                                    }
                                    return heading;
                                })
                            )
                        ),
                        bdoc.ele("tbody", bdoc.id("table-body"))
                    )
                )
            )
        );
    }

    render() {
        const tableHead = this.shadowRoot.getElementById("table-titles");
        if (!tableHead) return;
        tableHead.innerHTML = "";
        bdoc.append(
            tableHead,
            ...Object.keys(this.#cols).map((colKey, i) => {
                const heading = bdoc.ele(
                    "th",
                    colKey.charAt(0).toUpperCase() + colKey.slice(1)
                );
                if (i == 0) {
                    bdoc.append(heading, bdoc.class("table-name"));
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
                                element = col(item);
                        }
                        return bdoc.ele("td", element);
                    })
                )
            )
        );
    }
}
customElements.define("mm-table", MmTable);

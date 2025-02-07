import bdoc from "./bdoc.js";

class MmTooltip extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        bdoc.append(
            this.shadowRoot,
            bdoc.ele(
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/mm-tooltip.css")
            ),
            bdoc.ele(
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/styles.css")
            ),

            bdoc.ele(
                "div",
                bdoc.class("tooltip-button"),
                bdoc.ele("slot", bdoc.attr("name", "tooltip-button")),
                bdoc.ele(
                    "div",
                    bdoc.class("tooltip-content"),
                    bdoc.ele("slot", bdoc.attr("name", "tooltip-content"))
                )
            )
        );
    }
}
customElements.define("mm-tooltip", MmTooltip);

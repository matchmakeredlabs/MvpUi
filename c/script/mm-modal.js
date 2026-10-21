import bdoc from "./bdoc.js";

export default class MmModal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    onShow = () => {};
    onHide = () => {};

    show() {
        this.shadowRoot.getElementById("modal").style.display = "block";
        this.onShow();
    }

    hide() {
        this.shadowRoot.getElementById("modal").style.display = "none";
        this.onHide();
    }

    getModalContent() {
        return this.shadowRoot.querySelector(".modal-content");
    }

    connectedCallback() {
        bdoc.append(
            this.shadowRoot,
            bdoc.ele(
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/mm-modal.css")
            ),
            bdoc.ele(
                "link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/styles.css")
            ),
            bdoc.ele(
                "div",
                bdoc.id("modal"),
                bdoc.class("modal"),
                bdoc.eventListener("click", (event) => {
                    if (
                        event.target === this.shadowRoot.getElementById("modal")
                    ) {
                        this.hide();
                    }
                }),
                bdoc.ele(
                    "div",
                    bdoc.class("modal-content"),
                    bdoc.ele(
                        "span",
                        bdoc.class("close"),
                        "×",
                        bdoc.eventListener("click", () => this.hide())
                    ),
                    bdoc.ele("slot")
                )
            )
        );

        this.style.position = "absolute";
        this.hide();
    }
}
customElements.define("mm-modal", MmModal);

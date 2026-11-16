import bdoc from "./bdoc.js";

export default class MmDropdown extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    static adjustDropdownHeights = (parentRoot, maxTotalHeightPercentage) => {
        const openDropdowns = parentRoot.querySelectorAll("mm-dropdown.show");
        const openCount = openDropdowns.length;
        const maxHeight =
            openCount > 0
                ? maxTotalHeightPercentage / openCount
                : maxTotalHeightPercentage;
        openDropdowns.forEach((dropdown) => {
            dropdown.style.maxHeight = `${maxHeight}%`;
        });
    };

    connectedCallback() {
        const customSetsContainer = bdoc.ele(
            "div",
            bdoc.class("dropdown-body-container"),
            bdoc.id("dropdown-body-container"),
            bdoc.ele("slot", bdoc.attr("name", "dropdown-body"))
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
                bdoc.attr("href", "/c/res/mm-dropdown.css")
            ),
            bdoc.ele(
                "div",
                bdoc.class("dropdown-button-container"),
                bdoc.ele(
                    "button",
                    bdoc.class("dropdown-button"),
                    bdoc.ele("span", bdoc.class("chevron"), bdoc.id("chevron")),
                    bdoc.ele("slot", bdoc.attr("name", "button-text"))
                ),
                bdoc.eventListener("click", () => {
                    customSetsContainer.classList.toggle("show");
                    this.classList.toggle("show");
                    MmDropdown.adjustDropdownHeights(this.parentElement, 100);
                    this.shadowRoot
                        .getElementById("chevron")
                        .classList.toggle("down");
                })
            ),
            customSetsContainer,

            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-filter-table.js")
            ),
            bdoc.ele(
                "script",
                bdoc.attr("type", "module"),
                bdoc.attr("src", "/c/script/mm-match-profile-modal.js")
            )
        );
    }
}

customElements.define("mm-dropdown", MmDropdown);

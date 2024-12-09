import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

class MmOrganizations extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    static fetchOrganizations = async () => {
        const response = await MmOrganizations.session.fetch("/api/orgs");
        return (await response.json()).items;
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
                "h2",
                "Organizations",
                bdoc.attr("style", "margin-left: 1.5em")
            ),
            bdoc.ele(
                "div",
                bdoc.attr("style", "max-height: 80%"),
                bdoc.ele("mm-table"),
                bdoc.ele(
                    "script",
                    bdoc.attr("type", "module"),
                    bdoc.attr("src", "/c/script/mm-table.js")
                )
            )
        );
        this.#renderOrganizations();
    }

    #renderOrganizations = async () => {
        const organizations = await MmOrganizations.fetchOrganizations();

        customElements.whenDefined("mm-table").then(() => {
            const table = this.shadowRoot.querySelector("mm-table");
            table.cols = {
                name: (org) =>
                    bdoc.ele(
                        "a",
                        bdoc.attr("href", `/c/Organization?org=${org.id}`),
                        org.name
                    ),
                description: (org) => org.description,
            };
            table.data = organizations;
        });
    };
}
customElements.define("mm-organizations", MmOrganizations);

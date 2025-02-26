import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

class MmHome extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

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
                bdoc.attr("href", "/c/res/styles.css")
            )
        );

        const browseButton = bdoc.ele(
            "a",
            bdoc.attr("href", "/c/Collections"),
            bdoc.attr("style", "text-decoration: none; border-radius: 12px"),
            bdoc.ele(
                "div",
                bdoc.class("big-button big-button2"),
                bdoc.ele("div", bdoc.class("button-text"), "Browse & Describe"),
                bdoc.ele(
                    "div",
                    bdoc.class("button-description"),
                    "Browse and describe available elements"
                )
            )
        );

        const createButton = bdoc.ele(
            "a",
            bdoc.attr("href", "/c/"),
            bdoc.attr("style", "text-decoration: none; border-radius: 12px"),
            bdoc.ele(
                "div",
                bdoc.class("big-button big-button3"),
                bdoc.ele("div", bdoc.class("button-text"), "Create"),
                bdoc.ele(
                    "div",
                    bdoc.class("button-description"),
                    "Create, register, and manage collections"
                )
            )
        );

        const generateReportButton = bdoc.ele(
            "a",
            bdoc.attr("href", "/c/GenerateReport"),
            bdoc.attr("style", "text-decoration: none; border-radius: 12px"),
            bdoc.ele(
                "div",
                bdoc.class("big-button big-button4"),
                bdoc.ele("div", bdoc.class("button-text"), "Generate Report"),
                bdoc.ele(
                    "div",
                    bdoc.class("button-description"),
                    "Generate reports from described elements"
                )
            )
        );

        const administerContainer = bdoc.ele(
            "div",
            bdoc.class("button-container"),
            bdoc.ele(
                "a",
                bdoc.attr("href", "/c/Administer"),
                bdoc.attr(
                    "style",
                    "text-decoration: none; border-radius: 12px"
                ),
                bdoc.ele(
                    "div",
                    bdoc.class("big-button big-button5"),
                    bdoc.ele("div", bdoc.class("button-text"), "Administer"),
                    bdoc.ele(
                        "div",
                        bdoc.class("button-description"),
                        "Manage collaboration settings"
                    )
                )
            )
        );

        const buttonContainer = bdoc.ele(
            "div",
            bdoc.class("button-container"),
            bdoc.attr("style", "margin-top: 40px")
        );

        const userAcl = MmHome.session.getCachedAcl();

        let writeDescriptor = false;
        let readGroupsOrOrgs = false;
        if (userAcl) {
            for (const orgPerms of Object.values(userAcl)) {
                if (orgPerms.includes("WriteDescriptor")) {
                    writeDescriptor = true;
                }
                if (
                    orgPerms.includes("ReadGroup") ||
                    orgPerms.includes("ReadOrganization")
                ) {
                    readGroupsOrOrgs = true;
                }
            }
            if ("admin" in userAcl) {
                readGroupsOrOrgs = true;
                writeDescriptor = true;
            }
        }

        bdoc.append(buttonContainer, browseButton);
        if (writeDescriptor) {
            bdoc.append(buttonContainer, createButton);
        }

        bdoc.append(buttonContainer, generateReportButton);

        bdoc.append(this.shadowRoot, buttonContainer);

        if (readGroupsOrOrgs) {
            bdoc.append(this.shadowRoot, administerContainer);
        }
    }
}
customElements.define("mm-home", MmHome);

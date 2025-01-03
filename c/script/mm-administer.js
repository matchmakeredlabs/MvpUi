import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

class MmAdminister extends HTMLElement {
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
        const adminToolsButton = bdoc.ele(
            "a",
            bdoc.attr("href", "/c/AdminTools"),
            bdoc.attr("style", "text-decoration: none; border-radius: 12px"),
            bdoc.ele(
                "div",
                bdoc.class("big-button big-button3"),
                bdoc.ele("div", bdoc.class("button-text"), "Admin Tools"),
                bdoc.ele(
                    "div",
                    bdoc.class("button-description"),
                    "Manage MatchMaker users and settings"
                )
            )
        );

        const groupsButton = bdoc.ele(
            "a",
            bdoc.attr("href", "/c/Groups"),
            bdoc.attr("style", "text-decoration: none; border-radius: 12px"),
            bdoc.ele(
                "div",
                bdoc.class("big-button big-button4"),
                bdoc.ele("div", bdoc.class("button-text"), "Groups"),
                bdoc.ele(
                    "div",
                    bdoc.class("button-description"),
                    "View and manage your groups"
                )
            )
        );

        const organizationsButton = bdoc.ele(
            "a",
            bdoc.attr("href", "/c/Organizations"),
            bdoc.attr("style", "text-decoration: none; border-radius: 12px"),
            bdoc.ele(
                "div",
                bdoc.class("big-button big-button1"),
                bdoc.ele("div", bdoc.class("button-text"), "Organizations"),
                bdoc.ele(
                    "div",
                    bdoc.class("button-description"),
                    "View and manage your organizations"
                )
            )
        );

        const buttonContainer = bdoc.ele(
            "div",
            bdoc.class("button-container"),
            bdoc.attr("style", "margin-top: 40px")
        );

        const userAcl = MmAdminister.session.getCachedAcl();

        if (userAcl) {
            for (const orgPerms of Object.values(userAcl)) {
                if (orgPerms.includes("ReadGroup")) {
                    bdoc.append(buttonContainer, groupsButton);
                    break;
                }
            }

            bdoc.append(buttonContainer, organizationsButton);
            if ("admin" in userAcl) {
                bdoc.append(buttonContainer, adminToolsButton);
            }
        }

        bdoc.append(this.shadowRoot, buttonContainer);
    }
}
customElements.define("mm-administer", MmAdminister);

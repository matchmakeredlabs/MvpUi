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
            ),
            bdoc.ele("mm-create-org-modal"),
            bdoc.ele("mm-create-customer-modal"),
            bdoc.ele("mm-create-group-modal"),
            bdoc.ele("mm-modal"),
            bdoc.script("mm-modal.js"),
            bdoc.script("mm-create-org-modal.js"),
            bdoc.script("mm-create-customer-modal.js"),
            bdoc.script("mm-create-group-modal.js")
        );
        const buttonContainer = bdoc.ele(
            "div",
            bdoc.attr(
                "style",
                "display:flex;flex-direction:column;gap:24px;margin-top:32px;"
            )
        );

        const makeButton = (href, text, description, buttonClass) =>
            bdoc.ele(
                "a",
                bdoc.attr("href", href),
                bdoc.attr("style", "text-decoration: none; border-radius: 12px"),
                bdoc.ele(
                    "div",
                    bdoc.class(`big-button ${buttonClass}`),
                    bdoc.ele("div", bdoc.class("button-text"), text),
                    bdoc.ele(
                        "div",
                        bdoc.class("button-description"),
                        description
                    )
                )
            );

        const makeSection = (title, description, buttons) =>
            bdoc.ele(
                "div",
                bdoc.attr(
                    "style",
                    "display:flex;flex-direction:column;gap:16px;padding:20px 0;border-top:1px solid rgba(0,0,0,0.08);"
                ),
                bdoc.ele(
                    "div",
                    bdoc.attr("style", "display:flex;flex-direction:column;gap:6px;"),
                    bdoc.ele("h2", title, bdoc.attr("style", "margin:0;")),
                    bdoc.ele(
                        "div",
                        bdoc.class("button-description"),
                        description
                    )
                ),
                bdoc.ele(
                    "div",
                    bdoc.class("button-container"),
                    bdoc.attr("style", "margin-top:0;gap:16px;"),
                    ...buttons
                )
            );

        const makeActionButton = (text, description, buttonClass, onClick) =>
            bdoc.ele(
                "a",
                bdoc.attr("href", "#"),
                bdoc.attr(
                    "style",
                    "text-decoration:none;border-radius:12px;display:block;"
                ),
                bdoc.eventListener("click", (event) => {
                    event.preventDefault();
                    onClick?.();
                }),
                bdoc.ele(
                    "div",
                    bdoc.class(`big-button ${buttonClass}`),
                    bdoc.ele("div", bdoc.class("button-text"), text),
                    bdoc.ele(
                        "div",
                        bdoc.class("button-description"),
                        description
                    )
                )
            );

        const showModal = (tagName, modal) => {
            customElements.whenDefined(tagName).then(() => modal?.show());
        };

        const userAcl = MmAdminister.session.getCachedAcl();

        if (userAcl) {
            let hasCustomerRead = false;
            let hasGroupRead = false;
            let hasGroupWrite = false;
            let hasOrgWrite = false;
            let hasCustomerWrite = false;

            for (const orgPerms of Object.values(userAcl)) {
                if (orgPerms.includes("ReadGroup")) {
                    hasGroupRead = true;
                }
                if (orgPerms.includes("ReadCustomer")) {
                    hasCustomerRead = true;
                }
                if (orgPerms.includes("WriteGroup")) {
                    hasGroupWrite = true;
                }
                if (orgPerms.includes("WriteOrg")) {
                    hasOrgWrite = true;
                }
                if (orgPerms.includes("WriteCustomer")) {
                    hasCustomerWrite = true;
                }
            }

            const isAdmin = "admin" in userAcl;
            const createOrgModal = this.shadowRoot.querySelector(
                "mm-create-org-modal"
            );
            const createCustomerModal = this.shadowRoot.querySelector(
                "mm-create-customer-modal"
            );
            const createGroupModal = this.shadowRoot.querySelector(
                "mm-create-group-modal"
            );

            bdoc.append(
                buttonContainer,
                makeSection(
                    "View",
                    "Browse existing entities.",
                    [
                        hasGroupRead
                            ? makeButton(
                                  "/c/Groups.html",
                                  "Groups",
                                  "View and manage your groups",
                                  "big-button4"
                              )
                            : null,
                        makeButton(
                            "/c/Organizations",
                            "Organizations",
                            "View and manage your organizations",
                            "big-button1"
                        ),
                        hasCustomerRead || isAdmin
                            ? makeButton(
                                  "/c/Customers",
                                  "Customers",
                                  "View and manage your customers",
                                  "big-button2"
                              )
                            : null,
                    ].filter(Boolean)
                ),
                makeSection(
                    "Create",
                    "Create new entities.",
                    [
                        hasGroupWrite || hasCustomerWrite || isAdmin
                            ? makeActionButton(
                                    "Group",
                                    "Create a new group",
                                    "big-button4",
                                    () => showModal("mm-create-group-modal", createGroupModal)
                                )
                            : null,
                        hasOrgWrite || hasCustomerWrite || isAdmin
                            ? makeActionButton(
                                  "Organization",
                                  "Create a new organization",
                                  "big-button1",
                                  () => showModal("mm-create-org-modal", createOrgModal)
                              )
                            : null,
                        hasCustomerWrite || isAdmin
                            ? makeActionButton(
                                  "Customer",
                                  "Create a new customer",
                                  "big-button2",
                                  () => showModal("mm-create-customer-modal", createCustomerModal)
                              )
                            : null,
                    ].filter(Boolean)
                ),
                isAdmin
                    ? makeSection(
                          "Call API",
                          "Explore and test backend endpoints.",
                          [
                              makeButton(
                                  "/c/callapi",
                                  "Call API",
                                  "MatchMaker API test tool",
                                  "big-button5"
                              ),
                          ]
                      )
                    : null
            );
        }

        bdoc.append(this.shadowRoot, buttonContainer);
    }
}
customElements.define("mm-administer", MmAdminister);

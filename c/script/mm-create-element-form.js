import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import MmOrganizations from "./mm-organizations.js";
import config from "/config.js";

export default class MmCreateElementForm extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    static observedAttributes = ["parent-element"];

    #parentElement;

    #formGroupsContainer;

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "parent-element") {
            this.#parentElement = JSON.parse(newValue);
            this.#renderFormGroups();
        }
    }

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    static elementTypes = [
        { value: "lr", label: "Learning Resource" },
        { value: "cs", label: "Competency Statement" },
        { value: "c", label: "Curriculum" },
        { value: "o", label: "Other" },
    ];

    static details = [
        {
            label: "URL",
            id: "url",
        },
        {
            label: "Subject",
            id: "subject",
        },
        {
            label: "Identifier",
            id: "identifier",
        },
        {
            label: "Educational Level",
            id: "educationalLevel",
        },
        {
            label: "Creator",
            id: "creator",
        },
        {
            label: "Date Published",
            id: "datePublished",
        },
        {
            label: "Repository Date",
            id: "sdDatePublished",
        },
    ];

    onSettled = () => {};

    #submitCreateElement = async (event) => {
        event.preventDefault();

        const formData = new FormData(event.target);

        const variables = {
            name: formData.get("name"),
            members: [],
        };
        const description = formData.get("description");
        if (description && description.trim() !== "") {
            variables.description = formData.get("description");
        }
        const response = await MmCreateElementForm.createOrg(variables);

        this.onSettled(variables, response);
    };

    static createOrg = async (orgObj) => {
        return await MmCreateElementForm.session.fetch("/api/orgs", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(orgObj),
        });
    };

    getInnerForm = () => {
        return this.shadowRoot.querySelector("form");
    };

    submit = () => {
        this.getInnerForm().dispatchEvent(new Event("submit"));
    };

    #fetchOrgs = async () => {
        const cachedAcl = MmCreateElementForm.session.getCachedAcl();
        if ("admin" in cachedAcl) {
            return await MmOrganizations.fetchOrganizations();
        }
        return Object.keys(cachedAcl).filter((key) =>
            cachedAcl[key].includes("WriteDescriptor")
        );
    };

    #renderFormGroups = () => {
        this.#formGroupsContainer.innerHTML = "";

        bdoc.append(
            this.#formGroupsContainer,
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.attr("style", "flex: none; width: 100%; margin-bottom: 0"),
                bdoc.ele("label", bdoc.attr("for", "name"), "Name"),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "text"),
                    bdoc.attr("id", "name"),
                    bdoc.attr("name", "name"),
                    bdoc.attr("required", "true")
                )
            ),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele("label", bdoc.attr("for", "type"), "Type"),

                bdoc.attr("style", "flex: 1"),
                bdoc.ele(
                    "select",
                    bdoc.attr("id", "type"),
                    bdoc.attr("name", "type"),
                    bdoc.attr("required", "true"),
                    ...[
                        { label: "--", value: "--" },
                        ...MmCreateElementForm.elementTypes,
                    ].map((eleType) =>
                        bdoc.ele(
                            "option",
                            bdoc.attr("value", eleType.value),
                            eleType.label,
                            this.#parentElement &&
                                this.#parentElement.eleType === eleType.value
                                ? bdoc.attr("selected")
                                : null
                        )
                    )
                )
            ),
            this.#parentElement
                ? null
                : bdoc.ele(
                      "div",
                      bdoc.class("form-group"),
                      bdoc.ele(
                          "label",
                          bdoc.attr("for", "org"),
                          "Organization"
                      ),
                      bdoc.attr("style", "flex: 1"),
                      bdoc.ele(
                          "select",
                          bdoc.attr("id", "org"),
                          bdoc.attr("name", "org"),
                          bdoc.attr("required", "true")
                      )
                  ),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "description"),
                    "Description"
                ),
                bdoc.ele(
                    "textarea",
                    bdoc.attr("id", "description"),
                    bdoc.attr("name", "description")
                )
            ),
            ...MmCreateElementForm.details.map((detail) =>
                bdoc.ele(
                    "div",
                    bdoc.class("form-group"),
                    bdoc.attr(
                        "style",
                        "flex: none; width: 46%; margin-bottom: 0"
                    ),
                    bdoc.ele(
                        "label",
                        bdoc.attr("for", detail.id),
                        detail.label
                    ),
                    bdoc.ele(
                        "input",
                        bdoc.attr("type", "text"),
                        bdoc.attr("id", detail.id),
                        bdoc.attr("name", detail.id),
                        this.#parentElement
                            ? bdoc.attr(
                                  "value",
                                  this.#parentElement[detail.id] || ""
                              )
                            : null
                    )
                )
            )
        );

        if (!this.#parentElement) {
            this.#fetchOrgs().then((orgs) => {
                const orgSelect = this.shadowRoot.querySelector("#org");
                orgs.forEach((org) => {
                    bdoc.append(
                        orgSelect,
                        bdoc.ele("option", bdoc.attr("value", org.id), org.name)
                    );
                });
            });
        }
    };

    connectedCallback() {
        this.#formGroupsContainer = bdoc.ele(
            "div",
            bdoc.class("form-groups-container"),
            bdoc.attr("style", "margin-bottom: 15px")
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
                bdoc.attr("href", "/c/res/mm-form.css")
            ),
            bdoc.ele(
                "form",
                bdoc.class("form"),
                bdoc.eventListener("submit", this.#submitCreateElement),
                bdoc.id("create-element-form"),
                this.#formGroupsContainer,
                bdoc.ele("slot", bdoc.attr("name", "form-footer"))
            )
        );

        this.#renderFormGroups();
    }
}

customElements.define("mm-create-element-form", MmCreateElementForm);

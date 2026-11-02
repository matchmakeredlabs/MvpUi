import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import MmProjects from "./mm-projects.js";
import config from "/config.js";

export default class MmCreateElementForm extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    static observedAttributes = ["parent-element"];

    #parentElement;

    #formGroupsContainer;

    #isSubmitting = false;

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
        { value: "cs", label: "Competency" },
        { value: "c", label: "Curriculum" },
        { value: "o", label: "Other" },
    ];

    static details = [
        {
            label: "Subject",
            id: "subject",
            placeholder: "Math",
            require: false,
        },
        {
            label: "Publisher",
            id: "publisher",
            placeholder: "Washington",
            require: false,
        },
        {
            label: "Identifier",
            id: "identifier",
            placeholder: "",
            require: false,
        },
        {
            label: "Educational Level",
            id: "educationalLevel",
            placeholder: "06",
            require: false,
        },
        {
            label: "Creator",
            id: "creator",
            placeholder: "",
            require: false,
        },
        {
            label: "Date Published",
            id: "datePublished",
            placeholder: "YYYY-MM-DD",
            require: false,
        },
        {
            label: "Repository Date",
            id: "sdDatePublished",
            placeholder: "YYYY-MM-DD",
            require: false,
        },
        {
            label: "Provenance",
            id: "provenance",
            placeholder: "",
            require: false,
        },
    ];

    onSettled = () => {};

    #submitCreateElement = async (event) => {
        event.preventDefault();

        if (this.#isSubmitting) {
            return;
        }

        const urlInput = event.target.elements.url;
        if (urlInput) {
            urlInput.value =
                urlInput.value.trim() || this.#parentElement?.urlDefault || "";
        }

        // checkValidity() returns false if any required fields are missing
        if (!event.target.checkValidity()) {
            // reportValidity() will output "Please fill out this field" on the first required field with empty input
            event.target.reportValidity();
            return;
        }

        this.#isSubmitting = true;

        const formData = new FormData(event.target);

        const variables = {
            name: formData.get("name"),
            description: formData.get("description"),
            url: formData.get("url"),
            eleType: formData.get("type"),
        };

        if (!variables.eleType) {
            this.#isSubmitting = false;
            event.target.reportValidity();
            return;
        }

        for (const detail of MmCreateElementForm.details) {
            variables[detail.id] = formData.get(detail.id);
        }

        if (this.#parentElement) {
            variables.mainEntityId = this.#parentElement.mainEntityId;
            variables.isPartOf = this.#parentElement.url;
        } else {
            variables._projectId = formData.get("project");
            variables.mainEntity = variables.url;
        }

        try {
            const response = await MmCreateElementForm.createElement(variables);

            await this.onSettled(variables, response);
        } finally {
            this.#isSubmitting = false;
        }

        // TODO: What do we want to do about this?
        //window.location.reload();
    };

    static createElement = async (
        element,
        projectId,
        contentType = "application/json"
    ) => {
        let body;
        if (typeof element === "string") {
            body = element;
        } else if (element instanceof Blob) {
            body = await element.text();
        } else {
            body = JSON.stringify(element);
        }

        return await MmCreateElementForm.session.fetch(
            `/api/descriptors?verbose${projectId ? "&projectid=" + projectId : ""}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": contentType,
                },
                body,
            }
        );
    };

    getInnerForm = () => {
        return this.shadowRoot.querySelector("form");
    };

    submit = () => {
        this.getInnerForm().dispatchEvent(
            new Event("submit", { cancelable: true })
        );
    };

    #generateUrl = async (event) => {
        const button = event.currentTarget;
        const urlInput = this.shadowRoot.querySelector("#url");

        if (!urlInput || button.disabled) return;

        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = "Generating...";

        try {
            const response = await MmCreateElementForm.session.fetch(
                "/api/tag/generate",
                { method: "GET" }
            );

            if (!response.ok) {
                let message = `${response.status} ${response.statusText}`;
                const responseText = await response.text();

                if (responseText) {
                    try {
                        const body = JSON.parse(responseText);
                        message =
                            body.log?.[0]?.message ??
                            body.error ??
                            body.message ??
                            message;
                    } catch {
                        message = responseText;
                    }
                }

                throw new Error(message);
            }

            const body = await response.json();
            if (!body?.tag || typeof body.tag !== "string") {
                throw new Error("The server did not return a generated tag.");
            }

            urlInput.value = body.tag;
            urlInput.setCustomValidity("");
            urlInput.focus();
        } catch (error) {
            alert(`Unable to generate URL / Tag: ${error.message}`);
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    };

    #fetchProjects = async () => {
        const cachedAcl = MmCreateElementForm.session.getCachedAcl();
        if ("admin" in cachedAcl) {
            return await MmProjects.fetchProjects();
        }
        const projects = Object.keys(cachedAcl).filter((key) =>
            cachedAcl[key].includes("WriteDescriptor")
        );

        return projects.map((projectId) => ({ id: projectId, name: projectId }));
    };

    #getTooltipButton = (tooltipText) => {
        const tooltipButton = bdoc.ele(
            "div",
            bdoc.class("info-button"),
            "i",

            bdoc.attr("style", "display: inline-block;"),
            bdoc.attr("slot", "tooltip-button")
        );

        const tooltip = bdoc.ele(
            "mm-tooltip",
            bdoc.attr("style", "display: inline-block; vertical-align: top;"),
            tooltipButton,
            bdoc.ele("span", bdoc.attr("slot", "tooltip-content"), tooltipText)
        );
        return tooltip;
    };

    #renderFormGroups = () => {
        this.#formGroupsContainer.innerHTML = "";

        const elementTypes = [...MmCreateElementForm.elementTypes];
        if (!this.#parentElement) {
            elementTypes.find((eleType) => eleType.value === "cs").label =
                "Competency Framework";
        } else {
            elementTypes.find((eleType) => eleType.value === "cs").label =
                "Competency";
        }

        bdoc.append(
            this.#formGroupsContainer,
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.attr("style", "flex: none; width: 100%; margin-bottom: 0"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "name"),
                    "Name ",
                    bdoc.ele("span", bdoc.class("mmc_form_required"), "*")
                ),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "text"),
                    bdoc.attr("id", "name"),
                    bdoc.attr("name", "name"),
                    bdoc.attr("required", "true"),
                    bdoc.attr(
                        "placeholder",
                        this.#parentElement
                            ? "The Distributive Property"
                            : "Algebra 1"
                    )
                )
            ),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "type"),
                    "Type ",
                    bdoc.ele("span", bdoc.class("mmc_form_required"), "*")
                ),

                bdoc.attr("style", "flex: 1; margin-bottom: 0"),
                bdoc.ele(
                    "select",
                    bdoc.attr("id", "type"),
                    bdoc.attr("name", "type"),
                    bdoc.attr("required", "true"),
                    ...[
                        { label: "--", value: "" },
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
                          bdoc.attr("for", "project"),
                          "Project",
                          bdoc.ele(
                              "span",
                              bdoc.class("mmc_form_required"),
                              " *"
                          )
                      ),
                      bdoc.attr("style", "flex: 1"),
                      bdoc.ele(
                          "select",
                          bdoc.attr("id", "project"),
                          bdoc.attr("name", "project"),
                          bdoc.attr("required", "true")
                      )
                  ),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.attr("style", "flex: none; width: 100%;"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "url"),
                    "URL / Tag",
                    bdoc.ele("span", bdoc.class("mmc_form_required"), "* "),
                    this.#getTooltipButton(
                        "Insert the URL of the item you are describing or generate a MatchMaker tag with the button on the right. This can be changed later."
                    )
                ),
                bdoc.ele(
                    "div",
                    bdoc.class("url-input-group"),
                    bdoc.ele(
                        "input",
                        bdoc.attr("type", "text"),
                        bdoc.attr("id", "url"),
                        bdoc.attr("name", "url"),
                        bdoc.attr("required", "true"),
                        bdoc.attr(
                            "placeholder",
                            this.#parentElement
                                ? this.#parentElement.urlDefault ||
                                      "mm:algebra1/the-language-of/distributive"
                                : "mm:algebra1"
                        )
                    ),
                    bdoc.ele(
                        "button",
                        bdoc.attr("type", "button"),
                        bdoc.class("generate-url-button"),
                        bdoc.eventListener("click", this.#generateUrl),
                        "Generate"
                    )
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
                        detail.label,
                        detail.require
                            ? bdoc.ele(
                                  "span",
                                  bdoc.class("mmc_form_required"),
                                  " *"
                              )
                            : null
                    ),
                    bdoc.ele(
                        "input",
                        bdoc.attr("type", "text"),
                        bdoc.attr("id", detail.id),
                        bdoc.attr("placeholder", detail.placeholder),
                        bdoc.attr("name", detail.id),
                        detail.require ? bdoc.attr("required", "true") : null,
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
            this.#fetchProjects().then((projects) => {
                const projectSelect = this.shadowRoot.querySelector("#project");
                projects.forEach((project) => {
                    bdoc.append(
                        projectSelect,
                        bdoc.ele("option", bdoc.attr("value", project.id), project.name)
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
            ),
            bdoc.script("mm-tooltip.js")
        );

        this.#renderFormGroups();
    }
}

customElements.define("mm-create-element-form", MmCreateElementForm);

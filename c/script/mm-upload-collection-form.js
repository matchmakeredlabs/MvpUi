import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import MmCreateElementForm from "./mm-create-element-form.js";
import MmOrganizations from "./mm-organizations.js";
import config from "/config.js";

export default class MmUploadCollectionForm extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

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

    #submitUploadCollection = async (event) => {
        event.preventDefault();

        const formData = new FormData(event.target);

        const organizationId = formData.get("org");
        const file = formData.get("file");
        const fileType = file.name.split(".").pop();
        const fileTypeToMIMEType = {
            json: "application/json",
            csv: "text/csv",
        };

        const variables = {
            organizationId,
            file,
            fileType,
        };

        const response = await MmCreateElementForm.createElement(
            file,
            organizationId,
            fileTypeToMIMEType[fileType]
        );

        this.onSettled(variables, response);
    };

    getInnerForm = () => {
        return this.shadowRoot.querySelector("form");
    };

    submit = () => {
        this.getInnerForm().dispatchEvent(
            new Event("submit", { cancelable: true })
        );
    };

    #fetchOrgs = async () => {
        const cachedAcl = MmUploadCollectionForm.session.getCachedAcl();
        if ("admin" in cachedAcl) {
            return await MmOrganizations.fetchOrganizations();
        }
        return Object.keys(cachedAcl)
            .filter((key) => cachedAcl[key].includes("WriteDescriptor"))
            .map((key) => ({
                id: key,
                name: key,
            }));
    };

    #renderFormGroups = () => {
        this.#formGroupsContainer.innerHTML = "";

        bdoc.append(
            this.#formGroupsContainer,
            bdoc.ele(
                "div",
                bdoc.class("file-upload-container"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "file"),
                    bdoc.class("file-button"),
                    bdoc.id("file-button"),
                    "Choose File"
                ),
                bdoc.ele(
                    "p",
                    bdoc.attr("id", "file-name"),
                    "File format must be JSON or CSV"
                ),

                bdoc.attr("style", "flex: 2"),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "file"),
                    bdoc.attr("id", "file"),
                    bdoc.attr("name", "file"),
                    bdoc.attr("accept", ".json,.csv"),
                    bdoc.eventListener("change", ({ target }) => {
                        const file = target.files[0];
                        const fileNameDisplay =
                            this.shadowRoot.getElementById("file-name");
                        const fileType = file.name.split(".").pop();
                        if (fileType !== "json" && fileType !== "csv") {
                            alert("Please select a JSON or CSV file.");
                            target.value = "";
                            return;
                        }
                        fileNameDisplay.innerHTML = file.name;
                    })
                )
            ),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "org"),
                    "Organization",
                    bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                ),
                bdoc.attr("style", "flex: 1"),
                bdoc.ele(
                    "select",
                    bdoc.attr("id", "org"),
                    bdoc.attr("name", "org"),
                    bdoc.attr("required", "true")
                )
            )
        );

        this.#fetchOrgs().then((orgs) => {
            const orgSelect = this.shadowRoot.querySelector("#org");
            orgs.forEach((org) => {
                bdoc.append(
                    orgSelect,
                    bdoc.ele("option", bdoc.attr("value", org.id), org.name)
                );
            });
        });
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
                bdoc.eventListener("submit", this.#submitUploadCollection),
                bdoc.id("upload-collection-form"),
                this.#formGroupsContainer,
                bdoc.ele("slot", bdoc.attr("name", "form-footer"))
            )
        );

        this.#renderFormGroups();
    }
}

customElements.define("mm-upload-collection-form", MmUploadCollectionForm);

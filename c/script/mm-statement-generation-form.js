import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import config from "/config.js";

export default class MmStatementGenerationForm extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    onSettled = () => {};

    #submitGenerateText = async (event) => {
        event.preventDefault();

        const formData = new FormData(event.target);

        const variables = {
            prompt: formData.get("prompt"),
        };

        const response = await MmStatementGenerationForm.generateText(
            variables
        );

        this.onSettled(variables, response);
    };

    static generateText = async (textRequest) => {
        return await MmStatementGenerationForm.session.fetch("/api/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(textRequest),
        });
    };

    getInnerForm = () => {
        return this.shadowRoot.querySelector("form");
    };

    submit = () => {
        this.getInnerForm().dispatchEvent(
            new Event("submit", { cancelable: true })
        );
    };

    connectedCallback() {
        const formGroupsContainer = bdoc.ele(
            "div",
            bdoc.class("form-groups-container"),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "prompt"),
                    "Prompt",
                    bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                ),
                bdoc.ele(
                    "textarea",
                    bdoc.attr("id", "prompt"),
                    bdoc.attr("style", "max-height: 100px; min-width: 400px"),

                    bdoc.attr(
                        "placeholder",
                        "Generate statements related to mathematics"
                    ),
                    bdoc.attr("name", "prompt"),
                    bdoc.attr("required", "true")
                )
            )
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
                bdoc.eventListener("submit", this.#submitGenerateText),
                formGroupsContainer,
                bdoc.ele("slot", bdoc.attr("name", "form-footer"))
            )
        );
    }
}

customElements.define(
    "mm-statement-generation-form",
    MmStatementGenerationForm
);

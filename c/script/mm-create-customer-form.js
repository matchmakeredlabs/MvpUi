import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import config from "/config.js";

export default class MmCreateCustomerForm extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    onSettled = () => {};

    #submitCreateCustomer = async (event) => {
        event.preventDefault();

        const formData = new FormData(event.target);
        const currentUserId = MmCreateCustomerForm.session.getCachedUserID();
        const digitsOnlyNumber = (value) => {
            const digits = `${value ?? ""}`.replace(/\D+/g, "");
            return digits === "" ? 0 : Number(digits);
        };

        if (!currentUserId) {
            alert("Could not determine current user. Please log in again.");
            return;
        }

        const variables = {
            name: (formData.get("name") || "").trim(),
            description: (formData.get("description") || "").trim(),
            allowedProjects: digitsOnlyNumber(formData.get("allowedProjects")),
            usersPerProject: digitsOnlyNumber(formData.get("usersPerProject")),
            elePerCollection: digitsOnlyNumber(formData.get("elePerCollection")),
            maxCollections: digitsOnlyNumber(formData.get("maxCollections")),
            canUseApi: formData.get("canUseApi") === "on",
            reportingCapabilities:
                (formData.get("reportingCapabilities") || "none").toString(),
            roles: [{ id: currentUserId.toLowerCase(), role: "owner" }],
        };

        const response = await MmCreateCustomerForm.createCustomer(variables);
        this.onSettled(variables, response);
    };

    static createCustomer = async (customerObj) => {
        return await MmCreateCustomerForm.session.fetch("/api/customers", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(customerObj),
        });
    };

    getInnerForm = () => this.shadowRoot.querySelector("form");

    submit = () => {
        this.getInnerForm().dispatchEvent(
            new Event("submit", { cancelable: true })
        );
    };

    connectedCallback() {
        const blockNonDigitInput = (event) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            const allowedKeys = new Set([
                "Backspace",
                "Delete",
                "Tab",
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "End",
            ]);
            if (allowedKeys.has(event.key)) return;
            if (/^\d$/.test(event.key)) return;
            event.preventDefault();
        };
        const sanitizeDigitsOnlyInput = ({ target }) => {
            target.value = `${target.value ?? ""}`.replace(/\D+/g, "");
        };

        const formGroupsContainer = bdoc.ele(
            "div",
            bdoc.class("form-groups-container"),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "name"),
                    "Organization Name",
                    bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                ),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "text"),
                    bdoc.attr("id", "name"),
                    bdoc.attr("name", "name"),
                    bdoc.attr("placeholder", "Acme District"),
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
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "allowedProjects"),
                    "Allowed Projects",
                    bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                ),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "number"),
                    bdoc.attr("id", "allowedProjects"),
                    bdoc.attr("name", "allowedProjects"),
                    bdoc.attr("min", "0"),
                    bdoc.attr("step", "1"),
                    bdoc.attr("inputmode", "numeric"),
                    bdoc.attr("pattern", "[0-9]*"),
                    bdoc.attr("value", "0"),
                    bdoc.eventListener("keydown", blockNonDigitInput),
                    bdoc.eventListener("input", sanitizeDigitsOnlyInput),
                    bdoc.attr("required", "true")
                )
            ),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "usersPerProject"),
                    "Users Per Project",
                    bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                ),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "number"),
                    bdoc.attr("id", "usersPerProject"),
                    bdoc.attr("name", "usersPerProject"),
                    bdoc.attr("min", "0"),
                    bdoc.attr("step", "1"),
                    bdoc.attr("inputmode", "numeric"),
                    bdoc.attr("pattern", "[0-9]*"),
                    bdoc.attr("value", "0"),
                    bdoc.eventListener("keydown", blockNonDigitInput),
                    bdoc.eventListener("input", sanitizeDigitsOnlyInput),
                    bdoc.attr("required", "true")
                )
            ),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "elePerCollection"),
                    "Elements Per Collection",
                    bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                ),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "number"),
                    bdoc.attr("id", "elePerCollection"),
                    bdoc.attr("name", "elePerCollection"),
                    bdoc.attr("min", "0"),
                    bdoc.attr("step", "1"),
                    bdoc.attr("inputmode", "numeric"),
                    bdoc.attr("pattern", "[0-9]*"),
                    bdoc.attr("value", "0"),
                    bdoc.eventListener("keydown", blockNonDigitInput),
                    bdoc.eventListener("input", sanitizeDigitsOnlyInput),
                    bdoc.attr("required", "true")
                )
            ),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "maxCollections"),
                    "Max Collections",
                    bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                ),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "number"),
                    bdoc.attr("id", "maxCollections"),
                    bdoc.attr("name", "maxCollections"),
                    bdoc.attr("min", "0"),
                    bdoc.attr("step", "1"),
                    bdoc.attr("inputmode", "numeric"),
                    bdoc.attr("pattern", "[0-9]*"),
                    bdoc.attr("value", "0"),
                    bdoc.eventListener("keydown", blockNonDigitInput),
                    bdoc.eventListener("input", sanitizeDigitsOnlyInput),
                    bdoc.attr("required", "true")
                )
            ),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele(
                    "label",
                    bdoc.attr("for", "reportingCapabilities"),
                    "Reporting Capabilities",
                    bdoc.ele("span", bdoc.class("mmc_form_required"), " *")
                ),
                bdoc.ele(
                    "select",
                    bdoc.attr("id", "reportingCapabilities"),
                    bdoc.attr("name", "reportingCapabilities"),
                    bdoc.attr("required", "true"),
                    bdoc.ele("option", bdoc.attr("value", "none"), "none"),
                    bdoc.ele("option", bdoc.attr("value", "basic"), "basic"),
                    bdoc.ele("option", bdoc.attr("value", "full"), "full")
                )
            ),
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele("label", bdoc.attr("for", "canUseApi"), "Can Use API"),
                bdoc.ele(
                    "input",
                    bdoc.attr("type", "checkbox"),
                    bdoc.attr("id", "canUseApi"),
                    bdoc.attr("name", "canUseApi")
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
                bdoc.eventListener("submit", this.#submitCreateCustomer),
                formGroupsContainer,
                bdoc.ele("slot", bdoc.attr("name", "form-footer"))
            )
        );
    }
}

customElements.define("mm-create-customer-form", MmCreateCustomerForm);

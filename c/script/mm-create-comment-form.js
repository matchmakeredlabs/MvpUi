import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import config from "/config.js";

export default class MmCreateCommentForm extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    descriptor;
    statements;

    #formGroupsContainer;

    static requestedActions = [
        {
            label: "Add (select a reference Palet statement or no selection and provide text for the new statement)",
            value: "add",
        },
        {
            label: "Delete (select statement to be deleted and provide rationale)",
            value: "delete",
        },
        {
            label: "Split (select statement to be split and call out concepts for each new suggested statement)",
            value: "split",
        },
        {
            label: "Merge (select two or more statements and explain why these should be compiled into one)",
            value: "merge",
        },
        {
            label: "Rewrite (select statement and explain the issue with the existing text)",
            value: "rewrite",
        },
    ];

    static createComment = async (variables) =>
        await MmCreateCommentForm.session.fetch("/api/comments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(variables),
        });
    // static createComment = async (variables) => {
    //     console.log(variables);
    // };

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    onSettled = () => {};

    #submitComment = async (event) => {
        event.preventDefault();

        const formData = new FormData(event.target);

        const variables = {
            requestedAction: formData.get("type"),
            comment: formData.get("comment"),
            commentAbout: "paletStatements",
            descriptor: this.descriptor,
            statements: this.statements,
        };

        const response = await MmCreateCommentForm.createComment(variables);

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

    renderFormGroups = () => {
        this.#formGroupsContainer.innerHTML = "";

        const noStatementsMessage = bdoc.ele("span", "No statements selected.");

        bdoc.append(
            this.#formGroupsContainer,
            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele("label", bdoc.attr("for", "type"), "Requested Action"),

                bdoc.attr("style", "flex: 1; margin-bottom: 0"),
                bdoc.ele(
                    "select",
                    bdoc.attr("id", "type"),
                    bdoc.attr("name", "type"),
                    bdoc.attr("required", "true"),
                    ...[...MmCreateCommentForm.requestedActions].map(
                        (eleType) =>
                            bdoc.ele(
                                "option",
                                bdoc.attr("value", eleType.value),
                                eleType.label
                            )
                    )
                )
            ),

            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.attr("style", "width: 100%; margin-bottom: 0"),
                bdoc.ele("mm-table"),
                noStatementsMessage
            ),

            bdoc.ele(
                "div",
                bdoc.class("form-group"),
                bdoc.ele("label", bdoc.attr("for", "comment"), "Comment"),
                bdoc.ele(
                    "textarea",
                    bdoc.attr("id", "comment"),
                    bdoc.attr("name", "comment")
                )
            )
        );
        customElements.whenDefined("mm-table").then(() => {
            const statementsTable = this.shadowRoot.querySelector("mm-table");
            console.log(this.statements);
            if (this.statements && this.statements.length > 0) {
                statementsTable.style.display = "block";
                noStatementsMessage.style.display = "none";
                statementsTable.cols = {
                    ["ID"]: (statement) => statement.id,
                    ["Relation"]: (statement) => statement.rel,
                    // bdoc.ele(
                    //     "input",
                    //     bdoc.attr("type", "checkbox"),
                    //     statement.rel === "Central"
                    //         ? bdoc.attr("checked")
                    //         : null,
                    //     bdoc.attr("disabled")
                    // ),
                    ["Type"]: (statement) => statement.stmtType,
                    ["Statement"]: (statement) => statement.statement,
                };
                statementsTable.customColStyles = {
                    ID: "width: 100px",
                    Central: "width: 100px",
                    Type: "width: 100px",
                };
                // statementsTable.firstColWidth = "100px";
                statementsTable.data = this.statements || [];
            } else {
                statementsTable.style.display = "none";
                noStatementsMessage.style.display = "block";
            }
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
                bdoc.eventListener("submit", this.#submitComment),
                this.#formGroupsContainer,
                bdoc.ele("slot", bdoc.attr("name", "form-footer"))
            ),
            bdoc.script("mm-table.js")
        );

        this.renderFormGroups();
    }
}

customElements.define("mm-create-comment-form", MmCreateCommentForm);

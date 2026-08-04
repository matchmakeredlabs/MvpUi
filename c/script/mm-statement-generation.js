import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";
import "./mm-loading.js";

class MmStatementGeneration extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    onSuccess = (_, response) => {
        this.resultBox.innerHTML = "";
        if (response.statements) {
            Promise.all([customElements.whenDefined("mm-table")]).then(() => {
                const table = bdoc.ele(
                    "mm-table",
                    bdoc.attr("sort-properties", "Similarity Score"),
                    bdoc.attr("style", "height: 40%;")
                );
                table.cols = {
                    Statement: (stmtObj) => stmtObj.statement,
                    "Similarity Score": (stmtObj) => stmtObj.similarityScore,
                    "Similar Statements": (stmtObj) =>
                        bdoc.ele(
                            "button",
                            bdoc.attr("style", "cursor: pointer;"),
                            bdoc.eventListener("click", () => {
                                this.similarStatementsTable.data =
                                    stmtObj.similarStatements;
                                this.similarStatementsContainer.style.display =
                                    "flex";
                                this.similarStatementsText.innerHTML = `Showing ${stmtObj.similarStatements.length} similar statements for statement "${stmtObj.statement}"`;
                            }),
                            "View Similar Statements"
                        ),
                };
                table.customSorts = {
                    "Similarity Score": (a, b) =>
                        a.similarityScore - b.similarityScore,
                };
                bdoc.append(this.resultBox, table);
                table.data = response.statements;
            });
        }
    };

    resultBox;

    similarStatementsTable;

    similarStatementsText;

    similarStatementsContainer;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    handleError = async (response) => {
        try {
            const body = await response.json();

            if (body.log) {
                alert(body.log[0].message);
            } else if (body.error) {
                alert(body.error);
            } else {
                alert("An error occurred");
            }
        } catch (e) {
            alert("An error occurred");
        }
    };

    connectedCallback() {
        this.similarStatementsTable = bdoc.ele(
            "mm-table",
            bdoc.attr("sort-properties", "Similarity"),
            bdoc.attr("style", "height: 50%;")
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
                bdoc.attr("href", "/c/res/mm-create-project-modal.css")
            ),
            bdoc.ele("mm-modal", this.similarStatementsTable),

            bdoc.script("mm-table.js"),
            bdoc.script("mm-statement-generation-form.js"),
            bdoc.script("mm-modal.js")
        );

        Promise.all([
            customElements.whenDefined("mm-statement-generation-form"),
            customElements.whenDefined("mm-table"),
        ]).then(() => {
            this.similarStatementsTable.cols = {
                Statement: (stmtObj) => stmtObj.statement,
                ID: (stmtObj) => stmtObj.id,
                Similarity: (stmtObj) => stmtObj.distance,
            };

            this.similarStatementsTable.customSorts = {
                Similarity: (a, b) => a.distance - b.distance,
            };

            const onSettled = (onSuccess) => async (variables, response) => {
                if (response) {
                    if (response.status !== 200) {
                        this.handleError(response);
                        return;
                    }

                    onSuccess(variables, await response.json());
                }
            };

            const statementGenerationForm = bdoc.ele(
                "mm-statement-generation-form",
                bdoc.ele(
                    "div",

                    bdoc.class("form-end"),

                    bdoc.ele(
                        "div",
                        bdoc.ele(
                            "button",
                            bdoc.class("header-button add-entity-button"),
                            "Generate",
                            bdoc.eventListener("click", () => {
                                this.resultBox.innerHTML = "";
                                bdoc.append(
                                    this.resultBox,
                                    bdoc.ele(
                                        "mm-loading",
                                        bdoc.attr(
                                            "message",
                                            "Generating statements..."
                                        ),
                                        bdoc.attr(
                                            "style",
                                            "display: flex; margin: 2em auto;"
                                        )
                                    )
                                );
                                statementGenerationForm.onSettled = onSettled(
                                    async (variables, response) => {
                                        this.onSuccess(variables, response);
                                    }
                                );
                                statementGenerationForm.submit();
                            })
                        )
                    ),
                    bdoc.attr("slot", "form-footer")
                )
            );

            this.resultBox = bdoc.ele(
                "div",
                "Click 'Generate' to create statements. Uses Claude Sonnet 4."
            );

            this.similarStatementsText = bdoc.ele("p");

            this.similarStatementsContainer = bdoc.ele(
                "div",
                bdoc.attr(
                    "style",
                    "display: none; flex-direction: column; gap: 10px;"
                ),
                bdoc.ele("h3", "Similar Statements"),
                this.similarStatementsText,
                this.similarStatementsTable
            );

            bdoc.append(
                this.shadowRoot,

                bdoc.ele(
                    "h2",
                    "Generate Statements",
                    bdoc.attr("style", "margin-left: 18px;")
                ),
                bdoc.ele(
                    "div",
                    bdoc.attr(
                        "style",
                        "display: flex; flex-direction: row; gap: 20px;"
                    ),
                    bdoc.ele(
                        "div",
                        bdoc.attr(
                            "style",
                            "padding: 18px; display: flex; flex-direction: column; gap: 20px;"
                        ),
                        statementGenerationForm,

                        this.resultBox
                    ),
                    this.similarStatementsContainer
                )
            );
        });
    }
}
customElements.define("mm-statement-generation", MmStatementGeneration);

import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";

export default class MmElementCard extends HTMLElement {
    static observedAttributes = ["value", "editable", "show-describe-links"];

    static session = new bsession(config.backEndUrl, config.sessionTag);

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    onSave = async (data, propagate) => {
        try {
            const response = await MmElementCard.updateElement(data, propagate);
            return response;
        } catch (error) {
            return Promise.reject(error);
        }
    };

    onSuccess = () => {};

    #originalEleObj = {};

    #propagate = true;

    #editable = false;

    #showDescribeLinks = false;

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "value") {
            const elementObj = JSON.parse(newValue);
            this.#originalEleObj = elementObj;
            this.#renderCardElement(elementObj);
        } else if (name === "editable") {
            this.#editable = true;
        } else if (name === "show-describe-links") {
            console.log("showDescribeLinks");
            this.#showDescribeLinks = true;
        }
    }

    static handleError = async (response) => {
        try {
            const body = await response.json();
            if (body.error) alert(body.error);
            if (body.log) alert(body.log[0].message);
        } catch (e) {
            alert("An error occurred");
        }
    };

    static StripKeyPrefix(key) {
        let slash = key.lastIndexOf("/");
        return slash >= 0 ? key.substring(slash + 1) : key;
    }

    static updateElement = async (data, propagate) => {
        const response = await MmElementCard.session.fetch(
            `/api/descriptors${propagate ? "?propagate" : ""}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            }
        );
        if (response.status !== 200) {
            return Promise.reject(response);
        }
        return response;
    };

    static EleTypeTranslate = {
        any: "Any",
        lr: "Learning Resource",
        cs: "Competency",
        c: "Curriculum",
        o: "Other",
    };

    static fields = [
        "name",
        "description",
        "url",
        "subject",
        "identifier",
        "educationalLevel",
        "creator",
        "provenance",
        "datePublished",
        "sdDatePublished",
        "key",
    ];

    static keyLinkPrefix = "/c/Palet?key=";

    static renderElement = (
        val,
        eleContainer,
        cornerButton,
        editOptions,
        showDescribeLinks
    ) => {
        const editable = editOptions && editOptions.editable;
        const saveFunction = editOptions && editOptions.saveFunction;
        const editButtons = editOptions && editOptions.editButtons;

        const labels = {
            url: "URL",
            subject: "Subject",
            identifier: "Identifier",
            educationalLevel: "Ed. Level",
            creator: "Creator",
            provenance: "Provenance",
            datePublished: "Date Published",
            sdDatePublished: "Repository Date",
            key: "Palet Key",
        };

        const editableAttributes = (identifier) => {
            if (!editable) return [];
            const hiddenInput = bdoc.ele(
                "input",
                bdoc.attr("type", "hidden"),
                bdoc.attr("name", identifier),
                bdoc.attr("value", val[identifier] || "")
            );

            return [
                bdoc.class("mmc_editable"),
                bdoc.attr("contenteditable", "true"),
                hiddenInput,
                bdoc.eventListener("input", (event) => {
                    const eleText = event.target.textContent;
                    hiddenInput.value = eleText;
                }),
            ];
        };

        const addRow = (dl, identifier, customEle) => {
            const value = customEle || val[identifier];
            const label = labels[identifier];
            if (!editable && !value) return;
            const labelEle = bdoc.ele("dt", label);
            if (editable) {
                labelEle.style.marginTop = "5px";
            }
            dl.appendChild(
                bdoc.ele(
                    "div",
                    labelEle,
                    bdoc.ele("dd", ...editableAttributes(identifier), value)
                )
            );
        };
        eleContainer.innerHTML = "";

        eleContainer.mmxId = val.id;
        eleContainer.mmxKey = MmElementCard.StripKeyPrefix(val.key);

        if (editable) {
            const form = bdoc.ele(
                "form",
                bdoc.id("descriptor-edit-form"),
                bdoc.eventListener("submit", (event) => {
                    event.preventDefault();
                    const formData = new FormData(event.target);
                    saveFunction(formData);
                })
            );
            bdoc.append(eleContainer, form);
            eleContainer = form;
            bdoc.append(eleContainer, editButtons);
        }

        const annotation = bdoc.ele("div", bdoc.class("annotation"));

        if (val._matchIndex != undefined) {
            annotation.appendChild(
                bdoc.ele(
                    "div",
                    bdoc.class("mmc_matchindex"),
                    "MatchIndex: " + val._matchIndex
                )
            );
        }

        if (cornerButton != undefined) {
            annotation.appendChild(cornerButton);
        }

        if (annotation.children.length > 0) {
            eleContainer.appendChild(annotation);
        }

        if (val.eleType && !editable) {
            eleContainer.appendChild(
                bdoc.ele("h3", MmElementCard.EleTypeTranslate[val.eleType])
            );
        }

        if (editable) {
            eleContainer.appendChild(
                bdoc.ele("h2", val.name, ...editableAttributes("name"))
            );
        } else {
            if (val.name) {
                eleContainer.appendChild(bdoc.ele("h2", val.name));
            } else {
                eleContainer.appendChild(bdoc.ele("h2", "Unnamed"));
            }
        }

        if (editable) {
            eleContainer.appendChild(
                bdoc.ele(
                    "section",
                    bdoc.preText(val.description),
                    ...editableAttributes("description")
                )
            );
        } else if (val.description) {
            eleContainer.appendChild(
                bdoc.ele("section", bdoc.preText(val.description))
            );
        }
        eleContainer.appendChild(bdoc.ele("h3", "Detail"));

        const dl = bdoc.ele("dl");

        if (editable) {
            dl.appendChild(
                bdoc.ele(
                    "div",
                    bdoc.ele("dt", "Element Type"),
                    bdoc.ele(
                        "dd",
                        bdoc.ele(
                            "select",
                            bdoc.attr("name", "eleType"),

                            ...Object.entries(
                                MmElementCard.EleTypeTranslate
                            ).map(([key, value]) =>
                                bdoc.ele(
                                    "option",
                                    bdoc.attr("value", key),
                                    key === val.eleType
                                        ? bdoc.attr("selected")
                                        : null,
                                    value
                                )
                            )
                        )
                    )
                )
            );
        }

        if (val.url) {
            if (editable) {
                addRow(dl, "url");
            } else {
                addRow(
                    dl,
                    "url",
                    bdoc.ele(
                        "a",
                        bdoc.attr("href", val.url),
                        bdoc.attr("target", "_blank"),
                        val.url
                    )
                );
            }
        }

        for (const detail in labels) {
            if (detail === "url" || detail === "key") {
                continue;
            }

            addRow(dl, detail);
        }

        if (val.key) {
            addRow(
                dl,
                "key",
                bdoc.ele(
                    "a",
                    bdoc.attr(
                        "href",
                        MmElementCard.keyLinkPrefix +
                            MmElementCard.StripKeyPrefix(val.key) +
                            "&id=" +
                            encodeURIComponent(val.id)
                    ),
                    MmElementCard.StripKeyPrefix(val.key)
                )
            );
        }

        eleContainer.appendChild(dl);

        if (showDescribeLinks) {
            if (val.intHasPart && val.intHasPart.length === 0) {
                eleContainer.appendChild(bdoc.ele("h3", "Links"));
                eleContainer.appendChild(
                    bdoc.ele(
                        "div",
                        bdoc.ele(
                            "a",
                            bdoc.attr(
                                "href",
                                "/c/Describe?id=" + encodeURIComponent(val.id)
                            ),
                            bdoc.attr("target", "_blank"),
                            "Edit Description"
                        )
                    )
                );
                if (val.key) {
                    eleContainer.appendChild(
                        bdoc.ele(
                            "div",
                            bdoc.ele(
                                "a",
                                bdoc.attr(
                                    "href",
                                    "/c/Match?stmtId=" +
                                        encodeURIComponent(val.id)
                                ),
                                "View descriptor and matches"
                            )
                        )
                    );
                }
            }
        }
    };

    #renderCardElement = (val) => {
        let eleContainer = this.shadowRoot.querySelector(".mmc_descriptor");
        if (!eleContainer) {
            eleContainer = bdoc.ele("div", bdoc.class("mmc_descriptor"));
            this.shadowRoot.appendChild(eleContainer);
        }
        if (this.#editable) {
            MmElementCard.renderElement(
                val,
                eleContainer,
                null,
                {
                    editable: true,
                    saveFunction: (formData) => {
                        const data = { ...this.#originalEleObj };
                        for (const [key, value] of formData.entries()) {
                            data[key] = value;
                        }
                        this.onSave(data, this.#propagate).then(
                            (response) => {
                                const newEleObj = { ...val, ...data };
                                this.#originalEleObj = newEleObj;
                                this.#renderCardElement(this.#originalEleObj);
                                this.onSuccess(data, response, this.#propagate);
                            },
                            (error) => {
                                MmElementCard.handleError(error);
                            }
                        );
                    },
                    editButtons: bdoc.ele(
                        "div",
                        bdoc.attr(
                            "style",
                            "display: flex; gap: 0.25em; margin-bottom: 0.5em;"
                        ),
                        bdoc.ele(
                            "button",
                            "Clear",
                            bdoc.attr("style", "cursor: pointer;"),
                            bdoc.eventListener("click", () => {
                                this.#renderCardElement({
                                    ...val,
                                    ...Object.fromEntries(
                                        MmElementCard.fields.map((field) => [
                                            field,
                                            "",
                                        ])
                                    ),
                                });
                            })
                        ),
                        bdoc.ele(
                            "button",
                            "Reset",
                            bdoc.attr("style", "cursor: pointer;"),
                            bdoc.eventListener("click", () => {
                                this.#renderCardElement(this.#originalEleObj);
                            })
                        ),
                        bdoc.ele(
                            "button",
                            "Save",
                            bdoc.attr("style", "cursor: pointer;"),
                            bdoc.attr("type", "submit")
                        ),
                        bdoc.ele(
                            "div",
                            bdoc.class("propagate-container"),
                            bdoc.ele(
                                "input",
                                bdoc.attr("type", "checkbox"),
                                bdoc.id("propagate"),
                                this.#propagate ? bdoc.attr("checked") : null,
                                bdoc.eventListener("change", ({ target }) => {
                                    this.#propagate = target.checked;
                                })
                            ),
                            bdoc.ele("span", "Propagate changes to children")
                        )
                    ),
                },
                this.#showDescribeLinks
            );
        } else {
            MmElementCard.renderElement(
                val,
                eleContainer,
                null,
                null,
                this.#showDescribeLinks
            );
        }
    };

    connectedCallback() {
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
                bdoc.attr("href", "/c/res/mm-element-card.css")
            )
        );
    }
}
customElements.define("mm-element-card", MmElementCard);

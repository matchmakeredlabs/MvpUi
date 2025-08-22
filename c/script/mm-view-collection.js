import bdoc from "./bdoc.js";
import config from "/config.js";
import bsession from "./bsession.js";
import MmMatchProfileModal from "./mm-match-profile-modal.js";
import {
    convertJsonToCsv,
    convertJsonToCsvNoHeader,
} from "./downloadhelper.js";

export default class ViewCollection extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    handleError = async (response) => {
        try {
            const body = await response.json();
            if (body.error) alert(body.error);
            if (body.log) alert(body.log[0].message);
        } catch (e) {
            alert("An error occurred");
        }
    };

    #collection;
    isLoading = false;
    loadingElement;

    static fetchCollection = async (collectionId) => {
        const response = await ViewCollection.session.fetch(
            `/api/collections/${collectionId}`
        );
        if (response.status !== 200) {
            return Promise.reject(response);
        }
        return (await response.json()).collection;
    };

    downloadCollectionMatches = async () => {
        let currentCollection = this.#collection;

        let leafDescriptors = [];

        const matchWeightsQueryString = () => {
            let matchWeights = MmMatchProfileModal.getMatchWeights();

            // Create an array of key-value pairs
            let queryParams = [];
            for (let key in matchWeights) {
                if (matchWeights.hasOwnProperty(key)) {
                    queryParams.push(`${key}=${matchWeights[key]}`);
                }
            }

            // Join the array into a single string with '&' separator
            return queryParams.join("&");
        };
        for (let i = 0; i < currentCollection.length; i++) {
            if (currentCollection[i].intHasPart.length === 0) {
                let paletKey = currentCollection[i].key;
                if (paletKey && paletKey !== "") {
                    paletKey = paletKey.split("/");
                    paletKey = paletKey[paletKey.length - 1];
                    currentCollection[i][
                        "requestURL"
                    ] = `/descriptors?searchKey=${paletKey}&eleType=any&${matchWeightsQueryString()}`;
                    leafDescriptors.push(currentCollection[i]);
                }
            }
        }

        let allDescriptors = {};

        let requests = [];

        for (let leaf of leafDescriptors) {
            requests.push(async () => {
                const response = await ViewCollection.session.fetch(
                    leaf.requestURL
                );
                if (response.status !== 200) {
                    return Promise.reject(response);
                }
                return [leaf, await response.json()];
            });
        }
        const responses = await Promise.all(requests.map((r) => r()));

        for (const response of responses) {
            const [leaf, matches] = response;
            console.log(response);
            allDescriptors[leaf.id] = matches;
        }

        console.log(allDescriptors);

        let descriptorKeys = Object.keys(allDescriptors);

        for (let key of descriptorKeys) {
            let matches = allDescriptors[key].descriptors;
            for (let i = 0; i < matches.length; i++) {
                matches[i]["matchedTo"] = key;
            }
            allDescriptors[key].descriptors = matches;
        }

        let jsonform = false;

        const id = currentCollection[0].id;
        if (jsonform) {
            const dataUrl =
                "data:text/json;charset=utf-8," +
                encodeURIComponent(JSON.stringify(allDescriptors));
            const element = document.createElement("a");
            element.setAttribute("href", dataUrl);
            element.setAttribute(
                "download",
                `collection-matches-${id}` + ".json"
            );
            element.style.display = "none";
            this.shadowRoot.appendChild(element);
            element.click();
            this.shadowRoot.removeChild(element);
        } else {
            let finalCSV = "";
            for (let key of descriptorKeys) {
                let matches = allDescriptors[key].descriptors;
                if (finalCSV == "") {
                    finalCSV += convertJsonToCsv(matches);
                } else {
                    finalCSV += convertJsonToCsvNoHeader(matches);
                }
            }

            const dataUrl =
                "data:text/csv;charset=utf-8," + encodeURIComponent(finalCSV);
            const element = document.createElement("a");
            element.setAttribute("href", dataUrl);
            element.setAttribute(
                "download",
                `collection-matches-${id}` + ".csv"
            );
            element.style.display = "none";
            this.shadowRoot.appendChild(element);
            element.click();
            this.shadowRoot.removeChild(element);
        }
    };

    #exportCollection = (csv) => {
        const keysToKeep = [
            "name",
            "url",
            "eleType",
            "subject",
            "description",
            "identifier",
            "educationalLevel",
            "creator",
            "provenance",
            "isPartOf",
            "sdDatePublished",
            "datePublished",
            "key",
            "mainEntity",
        ];

        const collection = this.#collection.map((element) => {
            return Object.fromEntries(
                Object.entries(element).filter(([key]) =>
                    keysToKeep.includes(key)
                )
            );
        });

        if (csv) {
            const dataUrl =
                "data:text/csv;charset=utf-8," +
                encodeURIComponent(convertJsonToCsv(collection, keysToKeep));
            const element = document.createElement("a");
            element.setAttribute("href", dataUrl);
            element.setAttribute(
                "download",
                `${this.#collection[0].name}-${new Date().toISOString()}` +
                    ".csv"
            );
            element.style.display = "none";
            this.shadowRoot.appendChild(element);
            element.click();
            this.shadowRoot.removeChild(element);
        } else {
            const dataUrl =
                "data:text/json;charset=utf-8," +
                encodeURIComponent(JSON.stringify(collection));
            const element = document.createElement("a");
            element.setAttribute("href", dataUrl);
            element.setAttribute(
                "download",
                `${this.#collection[0].name}-${new Date().toISOString()}` +
                    ".json"
            );
            element.style.display = "none";
            this.shadowRoot.appendChild(element);
            element.click();
            this.shadowRoot.removeChild(element);
        }
    };

    connectedCallback() {
        this.isLoading = true;
        this.loadingElement = bdoc.ele("h2", "Loading...");

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
                bdoc.attr("href", "/c/res/mm-edit-collection.css")
            ),
            bdoc.ele(
                "main",
                bdoc.class("mm_columns"),
                bdoc.ele(
                    "div",
                    bdoc.ele(
                        "article",
                        bdoc.id("mmx_browse_tree"),
                        bdoc.ele("h3", "Collection"),

                        this.loadingElement
                    )
                ),
                bdoc.ele(
                    "div",
                    bdoc.id("descriptor-container"),
                    bdoc.ele(
                        "div",
                        bdoc.class("export-buttons"),
                        bdoc.ele(
                            "button",
                            bdoc.class("export-button collection"),
                            bdoc.id("export-collection-button"),
                            bdoc.attr("style", "margin-right: 25px"),
                            bdoc.attr("disabled", "true"),
                            "Export Collection",
                            bdoc.eventListener("click", () => {
                                customElements
                                    .whenDefined("mm-modal")
                                    .then(() => {
                                        this.shadowRoot
                                            .querySelector("mm-modal")
                                            .show();
                                    });
                            })
                        ),
                        bdoc.ele(
                            "button",
                            bdoc.class("export-button matches"),
                            bdoc.id("match-collections-button"),
                            bdoc.attr("disabled", "true"),
                            "Export Collection Matches",
                            bdoc.eventListener(
                                "click",
                                this.downloadCollectionMatches
                            )
                        )
                    ),

                    bdoc.ele(
                        "mm-element-card",
                        bdoc.id("descriptor-card"),
                        bdoc.attr("style", "display: block; margin-top: 50px"),
                        bdoc.attr("show-describe-links")
                    )
                )
            ),

            bdoc.ele(
                "mm-modal",
                bdoc.ele(
                    "div",
                    bdoc.class("button-container-download"),
                    bdoc.ele(
                        "div",
                        bdoc.class("modal-button small-button5"),
                        "Export JSON",
                        bdoc.eventListener("click", () => {
                            this.#exportCollection(false);
                        })
                    ),
                    bdoc.ele(
                        "div",
                        bdoc.class("modal-button small-button5"),
                        "Export CSV",
                        bdoc.eventListener("click", () => {
                            this.#exportCollection(true);
                        })
                    )
                )
            ),

            bdoc.script("mm-collection.js"),
            bdoc.script("mm-element-card.js"),
            bdoc.script("mm-modal.js")
        );
        this.#renderCollection();
    }

    #renderCollection = async () => {
        const collectionId = new URLSearchParams(window.location.search).get(
            "id"
        );

        if (!collectionId) {
            window.location.href = "/c/Collections";
        }

        this.#collection = await ViewCollection.fetchCollection(
            collectionId
        ).catch((response) => {
            if (response.status === 404) {
                alert("Collection not found");
            } else {
                this.handleError(response);
            }
            window.location.href = "/c/Collections";
        });

        this.loadingElement.style.display = "none";
        this.isLoading = false;

        const exportBtn  = this.shadowRoot.getElementById("export-collection-button");
        const matchesBtn = this.shadowRoot.getElementById("match-collections-button");
        if (exportBtn)  {
            exportBtn.disabled  = false;
        }
        if (matchesBtn) matchesBtn.disabled = false;

        const browseTree = this.shadowRoot.querySelector("#mmx_browse_tree");

        const topLevelEle = this.#collection[0];

        const topLevelButtons = bdoc.ele(
            "div",
            bdoc.class("top-level-buttons")
        );

        const headerContainer = bdoc.ele(
            "div",
            bdoc.class("top-level-container"),
            bdoc.ele("h2", topLevelEle.name),
            topLevelButtons
        );

        bdoc.append(browseTree, headerContainer);
        const collectionEle = bdoc.ele("mm-collection");
        bdoc.append(browseTree, collectionEle);
        Promise.all([
            customElements.whenDefined("mm-collection"),
            customElements.whenDefined("mm-element-card"),
        ]).then(() => {
            collectionEle.select = (descriptorEle, elementObj) => {
                const descriptorCard =
                    this.shadowRoot.getElementById("descriptor-card");
                bdoc.append(
                    descriptorCard,
                    bdoc.attr("value", JSON.stringify(elementObj))
                );
            };

            bdoc.append(headerContainer, collectionEle.expandContractButtons);

            collectionEle.loadDescriptors(this.#collection);
        });
    };
}
customElements.define("mm-view-collection", ViewCollection);


import bdoc from './bdoc.js';
import config from '/config.js';
import bsession from './bsession.js';

class MmMatchSets extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    static #displayProperties = [];
        

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }


    connectedCallback() {
       
        


        const displayPropertyTitles = MmCustomSets.#displayProperties.map(prop => {
            const property = prop.charAt(0).toUpperCase() + prop.slice(1);
            return bdoc.ele("th", property);
        });

        bdoc.append(this.shadowRoot,
            bdoc.ele("link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/mm-custom-sets.css"),
            ),
            bdoc.ele("div", bdoc.class("custom-sets-header"), 
                bdoc.ele("h2", "Custom Sets")
            ),
                bdoc.ele("div", bdoc.class("table-container"), 
                bdoc.ele("table",
                    bdoc.ele("thead",
                        bdoc.ele("tr",
                            bdoc.id("table-titles"
                            ),
                            bdoc.ele("th", bdoc.class("table-name"), "Name"),
                            ...displayPropertyTitles
                        )
                    ),
                    bdoc.ele("tbody", bdoc.id("table-body"),
                    ...customSetRows
                    
                    ),
                ),
            ),
        );


    }


}

customElements.define("mm-custom-sets", MmCustomSets);

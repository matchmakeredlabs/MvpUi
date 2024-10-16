
import bdoc from './bdoc.js';
import config from '/config.js';
import bsession from './bsession.js';
import MmCollection from './mmx_browse.js';

class MmCustomSet extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);
        
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }


    #loadCollection = async (key) => {
        const collection = await MmCollection.LoadFromLocalStorage(key, this.shadowRoot);
        const tree = this.shadowRoot.getElementById("mmx_browse_tree");
        collection.attachTo(tree);
    }

    connectedCallback() {

        const query = new URLSearchParams(window.location.search);
        const setKey = query.get("key");

        bdoc.append(this.shadowRoot,
            bdoc.ele("link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/styles.css"),
            ),
            bdoc.ele("div", bdoc.class("mm_columns"),
            bdoc.ele("div",
                bdoc.ele("article", bdoc.id("mmx_browse_tree"),"Loading...")
            ),
            bdoc.ele("br"),
            bdoc.ele("div",
                bdoc.ele("article", bdoc.id("mmx_browse_detail"))
            )
        )
        );

        this.#loadCollection(setKey);
    }


}

customElements.define("mm-custom-set", MmCustomSet);

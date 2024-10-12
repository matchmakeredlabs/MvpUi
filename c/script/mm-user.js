// Add internal elements to shadow
// Create an internal stylesheet using:
//   const sheet = new CSSStyleSheet();
//   sheet.replaceSync(...);
// shadow.adoptedStyleSheets = [sheet];
// or shadow.adoptedStyleSheets.push(sheet);
//
// Within the stylesheet, the :host selector indicates the root of the shadow DOM.
// Reset all inherited styles (if you want) with :host { all: initial; }
// Variables in the root are inherited by the shadow DOM
//
// Stylesheets in shadow DOM important reference: https://jordanbrennan.hashnode.dev/8-ways-to-style-the-shadow-dom
//
// https://webcomponents.dev/blog/all-the-ways-to-make-a-web-component/
//
// If the HTML is to be embedded in the JS there are three ways to do it:
// https://stackoverflow.com/questions/65038637/html-template-vs-defining-html-inside-web-component
// 
// Regardless of method, the shadowDOM is populated within either the constructor or connectedCallback
// Method 1: Clone from a template. This is superior if there will be many instances of the element.
//   const template = document.createElement('template');
//   template.innerHTML = `the template string`;
//
//   connectedCallback() {
//      this.shadowRoot.appendChild(template.content.cloneNode(true))
//   }
//
// Method 2: Assign the content directly. This is more efficient when only one or two of the components will be created
//   connectedCallback() {
//      this.shadowRoot.innerHTML = `the template string`;
//   }
//
// A variation on both methods is to fetch the HTML from a separate file.

import bdoc from './bdoc.js';
import config from '/config.js';
import bsession from './bsession.js';

class MmUser extends HTMLElement {
    static observedAttributes = ["userid"];
    static session = new bsession(config.backEndUrl, config.sessionTag);

    static #properties = [
        {id: "name", label: null},
        {id: "fullName", label: "Full Name"},
        {id: "email", label: "Email"}
        // Other properties could be added here because the back-end supports custom properties
    ];

    //#internals; // This class doesn't need #internals but elements that participate in forms do need it
    #userid;

    constructor() {
        // Call the constructor on the parent class
        super();

        // attachShadow creates the Shadow DOM. The return value is the shadow DOM but it is also placed
        // in this.shadowRoot so we don't need to save it.
        this.attachShadow({ mode: 'open' });

        //If this as an input control to be embedded in a form then we would need internals.
        //this.#internals = this.attachInternals();
    }

    connectedCallback() {
        // Here we use bdoc to create the shadow DOM but an alternative would be to assign an HTML string to #shadow.innerHTML

        const propList = bdoc.ele("dl");
        for (const prop of MmUser.#properties) {
            if (!prop.label) continue; // Suppress username and anything else with special treatment
            propList.append(
                bdoc.ele("div",
                    bdoc.ele("dt", prop.label),
                    bdoc.ele("dd", bdoc.id(prop.id), bdoc.attr("contenteditable", "true"))
                )
            );
        }

        bdoc.append(this.shadowRoot,
            bdoc.ele("link",
                bdoc.attr("rel", "stylesheet"),
                bdoc.attr("href", "/c/res/mm-controls.css"),
            ),
            bdoc.ele("div", bdoc.class("user-form"),
                bdoc.ele("div", bdoc.class("button-bar"),
                    bdoc.ele("button", bdoc.eventListener("click", (event) => this.#onClickSave(this, event)), "Save")
                ),
                bdoc.ele("h2", bdoc.id("name")),
                bdoc.ele("h3", "Details"),
                propList
            )
        );

        const userid = this.getAttribute("userid");
        if (userid) this.#loadUser(userid);
    }

    attributeChangedCallback(attrName, oldValue, newValue) {
        if (attrName == "userid")
            this.#loadUser(newValue);
    }

    async #loadUser(userid) {
        if (!userid) return;
        this.#userid = userid;

        const response = await MmUser.session.fetch("/api/users/" + encodeURIComponent(userid));
        const data = await response.json();
        // Error handling should be added to the above by way of a try/catch block

        const shadow = this.shadowRoot;
        for (const prop of MmUser.#properties) {
            const val = data[prop.id];
            shadow.getElementById(prop.id).textContent = val ? val : "";
        }
    }

    async #onClickSave(ele, event) {
        const payload = {id: ele.#userid}
        const shadow = ele.shadowRoot;
        for (const prop of MmUser.#properties) {
            payload[prop.id] = shadow.getElementById(prop.id).textContent;
        }
        
        const response = await MmUser.session.fetch("/api/users/" + encodeURIComponent(ele.#userid),
            {
                method: "PUT",
                body: JSON.stringify(payload),
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                }
            }
        );

        // Need better error handling here.
        const text = await response.text();
        alert(text);
    }
}

customElements.define("mm-user", MmUser);

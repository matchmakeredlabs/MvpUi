import bdoc from "./bdoc.js";

class MmRange extends HTMLElement {
    static formAssociated = true;

    #internals;
    #rangeInput;
    #numberInput;

    constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open" });

        this.#internals = this.attachInternals();

        const container = bdoc.ele(
            "div",
            bdoc.attr("style", "display: flex; align-items: center; gap: 5px;")
        );
        shadow.appendChild(container);

        const _self = this;

        this.#rangeInput = bdoc.ele(
            "input",
            bdoc.attr("type", "range"),
            bdoc.attr("min", 0),
            bdoc.attr("max", 1),
            bdoc.attr("step", 0.01),
            bdoc.attr("value", 0.5),
            bdoc.attr("style", "width: 100%; vertical-align: middle;"),
            bdoc.eventListener("change", ({ target }) => {
                // console.log(`Range: ${target.value}`);
                _self.#numberInput.value = target.value;
                _self.#internals.setFormValue(target.value);
                _self.dispatchEvent(new Event("change"));
            })
        );
        container.appendChild(this.#rangeInput);

        this.#numberInput = bdoc.ele(
            "input",
            bdoc.attr("type", "number"),
            bdoc.attr("min", 0),
            bdoc.attr("max", 1),
            bdoc.attr("step", 0.01),
            bdoc.attr("value", 0.5),
            bdoc.attr("style", "width: 4em; vertical-align: middle;"),
            bdoc.eventListener("change", ({ target }) => {
                // console.log(`Number: ${target.value}`);
                _self.#rangeInput.value = target.value;
                _self.#internals.setFormValue(target.value);
                _self.dispatchEvent(new Event("change"));
            })
        );
        container.appendChild(this.#numberInput);
    }

    updateValue(newValue) {
        this.setAttribute("value", newValue);
        this.#rangeInput.value = newValue;
        this.#numberInput.value = newValue;
        this.#internals.setFormValue(newValue);

        // You might also want to dispatch an event if needed, for example:
        this.dispatchEvent(new Event("change"));
    }

    connectedCallback() {
        let v = this.getAttribute("min");
        if (v) {
            this.#rangeInput.min = v;
            this.#numberInput.min = v;
        }
        v = this.getAttribute("max");
        if (v) {
            this.#rangeInput.max = v;
            this.#numberInput.max = v;
        }
        v = this.getAttribute("step");
        if (v) {
            this.#rangeInput.step = v;
            this.#numberInput.step = v;
        }
        v = this.getAttribute("value");
        if (v) {
            this.#rangeInput.value = v;
            this.#numberInput.value = v;
            this.#internals.setFormValue(v);
        }
    }

    get value() {
        return this.#numberInput.value;
    }
    set value(v) {
        this.#numberInput.value = v;
        this.#rangeInput.value = v;
        this.#internals.setFormValue(v);
    }
}

customElements.define("mm-range", MmRange);

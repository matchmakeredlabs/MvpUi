class MmRange extends HTMLElement {
    static formAssociated = true;

    #internals;
    #rangeInput;
    #numberInput;

    constructor() {
        super();
        var shadow = this.attachShadow({ mode: 'open' });
        this.#internals = this.attachInternals();

        const _self = this;

        this.#rangeInput = document.createElement('input');
        this.#rangeInput.type = 'range';
        this.#rangeInput.min = 0;
        this.#rangeInput.max = 1;
        this.#rangeInput.step = 0.01;
        this.#rangeInput.value = 0.5;
        this.#rangeInput.style.verticalAlign = "middle";
        this.#rangeInput.onchange = function () {
            console.log(`Range: ${this.value}`);
            _self.#numberInput.value = this.value;
            _self.#internals.setFormValue(this.value);

        }
        shadow.appendChild(this.#rangeInput);

        this.#numberInput = document.createElement('input');
        this.#numberInput.type = 'number';
        this.#numberInput.min = 0
        this.#numberInput.max = 1;
        this.#numberInput.step = 0.01;
        this.#numberInput.value = 0.5;
        this.#numberInput.style.width = '3em';
        this.#numberInput.style.textAlign = 'right';
        this.#numberInput.onchange = function () {
            console.log(`Number: ${this.value}`);
            _self.#rangeInput.value = this.value;
            _self.#internals.setFormValue(this.value);
        }
        shadow.appendChild(this.#numberInput);
    }

    connectedCallback() {
        let v = this.getAttribute('min');
        if (v) {
            this.#rangeInput.min = v;
            this.#numberInput.min = v;
        }
        v = this.getAttribute('max');
        if (v) {
            this.#rangeInput.max = v;
            this.#numberInput.max = v;
        }
        v = this.getAttribute('step');
        if (v) {
            this.#rangeInput.step = v;
            this.#numberInput.step = v;
        }
        v = this.getAttribute('value');
        if (v) {
            this.#rangeInput.value = v;
            this.#numberInput.value = v;
            this.#internals.setFormValue(v);
        }
    }

    get value() { return this.#numberInput.value; }
    set value(v) {
        this.#numberInput.value = v;
        this.#rangeInput.value = v;
        this.#internals.setFormValue(v);
    }
}

customElements.define("mm-range", MmRange);

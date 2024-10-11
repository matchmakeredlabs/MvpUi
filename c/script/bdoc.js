export default class bdoc {
    static appendList(ele, children) {
        for (let cn of children) {
            if (cn === undefined || cn === null) {
                ele.appendChild(document.createTextNode(""));
            }
            else if (cn instanceof Node) {
                ele.appendChild(cn);
            }
            else if (cn.addToEle !== undefined)
            {
                cn.addToEle(ele);
            }
            else {
                ele.appendChild(document.createTextNode(cn));
            }
        }
        return ele;
    }

    static append(ele, ...children) {
        this.appendList(ele, children);
    }

    static ele(tagName, ...children) {
        return bdoc.appendList(document.createElement(tagName), children);
    }

    static attr(name, value) {
        return new bdocAttr(name, value);
    }

    static class(className) {
        return new bdocAttr("class", className);
    }

    static preText(value) {
        return new bdocPre(value);
    }
}

class bdocAttr {
    constructor(name, value) {
        this.name = name;
        this.value = value;
    }

    addToEle(ele) {
        ele.setAttribute(this.name, this.value);
    }
}

class bdocPre {
    constructor(text) {
        this.text = text;
    }

    addToEle(ele) {
        appendPreformattedText(ele, this.text);
    }
}

function appendPreformattedText(element, text)
{
    let first = true;
    for (let part of text.split("\n")) {
        if (first) {
            first = false;
        }
        else {
            element.appendChild(document.createElement("br"));
        }

        let txt = part.replace(/\r/g, "");
        let spaces = 0;
        while (spaces < txt.length && txt.codePointAt(spaces) == 32) {
            ++spaces;
        }
        txt = txt.trim();
        if (txt.length > 0) {
            if (spaces > 0) {
                txt = "\u00A0".repeat(spaces) + txt;
            }
            element.appendChild(document.createTextNode(txt));
        }
    }
}

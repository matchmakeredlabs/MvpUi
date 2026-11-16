let generatedId = 0;
const svgNamespace = "http://www.w3.org/2000/svg";

function createEyeIcon() {
    const icon = document.createElementNS(svgNamespace, "svg");
    const attributes = {
        viewBox: "0 0 24 24",
        width: "20",
        height: "20",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "2",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "aria-hidden": "true",
        focusable: "false",
    };
    Object.entries(attributes).forEach(([name, value]) =>
        icon.setAttribute(name, value)
    );

    const eye = document.createElementNS(svgNamespace, "path");
    eye.setAttribute(
        "d",
        "M2.062 12.348a1 1 0 0 1 0-.696C3.423 7.51 7.36 5 12 5c4.638 0 8.573 2.508 9.938 6.652a1 1 0 0 1 0 .696C20.577 16.49 16.64 19 12 19c-4.638 0-8.573-2.508-9.938-6.652"
    );

    const pupil = document.createElementNS(svgNamespace, "circle");
    pupil.setAttribute("cx", "12");
    pupil.setAttribute("cy", "12");
    pupil.setAttribute("r", "3");

    const slash = document.createElementNS(svgNamespace, "path");
    slash.setAttribute("class", "password-toggle-slash");
    slash.setAttribute("d", "m4 4 16 16");

    icon.append(eye, pupil, slash);
    return icon;
}

export function enablePasswordVisibility(root = document) {
    root.querySelectorAll('input[type="password"]').forEach((input) => {
        if (input.dataset.passwordVisibilityEnabled === "true") {
            return;
        }

        input.dataset.passwordVisibilityEnabled = "true";
        if (!input.id) {
            generatedId += 1;
            input.id = `password-input-${generatedId}`;
        }

        const wrapper = document.createElement("span");
        wrapper.className = "password-input";
        input.parentNode.insertBefore(wrapper, input);
        wrapper.append(input);

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "password-toggle";
        toggle.setAttribute("aria-controls", input.id);
        toggle.setAttribute("aria-pressed", "false");
        toggle.setAttribute("aria-label", "Show password");
        toggle.title = "Show password";
        toggle.append(createEyeIcon());

        const setVisible = (isVisible) => {
            const action = isVisible ? "Hide password" : "Show password";
            input.type = isVisible ? "text" : "password";
            toggle.setAttribute("aria-pressed", isVisible ? "true" : "false");
            toggle.setAttribute("aria-label", action);
            toggle.title = action;
        };

        toggle.addEventListener("click", () => {
            setVisible(input.type !== "text");
        });

        input.form?.addEventListener("reset", () => {
            setVisible(false);
        });

        wrapper.append(toggle);
    });
}

import bdoc from "./bdoc.js";
import MmMatchProfileModal from "./mm-match-profile-modal.js";

class MmMatchProfileSelect extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }
    static getMatchProfiles() {
        return JSON.parse(localStorage.getItem("matchProfiles"));
    }

    static setMatchProfiles(matchProfiles) {
        localStorage.setItem("matchProfiles", JSON.stringify(matchProfiles));
    }

    onSelectAction = (profileName, matchWeights) => {};

    connectedCallback() {
        if (MmMatchProfileSelect.getMatchProfiles() == null) {
            MmMatchProfileSelect.setMatchProfiles({
                "MM Default": MmMatchProfileModal.defaultMatchWeights,
            });
        }

        const profiles = bdoc.ele("select", bdoc.attr("id", "match-profiles"));
        const matchProfiles = MmMatchProfileSelect.getMatchProfiles();
        let matchProfileNames = Object.keys(matchProfiles);
        const matchProfileSettings = Object.values(matchProfiles);

        matchProfileNames = ["--"].concat(matchProfileNames);

        matchProfileNames.forEach((name) => {
            bdoc.append(
                profiles,
                bdoc.ele("option", bdoc.attr("value", name), name)
            );
        });

        matchProfileNames = matchProfileNames.slice(1);

        const matchWeightsObj = MmMatchProfileModal.getMatchWeights();

        for (let i = 0; i < matchProfileSettings.length; i++) {
            if (
                JSON.stringify(matchProfileSettings[i]) ==
                JSON.stringify(matchWeightsObj)
            ) {
                profiles.value = matchProfileNames[i];
            }
        }

        const currEle = this;

        bdoc.append(
            profiles,
            bdoc.eventListener("change", () => {
                if (profiles.value === "--") {
                    return;
                }
                let updatedWeights = matchProfiles[profiles.value];
                localStorage.setItem(
                    "matchWeightsObj",
                    JSON.stringify(updatedWeights)
                );
                currEle.onSelectAction(profiles.value, updatedWeights);
            })
        );

        bdoc.append(this.shadowRoot, profiles);
    }
}
customElements.define("mm-match-profile-select", MmMatchProfileSelect);

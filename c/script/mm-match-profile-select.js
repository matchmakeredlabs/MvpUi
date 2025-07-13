import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import config from "/config.js";
import MmMatchProfileModal from "./mm-match-profile-modal.js";

export default class MmMatchProfileSelect extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);

    #matchProfiles = null;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    static async getSettings() {
        const userId = MmMatchProfileSelect.session.getCachedUserID();
        const response = await MmMatchProfileSelect.session.fetch(
            `/api/settings/${userId}`
        );
        if (response.status !== 200) {
            if (response.status === 404) {
                // If settings are not found, return an empty object
                return {};
            } else {
                alert("Unable to load settings.");
                return Promise.reject();
            }
        }
        return await response.json();
    }

    static async updateSettings(oldSettings, newSettings) {
        const updatedSettings = {
            ...oldSettings,
            ...newSettings,
        };
        const userId = MmMatchProfileSelect.session.getCachedUserID();
        const response = await MmMatchProfileSelect.session.fetch(
            `/api/settings/${userId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updatedSettings),
            }
        );
        return response;
    }

    static async getMatchProfiles(settings) {
        if (!settings) {
            settings = await MmMatchProfileSelect.getSettings();
        }
        const matchProfiles = settings.matchProfiles || {};
        matchProfiles["MM Default"] = MmMatchProfileModal.defaultMatchWeights;

        return matchProfiles;
    }

    onSelectAction = (profileName, matchWeights) => {};

    connectedCallback() {
        const profilesSelect = bdoc.ele(
            "select",
            bdoc.attr("id", "match-profiles"),

            bdoc.eventListener("change", ({ target }) => {
                if (target.value === "--") {
                    localStorage.removeItem("currentMatchProfileName");
                    return;
                }
                let updatedWeights = this.#matchProfiles[target.value];
                if (!updatedWeights) {
                    return;
                }
                localStorage.setItem(
                    "matchWeightsObj",
                    JSON.stringify(updatedWeights)
                );
                MmMatchProfileSelect.setCurrentMatchProfileName(target.value);
                this.onSelectAction(target.value, updatedWeights);
            })
        );
        bdoc.append(this.shadowRoot, profilesSelect);
        MmMatchProfileSelect.getMatchProfiles().then((matchProfiles) => {
            this.#matchProfiles = matchProfiles;
            this.renderMatchProfiles();
        });
    }

    static validateProfileChange(profileName) {
        if (profileName === "--" || profileName === "MM Default") {
            return false;
        }
        return true;
    }

    static async updateMatchProfile(profileName, newMatchWeights) {
        if (!MmMatchProfileSelect.validateProfileChange(profileName)) {
            alert("Invalid profile name.");
            return Promise.reject();
        }
        const settings = await MmMatchProfileSelect.getSettings();
        const matchProfiles = await MmMatchProfileSelect.getMatchProfiles(
            settings
        );
        if (!matchProfiles[profileName]) {
            alert("Profile does not exist.");
            return Promise.reject();
        }
        matchProfiles[profileName] = newMatchWeights;

        const response = await MmMatchProfileSelect.updateSettings(settings, {
            matchProfiles: matchProfiles,
        });
        if (response.status !== 200) {
            alert("Unable to update match profile.");
            return Promise.reject();
        }
    }

    async deleteMatchProfile(profileName) {
        if (!MmMatchProfileSelect.validateProfileChange(profileName)) {
            alert("Invalid profile name.");
            return Promise.reject();
        }
        const settings = await MmMatchProfileSelect.getSettings();
        const matchProfiles = await MmMatchProfileSelect.getMatchProfiles(
            settings
        );
        if (!matchProfiles[profileName]) {
            alert("Profile does not exist.");
            return Promise.reject();
        }
        delete matchProfiles[profileName];

        const response = await MmMatchProfileSelect.updateSettings(settings, {
            matchProfiles: matchProfiles,
        });
        if (response.status !== 200) {
            alert("Unable to delete match profile.");
            return Promise.reject();
        }

        this.#matchProfiles = matchProfiles;

        const currentMatchProfileName =
            MmMatchProfileSelect.getCurrentMatchProfileName();
        if (currentMatchProfileName === profileName) {
            MmMatchProfileSelect.removeCurrentMatchProfileName();
        }

        this.renderMatchProfiles();
    }

    addNewMatchProfile = async (profileName, matchWeights) => {
        const settings = await MmMatchProfileSelect.getSettings();
        const matchProfiles = await MmMatchProfileSelect.getMatchProfiles(
            settings
        );
        if (matchProfiles[profileName]) {
            alert("Profile already exists.");
            return Promise.reject();
        }

        matchProfiles[profileName] = matchWeights;

        const response = await MmMatchProfileSelect.updateSettings(settings, {
            matchProfiles: matchProfiles,
        });
        if (response.status !== 200) {
            alert("Unable to add match profile.");
            return Promise.reject();
        }

        this.renderMatchProfiles();
    };

    static setCurrentMatchProfileName = (profileName) => {
        localStorage.setItem("currentMatchProfileName", profileName);
    };

    static getCurrentMatchProfileName = () => {
        return localStorage.getItem("currentMatchProfileName");
    };

    static removeCurrentMatchProfileName = () => {
        localStorage.removeItem("currentMatchProfileName");
    };

    renderMatchProfiles = async () => {
        const profiles = this.shadowRoot.getElementById("match-profiles");

        profiles.innerHTML = "";

        const matchProfiles = this.#matchProfiles;

        let matchProfileNames = Object.keys(matchProfiles);

        matchProfileNames = ["--"].concat(matchProfileNames);

        const currentMatchProfileName =
            MmMatchProfileSelect.getCurrentMatchProfileName();

        matchProfileNames.forEach((name) => {
            bdoc.append(
                profiles,
                bdoc.ele(
                    "option",
                    bdoc.attr("value", name),
                    name === currentMatchProfileName
                        ? bdoc.attr("selected")
                        : null,
                    name
                )
            );
        });

        if (
            currentMatchProfileName !== null &&
            currentMatchProfileName !== ""
        ) {
            if (matchProfiles[currentMatchProfileName]) {
                localStorage.setItem(
                    "matchWeightsObj",
                    JSON.stringify(matchProfiles[currentMatchProfileName])
                );
            }
        }
    };
}
customElements.define("mm-match-profile-select", MmMatchProfileSelect);

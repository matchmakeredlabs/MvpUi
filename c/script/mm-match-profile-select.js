import bdoc from "./bdoc.js";
import bsession from "./bsession.js";
import config from "/config.js";
import {
    defaultMatchWeights,
    normalizeMatchWeights,
    getMatchWeights,
    setMatchWeights,
} from "./mm-match-profile-state.js";
import { showMessage } from "./mm-message-modal.js";

export default class MmMatchProfileSelect extends HTMLElement {
    static session = new bsession(config.backEndUrl, config.sessionTag);
    static unselectedProfileName = "--";

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
                await showMessage({
                    title: "Settings Error",
                    message: "Unable to load settings.",
                });
                return Promise.reject();
            }
        }
        return await response.json();
    }

    static async updateSettings(oldSettings, newSettings) {
        const userId = MmMatchProfileSelect.session.getCachedUserID();
        const updatedSettings = {
            mainEntityId: userId,
            ...oldSettings,
            ...newSettings,
        };
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
        const matchProfiles = {
            "MM Default": normalizeMatchWeights(defaultMatchWeights),
        };

        Object.entries(settings.matchProfiles || {}).forEach(
            ([profileName, matchWeights]) => {
                if (profileName === "MM Default") {
                    return;
                }
                matchProfiles[profileName] =
                    normalizeMatchWeights(matchWeights);
            }
        );

        return matchProfiles;
    }

    static getStoredMatchProfiles(matchProfiles) {
        const storedMatchProfiles = { ...matchProfiles };
        delete storedMatchProfiles["MM Default"];
        return storedMatchProfiles;
    }

    onSelectAction = (profileName, matchWeights) => {};

    onRenderAction = (profileName, matchWeights) => {};

    onLoadAction = (error) => {};

    connectedCallback() {
        const profilesSelect = bdoc.ele(
            "select",
            bdoc.attr("id", "match-profiles"),

            bdoc.eventListener("change", ({ target }) => {
                if (
                    target.value ===
                    MmMatchProfileSelect.unselectedProfileName
                ) {
                    MmMatchProfileSelect.removeCurrentMatchProfileName();
                    return;
                }
                let updatedWeights = this.#matchProfiles[target.value];
                if (!updatedWeights) {
                    return;
                }
                setMatchWeights(updatedWeights);
                MmMatchProfileSelect.setCurrentMatchProfileName(target.value);
                this.onSelectAction(target.value, updatedWeights);
            })
        );
        bdoc.append(this.shadowRoot, profilesSelect);
        MmMatchProfileSelect.getMatchProfiles()
            .then(async (matchProfiles) => {
                this.#matchProfiles = matchProfiles;
                await this.renderMatchProfiles();
                this.onLoadAction();
            })
            .catch((error) => {
                this.onLoadAction(error);
            });
    }

    static validateProfileChange(profileName) {
        if (
            !profileName ||
            profileName === MmMatchProfileSelect.unselectedProfileName ||
            profileName === "MM Default"
        ) {
            return false;
        }
        return true;
    }

    static async updateMatchProfile(profileName, newMatchWeights) {
        if (!MmMatchProfileSelect.validateProfileChange(profileName)) {
            await showMessage({
                title: "Match Profile Error",
                message: "Invalid profile name.",
            });
            return Promise.reject();
        }
        const settings = await MmMatchProfileSelect.getSettings();
        const matchProfiles = await MmMatchProfileSelect.getMatchProfiles(
            settings
        );
        if (!matchProfiles[profileName]) {
            await showMessage({
                title: "Match Profile Error",
                message: "Profile does not exist.",
            });
            return Promise.reject();
        }
        matchProfiles[profileName] = normalizeMatchWeights(newMatchWeights);

        const response = await MmMatchProfileSelect.updateSettings(settings, {
            matchProfiles:
                MmMatchProfileSelect.getStoredMatchProfiles(matchProfiles),
        });
        if (response.status !== 200) {
            await showMessage({
                title: "Match Profile Error",
                message: "Unable to update match profile.",
            });
            return Promise.reject();
        }
    }

    async deleteMatchProfile(profileName) {
        if (!MmMatchProfileSelect.validateProfileChange(profileName)) {
            await showMessage({
                title: "Match Profile Error",
                message: "Invalid profile name.",
            });
            return Promise.reject();
        }
        const settings = await MmMatchProfileSelect.getSettings();
        const matchProfiles = await MmMatchProfileSelect.getMatchProfiles(
            settings
        );
        if (!matchProfiles[profileName]) {
            await showMessage({
                title: "Match Profile Error",
                message: "Profile does not exist.",
            });
            return Promise.reject();
        }
        delete matchProfiles[profileName];

        const response = await MmMatchProfileSelect.updateSettings(settings, {
            matchProfiles:
                MmMatchProfileSelect.getStoredMatchProfiles(matchProfiles),
        });
        if (response.status !== 200) {
            await showMessage({
                title: "Match Profile Error",
                message: "Unable to delete match profile.",
            });
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
            await showMessage({
                title: "Match Profile Error",
                message: "Profile already exists.",
            });
            return Promise.reject();
        }

        matchProfiles[profileName] = normalizeMatchWeights(matchWeights);

        this.#matchProfiles = matchProfiles;

        const response = await MmMatchProfileSelect.updateSettings(settings, {
            matchProfiles:
                MmMatchProfileSelect.getStoredMatchProfiles(matchProfiles),
        });
        if (response.status !== 200) {
            await showMessage({
                title: "Match Profile Error",
                message: "Unable to add match profile.",
            });
            return Promise.reject();
        }

        await this.renderMatchProfiles();
    };

    static setCurrentMatchProfileName = (profileName) => {
        if (
            !profileName ||
            profileName === MmMatchProfileSelect.unselectedProfileName
        ) {
            MmMatchProfileSelect.removeCurrentMatchProfileName();
            return;
        }
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

        const matchProfileNames = [
            MmMatchProfileSelect.unselectedProfileName,
            ...Object.keys(matchProfiles),
        ];

        let currentMatchProfileName =
            MmMatchProfileSelect.getCurrentMatchProfileName();
        if (!matchProfiles[currentMatchProfileName]) {
            currentMatchProfileName =
                MmMatchProfileSelect.unselectedProfileName;
            MmMatchProfileSelect.removeCurrentMatchProfileName();
        }

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

        if (matchProfiles[currentMatchProfileName]) {
            const matchWeights = matchProfiles[currentMatchProfileName];
            setMatchWeights(matchWeights);
            this.onRenderAction(currentMatchProfileName, matchWeights);
        } else {
            this.onRenderAction(
                MmMatchProfileSelect.unselectedProfileName,
                getMatchWeights()
            );
        }
    };
}
customElements.define("mm-match-profile-select", MmMatchProfileSelect);

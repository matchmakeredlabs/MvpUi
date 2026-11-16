export const matchSettings = [
    "alg-w-cc",
    "alg-w-cp",
    "alg-w-pc",
    "alg-w-pp",
    "alg-t-cc",
    "alg-t-cp",
    "alg-t-pc",
    "alg-t-pp",
    "alg-w-k",
    "alg-t-k",
    "alg-w-c",
    "alg-t-c",
    "alg-w-p",
    "alg-t-p",
    "alg-w-d",
    "alg-t-d",
    "alg-w-tl",
    "alg-t-tl",
];

export const defaultMatchWeights = {
    "alg-w-cc": "2",
    "alg-t-cc": "0",
    "alg-w-cp": "1",
    "alg-t-cp": "0",
    "alg-w-pc": "0.5",
    "alg-t-pc": "0",
    "alg-w-pp": "0.25",
    "alg-t-pp": "0",
    "alg-w-k": "1",
    "alg-t-k": "0",
    "alg-w-c": "1",
    "alg-t-c": "0",
    "alg-w-p": "1",
    "alg-t-p": "0",
    "alg-w-d": "0",
    "alg-t-d": "0",
    "alg-w-tl": "0",
    "alg-t-tl": "0",
};

export function normalizeMatchWeights(matchWeights) {
    if (!matchWeights || Object.keys(matchWeights).length === 0) {
        return { ...defaultMatchWeights };
    }

    return matchSettings.reduce((normalized, setting) => {
        const value = matchWeights[setting];
        normalized[setting] =
            value === undefined || value === null || value === ""
                ? defaultMatchWeights[setting]
                : `${value}`;
        return normalized;
    }, {});
}

export function getMatchWeights() {
    let matchWeights;
    try {
        matchWeights = JSON.parse(localStorage.getItem("matchWeightsObj"));
    } catch {
        matchWeights = null;
    }
    return normalizeMatchWeights(matchWeights);
}

export function setMatchWeights(matchWeights) {
    localStorage.setItem(
        "matchWeightsObj",
        JSON.stringify(normalizeMatchWeights(matchWeights))
    );
}

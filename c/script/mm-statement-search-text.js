export const statementSearchTypes = {
    text: "Text",
    descriptor: "+ Descriptor",
    context: "+ Context",
};

export function statementSearchUsesAI(searchType) {
    return (
        searchType === statementSearchTypes.descriptor ||
        searchType === statementSearchTypes.context
    );
}

export function normalizeStatementSearchTypeForMode(searchType, useAI) {
    if (!useAI) return statementSearchTypes.text;
    return statementSearchUsesAI(searchType)
        ? searchType
        : statementSearchTypes.descriptor;
}

export function transitionStatementSearchType(currentType, selectedType) {
    if (selectedType === statementSearchTypes.text) {
        return statementSearchTypes.text;
    }

    if (selectedType === statementSearchTypes.descriptor) {
        return currentType === statementSearchTypes.descriptor
            ? statementSearchTypes.text
            : statementSearchTypes.descriptor;
    }

    if (selectedType === statementSearchTypes.context) {
        return currentType === statementSearchTypes.context
            ? statementSearchTypes.descriptor
            : statementSearchTypes.context;
    }

    return statementSearchTypes.text;
}

export function composeStatementSearchText({
    searchProperty,
    keywords = "",
    descriptor = "",
    context = "",
    auto = false,
}) {
    const join = (...parts) => parts.filter(Boolean).join(" ");

    if (searchProperty === statementSearchTypes.descriptor) {
        return join(descriptor, keywords);
    }
    if (searchProperty === statementSearchTypes.context) {
        return descriptor ? join(descriptor, context, keywords) : keywords;
    }
    return keywords;
}

export function getStatementSearchEndpoint(useAI) {
    return useAI
        ? "/api/match/palet?useVectorSearch"
        : "/api/match/palet";
}

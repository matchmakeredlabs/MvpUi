import auth from "./mmx_auth.js";

export default class bsession {
    constructor(baseUrl, tag) {
        this.baseUrl = baseUrl;
        this.tag = tag;
    }

    // Fetch that manages the authentication token through the Authentication-Info (received)
    // and the Authorization (sent) headers. It also defaults to the configured back-end origin.
    // Path must start with a slash and must not include a domain name.
    // Options is the same as used with conventional fetch.
    async fetch(path, options = null) {
        const url = this.baseUrl + path;
        const sessionKey = "bsession_" + this.tag;

        // Shallow clone the options so that we can add headers without changing the original
        const req = Object.assign({ headers: {} }, options);

        // Add the token if it exists
        const token = localStorage.getItem(sessionKey);
        if (token) {
            console.log("Bearer-Retrieve=" + token);
            req.headers = Object.assign(
                { Authorization: "Bearer " + token },
                req.headers
            );
        }

        // Call the api

        try {
            const response = await fetch(url, req);

            // Retrieve any updated token
            const info = response.headers.get("Authentication-Info");
            if (info) {
                for (let part of info.split(",")) {
                    part = part.trim();
                    let eq = part.search("=");
                    if (eq < 0) continue;
                    if (
                        part.substring(0, eq).trim().toLowerCase() !=
                        "bearer-update"
                    )
                        continue;
                    console.log(
                        "Bearer-Update=" + part.substring(eq + 1).trim()
                    );
                    localStorage.setItem(
                        "bsession_" + this.tag,
                        part.substring(eq + 1).trim()
                    );
                    break; // If there's more than one, keep the first
                }
            }

            if (response.status === 401) {
                localStorage.removeItem(sessionKey);
                alert("Session expired. Please log in again.");
                auth.redirectToLogin();
            }

            return response;
        } catch (err) {
            // Network/CORS/server connectivity errors should not force-logout users.
            // Keep the session token and let callers handle UI-specific error messages.

            throw err;
        }
    }

    getCachedAclBitFlags = () => {
        const cachedPermsURI = localStorage.getItem("bsession_" + this.tag);
        if (!cachedPermsURI) return null;

        let cachedPerms = decodeURIComponent(cachedPermsURI);

        const perms = {};

        const originIndex = cachedPerms.indexOf("&o=");
        if (originIndex < 0) return null;

        // Delete the part after the orgs
        cachedPerms = cachedPerms.substring(0, originIndex);

        for (const line of cachedPerms.split(";")) {
            if (line.substring(0, 4) === "acl=") {
                continue;
            }
            const [org, permsBitFlag] = line.split(":");
            if (!org || !permsBitFlag) continue;
            perms[org] = parseInt(`0x${permsBitFlag}`);
        }

        return perms;
    };

    // sample: acl=20250226T230945Z%3Btestuserorg%3Aff&o=http%3A%2F%2Flocalhost%3A4000&un=testuser&x=20250226T231023Z&m=32grk9_LTZVUa0hMY1YP02e6Nsprr217SL0UVgTWd

    getCachedUserID = () => {
        const userId = auth.getUserid();
        if (!userId) return null;
        return userId;
    };

    static privileges = {
        None: 0,
        ReadDescriptor: 0x0001,
        WriteDescriptor: 0x0002,
        ReadUser: 0x0004,
        WriteUser: 0x0008,
        ReadGroup: 0x0010,
        WriteGroup: 0x0020,
        ReadOrg: 0x0040,
        WriteOrg: 0x0080,
        ReadCustomer: 0x0100,
        WriteCustomer: 0x0200,
        All: 0x03ff,
    };

    getCachedAcl = () => {
        const cachedPerms = this.getCachedAclBitFlags();
        if (!cachedPerms) return null;

        const perms = {};
        for (const [org, permsBitFlag] of Object.entries(cachedPerms)) {
            for (const [key, value] of Object.entries(bsession.privileges)) {
                if (permsBitFlag & value) {
                    if (!perms[org]) perms[org] = [];
                    perms[org].push(key);
                }
            }
        }
        return perms;
    };
}

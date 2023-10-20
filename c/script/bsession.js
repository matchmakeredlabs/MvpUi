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

        // Shallow clone the options so that we can add headers without changing the original
        const req = Object.assign({headers: {}}, options)

        // Add the token if it exists
        const token = sessionStorage.getItem('bsession_' + this.tag);
        if (token) {
            console.log("Bearer-Retrieve=" + token);
            req.headers = Object.assign(
                {"Authorization": "Bearer " + token},
                req.headers);
        }

        // Call the api
        const response = await fetch(url, req);

        // Retrieve any updated token
        const info = response.headers.get('Authentication-Info');
        if (info) {
            for (let part of info.split(',')) {
                part = part.trim();
                let eq = part.search('=');
                if (eq < 0) continue;
                if (part.substring(0, eq).trim().toLowerCase() != 'bearer-update') continue;
                console.log("Bearer-Update=" + part.substring(eq + 1).trim());
                sessionStorage.setItem('bsession_' + this.tag, part.substring(eq + 1).trim());
                break; // If there's more than one, keep the first
            }
        }

        return response;
    }


}

// Fetch that manages the authentication token through the Authentication-Info (received)
// and the Authorization (sent) headers.
export default class bsession {

    static async fetch(url, options = null) {

        // Shallow clone the options so that we can add headers without changing the original
        const req = Object.assign({headers: {}}, options)

        // Add the token if it exists
        const token = sessionStorage.getItem('bsession_token');
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
                sessionStorage.setItem('bsession_token', part.substring(eq + 1).trim());
                break; // If there's more than one, keep the first
            }
        }

        return response;
    }


}

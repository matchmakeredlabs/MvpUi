import config from './config.js';

// Authentication and Authorization
export default class mmxAuth {
    static sessionKey = 'bsession_' + config.sessionTag;
    static loginUrl = "/c/Login";

    static dateParse(str) {
        str = ''.concat(str.substring(0, 4), "-", str.substring(4, 6), "-", str.substring(6, 11), ":",
            str.substring(11, 13), ":", str.substring(13));
        return Date.parse(str);
    }

    static isAuthenticated() {
        // Look for the presence of the authentication token in localStorage
        // and check for expiration
        const token = localStorage.getItem(mmxAuth.sessionKey)
        if (!token) return false;

        // Having found the cookie, parse it and check its expiration
        const tokenParts = new URLSearchParams(decodeURIComponent(token));
        const expiration = tokenParts.get("x");
        if (expiration && mmxAuth.dateParse(expiration) > Date.now()) return true;

        console.log("Cookie expired");
        return false;
    }

    static redirectToLogin() {
        window.location.replace(mmxAuth.loginUrl + "?returnTo=" + encodeURIComponent(window.location.href));
    }

    // This is a bit of a Kludge. The better way to do this would be to redirect
    // to the login page whenever an API call results in a 401 Unauthorized.
    static requireAuthentication() {
        if (!mmxAuth.isAuthenticated()) {
            console.log("Redirecting to login.");
            mmxAuth.redirectToLogin();
        }
    }
}

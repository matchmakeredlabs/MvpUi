// Authentication and Authorization

// Really just using mmxAuth as a namespace to isolate
class mmxAuth {

    static authtCookieName = "MMT";
    static loginUrl = "/c/Login";

    static dateParse(str) {
        str = ''.concat(str.substring(0, 4), "-", str.substring(4, 6), "-", str.substring(6, 11), ":",
            str.substring(11, 13), ":", str.substring(13));
        return Date.parse(str);
    }

    static isAuthenticated() {
        // Look for the presence of the authentication token.
        // If expired, it should go away, but we check its expiration anyway
        let ca = document.cookie.split(';');
        const match = mmxAuth.authtCookieName + '=';
        for (let cookie of ca) {
            if (cookie.startsWith(match)) {
                // Having found the cookie, parse it and check its expiration
                let cookieParts = new URLSearchParams(decodeURIComponent(cookie.substring(match.length, cookie.length)));
                let expiration = cookieParts.get("x");
                if (expiration && mmxAuth.dateParse(expiration) > Date.now()) return true;
            }
        }
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

console.log("mmx_auth.js Loaded.");


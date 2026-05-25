import config from "/config.js";

// Authentication and Authorization
export default class mmxAuth {
    static sessionKey = "bsession_" + config.sessionTag;
    static loginUrl = "/c/Login";
    static privileges = {
        ReadGroup: 0x0010,
        ReadOrg: 0x0040,
        ReadCustomer: 0x0100,
        WriteCustomer: 0x0200,
    };

    static dateParse(str) {
        str = "".concat(
            str.substring(0, 4),
            "-",
            str.substring(4, 6),
            "-",
            str.substring(6, 11),
            ":",
            str.substring(11, 13),
            ":",
            str.substring(13)
        );
        return Date.parse(str);
    }

    static isAuthenticated() {
        // Look for the presence of the authentication token in localStorage
        // and check for expiration
        const token = localStorage.getItem(mmxAuth.sessionKey);
        if (!token) return false;

        // Having found the token, parse it and check its expiration
        const tokenParts = new URLSearchParams(decodeURIComponent(token));
        const expiration = tokenParts.get("x");
        if (expiration && mmxAuth.dateParse(expiration) > Date.now())
            return true;

        return false;
    }

    static getUserid() {
        const token = localStorage.getItem(mmxAuth.sessionKey);
        if (!token) return false;

        // Having found the cookie, parse it and return the userid
        const tokenParts = new URLSearchParams(decodeURIComponent(token));
        return tokenParts.get("un") || tokenParts.get("uid");
    }

    static redirectToLogin() {
        // check if window location is already the login page
        if (window.location.pathname === mmxAuth.loginUrl) return;
        window.location.replace(mmxAuth.loginUrl);
    }

    static getCachedAclBitFlags() {
        const token = localStorage.getItem(mmxAuth.sessionKey);
        if (!token) return {};

        let cachedPerms = decodeURIComponent(token);
        const originIndex = cachedPerms.indexOf("&o=");
        if (originIndex >= 0) {
            cachedPerms = cachedPerms.substring(0, originIndex);
        }

        const perms = {};
        for (const line of cachedPerms.split(";")) {
            if (!line || line.substring(0, 4) === "acl=") continue;

            const [scope, permsBitFlag] = line.split(":");
            if (!scope || !permsBitFlag) continue;

            const parsed = parseInt(permsBitFlag, 16);
            if (!Number.isNaN(parsed)) {
                perms[scope] = parsed;
            }
        }

        return perms;
    }

    static hasAnyPrivilege(...privileges) {
        const acl = mmxAuth.getCachedAclBitFlags();
        for (const [scope, flags] of Object.entries(acl)) {
            if (scope === "admin") return true;
            if (privileges.some((privilege) => (flags & privilege) !== 0)) {
                return true;
            }
        }

        return false;
    }

    // This is a bit of a Kludge. The better way to do this would be to redirect
    // to the login page whenever an API call results in a 401 Unauthorized.
    static requireAuthentication() {
        if (!mmxAuth.isAuthenticated()) {
            localStorage.clear();
            console.log("Redirecting to login.");
            mmxAuth.redirectToLogin();
        }

        const header = document.getElementById("header-container");
        if (!header || document.getElementById("account-menu")) return;

        const menu = document.createElement("div");
        menu.id = "account-menu";
        menu.className = "account-menu";

        const menuButton = document.createElement("button");
        menuButton.id = "account-menu-button";
        menuButton.className = "small-button small-button5 account-menu-button";
        menuButton.type = "button";
        menuButton.textContent = mmxAuth.getUserid() || "Account";
        menuButton.setAttribute("aria-haspopup", "true");
        menuButton.setAttribute("aria-expanded", "false");

        const menuItems = document.createElement("div");
        menuItems.className = "account-menu-items";
        menuItems.setAttribute("role", "menu");

        const addLink = (text, href) => {
            const link = document.createElement("a");
            link.href = href;
            link.textContent = text;
            link.setAttribute("role", "menuitem");
            menuItems.appendChild(link);
        };

        addLink("Account Settings", "/c/AccountSettings");
        if (
            mmxAuth.hasAnyPrivilege(
                mmxAuth.privileges.ReadCustomer,
                mmxAuth.privileges.WriteCustomer
            )
        ) {
            addLink("Customers", "/c/Customers");
        }
        if (mmxAuth.hasAnyPrivilege(mmxAuth.privileges.ReadOrg)) {
            addLink("Projects", "/c/Projects");
        }
        if (mmxAuth.hasAnyPrivilege(mmxAuth.privileges.ReadGroup)) {
            addLink("Groups", "/c/Groups");
        }

        const logoutButton = document.createElement("button");
        logoutButton.type = "button";
        logoutButton.style.color = "red"
        logoutButton.style.fontWeight = "bold"
        logoutButton.textContent = "Log Out";
        logoutButton.setAttribute("role", "menuitem");
        logoutButton.addEventListener("click", function () {
            localStorage.clear();
            mmxAuth.redirectToLogin();
        });
        menuItems.appendChild(logoutButton);

        const closeMenu = () => {
            menu.classList.remove("open");
            menuButton.setAttribute("aria-expanded", "false");
        };

        menuButton.addEventListener("click", function (event) {
            event.stopPropagation();
            const isOpen = menu.classList.toggle("open");
            menuButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });

        document.addEventListener("click", closeMenu);
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeMenu();
        });

        menu.appendChild(menuButton);
        menu.appendChild(menuItems);
        header.appendChild(menu);
    }
}

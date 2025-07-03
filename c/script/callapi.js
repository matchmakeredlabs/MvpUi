import bsession from "./bsession.js";
import config from "../../config.js";

const session = new bsession(config.backEndUrl, config.sessionTag);

async function sendRequest(e) {
    e.preventDefault();
    const oldCookie = document.cookie;
    const form = e.currentTarget;
    const reqUrl = form.url.value;
    const verb = form.verb.value;
    const req = {
        headers: {},
        method: verb,
    };
    if (verb == "POST" || verb == "PUT") {
        req.headers["Content-Type"] = "application/json";
        req.body = form.body.value;
    }
    const token = form.token.value;
    let fetchFunc = fetch;
    if (token) {
        req.headers["Authorization"] = "Bearer " + token;
    } else {
        fetchFunc = (url, req) => {
            const objUrl = url.replace(/^(http|https):\/\//, "");
            const objUrlParts = objUrl.split("/");
            const objUrlPath = "/" + objUrlParts.slice(1).join("/");
            return session.fetch(objUrlPath, req);
        };
    }
    if (form.credinclude.checked) {
        req.credentials = "include";
    }

    document.getElementById("resStatus").innerHTML = "";
    document.getElementById("resHeaders").innerHTML = "";
    document.getElementById("resBody").textContent = "";

    try {
        const response = await fetchFunc(reqUrl, req);
        document.getElementById(
            "resStatus"
        ).textContent = `${response.status} ${response.statusText}`;
        let newToken;
        if ((newToken = getUpdatedToken(response)))
            document.getElementById("token").value = newToken;
        reportHeaders(response, oldCookie);
        let bodyText = await response.text();
        document.getElementById("resBody").textContent = bodyText;
    } catch (err) {
        document.getElementById(
            "resBody"
        ).textContent = `Error: ${err.message}\nSee console.`;
    }
}

function getUpdatedToken(response) {
    const info = response.headers.get("Authentication-Info");
    if (!info) return;
    for (let part of info.split(",")) {
        part = part.trim();
        let eq = part.search("=");
        if (eq < 0) continue;
        let e = eq;
        while (e > 0 && (part[e - 1] == " " || part[e - 1] == "\t")) --e;
        if (e != 13 || part.substring(0, 13).toLowerCase() != "bearer-update")
            continue;
        return part.substring(eq + 1).trim();
    }
}

function reportHeaders(response, oldCookie) {
    var ele = document.getElementById("resHeaders");
    ele.innerHTML = "";
    for (let pair of response.headers) {
        var div = document.createElement("div");
        div.textContent = `${pair[0]}: ${pair[1]}`;
        ele.appendChild(div);
    }

    // Report Cookies
    const oldCookies = parseCookies(oldCookie);
    const newCookies = parseCookies(document.cookie);
    for (var key in newCookies) {
        if (newCookies[key] != oldCookies[key]) {
            var div = document.createElement("div");
            div.textContent = `SetCookie:\u00A0${key}=${newCookies[key]}`;
            ele.appendChild(div);
        }
    }
}

function parseCookies(cookieString) {
    let cookies = {};
    for (var cookie of cookieString.split(";")) {
        let eq = cookie.indexOf("=");
        cookies[cookie.substring(0, eq).trim()] = cookie
            .substring(eq + 1)
            .trim();
    }
    return cookies;
}

function deleteAllCookies() {
    for (const key in parseCookies(document.cookie)) {
        // Clear with and without path
        document.cookie =
            key + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        document.cookie = key + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
}

function clearAll(e) {
    e.preventDefault();

    // Clear Request
    document.getElementById("verb").value = "GET";
    updateUrl("/");
    document.getElementById("token").value = "";
    document.getElementById("credinclude").checked = false;
    document.getElementById("body").value = "";
    deleteAllCookies();

    // Clear Response
    document.getElementById("resStatus").innerHTML = "";
    document.getElementById("resHeaders").innerHTML = "";
    document.getElementById("resBody").textContent = "";
}

const templates = [
    {
        name: "Login",
        verb: "POST",
        url: "/api/login",
        body: { username: "a", password: "" },
    },
    {
        name: "Logout",
        verb: "GET",
        url: "/api/logout",
    },
    {
        name: "Collections",
        verb: "GET",
        url: "/api/collections",
    },
    {
        name: "Descriptors",
        verb: "GET",
        url: "/api/descriptors",
        body: {
            eleType: "cs",
            name: "Statement Name",
            url: "http://example.com/someIdentifer",
            identifier: "SomeScience.1",
            subject: "Science",
            description: "A Science Competency Statement",
            educationLevel: "5",
            mainEntity: "http://example.com/mainIdentifier",
            mainEntityId: "00000000-0000-0000-0000-000000000000",
        },
    },
    {
        name: "Match",
        verb: "POST",
        url: "/api/match/palet",
        body: {
            matchText:
                "The sun is a mass of incandescent gas, a gigantic nuclear furnace. Where hydrogen is smashed into helium at temperatures of millions of degrees.",
        },
    },
    {
        name: "Users",
        verb: "GET",
        url: "/api/users",
        body: {
            name: "name@example.com",
            password: "Password",
            fullName: "FirstName LastName",
        },
    },
    {
        name: "Groups",
        verb: "GET",
        url: "/api/groups",
        body: {
            name: "GroupName",
            org: "OrgId",
            description: "display name / description",
            members: ["memberId"],
        },
    },
    {
        name: "Organizations",
        verb: "GET",
        url: "/api/orgs",
        body: {
            name: "OrgName",
            description: "display name / description",
            members: [{ id: "MemberId", role: "owner" }],
        },
    },
    {
        name: "ReportMxn",
        verb: "POST",
        url: "/api/report/mxn",
        body: {
            profile: {
                w_cc: 2,
                w_cp: 1,
                w_pc: 0.5,
                w_pp: 0.25,
                w_k: 1,
                w_c: 1,
                w_p: 1,
                w_d: 0,
                t_cc: 0,
                t_cp: 0,
                t_pc: 0,
                t_pp: 0,
                t_k: 0,
                t_c: 0,
                t_p: 0,
                t_d: 0,
            },
            srcDescriptorIds: [
                "c6761c8f-d0c9-4076-90ec-fc3b30e81d69",
                "dd4d8e04-2c89-4e6a-809f-d58d8fc43cc6",
            ],
            dstDescriptorIds: [
                "65eb2a4b-9ab6-44ef-baba-e1a3e44b1e85",
                "23209b0d-f7aa-4330-a7dc-b7fa8c9683f1",
                "42cf5d20-e42b-44c1-b2c7-c45d5cd7a96d",
                "23209b0d-f7aa-4330-a7dc-b7fa8c9683f1",
                "64fcebcf-1c00-4890-867d-18590dbdfd46",
                "7f44d663-9de5-4048-9ceb-cf36c57ae3f5",
                "46e54f5b-0bf3-4aee-ac17-816028dd3eb3",
                "c29b82f6-dc7d-4a21-a5aa-d928d783a34f",
            ],
        },
    },
    {
        name: "Settings",
        verb: "GET",
        url: "/api/settings",
        body: {
            mainEntityId: session.getCachedUserID() || "sampleId",
            matchProfiles: {
                newMatchProfile: {
                    "alg-w-cc": "2",
                    "alg-t-cc": "0",
                    "alg-w-cp": "0.49",
                    "alg-t-cp": "0",
                    "alg-w-pc": "0.5",
                    "alg-t-pc": "0",
                    "alg-w-pp": "0.86",
                    "alg-t-pp": "0.16",
                    "alg-w-k": "1",
                    "alg-t-k": "0",
                    "alg-w-c": "1",
                    "alg-t-c": "0",
                    "alg-w-p": "1",
                    "alg-t-p": "0",
                    "alg-w-d": "0.56",
                    "alg-t-d": "0",
                },
            },
        },
    },

    {
        name: "Comments",
        verb: "GET",
        url: "/api/comments",
        body: {
            comment: "This is a sample comment",
            commentAbout: "paletStatements",
            descriptor: {
                _canUpdate: true,
                _isLeaf: true,
                _leafCount: 1,
                _leafWithKeyCount: 1,
                _orgId: "testorg",
                _public: false,
                creator: "",
                datePublished: "",
                description: "co",
                educationalLevel: "",
                eleType: "lr",
                id: "7beda6ef-4568-421d-bba3-3db5ea94eaad",
                identifier: "",
                isPartOf: "hiii test wahh",
                isPartOfId: "52093ec2-3308-4fd6-be5b-bc4ad32a1cf0",
                key: "https://palet.codes/key/5553C-10481C",
                leafCount: 1,
                leafWithKeyCount: 1,
                mainEntity: "hiii test",
                mainEntityId: "5a0ecf28-9ba2-42aa-8dea-273572987614",
                name: "crazy",
                provenance: "",
                sdDatePublished: "",
                subject: "",
                url: "hiii test wahh oops",
            },
            statements: [
                {
                    id: "5553",
                    int: "Intentional",
                    rel: "Central",
                    statement:
                        "Defining the trigonometric ratios sine (sin), cosine (cos) and tangent (tan) in terms of the sides of a right triangle.",
                    stmtType: "STFk",
                },
            ],
        },
    },
];

function onTemplateClick(e) {
    e.preventDefault();
    const data = e.target.data;
    document.getElementById("verb").value = data.verb;
    updateUrl(data.url);
    if (data.body) {
        document.getElementById("body").value = JSON.stringify(
            data.body,
            null,
            2
        );
    } else {
        document.getElementById("body").value = "";
    }
}

function updateUrl(newurl) {
    const urlele = document.getElementById("url");
    const existing = urlele.value;
    if (existing.startsWith("http")) {
        urlele.value = new URL(newurl, existing);
    } else {
        urlele.value = newurl;
    }
}

function setTemplates() {
    const p = document.getElementById("templates");
    for (let t of templates) {
        p.appendChild(document.createTextNode(" "));
        let a = document.createElement("a");
        a.data = t;
        a.classList.add("tlnk");
        a.addEventListener("click", onTemplateClick);
        a.textContent = t.name;
        p.append(a);
    }
}

// Initialization

// Default URL
document.getElementById("url").value = config.backEndUrl;
document.getElementById("form").addEventListener("submit", sendRequest);
document.getElementById("clear").addEventListener("click", clearAll);
setTemplates();

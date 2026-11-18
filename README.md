# MatchMaker MVP UI

Running this site locally is far simpler than running the backend. All you really need is Jekyll and JavaScript installed.

To run, just type
```
jekyll serve
```
in the terminal.

config.js chooses the version of the backend behind the locally running website. Uncomment whichever version you want to use for local purposes. localhost:7071 to use the locally running backend (see MatchMakerMvp/README.md for instructions on how to run). The other two are deployed backends; app.matchmakeredlabs.net is the lastest stable version of the backend, and matchmakerstaging.azurewebsites.net is the latest deployed version.

Make sure that before you send a PR to merge into uxstage (we use this instead of main), the config file runs a deployed backend!

API failures display the backend's `message`. The `requestId` stays available in
the Network response and error metadata for diagnostics. The shared
`c/script/api-errors.js` helpers support the older error formats as well as empty or
HTML error responses. Keep response parsing and error presentation in these helpers
when adding API calls. Use `readJsonResponse` for successful JSON responses and
`showApiError` or `getApiErrorMessage` for a component's error UI.

Run offline error-handling and sign-in regression tests with:

```sh
node --experimental-vm-modules --test tests/*.test.cjs
```

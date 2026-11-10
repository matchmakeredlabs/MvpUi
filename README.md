# MatchMaker MVP UI

Running this site locally is far simpler than running the backend. All you really need is Jekyll and JavaScript installed.

To run, just type
```
jekyll serve
```
in the terminal.

config.js chooses the version of the backend behind the locally running website. Uncomment whichever version you want to use for local purposes. localhost:7071 to use the locally running backend (see MatchMakerMvp/README.md for instructions on how to run). The other two are deployed backends; app.matchmakeredlabs.net is the lastest stable version of the backend, and matchmakerstaging.azurewebsites.net is the latest deployed version.

Make sure that before you send a PR to merge into uxstage (we use this instead of main), the config file runs a deployed backend!
# MatchMaker MVP UI

This is the front end for the MatchMaker application.
 
## Orientation

Front-ends are hosted on CloudFlare workers while back-ends are hosted on Azure Functions.

The back-end servers are:
* Development/Testing/Staging: https://backstage.matchmakeredlabs.net
* Production: https://kitchen.matchmakeredlabslnet

> Note: "backstage.matchmakeredlabs.net" is the new DNS name for the previously-used "stage.matchmakeredlabs.net". In the near future, "stage" will be given to a front-end and that name will be disconnected from the back-end. That action is being deferred until the development team has changed their settings over to "backstage".

> As of November 2026, both back ends use the same database. Very soon we will create a new production database and the "kitchen" server will switch to that new database.

The front-end servers are:
* dev.matchmakeredlabs.net - To experiment with and evaluate features under development.
* preview.matchmakeredlabs.net - Features stable enough for cautious demonstration.
* stage.matchmakeredlabs.net - Final testing before deployment to production. Safe place to access the development database (once they are separate).
* preprod.matchmakeredabs.net - Pre-production deployment on the **production back-end server**. Intended for final testing before deploying to production.
* app.matchmakeredlabs.net - Production instance intended for customers. Uses the **production back-end server**.

## Development Environment

You need the following tools:
* [Git](https://git-scm.com/install/windows)
    * When installing, you must select **"Use Git and Optional Unix tools from the Command Prompt"** for the deployment scripts to work.
* [Node.js](https://nodejs.org/en/download)
* Either [Docker Desktop](https://www.docker.com/products/docker-desktop/) or [Jekyll](https://jekyllrb.com/docs/)

The website is built and tested using Jekyll. You can either install and run Jekyll natively or run the containerized version of Jekyll under Docker. I (Brandt) who already uses docker or many other things, find the containerized version to be more convenient because running Jekyll natively requires installing and configuring Ruby which can be a challenge on Windows.

### Docker Method

> On Windows, Docker Desktop requires the [Windows Subsystem for Linux](https://learn.microsoft.com/en-us/windows/wsl/install) as a prerequisite. From a Windows command line just type `wsl --install`. Then proceed to install [Docker Desktop](https://www.docker.com/products/docker-desktop/).

If you use the docker method then you will use the `jekylld.sh` script to serve and build.
* From a **Bash type shell** shell it's `./jekylld.sh serve` to serve a local copy and `./jekylld.sh build` to build a copy for deployment.
* From a **Windows Command Prompt** or **PowerShell** the commands are `sh jekylld.sh serve` and `sh jekylld.sh build`.

### Ruby and Jekyll method

* Install Ruby and RubyGems
* Follow the [installation instructions](https://jekyllrb.com/docs/) for Jekyll.
* Commands to serve and build are `jekyll serve` and `jekyll build`.

## Running locally for development and testing

Use `jekyll serve` if you have installed Jekyll or `./jekylld.sh serve` if you are using the Docker method.

The front-end server will appear at `https://localhost:4000`.

### Setting configuration

`config.js` indicates which back-end server to use. Usually you will use `https://backstage.matchmakeredlabs.net`. If you are testing a local copy of the server then set it to `http://localhost` with the right port number.

## Deploying the Front End onto a live server

Deployment on CloudFlare uses their **wrangler** tool. Before deploying, you must first log into wrangler which will save your credentials to your computer.

```sh
npx wrangler login
```

> Be sure to do a `Jekyll Build` before deploying. We may automate that in the future.

```sh
npx wrangler deploy --env dev
```

In the above command `dev` refers to the development server, [https://dev.matchmakeredlabs.net](https://dev.matchmakeredlabs.net). You can deploy to any of the five front-end servers using `dev`, `preview`, `stage`, `preprod`, or `app`.

> Temporarily, the `stage` environment will deploy to [https://stage2.matchmakeredlabs.net](https://dev.matchmakeredlabs.net) because we still stage.matchmakeredlabs.net mapped to the same server as backstage.matchmakeredlabs.net. As soon as everyone on the development team has change their configuration to `backstage` I will fix that.

> The deployment script automatically sets the right values in `config.js` according to which server is being deployed.

## Development Regulation and Pull Requests

In setting up this deployment framework, I (Brandt) have intentionally separated the build and deployment steps. We may set up an automated CI/CD system in the future but I'm deferring that for the moment.

As done previously, a commit or PR to the `uxstage` branch will still deploy to `https://uxstage.matchmakeredlabs.net` though we will shut that down once everyone has moved to the new system. We need to discuss how we plan to manage branches, PRs, and so forth.

## Housekeeping

As of November 2026, I (Brandt) still have some housekeeping tasks.

* Get rid of the extra "c/" directory in the deployed front-end site. It was there for when the front-end and back-end were hosted by the same server and now it's just awkward. The files in "c/" should just move to the root.
* Move all sources to a "src/" directory so that the root doesn't have a mix of source files and build scripts as it does now.
* Put a redirect to www.matchmakeredlabs.net at the root of both back-end servers.
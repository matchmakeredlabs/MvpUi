# MatchMaker MVP UI

Jekyll project to build the MatchMaker MVP UI Pages

## Testing locally

```sh
./mm.sh build
```

Then browse to https://localhost:4000/c
Use Ctrl-C to exit the development server.

## Preparing to build and deploy

1. Install Node.js
2. Install Docker Desktop
3. Login to wrangler, the CloudFlare deployment tool

```sh
npx wrangler login
```

If this is your first time using wrangler, it will ask you if you want to install it.
Then it will open a web page for you to log into CloudFlare (using your cloudflare account) and grant permission to Wrangler.

## To Build

```sh
./mm.sh build
```

## To Deploy

*Coming soon!*

## Todo (for Brandt)

1. Add an `index.html` in the root that redirects to `c/`. (Temporary solution: Until I remove the unnecessary `c` directory.)
2. Add a wrangler.jsonc file that supports multiple deployment options including which config file to use.
3. Change the `c` directory to `src` and update the build scripts to build directly from there so that upon deployment the main files go directly into the root of the website.


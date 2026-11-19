backend_url=${1:-https://kitchen.matchmakeredlabs.net}
deployed=$(date -u +%Y-%m-%dT%H:%M:%SZ)
deployed_by=$(id -un)

cat > ./_site/config.js << EOF
export default class config {
    static backEndUrl = "$backend_url";
    static sessionTag = "mm";
    static deployed = "$deployed";
    static deployedBy = "$deployed_by";
}
EOF
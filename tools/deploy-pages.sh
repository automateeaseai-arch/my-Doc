#!/usr/bin/env bash
# Builds the app and publishes it to the gh-pages branch (GitHub Pages).
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
cd dist
touch .nojekyll
sed -i "s/mydoc-v1/mydoc-$(date +%s)/" sw.js   # new offline cache each deploy
git init -q -b gh-pages
git add -A
git -c user.name="myDoc deploy" -c user.email="deploy@mydoc.invalid" commit -q -m "Deploy $(date -u '+%F %H:%M')"
git push -q -f "$(git -C .. remote get-url origin)" gh-pages
rm -rf .git
echo "Deployed to gh-pages"

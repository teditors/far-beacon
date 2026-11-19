#!/usr/bin/env bash
# Builds a playable copy of every branch worth playing into site/, one folder per branch, with a front page.
# Run by .github/workflows/site.yml on every push. Run it yourself with: bash tools/site.sh
set -u
rm -rf site .site-work && mkdir -p site .site-work
git fetch -q origin '+refs/heads/*:refs/remotes/origin/*' || true
rows=""
refs=$(git for-each-ref --format='%(refname:short)' refs/remotes/origin)
order="$(echo "$refs" | grep -x 'origin/main') $(echo "$refs" | grep '^origin/commission/' | sort -V) $(echo "$refs" | grep '^origin/version/' | sort -rV)"
for ref in $order; do
  branch=${ref#origin/}
  dir=$(echo "$branch" | tr '/' '-')
  echo "== $branch"
  git worktree add -q --detach ".site-work/$dir" "$ref" || continue
  if (cd ".site-work/$dir" && npm ci --silent --no-audit --no-fund >/dev/null 2>&1 && node tools/build.js >/dev/null) && [ -f ".site-work/$dir/dist/index.html" ]; then
    mkdir -p "site/$dir"
    # All builds share one web address, so each gets its own saves: every storage key is prefixed with the build's name.
    node -e '
      const fs = require("fs"), [src, out, name] = process.argv.slice(1);
      const shim = "<script>(()=>{const p=" + JSON.stringify(name + ":") + ",S=Storage.prototype,g=S.getItem,s=S.setItem,r=S.removeItem;" +
        "S.getItem=function(k){return g.call(this,p+k)};S.setItem=function(k,v){return s.call(this,p+k,v)};S.removeItem=function(k){return r.call(this,p+k)}})()</script>";
      fs.writeFileSync(out, fs.readFileSync(src, "utf8").replace(/<head[^>]*>/i, (m) => m + shim));
    ' ".site-work/$dir/dist/index.html" "site/$dir/index.html" "$dir"
    when=$(git log -1 --format='%cd' --date=format:'%b %d, %Y' "$ref")
    what=$(git log -1 --format='%s' "$ref" | sed 's/&/\&amp;/g; s/</\&lt;/g')
    rows="$rows<li><a href=\"$dir/\">$branch</a><span>$when: $what</span></li>"
  else
    echo "   (could not build $branch; skipped)"
  fi
  git worktree remove --force ".site-work/$dir"
done
rm -rf .site-work
cat > site/index.html <<HTML
<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Far Beacon builds</title>
<style>body{font:16px system-ui,sans-serif;background:#14181f;color:#ddd;max-width:40em;margin:2em auto;padding:0 1em}
a{color:#e0a84a;font-weight:600;font-size:1.1em}li{margin:0 0 1em}span{display:block;color:#999;font-size:.9em}ul{padding-left:1.2em}</style>
<h1>Far Beacon</h1><p>A playable copy of each branch, rebuilt on every push. Each keeps its own saves.</p><ul>$rows</ul>
HTML
echo "built site/ with $(ls site | wc -l) entries"

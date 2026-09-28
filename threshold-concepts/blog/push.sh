#!/usr/bin/env bash
# Render the post and push everything the rendered HTML actually needs
# to the CS department web server — same remote location as
# ../presentation/push.sh, so the talk and its write-up sit side by side.
#
# Deploy set, and why each is needed:
#   blog.html    the rendered post
#   blog_files/  Quarto's asset bundle (bootstrap, css, etc.)
#   images/      all <img> sources referenced in blog.qmd
#   js/          kmeans-widget.js, workflow-diagram.js — loaded via
#                 <script src="js/...">
#   libs/        d3.min.js — loaded via <script src="libs/...">
#
# js/, libs/, and images/ are referenced as root-relative paths in the
# rendered HTML (see include-after-body / raw <img> tags in blog.qmd),
# NOT copied into blog_files/ by Quarto, so they have to be pushed as
# separate top-level siblings of blog.html — same reasoning as
# presentation/push.sh. Filenames overlap with (and are identical
# copies of) files the presentation already pushes to this same
# directory, so syncing both is harmless — rsync just updates them in
# place.
#
# NOT pushed (not needed at runtime): blog.qmd, custom.scss,
# references.bib, _quarto.yml, _jigsaw.html (inlined into the HTML at
# render time).

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

REMOTE="lczhang@cs.toronto.edu"
REMOTE_DIR="public_html/iticse2026/"

echo "==> Rendering blog.qmd"
quarto render blog.qmd

echo "==> Syncing to $REMOTE:$REMOTE_DIR"
ssh "$REMOTE" "mkdir -p $REMOTE_DIR"
# No trailing slashes on these sources: rsync copies a source's
# *contents* into the destination when it ends in "/", and the
# directory itself (preserving the name) when it doesn't. We want the
# latter here — blog_files, images, js, and libs all need to keep
# their own names as subdirectories of $REMOTE_DIR, matching the
# root-relative paths blog.html actually requests.
rsync -avz \
  blog.html \
  blog_files \
  images \
  js \
  libs \
  "$REMOTE:$REMOTE_DIR"

# Note: no --delete. This only ever adds/updates files on the remote,
# so a stale asset removed locally will linger there until cleaned up
# by hand — safer default than silently deleting something on a shared
# public_html. Add --delete per-directory if you want a true mirror.

echo "==> Done: https://www.cs.toronto.edu/~lczhang/iticse2026/blog.html"

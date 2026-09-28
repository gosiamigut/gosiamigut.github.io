#!/usr/bin/env bash
# Render the deck and push everything the rendered HTML actually needs
# to the CS department web server.
#
# Deploy set, and why each is needed:
#   presentation.html   the rendered deck
#   presentation_files/ Quarto's asset bundle (revealjs, css, etc.)
#   images/             all <img> sources referenced in presentation.qmd
#   js/                 kmeans-widget.js, weightspace-widget.js,
#                        workflow-diagram.js — loaded via <script src="js/...">
#   libs/               d3.min.js — loaded via <script src="libs/...">
#
# js/, libs/, and images/ are referenced as root-relative paths in the
# rendered HTML (see include-after-body / raw <img> tags in
# presentation.qmd), NOT copied into presentation_files/ by Quarto, so
# they have to be pushed as separate top-level siblings of
# presentation.html — that's almost certainly the "forgotten" piece.
#
# NOT pushed (not needed at runtime): presentation.qmd, custom.scss,
# references.bib, _quarto.yml, _jigsaw.html (inlined into the HTML at
# render time), and everything under images/ that presentation.qmd
# doesn't actually reference (synced anyway below, since pruning that
# by hand is exactly how a file goes missing later).

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

REMOTE="lczhang@cs.toronto.edu"
REMOTE_DIR="public_html/iticse2026/"

echo "==> Rendering presentation.qmd"
quarto render presentation.qmd

echo "==> Syncing to $REMOTE:$REMOTE_DIR"
ssh "$REMOTE" "mkdir -p $REMOTE_DIR"
# No trailing slashes on these sources: rsync copies a source's
# *contents* into the destination when it ends in "/", and the
# directory itself (preserving the name) when it doesn't. We want the
# latter here — presentation_files, images, js, and libs all need to
# keep their own names as subdirectories of $REMOTE_DIR, matching the
# root-relative paths presentation.html actually requests.
rsync -avz \
  presentation.html \
  presentation_files \
  images \
  js \
  libs \
  "$REMOTE:$REMOTE_DIR"

# Note: no --delete. This only ever adds/updates files on the remote,
# so a stale asset removed locally will linger there until cleaned up
# by hand — safer default than silently deleting something on a shared
# public_html. Add --delete per-directory if you want a true mirror.

echo "==> Done: https://www.cs.toronto.edu/~lczhang/iticse2026/presentation.html"

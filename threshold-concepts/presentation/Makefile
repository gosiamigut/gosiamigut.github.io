QMD     := presentation.qmd
HTML    := presentation.html
FIGS    := images/kmeans.svg images/bias_variance.svg images/regularization.svg \
           images/overlap.svg images/loss_landscape.svg images/geometry_scatter.svg \
           images/geometry_warp.svg

.PHONY: all render preview figures pdf clean

all: render

render: $(HTML)

$(HTML): $(QMD) custom.scss references.bib $(FIGS)
	quarto render $(QMD)

# live-reload while editing
preview:
	quarto preview $(QMD)

# regenerate the matplotlib figures
figures $(FIGS) &: scripts/make_figures.py
	python3 scripts/make_figures.py

# PDF export of the revealjs deck (requires chrome/chromium via quarto)
pdf: $(HTML)
	quarto render $(QMD) --to revealjs -M pdf-export:true
	@echo "Or: open $(HTML)?print-pdf in Chrome and print to PDF"

clean:
	rm -rf $(HTML) presentation_files

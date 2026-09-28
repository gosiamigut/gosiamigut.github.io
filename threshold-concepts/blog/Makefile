QMD  := blog.qmd
HTML := blog.html

.PHONY: all render preview figures clean

all: render

render: $(HTML)

$(HTML): $(QMD) custom.scss references.bib _jigsaw.html
	quarto render $(QMD)

# live-reload while editing
preview:
	quarto preview $(QMD)

# regenerate the matplotlib-generated SVG figures (not currently used by
# blog.qmd, but kept in sync with the presentation's figure set)
figures:
	python3 scripts/make_figures.py

clean:
	rm -rf $(HTML) blog_files .quarto

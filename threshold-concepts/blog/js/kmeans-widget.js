// Interactive k-means widget for the "Learning is Optimization: Integrative"
// slide. Self-contained IIFE, D3 v7. Data matches scripts/make_figures.py's
// kmeans_figure() (data rng seed 4, init rng seed 8) so it's consistent with
// any other k-means figure used elsewhere in the deck.

(function () {
  const POINTS = [[-0.404,-0.108],[1.032,0.409],[-1.018,-0.003],[-0.387,0.092],[-0.997,0.15],[0.146,0.977],[0.196,0.317],[-0.926,1.397],[-1.188,0.683],[-0.205,-0.546],[-0.407,-0.417],[0.236,-0.068],[0.919,-1.134],[-0.002,-0.553],[0.481,-1.313],[-0.213,0.13],[-0.92,0.611],[0.111,0.624],[0.595,-0.608],[-0.495,-0.126],[0.464,0.528],[-0.44,-0.376],[-0.495,-0.362],[-0.148,-0.082],[1.276,-0.314],[-0.179,0.284],[-0.591,-0.229],[0.008,0.48],[-0.816,0.85],[-0.219,0.105],[0.525,0.41],[0.657,0.107],[-0.012,0.196],[-0.617,0.753],[-0.481,-0.781],[1.275,-0.085],[-0.731,1.148],[-0.204,0.658],[-0.514,-0.154],[-1.047,-1.184],[1.795,0.652],[2.895,2.204],[1.76,1.326],[2.025,0.605],[1.482,-0.217],[1.917,-0.04],[2.398,0.264],[3.175,0.795],[2.502,1.405],[2.721,0.677],[2.344,0.625],[3.068,1.186],[2.627,1.195],[2.062,1.017],[1.524,1.535],[2.456,0.814],[2.772,0.694],[2.242,1.438],[2.472,0.132],[2.673,-0.357],[3.426,0.594],[2.428,2.1],[3.734,0.772],[2.787,1.376],[3.443,0.619],[2.484,1.459],[2.567,1.168],[2.778,-0.004],[1.867,-0.938],[2.239,1.53],[1.712,1.465],[3.02,0.666],[2.395,0.751],[1.866,0.525],[2.371,1.079],[2.891,0.24],[2.912,0.218],[2.295,0.929],[2.386,0.621],[2.567,0.357],[0.495,2.173],[1.496,2.237],[2.081,2.433],[-0.944,2.027],[1.932,2.304],[0.629,1.758],[1.721,2.922],[1.317,2.565],[1.793,2.809],[0.138,2.776],[1.005,2.232],[1.373,2.318],[-0.919,3.266],[1.543,2.224],[0.669,2.441],[0.104,2.49],[0.757,2.081],[0.328,1.879],[1.586,3.128],[1.212,2.272],[0.356,2.745],[1.899,1.299],[1.628,0.957],[0.689,2.538],[0.054,1.359],[1.015,2.844],[0.605,3.133],[0.416,3.388],[0.975,2.446],[1.281,2.499],[2.044,3.668],[1.239,2.197],[0.171,1.832],[0.906,2.237],[0.873,2.303],[1.207,1.463],[0.264,2.996],[1.42,1.968],[1.703,1.881],[0.744,1.168]];
  const INIT_CENTROIDS = [[-0.514,-0.154],[1.932,2.304],[-0.816,0.85]];
  // Validated colorblind-safe categorical trio (blue/aqua/violet — CVD
  // ΔE 73.6 deutan / 21.6 tritan / 94.1 normal, well above the safety
  // floor). Cluster identity never rests on hue alone though: each
  // cluster also gets its own marker shape (circle/triangle/square), and
  // every mark carries a dark stroke halo for contrast against the light
  // surface (mitigating the aqua/yellow low-contrast warning that a
  // fill-only encoding would have).
  const COLORS = ["#2a78d6", "#1baf7a", "#4a3aa7"];
  const SYMBOLS = [d3.symbolCircle, d3.symbolTriangle, d3.symbolSquare];
  const SYMBOL_GENS = SYMBOLS.map(t => d3.symbol().type(t).size(70));
  const UNASSIGNED_GEN = d3.symbol().type(d3.symbolCircle).size(46);
  const GREY = "#c3c2b7";
  const INK = "#0b0b0b";

  function init(root) {
    if (!root || root.dataset.kmeansInit) return;
    root.dataset.kmeansInit = "1";

    const svg = d3.select(root.querySelector(".kmeans-svg"));
    const btn = root.querySelector(".kmeans-btn");
    const resetBtn = root.querySelector(".kmeans-reset");
    const infoEl = root.querySelector(".kmeans-info");

    const W = 640, H = 460, M = 30;
    const xExtent = d3.extent(POINTS, d => d[0]);
    const yExtent = d3.extent(POINTS, d => d[1]);
    const x = d3.scaleLinear().domain([xExtent[0] - 0.5, xExtent[1] + 0.5]).range([M, W - M]);
    const y = d3.scaleLinear().domain([yExtent[0] - 0.5, yExtent[1] + 0.5]).range([H - M, M]);

    svg.attr("viewBox", `0 0 ${W} ${H}`);

    let centroids = INIT_CENTROIDS.map(c => ({ x: c[0], y: c[1] }));
    let assignments = POINTS.map(() => null);
    let phase = "assign"; // 'assign' | 'refit'
    let iteration = 0;
    let converged = false;

    const pointG = svg.append("g").attr("class", "kmeans-points");
    const centroidG = svg.append("g").attr("class", "kmeans-centroids");

    const pointSel = pointG.selectAll("path")
      .data(POINTS)
      .join("path")
      .attr("transform", d => `translate(${x(d[0])},${y(d[1])})`)
      .attr("d", UNASSIGNED_GEN)
      .attr("fill", GREY)
      .attr("fill-opacity", 0.8)
      .attr("stroke", INK)
      .attr("stroke-opacity", 0.35)
      .attr("stroke-width", 1);

    function centroidSymbol(sel) {
      sel.each(function () {
        const g = d3.select(this);
        if (g.select(".halo").empty()) {
          const s = 10;
          const cross = `M${-s},${-s} L${s},${s} M${-s},${s} L${s},${-s}`;
          // white halo behind the colored cross keeps it legible over
          // any of the point colors/shapes it may sit on top of
          g.append("path")
            .attr("class", "halo")
            .attr("d", cross)
            .attr("stroke", "#fcfcfb")
            .attr("stroke-width", 6)
            .attr("stroke-linecap", "round");
          g.append("path")
            .attr("class", "mark")
            .attr("d", cross)
            .attr("stroke", INK)
            .attr("stroke-width", 3)
            .attr("stroke-linecap", "round");
        }
      });
    }

    const centroidSel = centroidG.selectAll("g")
      .data(centroids)
      .join(enter => {
        const g = enter.append("g")
          .attr("transform", d => `translate(${x(d.x)},${y(d.y)})`);
        centroidSymbol(g);
        return g;
      });

    function updateInfo(label) {
      infoEl.innerHTML = `Iteration ${iteration} — ${label}`;
    }

    function setButton(label, disabled) {
      btn.textContent = label;
      btn.disabled = !!disabled;
    }

    function step() {
      if (converged) return;

      if (phase === "assign") {
        assignments = POINTS.map(p => {
          let best = 0, bestD = Infinity;
          centroids.forEach((c, ci) => {
            const d = (p[0] - c.x) ** 2 + (p[1] - c.y) ** 2;
            if (d < bestD) { bestD = d; best = ci; }
          });
          return best;
        });

        // shape identifies the cluster unambiguously (no reliance on hue);
        // set it immediately, and fade the color transition in alongside
        pointSel
          .attr("d", (d, i) => SYMBOL_GENS[assignments[i]]())
          .transition().duration(500)
          .attr("fill", (d, i) => COLORS[assignments[i]])
          .attr("fill-opacity", 0.85)
          .attr("stroke-opacity", 0.6);
        centroidG.selectAll("g").each(function (d, i) {
          d3.select(this).select(".mark").transition().duration(500)
            .attr("stroke", COLORS[i]);
        });

        iteration += 1;
        updateInfo("assigned each point to its nearest centroid");
        phase = "refit";
        setButton("Next step: refitting");
      } else {
        const sums = centroids.map(() => ({ x: 0, y: 0, n: 0 }));
        POINTS.forEach((p, i) => {
          const s = sums[assignments[i]];
          s.x += p[0]; s.y += p[1]; s.n += 1;
        });
        const newCentroids = centroids.map((c, i) =>
          sums[i].n > 0 ? { x: sums[i].x / sums[i].n, y: sums[i].y / sums[i].n } : c
        );

        const moved = newCentroids.some((c, i) =>
          Math.hypot(c.x - centroids[i].x, c.y - centroids[i].y) > 1e-4
        );

        centroids = newCentroids;
        centroidG.selectAll("g").data(centroids)
          .transition().duration(600)
          .attr("transform", d => `translate(${x(d.x)},${y(d.y)})`);

        updateInfo("moved each centroid to the mean of its cluster");
        phase = "assign";

        if (!moved) {
          converged = true;
          setButton("Converged ✓ — click Reset to replay", true);
        } else {
          setButton("Next step: re-assignment");
        }
      }
    }

    function reset() {
      centroids = INIT_CENTROIDS.map(c => ({ x: c[0], y: c[1] }));
      assignments = POINTS.map(() => null);
      phase = "assign";
      iteration = 0;
      converged = false;

      pointSel.attr("d", UNASSIGNED_GEN)
        .transition().duration(400)
        .attr("fill", GREY)
        .attr("fill-opacity", 0.8)
        .attr("stroke-opacity", 0.35);
      centroidG.selectAll("g").data(centroids)
        .transition().duration(400)
        .attr("transform", d => `translate(${x(d.x)},${y(d.y)})`);
      centroidG.selectAll("g").each(function () {
        d3.select(this).select(".mark").transition().duration(400).attr("stroke", INK);
      });

      infoEl.innerHTML = "Iteration 0 — click to begin";
      setButton("Next step: re-assignment", false);
    }

    btn.addEventListener("click", step);
    resetBtn.addEventListener("click", reset);
  }

  function initAll() {
    document.querySelectorAll(".kmeans-widget").forEach(init);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();

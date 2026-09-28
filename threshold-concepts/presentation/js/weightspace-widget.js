// Interactive weight-space widget for the "Geometry: Models as Geometric
// Objects" slide. Replicates Figure 2 (fig-linreg-feasible-region) from
// mlbook's linear_classification/logistic_regression.qmd: a linear
// classifier's decision boundary in data space (left) is also a point in
// weight space (right); each data point in turn constrains the weights to
// a half-plane. Bias w0 is fixed at -150, matching the book figure.
// Self-contained IIFE, D3 v7.

(function () {
  const DATA = [
    { i: 1, u: 7, v: 12, type: "Oak" },
    { i: 2, u: 9, v: 6, type: "Oak" },
    { i: 3, u: 10, v: 18, type: "Oak" },
    { i: 4, u: 5, v: 10, type: "Oak" },
    { i: 5, u: 13, v: 11, type: "Maple" },
    { i: 6, u: 11, v: 9, type: "Maple" },
    { i: 7, u: 9, v: 14, type: "Maple" },
  ];
  const W0 = -150; // fixed bias, matches the book figure

  const COLORS = { Oak: "#2a78d6", Maple: "#4a3aa7" };
  const BG = { Oak: "rgba(42,120,214,0.16)", Maple: "rgba(74,58,167,0.16)" };
  const SYM_GENS = {
    Oak: d3.symbol().type(d3.symbolCircle).size(80),
    Maple: d3.symbol().type(d3.symbolTriangle).size(90),
  };
  const CORRECT = "#1baf7a";
  const INCORRECT = "#e34948";
  const INK = "#0b0b0b";

  // The line nx0*X + ny0*Y + c0 = 0 splits the plane in two. Build a
  // polygon covering the requested half (sign = +1/-1) far beyond the
  // visible area — a clip-path on the caller's <g> then crops it to the
  // plot rectangle, so we avoid enumerating rectangle-corner cases.
  function halfPlanePoly(nx0, ny0, c0, sign, xScale, yScale) {
    const norm = Math.hypot(nx0, ny0) || 1;
    const nx = nx0 / norm, ny = ny0 / norm;
    const dx = -ny, dy = nx;
    let px, py;
    if (Math.abs(ny0) > 1e-9) { px = 0; py = -c0 / ny0; }
    else if (Math.abs(nx0) > 1e-9) { py = 0; px = -c0 / nx0; }
    else { px = 0; py = 0; }
    const BIG = 1e4;
    const p1 = { x: px + dx * BIG, y: py + dy * BIG };
    const p2 = { x: px - dx * BIG, y: py - dy * BIG };
    const off = { x: sign * nx * BIG, y: sign * ny * BIG };
    return [
      [p1.x, p1.y],
      [p2.x, p2.y],
      [p2.x + off.x, p2.y + off.y],
      [p1.x + off.x, p1.y + off.y],
    ].map(([X, Y]) => [xScale(X), yScale(Y)]);
  }

  // Clip the same boundary line to [xDomain] x [yDomain] for a crisp stroke.
  function boundarySegment(nx0, ny0, c0, xScale, yScale, xDomain, yDomain) {
    const pts = [];
    const [x0, x1] = xDomain, [y0, y1] = yDomain;
    if (Math.abs(ny0) > 1e-9) {
      [x0, x1].forEach((X) => {
        const Y = -(c0 + nx0 * X) / ny0;
        if (Y >= y0 && Y <= y1) pts.push([X, Y]);
      });
    }
    if (Math.abs(nx0) > 1e-9) {
      [y0, y1].forEach((Y) => {
        const X = -(c0 + ny0 * Y) / nx0;
        if (X >= x0 && X <= x1) pts.push([X, Y]);
      });
    }
    if (pts.length < 2) return null;
    return [pts[0], pts[1]].map(([X, Y]) => [xScale(X), yScale(Y)]);
  }

  function init(root) {
    if (!root || root.dataset.wsInit) return;
    root.dataset.wsInit = "1";

    const svgData = d3.select(root.querySelector(".ws-data-svg"));
    const svgWeight = d3.select(root.querySelector(".ws-weight-svg"));
    const infoEl = root.querySelector(".ws-info");

    const W = 300, H = 260, M = { left: 30, right: 10, top: 10, bottom: 26 };
    [svgData, svgWeight].forEach((s) => s.attr("viewBox", `0 0 ${W} ${H}`));

    const uDomain = [3, 15], vDomain = [4, 20], wDomain = [-5, 20];
    const xData = d3.scaleLinear().domain(uDomain).range([M.left, W - M.right]);
    const yData = d3.scaleLinear().domain(vDomain).range([H - M.bottom, M.top]);
    const xW = d3.scaleLinear().domain(wDomain).range([M.left, W - M.right]);
    const yW = d3.scaleLinear().domain(wDomain).range([H - M.bottom, M.top]);

    function addAxes(svg, xScale, yScale, xLabel, yLabel) {
      svg.append("g")
        .attr("transform", `translate(0,${H - M.bottom})`)
        .attr("font-size", "8px")
        .call(d3.axisBottom(xScale).ticks(5));
      svg.append("g")
        .attr("transform", `translate(${M.left},0)`)
        .attr("font-size", "8px")
        .call(d3.axisLeft(yScale).ticks(5));
      svg.append("text")
        .attr("x", W - M.right).attr("y", H - 4)
        .attr("text-anchor", "end").attr("font-size", "9px").attr("fill", "#52514e")
        .text(xLabel);
      svg.append("text")
        .attr("x", M.left + 4).attr("y", M.top + 8)
        .attr("text-anchor", "start").attr("font-size", "9px").attr("fill", "#52514e")
        .text(yLabel);
    }

    addAxes(svgData, xData, yData, "x₁ (width)", "x₂ (height)");
    addAxes(svgWeight, xW, yW, "w₁", "w₂");

    const clipData = "ws-clip-" + Math.random().toString(36).slice(2);
    svgData.append("defs").append("clipPath").attr("id", clipData)
      .append("rect")
      .attr("x", M.left).attr("y", M.top)
      .attr("width", W - M.left - M.right).attr("height", H - M.top - M.bottom);

    const clipWeight = "ws-clipw-" + Math.random().toString(36).slice(2);
    svgWeight.append("defs").append("clipPath").attr("id", clipWeight)
      .append("rect")
      .attr("x", M.left).attr("y", M.top)
      .attr("width", W - M.left - M.right).attr("height", H - M.top - M.bottom);

    const regionG = svgData.append("g").attr("clip-path", `url(#${clipData})`);
    const boundaryLineG = svgData.append("g").attr("clip-path", `url(#${clipData})`);
    const pointsG = svgData.append("g");

    const constraintG = svgWeight.append("g").attr("clip-path", `url(#${clipWeight})`);
    const constraintLineG = svgWeight.append("g").attr("clip-path", `url(#${clipWeight})`);
    const markerG = svgWeight.append("g");

    let selectedIndex = null;
    let weights = { w1: 5, w2: 10 };

    function drawDataRegions() {
      regionG.selectAll("*").remove();
      boundaryLineG.selectAll("*").remove();
      const { w1, w2 } = weights;
      [["Maple", 1], ["Oak", -1]].forEach(([type, sign]) => {
        const poly = halfPlanePoly(w1, w2, W0, sign, xData, yData);
        regionG.append("polygon")
          .attr("points", poly.map((p) => p.join(",")).join(" "))
          .attr("fill", BG[type]);
      });
      const seg = boundarySegment(w1, w2, W0, xData, yData, uDomain, vDomain);
      if (seg) {
        boundaryLineG.append("line")
          .attr("x1", seg[0][0]).attr("y1", seg[0][1])
          .attr("x2", seg[1][0]).attr("y2", seg[1][1])
          .attr("stroke", INK).attr("stroke-dasharray", "4,3").attr("stroke-width", 1.5);
      }
    }

    function drawPoints() {
      pointsG.selectAll("path").data(DATA, (d) => d.i).join("path")
        .attr("transform", (d) => `translate(${xData(d.u)},${yData(d.v)})`)
        .attr("d", (d) => SYM_GENS[d.type]())
        .attr("fill", (d) => {
          if (selectedIndex === null || DATA[selectedIndex].i !== d.i) return COLORS[d.type];
          const z = W0 + weights.w1 * d.u + weights.w2 * d.v;
          const predicted = z >= 0 ? "Maple" : "Oak";
          return predicted === d.type ? CORRECT : INCORRECT;
        })
        .attr("stroke", INK)
        .attr("stroke-width", (d) => (selectedIndex !== null && DATA[selectedIndex].i === d.i ? 2.5 : 1))
        .attr("opacity", (d) => (selectedIndex === null || DATA[selectedIndex].i === d.i ? 1 : 0.45))
        .style("cursor", "pointer")
        .on("click", (event, d) => {
          const idx = DATA.indexOf(d);
          selectedIndex = selectedIndex === idx ? null : idx;
          update();
        });
    }

    function drawWeightMarker() {
      markerG.selectAll("*").remove();
      markerG.append("circle")
        .attr("cx", xW(weights.w1)).attr("cy", yW(weights.w2))
        .attr("r", 5).attr("fill", INK).attr("stroke", "#fff").attr("stroke-width", 1.5);
      markerG.append("text")
        .attr("x", xW(weights.w1) + 8).attr("y", yW(weights.w2) - 8)
        .attr("font-size", "9px").attr("fill", INK)
        .text(`(${weights.w1.toFixed(1)}, ${weights.w2.toFixed(1)})`);
    }

    function drawConstraint() {
      constraintG.selectAll("*").remove();
      constraintLineG.selectAll("*").remove();
      if (selectedIndex === null) return;
      const d = DATA[selectedIndex];
      const sign = d.type === "Maple" ? 1 : -1;
      const poly = halfPlanePoly(d.u, d.v, W0, sign, xW, yW);
      constraintG.append("polygon")
        .attr("points", poly.map((p) => p.join(",")).join(" "))
        .attr("fill", BG[d.type]);
      const seg = boundarySegment(d.u, d.v, W0, xW, yW, wDomain, wDomain);
      if (seg) {
        constraintLineG.append("line")
          .attr("x1", seg[0][0]).attr("y1", seg[0][1])
          .attr("x2", seg[1][0]).attr("y2", seg[1][1])
          .attr("stroke", INK).attr("stroke-width", 2);
      }
    }

    function updateInfo() {
      if (!infoEl) return;
      if (selectedIndex === null) {
        infoEl.innerHTML = "Click a leaf to see the weights that classify it correctly.";
        return;
      }
      const d = DATA[selectedIndex];
      const z = W0 + weights.w1 * d.u + weights.w2 * d.v;
      const predicted = z >= 0 ? "Maple" : "Oak";
      const correct = predicted === d.type;
      infoEl.innerHTML = `Leaf #${d.i} (<strong>${d.type}</strong>) is currently <strong style="color:${correct ? CORRECT : INCORRECT}">${correct ? "correctly" : "incorrectly"}</strong> classified — shaded region shows weights that get it right.`;
    }

    function update() {
      drawDataRegions();
      drawPoints();
      drawWeightMarker();
      drawConstraint();
      updateInfo();
    }

    svgWeight.append("rect")
      .attr("x", M.left).attr("y", M.top)
      .attr("width", W - M.left - M.right).attr("height", H - M.top - M.bottom)
      .attr("fill", "transparent").style("cursor", "crosshair")
      .on("click", function (event) {
        const [mx, my] = d3.pointer(event, svgWeight.node());
        weights = { w1: xW.invert(mx), w2: yW.invert(my) };
        update();
      });

    update();
  }

  function initAll() {
    document.querySelectorAll(".ws-widget").forEach(init);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();

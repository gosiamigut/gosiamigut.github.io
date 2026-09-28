// Supervised learning workflow diagram for the "Machine Learning is an
// Empirical Science" section. Ported from mlbook's
// supervised_learning/workflow_diagrams.ts (createTrainingWorkflowDiagram),
// dropping the learning-algorithm/inference mini-diagrams that page also
// draws (not used here) and grouping elements into reveal.js fragments:
// the base diagram (training data -> algorithms -> models) is visible
// immediately, then two fragments reveal "Empirical Evaluation" and
// "Estimate generalization accuracy" respectively, each with its own
// arrows/boxes/labels/brace. Self-contained IIFE, D3 v7.

(function () {
  const THEME_COLORS = {
    error: "#DC267F",
    info: "#648FFF",
    success: "#32CD32",
    black: "#000000",
    white: "#FFFFFF",
  };

  function build(container) {
    if (container.empty() || !container.select("svg").empty()) return;

    const svg = container.append("svg")
      .attr("width", 1500)
      .attr("height", 780)
      .attr("viewBox", "-138 -70 1500 780")
      .style("max-width", "100%")
      .style("height", "auto")
      .style("display", "block")
      .style("margin", "0 auto");

    const defs = svg.append("defs");
    defs.append("marker")
      .attr("id", "arrow-workflow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", THEME_COLORS.black);

    // Base diagram (always visible) + two fragment groups, drawn on top
    // in reveal-fragment order so later stages layer over earlier ones.
    const gBase = svg.append("g").attr("class", "wf-base");
    const gEval = svg.append("g").attr("class", "fragment").attr("data-fragment-index", "1");
    const gTest = svg.append("g").attr("class", "fragment").attr("data-fragment-index", "2");

    const trainingDataRadius = 80;
    const circleRadius = 55; // hypothesis circles only
    const algoBoxWidth = 180;
    const algoBoxHeight = 100;
    const valAccBoxWidth = 220;
    const valAccBoxHeight = 90;
    const hSpacing = 155; // = modelValGap + circleRadius, keeps left/right arrows symmetric
    const modelValGap = 100; // gap between hypothesis circle edge and adjacent box
    const vSpacing = 160;
    const startX = 100;
    const centerY = 345;

    // ---- Training Data circle ----
    const trainingDataX = startX;
    gBase.append("circle")
      .attr("cx", trainingDataX)
      .attr("cy", centerY)
      .attr("r", trainingDataRadius)
      .attr("fill", THEME_COLORS.white)
      .attr("stroke", THEME_COLORS.black)
      .attr("stroke-width", 2);

    gBase.append("foreignObject")
      .attr("x", trainingDataX - trainingDataRadius)
      .attr("y", centerY - 28)
      .attr("width", trainingDataRadius * 2)
      .attr("height", 56)
      .append("xhtml:div")
      .style("text-align", "center")
      .style("font-size", "44px")
      .html("\\(\\mathcal{D}\\)");

    gBase.append("text")
      .attr("x", trainingDataX)
      .attr("y", centerY + trainingDataRadius + 50)
      .attr("text-anchor", "middle")
      .attr("font-size", "28px")
      .attr("fill", THEME_COLORS.black)
      .text("Training Data");

    // ---- Four learning algorithms ----
    const algorithms = [
      { x: trainingDataX + trainingDataRadius + hSpacing, y: centerY - vSpacing * 1.5 },
      { x: trainingDataX + trainingDataRadius + hSpacing, y: centerY - vSpacing * 0.5 },
      { x: trainingDataX + trainingDataRadius + hSpacing, y: centerY + vSpacing * 0.5 },
      { x: trainingDataX + trainingDataRadius + hSpacing, y: centerY + vSpacing * 1.5 },
    ];

    algorithms.forEach((algo) => {
      gBase.append("line")
        .attr("x1", trainingDataX + trainingDataRadius)
        .attr("y1", centerY)
        .attr("x2", algo.x - algoBoxWidth / 2)
        .attr("y2", algo.y)
        .attr("stroke", THEME_COLORS.black)
        .attr("stroke-width", 2)
        .attr("marker-end", "url(#arrow-workflow)");
    });

    algorithms.forEach((algo, i) => {
      const algoBox = gBase.append("g")
        .attr("transform", `translate(${algo.x - algoBoxWidth / 2}, ${algo.y - algoBoxHeight / 2})`);

      algoBox.append("rect")
        .attr("width", algoBoxWidth)
        .attr("height", algoBoxHeight)
        .attr("rx", 5)
        .attr("fill", THEME_COLORS.error)
        .attr("fill-opacity", 0.3)
        .attr("stroke", THEME_COLORS.black)
        .attr("stroke-width", 2);

      algoBox.append("foreignObject")
        .attr("x", 0)
        .attr("y", algoBoxHeight / 2 - 28)
        .attr("width", algoBoxWidth)
        .attr("height", 56)
        .append("xhtml:div")
        .style("text-align", "center")
        .style("font-size", "34px")
        .html("\\(\\mathcal{A}_{" + (i + 1) + "}\\)");

      if (i === 3) {
        gBase.append("text")
          .attr("x", algo.x)
          .attr("y", algo.y + algoBoxHeight / 2 + 50)
          .attr("text-anchor", "middle")
          .attr("font-size", "26px")
          .attr("fill", THEME_COLORS.black)
          .text("Learning Algorithm");
      }
    });

    // ---- Four models (hypotheses) ----
    const models = [
      { valAcc: "70%", x: algorithms[0].x + algoBoxWidth / 2 + hSpacing, y: algorithms[0].y },
      { valAcc: "75%", testAcc: "73%", x: algorithms[1].x + algoBoxWidth / 2 + hSpacing, y: algorithms[1].y },
      { valAcc: "72%", x: algorithms[2].x + algoBoxWidth / 2 + hSpacing, y: algorithms[2].y },
      { valAcc: "70%", x: algorithms[3].x + algoBoxWidth / 2 + hSpacing, y: algorithms[3].y },
    ];

    models.forEach((model, i) => {
      gBase.append("line")
        .attr("x1", algorithms[i].x + algoBoxWidth / 2)
        .attr("y1", algorithms[i].y)
        .attr("x2", model.x - circleRadius)
        .attr("y2", model.y)
        .attr("stroke", THEME_COLORS.black)
        .attr("stroke-width", 2)
        .attr("marker-end", "url(#arrow-workflow)");
    });

    models.forEach((model, i) => {
      gBase.append("circle")
        .attr("cx", model.x)
        .attr("cy", model.y)
        .attr("r", circleRadius)
        .attr("fill", "blue")
        .attr("stroke", THEME_COLORS.black)
        .attr("stroke-width", 2)
        .attr("opacity", 0.7);

      gBase.append("foreignObject")
        .attr("x", model.x - circleRadius)
        .attr("y", model.y - 24)
        .attr("width", circleRadius * 2)
        .attr("height", 48)
        .append("xhtml:div")
        .style("text-align", "center")
        .style("font-size", "28px")
        .style("color", "white")
        .html("\\(f_{" + (i + 1) + "}\\)");

      if (i === 3) {
        gBase.append("text")
          .attr("x", model.x)
          .attr("y", model.y + circleRadius + 50)
          .attr("text-anchor", "middle")
          .attr("font-size", "26px")
          .attr("fill", THEME_COLORS.black)
          .text("Hypothesis");
      }
    });

    // ---- Fragment 1: Empirical Evaluation (validation accuracy boxes) ----
    models.forEach((model, i) => {
      const valAccX = model.x + circleRadius + modelValGap;
      const valAccY = model.y - valAccBoxHeight / 2;
      const valAccBox = gEval.append("g")
        .attr("transform", `translate(${valAccX}, ${valAccY})`);

      valAccBox.append("rect")
        .attr("width", valAccBoxWidth)
        .attr("height", valAccBoxHeight)
        .attr("rx", 3)
        .attr("fill", THEME_COLORS.info)
        .attr("fill-opacity", 0.2)
        .attr("stroke", THEME_COLORS.black)
        .attr("stroke-width", 1.5);

      valAccBox.append("text")
        .attr("x", valAccBoxWidth / 2)
        .attr("y", valAccBoxHeight / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "24px")
        .attr("font-weight", "bold")
        .attr("dominant-baseline", "middle")
        .text(`Val: ${model.valAcc}`);

      if (i === 1) {
        gEval.append("text")
          .attr("x", valAccX + valAccBoxWidth / 2)
          .attr("y", valAccY + valAccBoxHeight + 40)
          .attr("text-anchor", "middle")
          .attr("font-size", "26px")
          .attr("font-weight", "bold")
          .attr("fill", THEME_COLORS.black)
          .text("best");
      }

      if (i === 3) {
        const lx = valAccX + valAccBoxWidth / 2;
        const ly = valAccY + valAccBoxHeight + 40;
        const valLabel = gEval.append("text")
          .attr("text-anchor", "middle")
          .attr("font-size", "26px")
          .attr("fill", THEME_COLORS.black);
        valLabel.append("tspan").attr("x", lx).attr("y", ly).text("Validation Set");
        valLabel.append("tspan").attr("x", lx).attr("dy", "1.2em").text("Accuracy");
      }

      gEval.append("line")
        .attr("x1", model.x + circleRadius)
        .attr("y1", model.y)
        .attr("x2", valAccX)
        .attr("y2", valAccY + valAccBoxHeight / 2)
        .attr("stroke", THEME_COLORS.black)
        .attr("stroke-width", 1.5)
        .attr("marker-end", "url(#arrow-workflow)");
    });

    // ---- Fragment 2: Estimate generalization accuracy (test box) ----
    const testAccX = models[1].x + circleRadius + modelValGap + valAccBoxWidth + 30;
    const testAccY = models[1].y;
    const testAccBox = gTest.append("g")
      .attr("transform", `translate(${testAccX}, ${testAccY - valAccBoxHeight / 2})`);

    testAccBox.append("rect")
      .attr("width", valAccBoxWidth)
      .attr("height", valAccBoxHeight)
      .attr("rx", 3)
      .attr("fill", THEME_COLORS.success)
      .attr("fill-opacity", 0.2)
      .attr("stroke", THEME_COLORS.black)
      .attr("stroke-width", 1.5);

    testAccBox.append("text")
      .attr("x", valAccBoxWidth / 2)
      .attr("y", valAccBoxHeight / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "24px")
      .attr("font-weight", "bold")
      .attr("dominant-baseline", "middle")
      .text(`Test: ${models[1].testAcc}`);

    const bottomLabelY = centerY + vSpacing * 1.5 + valAccBoxHeight / 2 + 40;
    const testLabelX = testAccX + valAccBoxWidth / 2;
    const testLabel = gTest.append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "26px")
      .attr("fill", THEME_COLORS.black);
    testLabel.append("tspan").attr("x", testLabelX).attr("y", bottomLabelY).text("Test Set");
    testLabel.append("tspan").attr("x", testLabelX).attr("dy", "1.2em").text("Accuracy");

    gTest.append("line")
      .attr("x1", models[1].x + circleRadius + modelValGap + valAccBoxWidth)
      .attr("y1", models[1].y)
      .attr("x2", testAccX)
      .attr("y2", testAccY)
      .attr("stroke", THEME_COLORS.black)
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow-workflow)");

    // ---- Curly brace annotations above the diagram ----
    const braceBaseY = 45;
    const braceOffsetY = 30;
    const braceDepth = 18;
    const braceTip = 10;
    const braceLabelLineHeight = 32;
    const braceGap = 8;

    const modelRightX = models[0].x + circleRadius;
    const valAccRightX = models[0].x + circleRadius + modelValGap + valAccBoxWidth;
    const testRightX = testAccX + valAccBoxWidth;

    const drawBrace = (target, x1, x2, baseY, color, lines) => {
      const mid = (x1 + x2) / 2;
      target.append("path")
        .attr("d", `M ${x1},${baseY} Q ${x1},${baseY - braceDepth} ${mid - 14},${baseY - braceDepth} Q ${mid},${baseY - braceDepth} ${mid},${baseY - braceDepth - braceTip} Q ${mid},${baseY - braceDepth} ${mid + 14},${baseY - braceDepth} Q ${x2},${baseY - braceDepth} ${x2},${baseY}`)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2.5);
      const firstLineY = baseY - braceDepth - braceTip - 10 - (lines.length - 1) * braceLabelLineHeight;
      const textEl = target.append("text")
        .attr("text-anchor", "middle")
        .attr("font-size", "26px")
        .attr("fill", THEME_COLORS.black);
      lines.forEach((line, li) => {
        const tspan = textEl.append("tspan").attr("x", mid).text(line);
        if (li === 0) {
          tspan.attr("y", firstLineY);
        } else {
          tspan.attr("dy", `${braceLabelLineHeight}px`);
        }
      });
    };

    drawBrace(gBase, trainingDataX - trainingDataRadius, modelRightX - braceGap,
      braceBaseY, THEME_COLORS.error, ["Produce several candidate models"]);

    drawBrace(gEval, modelRightX + braceGap, valAccRightX - braceGap,
      braceOffsetY, THEME_COLORS.info, ["Empirical Evaluation"]);

    drawBrace(gTest, valAccRightX + braceGap, testRightX,
      braceBaseY, THEME_COLORS.success, ["Estimate generalization", "accuracy"]);

    if (typeof MathJax !== "undefined" && typeof MathJax.typesetPromise === "function") {
      MathJax.typesetPromise().catch(() => {});
    }
  }

  function initAll() {
    document.querySelectorAll("#workflow-diagram").forEach((el) => build(d3.select(el)));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();

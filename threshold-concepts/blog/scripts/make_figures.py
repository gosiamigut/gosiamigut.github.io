"""Generate SVG figures for the ITiCSE 2026 threshold-concepts presentation.

Run:  python3 scripts/make_figures.py
Outputs into images/.
"""

import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

# ---- palette (validated: dataviz reference palette, light surface) ----
BLUE = "#2a78d6"
AQUA = "#1baf7a"
VIOLET = "#4a3aa7"
RED = "#e34948"
INK = "#0b0b0b"
MUTED = "#898781"
GRID = "#e1e0d9"

plt.rcParams.update(
    {
        "font.family": "sans-serif",
        "font.sans-serif": ["Helvetica Neue", "Helvetica", "Arial", "DejaVu Sans"],
        "font.size": 13,
        "axes.edgecolor": GRID,
        "axes.labelcolor": MUTED,
        "xtick.color": MUTED,
        "ytick.color": MUTED,
        "svg.fonttype": "none",  # keep text as text
        "figure.facecolor": "none",
        "axes.facecolor": "none",
        "savefig.transparent": True,
    }
)


def clean_axes(ax, keep_ticks=False):
    for side in ["top", "right"]:
        ax.spines[side].set_visible(False)
    if not keep_ticks:
        ax.set_xticks([])
        ax.set_yticks([])


# ----------------------------------------------------------------------
# 1. k-means: procedure (assign / update) + objective going down
# ----------------------------------------------------------------------
def kmeans_figure():
    rng = np.random.default_rng(4)
    true_centers = np.array([[0.0, 0.0], [2.4, 0.7], [0.9, 2.3]])
    X = np.vstack([c + rng.normal(0, 0.62, size=(40, 2)) for c in true_centers])
    colors = [BLUE, AQUA, VIOLET]

    # init chosen (seed 8) so convergence is gradual and ends at the true grouping
    centroids = X[np.random.default_rng(8).choice(len(X), 3, replace=False)]
    snapshots = []  # (assignments, centroids, objective)
    for _ in range(8):
        d = ((X[:, None, :] - centroids[None, :, :]) ** 2).sum(-1)
        assign = d.argmin(1)
        obj = d.min(1).sum()
        snapshots.append((assign.copy(), centroids.copy(), obj))
        centroids = np.array([X[assign == j].mean(0) for j in range(3)])

    fig, axes = plt.subplots(1, 4, figsize=(12.5, 3.1), gridspec_kw={"wspace": 0.15})

    panels = [0, 2, 7]
    titles = ["step 1: assign to nearest centroid", "step 2: move centroids", "…repeat until converged"]
    for ax, s, title in zip(axes[:3], panels, titles):
        assign, cents, _ = snapshots[s]
        for j in range(3):
            pts = X[assign == j]
            ax.scatter(pts[:, 0], pts[:, 1], s=22, color=colors[j], alpha=0.75, linewidths=0)
        ax.scatter(cents[:, 0], cents[:, 1], s=170, marker="X", color=INK, zorder=5)
        ax.set_title(title, fontsize=12, color=INK)
        ax.set_aspect("equal")
        clean_axes(ax)

    ax = axes[3]
    objs = [s[2] for s in snapshots]
    ax.plot(range(1, len(objs) + 1), objs, color=RED, linewidth=2, marker="o", markersize=6)
    ax.set_title("objective $J$ never increases", fontsize=12, color=INK)
    ax.set_xlabel("iteration", fontsize=11)
    ax.grid(axis="y", color=GRID, linewidth=0.8)
    clean_axes(ax, keep_ticks=True)
    ax.set_yticks([])

    fig.savefig("images/kmeans.svg", bbox_inches="tight")
    plt.close(fig)


# ----------------------------------------------------------------------
# 2. bias-variance tradeoff curves
# ----------------------------------------------------------------------
def bias_variance_figure():
    x = np.linspace(0.02, 1, 300)
    bias2 = 0.9 * np.exp(-4.2 * x)
    var = 0.03 * np.exp(3.1 * x)
    bayes = np.full_like(x, 0.16)
    total = bias2 + var + bayes

    fig, ax = plt.subplots(figsize=(7.6, 4.4))
    ax.plot(x, total, color=INK, linewidth=2.4)
    ax.plot(x, bias2, color=BLUE, linewidth=2)
    ax.plot(x, var, color=RED, linewidth=2)
    ax.plot(x, bayes, color=MUTED, linewidth=1.6, linestyle=(0, (4, 3)))

    xm_i = np.argmin(total)
    ax.text(x[xm_i], total[xm_i] + 0.09, "total error", color=INK, fontsize=13, fontweight="bold", ha="center")
    ax.text(0.16, 0.26, "bias$^2$\n(model too simple)", color=BLUE, fontsize=12, ha="center")
    ax.text(0.94, 0.40, "variance\n(model too complex)", color=RED, fontsize=12, ha="right")
    ax.text(0.03, 0.19, "Bayes error (irreducible — depends on data representation)", color=MUTED, fontsize=11)

    xm = x[np.argmin(total)]
    ax.axvline(xm, color=GRID, linewidth=1)
    ax.set_xlabel("model complexity $\\rightarrow$")
    ax.set_ylabel("expected error $\\rightarrow$")
    ax.set_ylim(0, 1.15)
    ax.set_xlim(0, 1)
    clean_axes(ax)
    fig.savefig("images/bias_variance.svg", bbox_inches="tight")
    plt.close(fig)


# ----------------------------------------------------------------------
# 3. regularization: same model class, three lambdas
# ----------------------------------------------------------------------
def regularization_figure():
    rng = np.random.default_rng(3)
    n = 22
    xs = np.sort(rng.uniform(0, 1, n))
    f = lambda t: np.sin(2 * np.pi * t)
    ys = f(xs) + rng.normal(0, 0.28, n)
    grid = np.linspace(0, 1, 400)

    def ridge_poly_fit(lam, degree=12):
        Phi = np.vander(xs, degree + 1, increasing=True)
        # do not penalize the intercept
        P = np.eye(degree + 1)
        P[0, 0] = 0
        w = np.linalg.solve(Phi.T @ Phi + lam * P, Phi.T @ ys)
        return np.vander(grid, degree + 1, increasing=True) @ w

    lams = [0.0, 1e-4, 10.0]
    titles = [r"$\lambda = 0$:  overfits", r"$\lambda = 10^{-4}$:  just right?", r"$\lambda = 10$:  underfits"]

    fig, axes = plt.subplots(1, 3, figsize=(12.5, 3.4), sharey=True, gridspec_kw={"wspace": 0.12})
    for ax, lam, title in zip(axes, lams, titles):
        ax.plot(grid, f(grid), color=MUTED, linewidth=1.4, linestyle=(0, (4, 3)))
        ax.scatter(xs, ys, s=26, color=INK, alpha=0.6, linewidths=0)
        ax.plot(grid, ridge_poly_fit(lam), color=BLUE, linewidth=2.2)
        ax.set_title(title, fontsize=13, color=INK)
        ax.set_ylim(-1.9, 1.9)
        clean_axes(ax)

    fig.savefig("images/regularization.svg", bbox_inches="tight")
    plt.close(fig)


# ----------------------------------------------------------------------
# 4. overlapping class-conditional densities (Bayes error / prob. lens)
# ----------------------------------------------------------------------
def overlap_figure():
    x = np.linspace(-4, 6, 500)
    g = lambda m, s: np.exp(-0.5 * ((x - m) / s) ** 2) / (s * np.sqrt(2 * np.pi))
    p0, p1 = g(0, 1.0), g(2.4, 1.1)

    fig, ax = plt.subplots(figsize=(7.6, 3.6))
    ax.plot(x, p0, color=BLUE, linewidth=2.2)
    ax.plot(x, p1, color=RED, linewidth=2.2)
    ax.fill_between(x, np.minimum(p0, p1), color=MUTED, alpha=0.35, linewidth=0)
    ax.text(-1.6, 0.30, "$p(x \\mid y{=}0)$", color=BLUE, fontsize=14)
    ax.text(3.2, 0.28, "$p(x \\mid y{=}1)$", color=RED, fontsize=14)
    ax.text(1.2, 0.045, "no classifier can\nseparate these", color=INK, fontsize=11, ha="center")
    ax.set_xlabel("feature $x$")
    ax.set_ylim(0, 0.46)
    clean_axes(ax)
    fig.savefig("images/overlap.svg", bbox_inches="tight")
    plt.close(fig)


# ----------------------------------------------------------------------
# 5. loss landscape with gradient descent path (geometry TC)
# ----------------------------------------------------------------------
def landscape_figure():
    w1, w2 = np.meshgrid(np.linspace(-2.4, 2.4, 300), np.linspace(-1.6, 2.2, 300))
    # slightly non-convex banana-ish bowl
    L = 0.5 * (w1**2 + 4 * (w2 - 0.4 * w1**2) ** 2) + 0.3

    fig, ax = plt.subplots(figsize=(6.4, 4.6))
    levels = np.linspace(L.min(), 4.5, 14)
    ax.contour(w1, w2, L, levels=levels, colors=["#9ec5f4"], linewidths=1.1)

    # gradient descent path
    def grad(p):
        a, b = p
        return np.array(
            [a + 4 * (b - 0.4 * a**2) * (-0.8 * a), 8 * (b - 0.4 * a**2)]
        )

    p = np.array([-2.1, 1.9])
    path = [p.copy()]
    for _ in range(90):
        p = p - 0.08 * grad(p)
        path.append(p.copy())
    path = np.array(path)
    ax.plot(path[:, 0], path[:, 1], color=RED, linewidth=2, marker="o", markersize=4.5)
    ax.scatter(*path[0], s=90, color=RED, zorder=5)
    ax.text(path[0, 0] - 0.08, path[0, 1] + 0.12, "start", color=RED, fontsize=12)
    ax.scatter(0, 0, s=140, marker="*", color=INK, zorder=5)
    ax.text(0.1, -0.22, "minimum", color=INK, fontsize=12)
    ax.annotate(
        "slow along the\nvalley floor\n(plateau-like)",
        xy=path[45], xytext=(0.75, 0.75),
        fontsize=10.5, color=MUTED, ha="left",
        arrowprops=dict(arrowstyle="-", color=MUTED, linewidth=1),
    )
    ax.set_xlabel("parameter $w_1$")
    ax.set_ylabel("parameter $w_2$")
    ax.set_aspect("equal")
    clean_axes(ax)
    fig.savefig("images/loss_landscape.svg", bbox_inches="tight")
    plt.close(fig)


# ----------------------------------------------------------------------
# 6. data as a geometric object: 2D scatter with distance annotations
#    (geometry TC — "data are points in R^D")
# ----------------------------------------------------------------------
def ring_data(n_per_class=45, seed=7):
    rng = np.random.default_rng(seed)
    theta_in = rng.uniform(0, 2 * np.pi, n_per_class)
    theta_out = rng.uniform(0, 2 * np.pi, n_per_class)
    r_in = 1.0 + rng.normal(0, 0.09, n_per_class)
    r_out = 2.6 + rng.normal(0, 0.09, n_per_class)
    inner = np.c_[r_in * np.cos(theta_in), r_in * np.sin(theta_in)]
    outer = np.c_[r_out * np.cos(theta_out), r_out * np.sin(theta_out)]
    return inner, outer, r_in, theta_in, r_out, theta_out


def _nearest_by_angle(pts, thetas, target):
    i = np.argmin(np.abs((thetas - target + np.pi) % (2 * np.pi) - np.pi))
    return pts[i]


def geometry_scatter_figure():
    inner, outer, r_in, theta_in, r_out, theta_out = ring_data()

    fig, ax = plt.subplots(figsize=(5.2, 5.2))
    ax.scatter(inner[:, 0], inner[:, 1], s=32, color=BLUE, alpha=0.85, linewidths=0, label="class 0")
    ax.scatter(outer[:, 0], outer[:, 1], s=32, color=RED, alpha=0.85, linewidths=0, label="class 1")

    # "close" pair: two same-class inner points near the top of the ring
    p1 = _nearest_by_angle(inner, theta_in, np.deg2rad(80))
    p2 = _nearest_by_angle(inner, theta_in, np.deg2rad(100))
    ax.plot(*zip(p1, p2), color=INK, linewidth=1.3, linestyle=(0, (3, 2)))
    ax.annotate(
        "close\n(same class)", xy=((p1 + p2) / 2), xytext=(-1.55, 2.6),
        fontsize=10.5, color=INK, ha="center",
        arrowprops=dict(arrowstyle="-", color=INK, linewidth=1),
    )

    # "far" pair: a clean radial spoke, inner ring out to outer ring
    q1 = _nearest_by_angle(inner, theta_in, np.deg2rad(-55))
    q2 = _nearest_by_angle(outer, theta_out, np.deg2rad(-55))
    ax.plot(*zip(q1, q2), color=INK, linewidth=1.3, linestyle=(0, (3, 2)))
    ax.annotate(
        "far\n(different class)", xy=((q1 + q2) / 2), xytext=(1.75, -2.9),
        fontsize=10.5, color=INK, ha="center",
        arrowprops=dict(arrowstyle="-", color=INK, linewidth=1),
    )

    ax.set_xlabel("feature $x_1$")
    ax.set_ylabel("feature $x_2$")
    ax.set_xlim(-3.4, 3.4)
    ax.set_ylim(-3.4, 3.4)
    ax.set_aspect("equal")
    clean_axes(ax)
    fig.savefig("images/geometry_scatter.svg", bbox_inches="tight")
    plt.close(fig)


# ----------------------------------------------------------------------
# 7. models act on the geometric object: a decision boundary partitions
#    it (left), a nonlinear map warps it into a new, linearly-separable
#    representation (right) — geometry TC
# ----------------------------------------------------------------------
def geometry_warp_figure():
    inner, outer, r_in, theta_in, r_out, theta_out = ring_data()
    boundary_r = 1.8

    fig, (axL, axR) = plt.subplots(1, 2, figsize=(11.5, 5.2))

    # ---- left: original space, curved decision boundary ----
    grid = np.linspace(-3.2, 3.2, 400)
    gx, gy = np.meshgrid(grid, grid)
    gr = np.sqrt(gx**2 + gy**2)
    axL.contourf(gx, gy, gr < boundary_r, levels=[-0.5, 0.5, 1.5], colors=["#fbe7e7", "#e4eefb"])
    # polar reference grid, to compare against the straightened grid on the right
    for rr in np.arange(0.5, 3.3, 0.5):
        circ = plt.Circle((0, 0), rr, fill=False, color=GRID, linewidth=1)
        axL.add_patch(circ)
    for ang in np.linspace(0, 2 * np.pi, 12, endpoint=False):
        axL.plot([0, 3.2 * np.cos(ang)], [0, 3.2 * np.sin(ang)], color=GRID, linewidth=1)
    circ_b = plt.Circle((0, 0), boundary_r, fill=False, color=INK, linewidth=2, linestyle=(0, (5, 3)))
    axL.add_patch(circ_b)
    axL.scatter(inner[:, 0], inner[:, 1], s=26, color=BLUE, alpha=0.9, linewidths=0)
    axL.scatter(outer[:, 0], outer[:, 1], s=26, color=RED, alpha=0.9, linewidths=0)
    axL.set_xlim(-3.2, 3.2)
    axL.set_ylim(-3.2, 3.2)
    axL.set_aspect("equal")
    axL.set_title("decision boundary carves the space", fontsize=12.5, color=INK)
    clean_axes(axL)

    # ---- right: same points under (r, theta) — a nonlinear warp ----
    axR.axvline(boundary_r, color=INK, linewidth=2, linestyle=(0, (5, 3)))
    axR.fill_betweenx([-0.3, 2 * np.pi + 0.3], -0.3, boundary_r, color="#e4eefb", zorder=0)
    axR.fill_betweenx([-0.3, 2 * np.pi + 0.3], boundary_r, 3.2, color="#fbe7e7", zorder=0)
    # the polar grid above becomes straight lines here: this *is* the warp
    for rr in np.arange(0.5, 3.3, 0.5):
        axR.axvline(rr, color=GRID, linewidth=1)
    for ang in np.linspace(0, 2 * np.pi, 12, endpoint=False):
        axR.axhline(ang, color=GRID, linewidth=1)
    axR.scatter(r_in, theta_in, s=26, color=BLUE, alpha=0.9, linewidths=0)
    axR.scatter(r_out, theta_out, s=26, color=RED, alpha=0.9, linewidths=0)
    axR.set_xlim(-0.3, 3.2)
    axR.set_ylim(-0.3, 2 * np.pi + 0.3)
    axR.set_xlabel(r"radius $r$")
    axR.set_ylabel(r"angle $\theta$")
    axR.set_title("warped representation: now linearly separable", fontsize=12.5, color=INK)
    clean_axes(axR, keep_ticks=True)
    axR.set_yticks([])

    fig.savefig("images/geometry_warp.svg", bbox_inches="tight")
    plt.close(fig)


# ----------------------------------------------------------------------
# 8. word2vec-style analogy scatter: distance = similarity, parallel
#    offsets = a consistent relation (geometry TC, "geometric process")
# ----------------------------------------------------------------------
def word2vec_figure():
    fig, ax = plt.subplots(figsize=(8.4, 5.6))

    # gender pair (man -> woman) and royalty pair (king -> queen): parallel
    gender = {"man": (0.9, 0.9), "woman": (0.9, 1.9), "king": (3.1, 1.0), "queen": (3.1, 2.0)}
    # country -> capital pair, a second parallel relation
    geo = {"france": (5.7, 3.5), "paris": (6.5, 2.35), "japan": (7.7, 3.55), "tokyo": (8.5, 2.4)}
    # an unrelated cluster, far away, to show distance = semantic similarity
    animals = {"dog": (0.9, 3.75), "cat": (1.5, 4.15), "puppy": (0.55, 4.3)}

    for pts, color in [(gender, BLUE), (geo, AQUA), (animals, VIOLET)]:
        xs = [p[0] for p in pts.values()]
        ys = [p[1] for p in pts.values()]
        ax.scatter(xs, ys, s=60, color=color, zorder=5, linewidths=0)
        for word, (x, y) in pts.items():
            ax.annotate(word, (x, y), xytext=(7, 6), textcoords="offset points", fontsize=13, color=INK)

    def rel_arrow(p_from, p_to, color):
        ax.annotate(
            "", xy=p_to, xytext=p_from,
            arrowprops=dict(arrowstyle="-|>", color=color, linewidth=1.8, alpha=0.65),
        )

    rel_arrow(gender["man"], gender["woman"], BLUE)
    rel_arrow(gender["king"], gender["queen"], BLUE)
    rel_arrow(geo["france"], geo["paris"], AQUA)
    rel_arrow(geo["japan"], geo["tokyo"], AQUA)

    ax.text(2.0, 1.45, "same offset", color=BLUE, fontsize=11, ha="center", style="italic")
    ax.text(7.1, 3.25, "same offset", color=AQUA, fontsize=11, ha="center", style="italic")

    # dashed loop around the unrelated cluster: near each other, far from the rest
    ax.add_patch(
        plt.Circle((0.95, 4.05), 0.55, fill=False, color=VIOLET, linewidth=1.4, linestyle=(0, (4, 3)))
    )
    ax.annotate(
        "close together $\\rightarrow$\nsimilar meaning", xy=(1.42, 3.85), xytext=(3.3, 3.55),
        fontsize=11, color=VIOLET, ha="left",
        arrowprops=dict(arrowstyle="-", color=VIOLET, linewidth=1),
    )

    ax.set_xlim(-0.3, 9.3)
    ax.set_ylim(0.2, 4.9)
    ax.set_aspect("equal")
    clean_axes(ax)
    fig.savefig("images/word2vec.svg", bbox_inches="tight")
    plt.close(fig)


if __name__ == "__main__":
    kmeans_figure()
    bias_variance_figure()
    regularization_figure()
    overlap_figure()
    landscape_figure()
    geometry_scatter_figure()
    geometry_warp_figure()
    word2vec_figure()
    print(
        "wrote images/{kmeans,bias_variance,regularization,overlap,loss_landscape,"
        "geometry_scatter,geometry_warp,word2vec}.svg"
    )

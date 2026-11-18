"""Independent reference values for the statistics in work/statistics-core.js.

Uses pandas / numpy / scipy / statsmodels only (no app code), on the same 240-batch demo data
(work/sample240.json). work/test-reference.cjs compares the app's results with expected.json.

    python work/reference/compute_reference.py          # rewrite expected.json
    python work/reference/compute_reference.py --check  # fail if expected.json is stale
"""
import io
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats
import statsmodels.api as sm
from statsmodels.formula.api import ols

HERE = Path(__file__).resolve().parent
SAMPLE = json.loads((HERE.parent / "sample240.json").read_text(encoding="utf-8"))
T = {k: pd.read_csv(io.StringIO(v), dtype=str) for k, v in SAMPLE.items()}


def capability(y, lsl, usl, mr_order=None):
    y = np.asarray(y, float)
    mu, so = y.mean(), y.std(ddof=1)
    out = {"n": len(y), "mean": mu, "overall": so,
           "Pp": (usl - lsl) / (6 * so), "Ppk": min(usl - mu, mu - lsl) / (3 * so)}
    if mr_order is not None:
        sw = np.abs(np.diff(y)).mean() / 1.128
        out.update(within=sw, Cp=(usl - lsl) / (6 * sw), Cpk=min(usl - mu, mu - lsl) / (3 * sw))
    return out


def batch_order():
    b = T["Batch"].copy()
    b["start"] = pd.to_datetime(b["Start_TS"])
    return b.sort_values("start")


def qc(analyte):
    q = T["QC"][T["QC"]["Analyte_ID"] == analyte].copy()
    q["y"] = q["Value"].astype(float)
    return q


def main():
    b = batch_order()
    ph = qc("pH").merge(b[["Batch_ID", "Equipment_ID", "start"]], on="Batch_ID").sort_values("start")
    lsl, usl = float(ph["LSL"].iloc[0]), float(ph["USL"].iloc[0])
    res = {"capability_pH_all": capability(ph["y"], lsl, usl)}
    m1 = ph[ph["Equipment_ID"] == "MIX-1"]
    res["capability_pH_MIX1_mr"] = capability(m1["y"], lsl, usl, mr_order=True)

    dp = T["Process"][T["Process"]["Parameter"] == "Filter_DP"].copy()
    dp["x"] = dp["Value"].astype(float)
    dpmax = dp.groupby("Batch_ID")["x"].max()
    lpc = qc("LPC_1p0").set_index("Batch_ID")["y"]
    xy = pd.concat([dpmax.rename("x"), lpc.rename("y")], axis=1, join="inner")
    xy = xy.loc[b["Batch_ID"][b["Batch_ID"].isin(xy.index)]]
    lr = stats.linregress(xy["x"], xy["y"])
    fit = sm.OLS(xy["y"], sm.add_constant(xy["x"])).fit()
    res["regression_LPC_vs_FilterDPmax"] = {"n": len(xy), "slope": lr.slope, "intercept": lr.intercept,
                                            "r": lr.rvalue, "r2": fit.rsquared,
                                            "rmse": float(np.sqrt(fit.ssr / (len(xy) - 2)))}
    res["spearman_LPC_vs_FilterDPmax"] = float(stats.spearmanr(xy["x"], xy["y"]).statistic)

    mat = T["Material"]
    for m in ("ADDITIVE", "SILICA", "DIW"):
        g = mat[mat["Material_ID"] == m][["Batch_ID", "Lot_ID"]].merge(ph[["Batch_ID", "y"]], on="Batch_ID")
        g = g[g.groupby("Lot_ID")["Lot_ID"].transform("size") >= 2]   # the app needs >= 2 batches per lot
        a = sm.stats.anova_lm(ols("y ~ C(Lot_ID)", g).fit(), typ=1)
        msb, mse = a.loc["C(Lot_ID)", "mean_sq"], a.loc["Residual", "mean_sq"]
        sizes = g.groupby("Lot_ID").size()
        N, k = len(g), len(sizes)
        n0 = (N - (sizes ** 2).sum() / N) / (k - 1)
        between = max(0.0, (msb - mse) / n0)
        res[f"contribution_pH_by_{m}_lot"] = {"groups": k, "n": N, "between": between, "residual": mse,
                                             "percent": 100 * between / (between + mse)}
    return res


def _clean(o):
    if isinstance(o, dict):
        return {k: _clean(v) for k, v in o.items()}
    if isinstance(o, (np.floating, np.integer)):
        return o.item()
    return o


if __name__ == "__main__":
    out = HERE / "expected.json"
    new = json.dumps(_clean(main()), indent=2, ensure_ascii=False) + "\n"
    if "--check" in sys.argv:
        old = json.loads(out.read_text(encoding="utf-8"))
        cur = json.loads(new)
        bad = [k for k in cur if any(abs(cur[k][f] - old[k][f]) > 1e-9 * max(1, abs(cur[k][f]))
                                     for f in (cur[k] if isinstance(cur[k], dict) else [None]) if f is not None)
               or (not isinstance(cur[k], dict) and abs(cur[k] - old[k]) > 1e-12)]
        if bad:
            sys.exit(f"expected.json is stale for: {bad}")
        print("expected.json matches a fresh independent computation")
    else:
        out.write_text(new, encoding="utf-8")
        print(new)

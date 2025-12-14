"""
Anomaly detection for PV panels.
Two checks:
1) Prediction vs. actual gap (uses stored predictions for the same day).
2) Peer-ratio drift (panel output ratio vs. neighbors compared to historical median).
"""

import numpy as np
from collections import defaultdict
from datetime import datetime
from typing import List, Dict, Any

# Thresholds tuned for small residential arrays; keep conservative to reduce false positives.
PRED_REL_DROP = 0.30      # Flag if actual is 30% below predicted (after error margin)
PRED_ABS_MIN = 0.5        # Minimum absolute gap (kWh) to avoid tiny fluctuations
PEER_DROP = 0.25          # Flag if peer ratio drops more than 25% vs. historical median
MIN_HISTORY_DAYS = 5      # Need at least this many days of history to trust peer ratios


def _group_by_date_and_panel(records: List[Dict[str, Any]]) -> Dict[str, Dict[int, float]]:
    grouped: Dict[str, Dict[int, float]] = defaultdict(dict)
    for rec in records:
        date = str(rec.get('date'))
        panel = int(rec.get('panel_id', 1))
        grouped[date][panel] = float(rec.get('total_kwh', 0.0))
    return grouped


def _historical_peer_ratios(actual_by_date: Dict[str, Dict[int, float]], num_panels: int) -> Dict[tuple, float]:
    """Compute median ratios between neighboring panels over history (excluding latest day)."""
    ratios: Dict[tuple, list] = defaultdict(list)
    if not actual_by_date:
        return {}
    latest_date = max(actual_by_date.keys())
    for date, panels in actual_by_date.items():
        if date == latest_date:
            continue  # exclude target day
        for panel in range(1, num_panels + 1):
            left = panel - 1
            right = panel + 1
            curr = panels.get(panel)
            if curr is None or curr <= 0:
                continue
            if left >= 1 and panels.get(left, 0) > 0:
                ratios[(panel, left)].append(curr / panels[left])
            if right <= num_panels and panels.get(right, 0) > 0:
                ratios[(panel, right)].append(curr / panels[right])
    return {k: float(np.median(v)) for k, v in ratios.items() if v}


def detect_anomalies(historic_generation: list, predictions: list = None, num_panels: int = 3) -> list:
    """
    Detect anomalies using prediction gap + peer-ratio drift.

    Args:
        historic_generation: List of dicts [{date, panel_id, total_kwh}, ...]
        predictions: List of dicts from DB predictions table for the target date
                     [{prediction_date, panel_or_source_id, predicted_value_kwh, error_margin_kwh}, ...]
        num_panels: Number of PV panels

    Returns:
        List of anomaly dicts: [{panel_id, type, confidence, description}, ...]
    """

    anomalies = []

    if not historic_generation:
        print("[Anomaly Detector] No generation history available")
        return anomalies

    # Organize actuals by date and panel
    actual_by_date = _group_by_date_and_panel(historic_generation)
    target_date = max(actual_by_date.keys())
    actual_latest = actual_by_date[target_date]

    # Prediction map for the target date (if provided)
    pred_map = {}
    if predictions:
        for p in predictions:
            if str(p.get('prediction_date')) != target_date:
                continue
            panel_id = int(p.get('panel_or_source_id') or 1)
            pred_map[panel_id] = {
                'pred': float(p.get('predicted_value_kwh', 0.0)),
                'err': float(p.get('error_margin_kwh', 0.0))
            }

    # --- Check 1: Prediction vs. actual gap ---
    for panel in range(1, num_panels + 1):
        actual = actual_latest.get(panel)
        if actual is None:
            continue
        pred_rec = pred_map.get(panel)
        if not pred_rec:
            continue
        predicted = pred_rec['pred']
        err_margin = max(pred_rec['err'], 0.0)

        lower_bound = max(predicted - max(err_margin * 2, predicted * PRED_REL_DROP), 0.0)
        if actual < lower_bound and (predicted - actual) >= PRED_ABS_MIN:
            rel_gap = (predicted - actual) / max(predicted, 1e-3)
            confidence = min(0.99, rel_gap / PRED_REL_DROP)
            anomalies.append({
                'panel_id': panel,
                'type': 'underperformance',
                'confidence': float(confidence),
                'description': (
                    f"Panel {panel}: actual {actual:.2f} kWh vs predicted {predicted:.2f} kWh "
                    f"(margin {err_margin:.2f}), gap {(predicted-actual):.2f} kWh"
                )
            })

    # --- Check 2: Peer-ratio drift vs. historical median ---
    peer_baseline = _historical_peer_ratios(actual_by_date, num_panels)
    baseline_days = len(actual_by_date) - 1
    if baseline_days >= MIN_HISTORY_DAYS and peer_baseline:
        for panel in range(1, num_panels + 1):
            curr = actual_latest.get(panel)
            if curr is None or curr <= 0:
                continue
            for neighbor in (panel - 1, panel + 1):
                if neighbor < 1 or neighbor > num_panels:
                    continue
                neigh_val = actual_latest.get(neighbor)
                if neigh_val is None or neigh_val <= 0:
                    continue
                key = (panel, neighbor)
                expected_ratio = peer_baseline.get(key)
                if not expected_ratio:
                    continue
                ratio_now = curr / neigh_val
                if ratio_now < expected_ratio * (1 - PEER_DROP):
                    drop_pct = 1 - (ratio_now / expected_ratio)
                    confidence = min(0.95, drop_pct / PEER_DROP)
                    anomalies.append({
                        'panel_id': panel,
                        'type': 'fault',
                        'confidence': float(confidence),
                        'description': (
                            f"Panel {panel}: ratio to panel {neighbor} is {ratio_now:.2f} vs "
                            f"historical {expected_ratio:.2f} (drop {drop_pct*100:.1f}%)."
                        )
                    })

    print(f"[Anomaly Detector] Found {len(anomalies)} anomalies for {target_date}")
    return anomalies

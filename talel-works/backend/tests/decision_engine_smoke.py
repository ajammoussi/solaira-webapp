"""
Lightweight smoke test for decision engine wiring without external deps.
Run: python -m backend.tests.decision_engine_smoke
"""

from backend.utils.decision_engine import compute_decisions

def main():
    predictions = {
        'pv': [{'value': 2.0}, {'value': 1.5}, {'value': 1.2}],
        'wind_tree': {'value': 2.4},
        'consumption': {'value': 5.5}
    }

    user_appliances = [
        {'id': 'washing_machine', 'name': 'Washing Machine', 'power_kwh': 2.5},
        {'id': 'dishwasher', 'name': 'Dishwasher', 'power_kwh': 1.8},
        {'id': 'hvac', 'name': 'HVAC', 'power_kwh': 3.5}
    ]

    weekly_actions = [
        {'id': 'weekly_laundry', 'name': 'Weekly Laundry', 'power_kwh': 2.5, 'preferred_time': '10:00'}
    ]

    decisions = compute_decisions(
        predictions,
        user_appliances=user_appliances,
        current_battery_soc=50.0,
        weekly_actions=weekly_actions
    )

    print("Sources:", decisions['sources'])
    print("Battery:", decisions['battery'])
    print("Microgrid:", decisions['microgrid'])
    print("Appliances:", decisions['appliances'])
    print("Alerts:", decisions['alerts'])

if __name__ == '__main__':
    main()

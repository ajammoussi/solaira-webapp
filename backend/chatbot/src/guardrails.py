from datetime import datetime, timedelta

MESSAGES = {
    "length": "Hold on a moment. That message is rather lengthy. What are you trying to accomplish?",
    "rate_limited": "Please slow down! You're sending messages too quickly."
}

"""
Each user gets to use the model 10 times every hour.
This is to ensure equitable access due to limited resources.
"""

USERS = {}

def rate_limited(user_name) -> bool:
    if user_name not in USERS:
        USERS[user_name] = []

    USERS[user_name].append(datetime.now())
    USERS[user_name] = [timestamp for timestamp in USERS[user_name] if timestamp > datetime.now() - timedelta(hours=1)]

    if len(USERS[user_name]) >= 10:
        return True

    return False
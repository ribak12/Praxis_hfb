# backend/models.py
from datetime import datetime
from db import db

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # archetype assigned after test
    archetype = db.Column(db.String(64), nullable=True)

    # OPTIONAL (uncomment if you want to store final philosophy/ritual)
    # last_philosophy = db.Column(db.Text, nullable=True)
    # last_ritual = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "archetype": self.archetype
        }


class DailySession(db.Model):
    __tablename__ = "daily_sessions"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    date = db.Column(db.Date, nullable=False)

    # store archetype at time of session
    archetype = db.Column(db.String(80))

    mood_score = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # OPTIONAL fields in the future
    # philosophy_shown = db.Column(db.Text)
    # ritual_shown = db.Column(db.Text)

# backend/api_routes.py
# blueprint-only module: avoid top-level imports of app/models/db that require app init
from flask import Blueprint, request, jsonify, send_from_directory, current_app
import os
import json
from typing import Dict, Any

bp = Blueprint("api", __name__)

# Default in-code archetype library (fallback)
_DEFAULT_ARCHETYPE_LIBRARY: Dict[str, Dict[str, Any]] = {
    "observer": {
        "title": "The Observer",
        "philosophies": [
            "Pause before action — observe patterns.",
            "Value curiosity over certainty."
        ],
        "rituals": [
            {"name": "5-minute reflection", "description": "Sit quietly and note 3 recurring thoughts."},
            {"name": "Daily log", "description": "Write one observation about today."}
        ]
    },
    "warrior": {
        "title": "The Warrior",
        "philosophies": [
            "Small wins compound.",
            "Discipline over inspiration."
        ],
        "rituals": [
            {"name": "Two-minute push", "description": "Do a single focused action for 2 minutes."},
            {"name": "Victory list", "description": "Write 3 small wins at day's end."}
        ]
    }
    # Add more fallback archetypes here if you like
}

def _load_archetype_library() -> Dict[str, Dict[str, Any]]:
    """
    Attempt to load archetypes from an external JSON file:
    ../data/archetypes.json relative to this file. If absent or invalid, return default.
    This lets you edit archetypes without changing Python code.
    """
    try:
        base = os.path.dirname(__file__)
        candidate = os.path.abspath(os.path.join(base, "..", "data", "archetypes.json"))
        if os.path.exists(candidate):
            with open(candidate, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
    except Exception:
        # silent fallback to default if loading/parsing fails
        pass
    return _DEFAULT_ARCHETYPE_LIBRARY

# load once at import time (safe; reading a file is fine)
ARCHETYPE_LIBRARY = _load_archetype_library()

@bp.route("/api/archetype/<string:name>", methods=["GET"])
def get_archetype(name: str):
    """
    Return archetype data (title, philosophies, rituals).
    If external JSON contains the archetype keys, those will be used.
    """
    data = ARCHETYPE_LIBRARY.get(name)
    if not data:
        return jsonify({"error": "Unknown archetype"}), 404
    # return structure consistent with other API responses
    return jsonify({"ok": True, "archetype": name, "data": data})

@bp.route("/api/user/<int:user_id>/archetype", methods=["POST"])
def assign_archetype(user_id: int):
    """
    Assign an archetype to a user. Uses lazy imports to avoid circular imports at module-import time.
    Expected payload: {"archetype": "the_key"}
    """
    payload = request.get_json(silent=True) or {}
    archetype = payload.get("archetype")
    if not archetype or archetype not in ARCHETYPE_LIBRARY:
        return jsonify({"error": "Invalid archetype"}), 400

    # lazy imports
    from models import User  # type: ignore
    from db import db  # type: ignore

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.archetype = archetype
    db.session.commit()
    return jsonify({"ok": True, "user_id": user.id, "archetype": archetype})



@bp.route("/api/user/<int:user_id>", methods=["GET"])
def get_user(user_id: int):
    """
    Return minimal user info. Lazy-imports models to avoid app-init issues.
    """
    from models import User  # type: ignore

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # adapt to your User.to_dict() if present; keep fields explicit for clarity
    user_data = {
        "id": user.id,
        "email": getattr(user, "email", None),
        "name": getattr(user, "name", None),
        "archetype": getattr(user, "archetype", None),
    }
    return jsonify({"ok": True, "user": user_data})

# Static proxy for frontend assets (optional)
@bp.route("/", defaults={"path": "index.html"})
@bp.route("/<path:path>")
def static_proxy(path: str):
    """
    Serves files from ../frontend/static relative to backend/.
    IMPORTANT: ensure your frontend build files live in that folder.
    """
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/static"))
    # avoid directory traversal (Flask's send_from_directory already protects, but be explicit)
    safe_path = os.path.normpath(path).lstrip(os.sep)
    return send_from_directory(root, safe_path)

@bp.route("/api/ping", methods=["GET"])
def ping():
    return jsonify({"ok": True})

@bp.route("/api/auth/login", methods=["POST"])
def login():
    """
    Example login route that creates a user by email if not exists.
    Payload: {"email": "...", "name": "..."}
    """
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    if not email:
        return jsonify({"error": "email required"}), 400

    # lazy imports
    from models import User  # type: ignore
    from db import db  # type: ignore

    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(email=email, name=data.get("name"))
        db.session.add(user)
        db.session.commit()

    # try to use to_dict if available, otherwise return basic fields
    if hasattr(user, "to_dict"):
        user_payload = user.to_dict()
    else:
        user_payload = {"id": user.id, "email": user.email, "name": getattr(user, "name", None)}

    return jsonify({"status": "ok", "user": user_payload})

@bp.route("/api/session", methods=["POST"])
def save_session():
    """
    Records a daily session. Expected payload example:
    {
      "user_id": 1,
      "date": "2025-11-30",
      "archetype": "seeker",
      "mood_score": 7
    }
    """
    payload = request.get_json(silent=True) or {}
    user_id = payload.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    # lazy imports
    from models import DailySession, User  # type: ignore
    from db import db  # type: ignore

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # defensive field handling
    session = DailySession(
        user_id=user_id,
        date=payload.get("date"),
        archetype=payload.get("archetype", getattr(user, "archetype", None)),
        mood_score=payload.get("mood_score"),
        notes=payload.get("notes")
    )
    db.session.add(session)
    db.session.commit()
    return jsonify({"status": "ok", "id": session.id})

# ---------------------------------------------
# NEW: Return 1 philosophy + 1 ritual after test
# ---------------------------------------------
@bp.route("/api/user/<int:user_id>/complete_test", methods=["POST"])
def complete_test(user_id):
    from models import User
    from db import db
    import random

    # Load archetype library (already defined in this file)
    lib = ARCHETYPE_LIBRARY

    # get user
    user = User.query.get_or_404(user_id)

    archetype_key = user.archetype
    if not archetype_key:
        return jsonify({"error": "User has no archetype assigned yet"}), 400

    if archetype_key not in lib:
        return jsonify({"error": "Unknown archetype"}), 400

    arche = lib[archetype_key]

    philosophies = arche.get("philosophies", [])
    rituals = arche.get("rituals", [])

    if not philosophies or not rituals:
        return jsonify({"error": "No content for this archetype"}), 500

    philosophy = random.choice(philosophies)
    ritual = random.choice(rituals)

    # OPTIONAL: save last recommendation if you later want this
    # user.last_philosophy = philosophy
    # user.last_ritual = ritual
    # db.session.commit()

    return jsonify({
        "ok": True,
        "archetype": archetype_key,
        "philosophy": philosophy,
        "ritual": ritual
    })


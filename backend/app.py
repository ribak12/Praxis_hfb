# backend/app.py
# application factory — create app, init extensions, register blueprint after init
from flask import Flask
from config import Config  # if you have; otherwise replace with desired settings
from db import db

def create_app(config_object=None):
    app = Flask(__name__, static_folder=None)  # we serve frontend static via blueprint
    app.config.from_object(config_object or Config)

    # init extensions that require app
    db.init_app(app)

    # register blueprint AFTER app and extensions are initialized
    # this import is local so api_routes never imports the app at top-level
    from api_routes import bp as api_bp
    app.register_blueprint(api_bp, url_prefix="/")

    # optional: simple health route
    @app.route("/_health")
    def _health():
        return {"ok": True}

    return app

# Optional: quick dev app variable if you run backend/app.py directly in dev
# if you prefer to run via run.py or main, comment this out.
# app = create_app()

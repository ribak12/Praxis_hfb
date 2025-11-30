# run.py  (project root)
# simple runner that imports the factory and starts the server
import os
import random
import sys
# ensure backend package path is on sys.path when running from project root in PyCharm
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))

from backend.app import create_app


app = create_app()

if __name__ == "__main__":
    # development settings
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", 1225))
    debug = os.environ.get("FLASK_DEBUG", "1") in ("1", "true", "True")
    app.run(host=host, port=port, debug=debug)

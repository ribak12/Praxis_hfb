from flask_sqlalchemy import SQLAlchemy

# create SQLAlchemy without binding to an app here to avoid circular imports
db = SQLAlchemy()
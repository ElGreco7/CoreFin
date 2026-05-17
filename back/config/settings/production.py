from .base import *

from decouple import config
DEBUG = False
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="").split(",")

# Segurança
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Arquivos estáticos
STATIC_ROOT = BASE_DIR / "staticfiles"
STATIC_URL = "/static/"

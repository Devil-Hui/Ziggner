"""Pre-production settings with production security and isolated resources."""
from .prod import *  # noqa: F401,F403

DEBUG = False
ENVIRONMENT = 'staging'

# Staging is frequently reached through an internal HTTP ingress. The outer
# proxy still terminates HTTPS and supplies X-Forwarded-Proto.
SECURE_SSL_REDIRECT = True

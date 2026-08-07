"""
Social OAuth authentication backend.
Supports Google and Facebook OAuth 2.0 login flow.
"""

import requests
import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction

logger = logging.getLogger('biz')

User = get_user_model()


class SocialAuthService:
    """Handles OAuth token verification and user creation for social providers."""

    PROVIDERS = {
        'google': {
            'token_info_url': 'https://www.googleapis.com/oauth2/v3/tokeninfo',
            'userinfo_url': 'https://www.googleapis.com/oauth2/v3/userinfo',
            'client_id_key': 'SOCIAL_AUTH_GOOGLE_CLIENT_ID',
            'secret_key': 'SOCIAL_AUTH_GOOGLE_SECRET',
        },
        'facebook': {
            'token_info_url': 'https://graph.facebook.com/debug_token',
            'userinfo_url': 'https://graph.facebook.com/me',
            'client_id_key': 'SOCIAL_AUTH_FACEBOOK_APP_ID',
            'secret_key': 'SOCIAL_AUTH_FACEBOOK_SECRET',
            'fields': 'id,name,email,picture',
        },
    }

    @classmethod
    def get_provider_config(cls, provider):
        config = cls.PROVIDERS.get(provider)
        if not config:
            raise ValueError(f'Unsupported provider: {provider}')
        client_id = getattr(settings, config['client_id_key'], '')
        client_secret = getattr(settings, config['secret_key'], '')
        return {
            **config,
            'client_id': client_id,
            'client_secret': client_secret,
            'redirect_uri': getattr(settings, 'SOCIAL_AUTH_REDIRECT_BASE', 'http://localhost:12700') + '/auth/social/callback',
        }

    @classmethod
    def verify_token(cls, provider, access_token):
        """Verify the OAuth access token with the provider and return user info."""
        config = cls.get_provider_config(provider)

        if provider == 'google':
            resp = requests.get(config['userinfo_url'], params={'access_token': access_token}, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            return {
                'sub': data['sub'],
                'email': data.get('email', ''),
                'name': data.get('name', ''),
                'picture': data.get('picture', ''),
            }

        elif provider == 'facebook':
            app_secret_proof = config['client_secret']
            resp = requests.get(config['userinfo_url'], params={
                'access_token': access_token,
                'fields': config['fields'],
                'appsecret_proof': app_secret_proof,
            }, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            return {
                'sub': str(data['id']),
                'email': data.get('email', ''),
                'name': data.get('name', ''),
                'picture': data.get('picture', {}).get('data', {}).get('url', '') if isinstance(data.get('picture'), dict) else '',
            }

        raise ValueError(f'Unsupported provider: {provider}')

    @classmethod
    @transaction.atomic
    def get_or_create_user(cls, provider, user_info):
        """Find existing social account or create a new user."""
        from apps.users.models import SocialAccount

        sub = user_info['sub']
        email = user_info.get('email', '')
        name = user_info.get('name', '')

        # Check if social account already exists
        social_account = SocialAccount.objects.filter(
            provider=provider, provider_id=sub
        ).select_related('user').first()

        if social_account:
            return social_account.user, False

        # Check if email already registered
        existing_user = None
        if email:
            existing_user = User.objects.filter(email=email).first()

        if existing_user:
            # Link social account to existing user
            SocialAccount.objects.create(
                user=existing_user,
                provider=provider,
                provider_id=sub,
                extra_data={'name': name, 'picture': user_info.get('picture', '')},
            )
            return existing_user, False

        # Create new user with auto-generated username
        base_username = name.lower().replace(' ', '_') if name else f'{provider}_{sub[:8]}'
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f'{base_username}_{counter}'
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            password=None,  # No password set — user must set it on first login
        )

        SocialAccount.objects.create(
            user=user,
            provider=provider,
            provider_id=sub,
            extra_data={'name': name, 'picture': user_info.get('picture', '')},
        )

        return user, True  # True = new user, needs password setup

    @classmethod
    def exchange_code_for_token(cls, provider, code):
        """Exchange authorization code for access token (server-side flow)."""
        config = cls.get_provider_config(provider)
        token_urls = {
            'google': 'https://oauth2.googleapis.com/token',
            'facebook': 'https://graph.facebook.com/v12.0/oauth/access_token',
        }
        url = token_urls.get(provider)
        if not url:
            raise ValueError(f'Unsupported provider: {provider}')

        payload = {
            'code': code,
            'client_id': config['client_id'],
            'client_secret': config['client_secret'],
            'redirect_uri': config['redirect_uri'],
            'grant_type': 'authorization_code',
        }

        resp = requests.post(url, data=payload, timeout=10)
        resp.raise_for_status()
        return resp.json().get('access_token')

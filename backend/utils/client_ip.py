"""Resolve client IPs without trusting attacker-controlled forwarding headers."""

from __future__ import annotations

import ipaddress
from collections.abc import Iterable

from django.conf import settings


def _valid_ip(value: str) -> str | None:
    try:
        return str(ipaddress.ip_address(value.strip()))
    except (ValueError, AttributeError):
        return None


def get_client_ip(request, trusted_proxy_cidrs: Iterable[str] | None = None) -> str:
    remote = _valid_ip(request.META.get("REMOTE_ADDR", "")) or "127.0.0.1"
    cidrs = trusted_proxy_cidrs
    if cidrs is None:
        cidrs = getattr(settings, "TRUSTED_PROXY_CIDRS", ())

    remote_address = ipaddress.ip_address(remote)
    trusted = any(remote_address in ipaddress.ip_network(cidr) for cidr in cidrs)
    if not trusted:
        return remote

    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",", 1)[0]
    return _valid_ip(forwarded) or remote

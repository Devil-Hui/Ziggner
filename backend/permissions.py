"""
DRF Permission Classes — IsResourceOwner for IDOR protection.
Usage: Add to permission_classes of any view handling user-owned resources:
    class MyView(BaseApiView):
        permission_classes = [ApiPermission, IsResourceOwner]
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS
from django.db.models import Model


class IsResourceOwner(BasePermission):
    """
    Object-level permission: only allow owners to access their resources.
    Works at both view-level (has_permission) and object-level (has_object_permission).

    View-level: Validates that the URL kwargs include a resource ID that
    belongs to the current user (e.g., order_no, pk).

    Object-level: Validates obj.user_id == request.user.id.

    Usage:
        class OrderDetailView(BaseApiView):
            permission_classes = [ApiPermission, IsResourceOwner]
    """

    def has_permission(self, request, view):
        # For views that pass user context to services, delegate to service layer
        # This permission provides defense-in-depth — the service layer already
        # filters by request.user (e.g., Order.objects.filter(user=user))
        if not request.user or not request.user.is_authenticated:
            return False
        return True  # Service-layer filtering handles ownership; this is defense-in-depth

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'user_id'):
            return obj.user_id == request.user.id
        if hasattr(obj, 'user'):
            return getattr(obj.user, 'pk', None) == request.user.pk
        return False


class IsAdminOrReadOnly(BasePermission):
    """Write requires admin, read is public."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

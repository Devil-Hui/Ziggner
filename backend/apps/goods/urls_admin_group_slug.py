"""
Slug-style AdminGroup routes, mounted at /api/v1/admin/groups/ (and /api/admin/groups/).

The production frontend (built & deployed to Cloudflare Pages) calls these
endpoints, using the numeric group id as the path param:

  GET    /admin/groups/                        -> list groups
  POST   /admin/groups/create/                 -> create group
  GET    /admin/groups/<id>/members            -> list members
  POST   /admin/groups/<id>/members            -> add member
  DELETE /admin/groups/<id>/members/<user_id>  -> remove member
  PUT    /admin/groups/<id>/update             -> update group
  DELETE /admin/groups/<id>/delete             -> delete group

These reuse the existing id-based AdminGroup* views from
``apps.goods.views.admin_group``; only the URL prefix differs from the legacy
``/api/v1/goods/admin_group/...`` routes. The previous 404 on
``/api/v1/admin/groups/`` was caused solely by the missing prefix — the views
and their request/response shapes already matched the frontend contract.
"""
from django.urls import path

from .views.admin_group import (
    AdminGroupListView,
    AdminGroupCreateView,
    AdminGroupMembersView,
    AdminGroupUpdateView,
    AdminGroupDeleteView,
)

urlpatterns = [
    path('', AdminGroupListView.as_view(), name='slug-admin-group-list'),
    path('create/', AdminGroupCreateView.as_view(), name='slug-admin-group-create'),
    path('<int:group_id>/members', AdminGroupMembersView.as_view(), name='slug-admin-group-members'),
    path('<int:group_id>/members/<int:user_id>', AdminGroupMembersView.as_view(), name='slug-admin-group-member-delete'),
    path('<int:group_id>/update', AdminGroupUpdateView.as_view(), name='slug-admin-group-update'),
    path('<int:group_id>/delete', AdminGroupDeleteView.as_view(), name='slug-admin-group-delete'),
]

"""
Slug-style AdminGroup routes, mounted at /api/v1/admin/groups/ (and /api/admin/groups/).

The production frontend (built & deployed to Cloudflare Pages) calls these
endpoints, addressing a group by its **slug** (e.g. the default shelter group
``pending``):

  GET    /admin/groups/                        -> list groups
  POST   /admin/groups/create/                 -> create group
  GET    /admin/groups/<ref>/members           -> list members
  POST   /admin/groups/<ref>/members           -> add member
  DELETE /admin/groups/<ref>/members/<user_ref>-> remove member
  PUT    /admin/groups/<ref>/update            -> update group
  DELETE /admin/groups/<ref>/delete            -> delete group

``<ref>`` accepts BOTH the numeric group id and the textual slug (via
``_resolve_group`` in ``apps.goods.views.admin_group``), so the route keeps
working whether the frontend sends a slug (current behaviour) or a numeric id.
The previous 404 on ``/api/v1/admin/groups/pending/members`` was caused by the
route only accepting ``<int:group_id>``; the slug form fixes it.
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
    path('<str:group_ref>/members', AdminGroupMembersView.as_view(), name='slug-admin-group-members'),
    path('<str:group_ref>/members/<str:user_ref>', AdminGroupMembersView.as_view(), name='slug-admin-group-member-delete'),
    path('<str:group_ref>/update', AdminGroupUpdateView.as_view(), name='slug-admin-group-update'),
    path('<str:group_ref>/delete', AdminGroupDeleteView.as_view(), name='slug-admin-group-delete'),
]

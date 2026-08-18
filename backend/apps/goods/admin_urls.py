from django.urls import path

from apps.goods.admin_views import (
    AdminGroupListView,
    AdminGroupCreateView,
    AdminGroupMembersView,
    AdminGroupUpdateView,
    AdminGroupDeleteView,
)

urlpatterns = [
    path('', AdminGroupListView.as_view(), name='admin-group-list'),
    path('create/', AdminGroupCreateView.as_view(), name='admin-group-create'),
    path('<str:slug>/members', AdminGroupMembersView.as_view(), name='admin-group-members'),
    path('<str:slug>/members/<str:account_no>', AdminGroupMembersView.as_view(), name='admin-group-member-delete'),
    path('<str:slug>/update', AdminGroupUpdateView.as_view(), name='admin-group-update'),
    path('<str:slug>/delete', AdminGroupDeleteView.as_view(), name='admin-group-delete'),
]

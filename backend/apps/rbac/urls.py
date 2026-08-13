from django.urls import path

from apps.rbac.views import RoleMatrixView, UserRoleDetailView, UserRoleListView

urlpatterns = [
    path('matrix', RoleMatrixView.as_view(), name='rbac-matrix'),
    path('users', UserRoleListView.as_view(), name='rbac-user-list'),
    path('users/<int:user_id>/roles', UserRoleDetailView.as_view(),
         name='rbac-user-roles'),
]

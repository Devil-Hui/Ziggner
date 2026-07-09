from django.urls import path
from .views import (
    NotificationListView, NotificationReadAllView, NotificationReadView,
    OperationLogListView, OperationLogCategoryView,
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('read-all/', NotificationReadAllView.as_view(), name='notification-read-all'),
    path('<int:notification_id>/read/', NotificationReadView.as_view(), name='notification-read'),
    path('logs/', OperationLogListView.as_view(), name='operation-log-list'),
    path('logs/categories/', OperationLogCategoryView.as_view(), name='operation-log-categories'),
]

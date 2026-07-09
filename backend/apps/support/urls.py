from django.urls import path
from .views import (
    ConversationListView, ConversationDetailView,
    ConversationCloseView, UploadAttachmentView,
)

urlpatterns = [
    path('', ConversationListView.as_view(), name='support-conversation-list'),
    path('<int:conv_id>/', ConversationDetailView.as_view(), name='support-conversation-detail'),
    path('<int:conv_id>/close/', ConversationCloseView.as_view(), name='support-conversation-close'),
    path('upload/', UploadAttachmentView.as_view(), name='support-upload'),
]
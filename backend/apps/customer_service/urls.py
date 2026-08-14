from django.urls import path
from .views import (
    UploadFileView,
    ProductSearchView,
    ProductDetailView,
    AgentListView,
    ConversationListView,
    ConversationDetailView,
    ConversationReleaseView,
    ConversationCloseView,
    ConversationMarkReadView,
    MessageView,
)

urlpatterns = [
    # 文件上传
    path('upload/', UploadFileView.as_view(), name='cs-upload'),

    # 商品搜索（Admin 端）
    path('products/search/', ProductSearchView.as_view(), name='cs-product-search'),

    # 商品实时详情
    path('product/<int:spu_id>/detail/', ProductDetailView.as_view(), name='cs-product-detail'),

    # 客服列表（组级）
    path('agents/', AgentListView.as_view(), name='cs-agents'),

    # 会话
    path('conversations/', ConversationListView.as_view(), name='cs-conversation-list'),
    path('conversations/<int:conv_id>/', ConversationDetailView.as_view(), name='cs-conversation-detail'),
    path('conversations/<int:conv_id>/read/', ConversationMarkReadView.as_view(), name='cs-conversation-read'),
    path('conversations/<int:conv_id>/close/', ConversationCloseView.as_view(), name='cs-conversation-close'),

    # 消息（GET 历史 + 离线拉取 / POST 发送）
    path('conversations/<int:conv_id>/messages/', MessageView.as_view(), name='cs-messages'),

    # 释放对话（管理员主动释放）
    path('conversations/<int:conv_id>/release/', ConversationReleaseView.as_view(), name='cs-conversation-release'),
]

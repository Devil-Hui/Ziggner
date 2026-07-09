from django.urls import path
from .views import (
    ReviewListView, CreateReviewView, MyReviewView, EditReviewView,
    ReviewableItemsView, DeleteReviewView, ReplyReviewView,
)


urlpatterns = [
    path('', ReviewListView.as_view(), name='review-list'),
    path('create/', CreateReviewView.as_view(), name='review-create'),
    path('reviewable/', ReviewableItemsView.as_view(), name='review-reviewable'),
    path('my/', MyReviewView.as_view(), name='review-my'),
    path('<int:review_id>/', EditReviewView.as_view(), name='review-edit'),
    path('<int:review_id>/delete/', DeleteReviewView.as_view(), name='review-delete'),
    path('<int:review_id>/reply/', ReplyReviewView.as_view(), name='review-reply'),
]

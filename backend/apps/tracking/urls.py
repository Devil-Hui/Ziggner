from django.urls import path
from .views import BrowseHistoryListView

urlpatterns = [
    path('history/', BrowseHistoryListView.as_view(), name='browse-history'),
]

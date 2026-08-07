from django.contrib import admin
from .models import BrowseHistory


@admin.register(BrowseHistory)
class BrowseHistoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'spu', 'viewed_at', 'created_at']
    list_filter = ['viewed_at']
    search_fields = ['user__username', 'spu__name']
    readonly_fields = ['viewed_at', 'created_at']
    date_hierarchy = 'viewed_at'

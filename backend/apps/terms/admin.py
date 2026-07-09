from django.contrib import admin
from .models import Term


@admin.register(Term)
class TermAdmin(admin.ModelAdmin):
    list_display = ['title', 'type', 'version', 'is_active', 'effective_date', 'created_at']
    list_filter = ['type', 'is_active']
    search_fields = ['title', 'content']
    list_editable = ['is_active']
    date_hierarchy = 'effective_date'
    fieldsets = (
        (None, {
            'fields': ('title', 'type', 'version', 'is_active', 'effective_date')
        }),
        ('内容', {
            'fields': ('content',),
            'classes': ('wide',),
        }),
    )

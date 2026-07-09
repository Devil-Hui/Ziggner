from django.contrib import admin
from .models import Favorite


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'spu', 'created_at']
    search_fields = ['user__username', 'spu__name']

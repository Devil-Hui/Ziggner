from django.contrib import admin
from .models import Address


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'name', 'phone', 'country', 'region',
                    'city', 'address_line', 'is_default', 'created_at']
    list_filter = ['is_default', 'country', 'region']
    search_fields = ['name', 'phone', 'address_line']

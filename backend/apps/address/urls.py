from django.urls import path
from .views import (
    AddressDefaultView, AddressDetailView,
    AddressListView, AddressSetDefaultView,
)

urlpatterns = [
    path('', AddressListView.as_view(), name='address-list'),
    path('default/', AddressDefaultView.as_view(), name='address-default'),
    path('<int:address_id>/', AddressDetailView.as_view(), name='address-detail'),
    path('<int:address_id>/default/', AddressSetDefaultView.as_view(), name='address-set-default'),
]

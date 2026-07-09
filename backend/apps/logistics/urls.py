from django.urls import path
from .views import CarrierListView, ShippingCostView, TrackShipmentView, MyShipmentsView


urlpatterns = [
    path('carriers/', CarrierListView.as_view(), name='logistics-carriers'),
    path('cost/', ShippingCostView.as_view(), name='logistics-cost'),
    path('track/', TrackShipmentView.as_view(), name='logistics-track'),
    path('my/', MyShipmentsView.as_view(), name='logistics-my'),
]

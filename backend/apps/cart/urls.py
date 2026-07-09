from django.urls import path
from .views import (
    CartItemAddView, CartItemRemoveView, CartItemSelectView,
    CartItemUpdateView, CartView, CartClearView,
)

urlpatterns = [
    path('', CartView.as_view(), name='cart-detail'),
    path('clear/', CartClearView.as_view(), name='cart-clear'),
    path('items/', CartItemAddView.as_view(), name='cart-item-add'),
    path('items/<int:item_id>/', CartItemUpdateView.as_view(), name='cart-item-update'),
    path('items/<int:item_id>/remove/', CartItemRemoveView.as_view(), name='cart-item-remove'),
    path('items/select/', CartItemSelectView.as_view(), name='cart-item-select'),
]

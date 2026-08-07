from django.urls import path
from .views import (
    ClaimCouponView, CouponDetailView, CouponListView,
    GenerateCouponView, MyCouponView,
    ActivityListView, ActivityCreateView, ActivityUpdateView, ActivityDeleteView,
    CouponApplicationCreateView, CouponApplicationDetailView,
    CouponApplicationReviewView, CouponApplicationSubmitView,
    MyCouponApplicationView, PendingCouponApplicationView,
)
from .admin_views import (
    CouponAdminListView, CouponAdminDetailView,
    ActivityAdminListView, ActivityAdminDetailView,
    CouponScopeView, ActivitySKUView,
)

urlpatterns = [
    # Public
    path('', CouponListView.as_view(), name='promotion-list'),
    path('activity/', ActivityListView.as_view(), name='promotion-activity-list'),
    path('generate/', GenerateCouponView.as_view(), name='promotion-generate'),
    path('my/', MyCouponView.as_view(), name='promotion-my'),
    path('application/', CouponApplicationCreateView.as_view(), name='promotion-application-create'),
    path('application/my/', MyCouponApplicationView.as_view(), name='promotion-application-my'),
    path('application/pending/', PendingCouponApplicationView.as_view(), name='promotion-application-pending'),
    path('application/<int:application_id>/', CouponApplicationDetailView.as_view(), name='promotion-application-detail'),
    path('application/<int:application_id>/submit/', CouponApplicationSubmitView.as_view(), name='promotion-application-submit'),
    path('application/<int:application_id>/review/', CouponApplicationReviewView.as_view(), name='promotion-application-review'),
    path('<str:code>/', CouponDetailView.as_view(), name='promotion-detail'),
    path('<str:code>/claim/', ClaimCouponView.as_view(), name='promotion-claim'),

    # Admin Coupon CRUD
    path('coupon', CouponAdminListView.as_view(), name='promotion-coupon-admin'),
    path('coupon/create', CouponAdminListView.as_view(), name='promotion-coupon-create'),
    path('coupon/<int:pk>/update', CouponAdminDetailView.as_view(), name='promotion-coupon-update'),
    path('coupon/<int:pk>/delete', CouponAdminDetailView.as_view(), name='promotion-coupon-delete'),
    path('coupon/<int:pk>/scope', CouponScopeView.as_view(), name='promotion-coupon-scope'),

    # Admin Activity CRUD
    path('activity', ActivityAdminListView.as_view(), name='promotion-activity-admin'),
    path('activity/create', ActivityAdminListView.as_view(), name='promotion-activity-create'),
    path('activity/<int:pk>/update', ActivityAdminDetailView.as_view(), name='promotion-activity-update'),
    path('activity/<int:pk>/delete', ActivityAdminDetailView.as_view(), name='promotion-activity-delete'),
    path('activity/<int:pk>/skus', ActivitySKUView.as_view(), name='promotion-activity-skus'),
]

"""
全局 API 返回码声明 —— 严格遵循 HTTP 标准状态码。

Usage:
    from utils.response_codes import Messages
    from rest_framework import status
    return Response({'detail': Messages.USERNAME_EXISTS}, status=status.HTTP_409_CONFLICT)

所有数字均为 HTTP 标准状态码，不自定义新的 code 编号。
新增 app 时在此文件对应 section 追加消息模板即可。
"""

# ============================================================
# HTTP 状态码声明（文档）
# 实际使用 rest_framework.status 内置常量，此处仅作统一声明
# ============================================================
# HTTP_200_OK                   200   请求成功
# HTTP_201_CREATED              201   资源创建成功
# HTTP_400_BAD_REQUEST          400   请求参数校验失败
# HTTP_401_UNAUTHORIZED         401   未登录 / token 过期
# HTTP_403_FORBIDDEN            403   无权限
# HTTP_404_NOT_FOUND            404   资源不存在
# HTTP_409_CONFLICT             409   资源冲突（重复注册）
# HTTP_429_TOO_MANY_REQUESTS    429   请求频率超限
# HTTP_500_INTERNAL_SERVER_ERROR 500  服务器内部错误


class Messages:
    """
    全局英文返回消息模板。
    按业务域分 section，新增 app 时追加对应 section 即可。
    """

    # ============================================================
    # 通用
    # ============================================================
    SUCCESS = 'ok'
    BAD_REQUEST = 'Bad request.'
    PERMISSION_DENIED = 'You do not have permission to perform this action.'
    NOT_AUTHENTICATED = 'Authentication required. Please log in.'
    NOT_FOUND = 'Resource not found.'
    INTERNAL_ERROR = 'Internal server error. Please try again later.'
    MISSING_SPU_ID = 'spu_id parameter is required.'

    # ============================================================
    # 用户 —— 注册
    # ============================================================
    REGISTER_SUCCESS = 'Registration successful. Please log in.'
    USERNAME_EXISTS = 'This username is already registered. Please log in instead.'
    PHONE_EXISTS = 'This phone number is already registered. Please log in instead.'
    EMAIL_EXISTS = 'This email is already registered. Please log in instead.'
    REGISTER_REQUIRE_CONTACT = 'Either email or phone number is required for registration.'
    REGISTER_REQUIRE_CODE = 'Verification code is required.'

    # ============================================================
    # 用户 —— 登录 / 登出 / 注销
    # ============================================================
    LOGIN_FAILED = 'Invalid username or password.'
    LOGOUT_SUCCESS = 'Logged out successfully.'
    DEACTIVATE_SUCCESS = 'Account deactivated successfully.'

    # ============================================================
    # 用户 —— Profile
    # ============================================================
    PROFILE_UPDATED = 'Profile updated successfully.'
    USERNAME_CHANGE_COOLDOWN = (
        'Username can only be changed once every {days} days. '
        'Next change available after {next_date}.'
    )
    USERNAME_ALREADY_TAKEN = 'This username is already taken.'
    PHONE_ALREADY_TAKEN = 'This phone number is already in use.'

    # ============================================================
    # 用户 —— 验证码（短信 + 邮箱共用）
    # ============================================================
    CODE_SENT = 'Verification code sent.'
    CODE_RATE_LIMITED = 'Please wait {seconds} seconds before requesting a new code.'
    CODE_INVALID = 'Invalid or expired verification code.'
    CODE_VERIFIED = 'Verification successful.'
    CODE_TOO_MANY_ATTEMPTS = 'Too many verification attempts. Please request a new code.'
    # 保留旧名称以兼容
    SMS_CODE_SENT = 'Verification code sent.'
    SMS_RATE_LIMITED = 'Please wait {seconds} seconds before requesting a new code.'
    SMS_CODE_INVALID = 'Invalid or expired verification code.'
    SMS_CODE_VERIFIED = 'Phone number verified successfully.'
    SMS_TOO_MANY_ATTEMPTS = 'Too many verification attempts. Please request a new code.'

    # ============================================================
    # 商品 (Goods)
    # ============================================================
    SPU_NOT_FOUND = 'Product not found.'
    SKU_NOT_FOUND = 'SKU not found.'
    SPU_NOT_PUBLISHED = 'Product is not yet published.'
    SPU_STATUS_INVALID = 'Invalid status transition.'
    SPU_APPROVED_SCHEDULED = 'Approved. Product will go live in {minutes} minutes.'
    SPU_REJECTED = 'Product has been rejected.'
    CATEGORY_DEPTH_EXCEEDED = 'Category depth cannot exceed 3 levels.'
    CATEGORY_CIRCULAR_REF = 'Cannot set parent to itself or its descendants.'
    SPEC_DIMENSION_NOT_ENABLED = 'Spec dimension is not enabled for this SPU.'
    SPEC_VALUE_NOT_ALLOWED = 'Spec value is not within the allowed values for this SPU.'
    SKU_SPEC_DUPLICATE = 'SKU already has a value assigned for this spec dimension.'
    ATTRIBUTE_CATEGORY_MISMATCH = 'Attribute value category does not match SPU category.'
    INVALID_PRODUCT_ID = 'Invalid product ID.'
    INVALID_SKU_ID = 'Invalid SKU ID.'

    # ============================================================
    # Cart (购物车)
    # ============================================================
    CART_ITEM_ADDED = 'Item added to cart.'
    CART_ITEM_UPDATED = 'Cart item updated.'
    CART_ITEM_REMOVED = 'Item removed from cart.'
    CART_ITEM_NOT_FOUND = 'Cart item not found.'
    CART_SELECTED_UPDATED = 'Cart selection updated.'
    CART_FULL = 'Cart is full. Max {max_items} items allowed.'
    INSUFFICIENT_STOCK = 'Insufficient stock.'
    NO_ITEMS_SELECTED = 'No items selected for checkout.'

    # ============================================================
    # Order (订单)
    # ============================================================
    ORDER_NOT_FOUND = 'Order not found.'
    ORDER_CANCELLED = 'Order cancelled.'
    ORDER_CONFIRMED = 'Order confirmed.'
    ORDER_CANNOT_CANCEL = 'Order cannot be cancelled in current status.'
    ORDER_CANNOT_AFTER_SALE = 'Order is not eligible for after-sale service.'

    # ============================================================
    # AfterSale (售后)
    # ============================================================
    AFTER_SALE_SUBMITTED = 'After-sale request submitted.'
    AFTER_SALE_NOT_FOUND = 'After-sale request not found.'
    AFTER_SALE_UNAVAILABLE = 'After-sale service is not available for this order.'
    AFTER_SALE_AMOUNT_EXCEEDED = 'Refund amount exceeds the order actual amount.'

    # ============================================================
    # Address (收货地址)
    # ============================================================
    ADDRESS_NOT_FOUND = 'Address not found.'
    ADDRESS_DELETED = 'Address deleted.'
    ADDRESS_LIMIT_REACHED = 'Address limit reached. Max {max_count} addresses allowed.'

    # ============================================================
    # Payment (支付)
    # ============================================================
    PAYMENT_SUCCESS = 'Payment successful.'
    PAYMENT_FAILED = 'Payment failed.'
    PAYMENT_DUPLICATE = 'Order already paid. Duplicate payment rejected.'
    PAYMENT_UNSUPPORTED_METHOD = 'Unsupported payment method.'
    PAYMENT_GATEWAY_ERROR = 'Payment gateway temporarily unavailable. Please try again later.'
    PAYMENT_AMOUNT_MISMATCH = 'Payment amount does not match order amount.'
    PAYMENT_CURRENCY_MISMATCH = 'Payment currency does not match order currency.'
    PAYMENT_INVALID_SIGNATURE = 'Webhook signature verification failed.'
    PAYMENT_NOT_FOUND = 'Payment record not found.'
    PAYMENT_INVALID_BODY = 'Invalid webhook body.'
    PAYMENT_INVALID_PAYLOAD = 'Invalid webhook payload.'
    ORDER_CANNOT_PAY = 'Order cannot be paid in current status.'
    ORDER_ALREADY_PAID = 'Order has already been paid.'
    ORDER_CANCELLED_CANNOT_PAY = 'Order has been cancelled and cannot be paid.'

    # ============================================================
    # Review (商品评价)
    # ============================================================
    REVIEW_ALREADY_EXISTS = 'You have already reviewed this item.'
    REVIEW_NOT_PURCHASED = 'You have not purchased this item.'
    REVIEW_ORDER_NOT_DELIVERED = 'Order has not been delivered yet.'
    REVIEW_NOT_FOUND = 'Review not found.'
    REVIEW_ALREADY_EDITED = 'Review can only be edited once.'

    # ============================================================
    # Logistics (物流)
    # ============================================================
    SHIPMENT_NOT_FOUND = 'Shipment not found.'

    # ============================================================
    # Notification (消息通知)
    # ============================================================
    NOTIFICATION_READ = 'Notification marked as read.'
    NOTIFICATION_ALL_READ = 'All notifications marked as read.'

    # ============================================================
    # Promotion (优惠券)
    # ============================================================
    COUPON_NOT_FOUND = 'Coupon not found.'
    COUPON_UNAVAILABLE = 'Coupon is not available.'
    COUPON_LIMIT_REACHED = 'You have reached the claim limit for this coupon.'
    COUPON_CLAIMED = 'Coupon claimed successfully.'
    COUPON_INVALID = 'Coupon is invalid or already used.'
    COUPON_EXPIRED = 'Coupon has expired.'

    # ============================================================
    # Favorite (收藏)
    # ============================================================
    FAVORITE_ADDED = 'Added to favorites.'
    FAVORITE_REMOVED = 'Removed from favorites.'
    FAVORITES_LIMIT_REACHED = 'Favorites limit reached. Max {max_count} items allowed.'

    # ============================================================
    # Admin (管理后台)
    # ============================================================
    ADMIN_NOT_STAFF = 'You do not have admin access.'
    ADMIN_GROUP_NOT_FOUND = 'Admin group not found.'
    ADMIN_GROUP_MEMBER_EXISTS = 'User is already a member of this group.'
    ADMIN_APPLICATION_NOT_FOUND = 'Application not found.'
    ADMIN_APPLICATION_ALREADY_REVIEWED = 'Application has already been reviewed.'
    ADMIN_SPU_NOT_IN_GROUP = 'SPU does not belong to your managed categories.'
    ADMIN_SPU_AUDIT_NOT_ALLOWED = 'Only group leaders can audit SPUs.'
    ADMIN_CATEGORY_HAS_CHILDREN = 'Cannot delete category with child categories.'
    ADMIN_CATEGORY_HAS_SPUS = 'Cannot delete category with associated SPUs.'
    ADMIN_BATCH_IN_PROGRESS = 'Batch operation is in progress. Check task status.'
    ADMIN_TASK_NOT_FOUND = 'Task not found.'
    ADMIN_STOCK_ALERT = 'SKU stock below alert threshold.'
    ADMIN_SCHEDULED_PUBLISH_SET = 'Scheduled publish time set.'
    ADMIN_DUPLICATE_SUCCESS = 'SPU duplicated successfully.'
    ADMIN_LEADER_CHANGE_NOT_ALLOWED = 'You can only change the leader of your own group.'
    ADMIN_LOGIN_FAILED = 'Invalid username or password.'
    ADMIN_APPLICATION_TYPE_INVALID = 'Invalid application type.'
    ADMIN_GROUP_NOT_EMPTY = 'Cannot delete group with active members.'
    ADMIN_IMPORT_INVALID_FORMAT = 'Invalid file format. Please upload CSV.'
    ADMIN_IMPORT_PREVIEW_FAILED = 'Import preview failed. Check file format.'
    ADMIN_IMPORT_NO_DATA = 'No valid data rows found in file.'
    ADMIN_INVALID_ACTION = 'Invalid action.'


# ============================================================
# 错误码注册表（统一来源）
# ============================================================
# 注意：业务错误码已统一迁移至 utils.exceptions.ErrorCodes（单一事实来源），
# 其值为 (code, http_status, default_message, category) 元组，并由统一的异常类层次携带。
# 此处重新导出，保证 `from utils.response_codes import ErrorCodes` 的历史 import 仍可用。
# 旧式 ERR_* 字符串常量不再维护，请改用 utils.exceptions.ErrorCodes.*。
from utils.exceptions import ErrorCodes  # noqa: F401  # re-export unified registry

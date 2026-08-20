from django.apps import AppConfig


class WechatMpConfig(AppConfig):
    """微信小程序后端占位 App。

    当前仅作为 API 命名空间占位（/api/v1/wechat_mp/），
    真实的小程序业务能力（登录 code2session、AccessToken 管理、
    订阅消息推送、与商城订单/购物车同步等）尚未实现，
    请在后续迭代中补充 services / views / urls。
    """

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.wechat_mp'

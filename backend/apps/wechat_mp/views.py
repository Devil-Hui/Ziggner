"""微信小程序后端 — 占位视图。

TODO（后续迭代补全）:
- 微信小程序登录：code2session 换取 openid / unionid，绑定本地账户
- AccessToken 管理与缓存
- 订阅消息 / 模板消息推送（订单状态变更等）
- 与商城购物车、订单的数据同步
"""
import logging

from django.http import JsonResponse

logger = logging.getLogger('biz')


def placeholder(request):
    """GET /api/v1/wechat_mp/ — 微信小程序接口占位。

    返回 501 Not Implemented，明确告知调用方该命名空间已预留但尚未实现。
    """
    return JsonResponse(
        {
            "platform": "wechat_mp",
            "status": "not_implemented",
            "message": "微信小程序后端接口尚未实现（占位）。",
            "note": "本端点仅用于预留 /api/v1/wechat_mp/ 命名空间；"
                    "具体的小程序登录、订单同步、订阅消息等能力待后续迭代补充。",
        },
        status=501,
    )

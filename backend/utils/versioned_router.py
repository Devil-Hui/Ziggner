"""
API 版本路由 — 支持视图级版本化，允许 /api/v1/ 和 /api/v2/ 独立演进。

用法:
    from utils.versioned_router import VersionedAPIRouter

    router = VersionedAPIRouter()
    # v1: 使用旧版视图
    router.register_v1("users", apps.users.views.old_viewset)
    # v2: 使用新版视图
    router.register_v2("users", apps.users.views.new_viewset)
    # 或者注册所有版本共享同一视图（当前兼容模式）
    router.register("users", "apps.users.urls")

然后在 project/urls.py 中:
    urlpatterns += router.get_urlpatterns()
"""
from django.urls import path, include

# 当前项目使用的 API 版本常量
API_VERSIONS = ("v1",)  # 当前只有 v1，未来添加 "v2"


class VersionedAPIRouter:
    """
    支持多版本的 API 路由器。

    两种注册方式:
    1. router.register("users", "apps.users.urls") — 所有版本共享相同 URL conf
       （当前项目所有 app 都使用这种方式，保持向后兼容）

    2. router.register_v1("users", v1_urls) / router.register_v2("users", v2_urls)
       — 不同版本使用不同的 URL conf，版本间完全解耦
    """

    def __init__(self):
        self._shared = {}   # app_name -> url_conf (所有版本共享)
        self._v1_only = {}  # app_name -> url_conf (仅 v1)
        self._v2_only = {}  # app_name -> url_conf (仅 v2)

    def register(self, app_name: str, url_conf: str):
        """注册一个在所有当前版本中共用的路由"""
        self._shared[app_name] = url_conf

    def register_v1(self, app_name: str, url_conf: str):
        """注册仅在 v1 中使用的路由（v2 有不同实现时使用）"""
        self._v1_only[app_name] = url_conf

    def register_v2(self, app_name: str, url_conf: str):
        """注册仅在 v2 中使用的路由（为未来 v2 准备）"""
        self._v2_only[app_name] = url_conf

    def _get_urls_for_version(self, prefix: str, version: str) -> list:
        """
        获取指定版本的 URL 列表。

        优先级: version-specific > shared
        - 如果该 app 有 version-specific 路由，使用它
        - 否则使用 shared 路由
        """
        version_map = {
            "v1": self._v1_only,
            "v2": self._v2_only,
        }
        specific = version_map.get(version, {})

        urls = []
        # 先注册共享路由
        for app_name, url_conf in self._shared.items():
            urls.append(path(f"{prefix}/{app_name}/", include(url_conf)))
        # 再注册版本特有路由（覆盖共享路由中的同名 app）
        for app_name, url_conf in specific.items():
            urls.append(path(f"{prefix}/{app_name}/", include(url_conf)))
        return urls

    def get_urlpatterns(self) -> list:
        """生成所有版本的 URL pattern 列表。

        仅挂载带版本前缀的 /api/v1/* —— 无前缀旧版 /api/* 已于 v1.0 全面废弃
        （前端 request.ts BASE_URL=/api/v1、.env.production 显式 /api/v1），
        删除旧挂载避免新旧双路径并存导致的路由/文档/权限歧义。
        """
        urlpatterns = []
        # v1 版本路由（唯一对外路径）
        urlpatterns.extend(self._get_urls_for_version("api/v1", "v1"))
        return urlpatterns

    def get_app_list(self) -> list:
        """返回所有已注册的 app 列表信息"""
        return [
            {"name": name, "shared": True}
            for name in self._shared
        ] + [
            {"name": name, "version": "v1"}
            for name in self._v1_only
        ]


# 全局实例（可被 project/urls.py 导入）
router = VersionedAPIRouter()

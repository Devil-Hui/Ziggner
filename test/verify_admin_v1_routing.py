"""Verify the new admin endpoints resolve under BOTH /api/admin/ and
/api/v1/admin/ prefixes, matching the exact relative paths the frontend sends.

Frontend request.ts uses BASE_URL='/api/v1', so relative admin calls
(e.g. get('/admin/groups/')) resolve to /api/v1/admin/groups/. This proves
those paths hit the intended admin views via Django's real resolver.
"""
import sys
import types
from pathlib import Path

BACKEND = Path(r"d:/下载/浏览器下载/change/Ziggner/Ziggner/backend")
TESTDIR = Path(r"d:/下载/浏览器下载/change/Ziggner/Ziggner/test")
sys.path.insert(0, str(BACKEND))
sys.path.insert(0, str(TESTDIR))

def make_stub(name, classes):
    mod = types.ModuleType(name)
    for c in classes:
        def dummy_as_view(cls):
            def view(request, *a, **k):
                return None
            return view
        mod.__dict__[c] = type(c, (), {"as_view": classmethod(dummy_as_view)})
    sys.modules[name] = mod

make_stub("apps.users.admin_views",
          ["AdminUserCreateView", "AdminUserListView", "AdminUserRoleView"])
make_stub("apps.goods.admin_views",
          ["AdminGroupListView", "AdminGroupCreateView", "AdminGroupMembersView",
           "AdminGroupUpdateView", "AdminGroupDeleteView"])

# Temp urlconf mirroring the mounts added to project/urls.py.
CONF = TESTDIR / "_tmp_admin_urls_conf.py"
CONF.write_text(
    "from django.urls import path, include\n"
    "urlpatterns = [\n"
    "    path('api/admin/users/', include('apps.users.admin_urls')),\n"
    "    path('api/admin/groups/', include('apps.goods.admin_urls')),\n"
    "    path('api/v1/admin/users/', include('apps.users.admin_urls')),\n"
    "    path('api/v1/admin/groups/', include('apps.goods.admin_urls')),\n"
    "]\n"
)

import django
from django.conf import settings
settings.configure(DEBUG=True, ALLOWED_HOSTS=["*"], ROOT_URLCONF="_tmp_admin_urls_conf")
django.setup()

from django.urls import resolve

tests = [
    "/api/v1/admin/groups/",
    "/api/v1/admin/groups/create/",
    "/api/v1/admin/groups/abc-x1/members",
    "/api/v1/admin/groups/abc-x1/members/ZG-1234567890ABCDEF",
    "/api/v1/admin/groups/abc-x1/update",
    "/api/v1/admin/groups/abc-x1/delete",
    "/api/v1/admin/users/create/",
    "/api/v1/admin/users/",
    "/api/v1/admin/users/ZG-1234567890ABCDEF/roles",
    "/api/admin/groups/",
    "/api/admin/users/create/",
]
ok = True
for t in tests:
    try:
        m = resolve(t)
        print(f"OK   {t:55s} -> {m.func.__name__}  kwargs={m.kwargs}")
    except Exception as e:
        ok = False
        print(f"FAIL {t:55s} -> {e!r}")
print("\nRESULT:", "ALL RESOLVED" if ok else "FAILURES PRESENT")
sys.exit(0 if ok else 1)

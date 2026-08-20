#!/usr/bin/env python3
"""
Ziggner OpenAPI 安全导出后处理脚本。

用法：
  python manage.py spectacular > /tmp/schema_raw.yml
  python scripts/export_safe_openapi.py /tmp/schema_raw.yml docs/api/ziggner-openapi-safe.yml

安全规范（大厂导出标准）：
  1. servers.url 使用 {{base_url}} 占位，不写死生产域名；
  2. 全局 example/default 脱敏（手机号/邮箱/密码/令牌/身份证/价格）；
  3. securitySchemes 声明认证方式但不内置测试 Token；
  4. 排除 /metrics /health /ops 等内部运维路径；
  5. tags 映射中文子系统分组。
"""
import os
import sys
import yaml

SENSITIVE_KEYS = ('password', 'passwd', 'pwd', 'secret', 'api_key', 'apikey',
                  'token', 'app_secret')
PHONE_KEYS = ('phone', 'mobile')
EMAIL_KEYS = ('email', 'mail')
ID_KEYS = ('id_card', 'idcard', 'identity')
PRICE_KEYS = ('price', 'amount', 'max_discount')
INTERNAL_PATH_MARKERS = ('/ops', '/metrics', '/health')

TAG_CN = {
    'users': '用户权限', 'rbac': '用户权限', 'social': '用户权限', 'groups': '用户权限',
    'goods': '商品运营', 'category': '商品运营',
    'order': '交易履约', 'payment': '交易履约', 'cart': '交易履约', 'logistics': '交易履约',
    'promotion': '促销营销', 'coupon': '促销营销',
    'review': '运营辅助', 'notification': '运营辅助', 'tracking': '运营辅助', 'lovegoods': '运营辅助',
    'address': '用户权限', 'support': '客户服务', 'chat': '客户服务', 'customer_service': '客户服务',
}

# 资源中文名（用于生成接口中文摘要 summary）
RES_CN = {
    'address': '收货地址', 'cart': '购物车', 'goods': '商品', 'category': '类目',
    'brand': '品牌', 'tag': '标签', 'sku': 'SKU', 'spu': '商品', 'order': '订单',
    'payment': '支付', 'review': '评价', 'notification': '通知', 'promotion': '优惠券',
    'coupon': '优惠券', 'activity': '活动', 'lovegoods': '收藏', 'tracking': '浏览历史',
    'logistics': '物流', 'support': '客服会话', 'chat': '客服', 'conversation': '会话',
    'message': '消息', 'users': '用户', 'social': '社交账号', 'session': '会话',
    'rbac': '权限', 'matrix': '权限矩阵', 'role': '角色', 'application': '申请',
    'audit_log': '审计日志', 'recycle': '回收站', 'media': '媒体资源', 'group': '管理组',
    'task': '任务', 'staff': '运营人员', 'groups': '管理组', 'aftersale': '售后',
    'import': '导入', 'export': '导出', 'upload': '上传', 'favorite': '收藏',
    'coupons': '优惠券', 'track': '物流', 'download': '下载', 'about': '关于',
    'reviewable': '可评价', 'my': '我的', 'admin': '管理后台',
}

# 路径动作词 → 中文动作（用于生成 summary）
ACTION_CN = [
    ('create', '创建'), ('update', '更新'), ('delete', '删除'), ('remove', '移除'),
    ('audit', '审核'), ('shelf', '上下架'), ('batch', '批量'), ('checkout', '结算'),
    ('claim', '领取'), ('detail', '详情'), ('list', '列表'), ('login', '登录'),
    ('register', '注册'), ('refresh', '刷新'), ('logout', '登出'), ('cancel', '取消'),
    ('confirm', '确认收货'), ('submit', '提交'), ('review', '审核/评价'), ('ship', '发货'),
    ('refund', '退款'), ('restore', '恢复'), ('duplicate', '复制'), ('schedule', '定时上架'),
    ('migrate', '迁移'), ('assign', '分配'), ('set', '设置'), ('toggle', '切换'),
    ('read_all', '全部已读'), ('unread_count', '未读数'), ('mark', '标记'),
    ('search', '搜索'), ('suggest', '搜索建议'), ('stats', '统计'), ('tree', '树'),
    ('subtree', '子树'), ('pending', '待审核'), ('my', '我的'), ('sync', '同步'),
    ('verify', '验证'), ('send', '发送'), ('providers', '第三方登录源'),
]

METHOD_VERB = {'get': '获取', 'post': '提交', 'put': '更新', 'patch': '更新', 'delete': '删除'}


def derive_tag(path: str) -> str:
    """按路径推导中文子系统分组（/api/v1/{app}/... → 中文子系统）。"""
    segs = [s for s in path.split('/') if s and s != 'api' and s != 'v1']
    app = segs[0] if segs else 'other'
    if app == 'admin':  # /api/v1/admin/groups|users → 用户权限（管理后台）
        app = segs[1] if len(segs) > 1 else 'admin'
    return TAG_CN.get(app, '其他')


def derive_summary(path: str, method: str, op: dict) -> str:
    """生成接口中文摘要：优先 description 首行（中文且非基类 docstring）；否则由路径动作词+资源名推导。"""
    desc = (op.get('description') or '').strip()
    if desc:
        first = desc.split('\n')[0].strip().strip('。.')
        is_cn = any('\u4e00' <= c <= '\u9fff' for c in first)
        if (first and is_cn and len(first) <= 36
                and '基类' not in first and '基础视图' not in first and '兼容接口' not in first):
            return first
    segs = [s for s in path.split('/') if s and s != 'api' and s != 'v1']
    app = segs[0] if segs else ''
    if app == 'admin':
        app = segs[1] if len(segs) > 1 else 'admin'
    action = None
    for kw, cn in ACTION_CN:
        if kw in path.lower():
            action = cn
            break
    verb = METHOD_VERB.get(method, '操作')
    res = RES_CN.get(app, app)
    if action:
        return f'{action}{res}'
    return f'{verb}{res}'


def mask_value(field: str, value):
    if value is None:
        return value
    fl = field.lower()
    if any(k in fl for k in SENSITIVE_KEYS):
        return '********'
    if any(k in fl for k in PHONE_KEYS):
        return '13800138000'
    if fl in EMAIL_KEYS or fl.endswith('_email'):
        return 'test@example.com'
    if any(k in fl for k in ID_KEYS):
        return '110101199001011234'
    if any(k in fl for k in PRICE_KEYS):
        try:
            return int(value)
        except (TypeError, ValueError):
            return value
    return value


def mask_schema(schema):
    if not isinstance(schema, dict):
        return schema
    for k, v in schema.items():
        if k == 'example' and v is not None:
            schema[k] = mask_value(schema.get('title') or '', v)
        elif k == 'default' and v is not None and not isinstance(v, (dict, list)):
            schema[k] = mask_value(schema.get('title') or '', v)
        elif k == 'properties' and isinstance(v, dict):
            for pname, psch in v.items():
                if isinstance(psch, dict):
                    if 'example' in psch and psch['example'] is not None:
                        psch['example'] = mask_value(pname, psch['example'])
                    if 'default' in psch and psch['default'] is not None and not isinstance(psch['default'], (dict, list)):
                        psch['default'] = mask_value(pname, psch['default'])
                    if 'items' in psch and isinstance(psch['items'], dict):
                        psch['items'] = mask_schema(psch['items'])
        elif k == 'items' and isinstance(v, dict):
            schema[k] = mask_schema(v)
        elif k in ('oneOf', 'anyOf', 'allOf'):
            for sub in v:
                mask_schema(sub)
    return schema


def main():
    raw_path, out_path = sys.argv[1], sys.argv[2]
    with open(raw_path, encoding='utf-8') as f:
        doc = yaml.safe_load(f)

    doc['openapi'] = '3.0.3'
    doc['servers'] = [{'url': '{{base_url}}',
                       'description': '由导入方配置（本地/开发/预发布），禁止使用生产域名直连'}]

    info = doc.get('info', {})
    info['version'] = os.environ.get('APP_VERSION', 'v1.0.0')
    info['description'] = (info.get('description') or '') + (
        '\n\n## 安全导出声明\n'
        '- 本文件为脱敏导出：所有示例数据均为虚构，禁止用于生产联调。\n'
        '- servers.url 使用 {{base_url}} 占位，导入方需自行配置环境变量。\n'
        '- 认证：Bearer JWT / Cookie 会话 / Admin Token 均不内置测试凭据，请通过环境变量动态获取。\n'
        '- 不含任何内部运维路径、连接串或云厂商凭据。')
    doc['info'] = info

    components = doc.get('components', {})
    if 'schemas' in components:
        for name in components['schemas']:
            components['schemas'][name] = mask_schema(components['schemas'][name])

    # 排除内部运维路径
    doc['paths'] = {p: v for p, v in doc.get('paths', {}).items()
                    if not any(m in p for m in INTERNAL_PATH_MARKERS)}

    for path, item in doc['paths'].items():
        for method, op in (item or {}).items():
            if not isinstance(op, dict):
                continue
            for param in op.get('parameters') or []:
                if isinstance(param, dict) and isinstance(param.get('schema'), dict):
                    param['schema'] = mask_schema(param['schema'])
                if isinstance(param, dict) and param.get('example') is not None:
                    param['example'] = mask_value(param.get('name') or '', param['example'])
            rb = op.get('requestBody') or {}
            for cval in (rb.get('content') or {}).values():
                if isinstance(cval, dict) and isinstance(cval.get('schema'), dict):
                    cval['schema'] = mask_schema(cval['schema'])

    ss = components.setdefault('securitySchemes', {})
    for name, sch in ss.items():
        desc = sch.get('description', '')
        if 'Bearer' in desc or 'JWT' in desc:
            sch['description'] = desc + ' 不内置测试 Token，请通过环境变量 {{jwt_token}} 动态获取。'
        elif 'Cookie' in desc:
            sch['description'] = desc + ' CSRF Token 由登录后 Cookie 自动携带，无需手动配置。'

    # 接口分组与中文摘要：tags 按路径重映射为中文子系统；每个接口生成中文 summary
    used_tags = set()
    for path, item in doc['paths'].items():
        for method, op in (item or {}).items():
            if not isinstance(op, dict):
                continue
            tag = derive_tag(path)
            op['tags'] = [tag]
            used_tags.add(tag)
            # 中文接口名（Apifox/Postman 显示 summary）
            if not op.get('summary'):
                op['summary'] = derive_summary(path, method, op)
    # 顶层 tags 列表用中文子系统名
    doc['tags'] = [{'name': t, 'description': f'{t}子系统（Ziggner）'} for t in sorted(used_tags)]

    with open(out_path, 'w', encoding='utf-8') as f:
        yaml.safe_dump(doc, f, allow_unicode=True, sort_keys=False, width=120)

    print(f'OK: {len(doc["paths"])} paths, {len(components.get("schemas", {}))} schemas → {out_path}')


if __name__ == '__main__':
    main()

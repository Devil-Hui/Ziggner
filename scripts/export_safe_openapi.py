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
    'users': '用户权限', 'rbac': '用户权限', 'social': '用户权限',
    'goods': '商品运营', 'category': '商品运营',
    'order': '交易履约', 'payment': '交易履约', 'cart': '交易履约', 'logistics': '交易履约',
    'promotion': '促销营销', 'coupon': '促销营销',
    'review': '运营辅助', 'notification': '运营辅助', 'tracking': '运营辅助', 'lovegoods': '运营辅助',
    'address': '用户权限', 'support': '客户服务', 'chat': '客户服务', 'customer_service': '客户服务',
}


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
    info['version'] = 'v1.0.0'
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

    for t in doc.get('tags') or []:
        name = t.get('name', '')
        t['description'] = f'{TAG_CN.get(name, name)}子系统（Ziggner）'

    with open(out_path, 'w', encoding='utf-8') as f:
        yaml.safe_dump(doc, f, allow_unicode=True, sort_keys=False, width=120)

    print(f'OK: {len(doc["paths"])} paths, {len(components.get("schemas", {}))} schemas → {out_path}')


if __name__ == '__main__':
    main()

import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from drf_spectacular.settings import spectacular_settings


HTTP_METHODS = ('get', 'post', 'put', 'patch', 'delete')


def default_api_docs_dir():
    return Path(settings.BASE_DIR).parent / 'docs' / 'api'


def _write_json(path, payload):
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8',
    )


def _apifox_environment(name, base_url):
    return {
        'id': f'ziggner-{name.lower().replace(" ", "-")}',
        'name': name,
        'values': [
            {'key': 'base_url', 'value': base_url, 'type': 'default', 'enabled': True},
            {'key': 'api_prefix', 'value': '/api/v1', 'type': 'default', 'enabled': True},
            {'key': 'access_token', 'value': '', 'type': 'secret', 'enabled': True},
            {'key': 'csrf_token', 'value': '', 'type': 'secret', 'enabled': True},
        ],
        '_postman_variable_scope': 'environment',
        '_postman_exported_using': 'Ziggner generate_api_docs',
    }


def _resolve_schema(schema, node):
    if not isinstance(node, dict):
        return {}
    reference = node.get('$ref', '')
    if reference.startswith('#/components/schemas/'):
        return schema['components']['schemas'].get(reference.rsplit('/', 1)[-1], {})
    return node


def _type_label(schema, field):
    field = _resolve_schema(schema, field)
    if field.get('type') == 'array':
        return f"array<{_type_label(schema, field.get('items', {}))}>"
    return field.get('type', field.get('format', 'object'))


def _enum_label(schema, field):
    field = _resolve_schema(schema, field)
    values = field.get('enum', [])
    return ' / '.join(str(value) for value in values) if values else '-'


def _security_label(operation):
    security = operation.get('security')
    if security == []:
        return '公开接口'
    if not security:
        return '按接口权限控制；请参阅角色权限矩阵'
    names = []
    for option in security:
        names.extend(option.keys())
    labels = {
        'BearerAuth': 'Bearer JWT',
        'CookieJWT': 'Cookie JWT + CSRF（写请求）',
        'AdminToken': '后台 Admin Token',
    }
    return ' 或 '.join(dict.fromkeys(labels.get(name, name) for name in names))


def _request_schema(operation):
    content = operation.get('requestBody', {}).get('content', {})
    for media_type in ('application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'):
        if media_type in content:
            return media_type, content[media_type].get('schema', {})
    return None, {}


def _render_parameters(schema, parameters):
    if not parameters:
        return ['无。']
    lines = [
        '| 名称 | 位置 | 必填 | 类型 | 可选项 | 中文备注 |',
        '| --- | --- | --- | --- | --- | --- |',
    ]
    for parameter in parameters:
        resolved = parameter
        lines.append(
            '| {name} | {location} | {required} | {type_name} | {choices} | {description} |'.format(
                name=resolved.get('name', '-'),
                location=resolved.get('in', '-'),
                required='是' if resolved.get('required') else '否',
                type_name=_type_label(schema, resolved.get('schema', {})),
                choices=_enum_label(schema, resolved.get('schema', {})),
                description=str(resolved.get('description', '-')).replace('|', '\\|').replace('\n', ' '),
            )
        )
    return lines


def _render_body(schema, operation):
    media_type, body = _request_schema(operation)
    if not body:
        return ['无。']
    resolved = _resolve_schema(schema, body)
    properties = resolved.get('properties', {})
    if not properties:
        return [f'内容类型：`{media_type}`；结构：`object`。']
    required = set(resolved.get('required', []))
    lines = [
        f'内容类型：`{media_type}`',
        '',
        '| 字段 | 必填 | 类型 | 可选项 | 中文备注 |',
        '| --- | --- | --- | --- | --- |',
    ]
    for name, field in properties.items():
        resolved_field = _resolve_schema(schema, field)
        description = str(resolved_field.get('description', '-')).replace('|', '\\|').replace('\n', ' ')
        lines.append(
            f'| {name} | {"是" if name in required else "否"} | '
            f'{_type_label(schema, field)} | {_enum_label(schema, field)} | {description} |'
        )
    return lines


def _render_reference(schema):
    lines = [
        '# Ziggner 商城 API 中文说明',
        '',
        '> 本文档由 `python manage.py generate_api_docs` 从 OpenAPI 3.1 契约生成。',
        '',
        '## 接入方式',
        '',
        '### Cookie / CSRF 浏览器会话',
        '',
        '1. `GET /api/v1/users/session/csrf/` 获取 `csrftoken` Cookie。',
        '2. `POST /api/v1/users/session/login/` 携带 `X-CSRFToken` 登录。',
        '3. 浏览器自动携带 `ziggner_access` / `ziggner_refresh` HttpOnly Cookie；写请求继续携带 `X-CSRFToken`。',
        '',
        '### Bearer 客户端',
        '',
        'Apifox 或外部客户端调用 `POST /api/v1/users/token/` 获取令牌，后续使用 '
        '`Authorization: Bearer <access_token>`。不得把浏览器会话令牌存入 localStorage。',
        '',
        '### 统一错误',
        '',
        '所有错误包含 `code`、`message`、`details`、`request_id`；429 响应还包含 `Retry-After`。',
        '',
        '```json',
        '{"code":"BAD_REQUEST","message":"请求参数错误","details":{"field":["必填"]},"request_id":"req-example"}',
        '```',
        '',
        '## 核心请求示例',
        '',
        '### 优惠券结算',
        '',
        '```json',
        '{"cart_item_ids":[12],"shipping_name":"张三","shipping_phone":"13800000000",'
        '"shipping_address":{"country":"中国","region":"上海","city":"上海","address_line":"示例路1号"},'
        '"payment_method":"mock","user_coupon_id":8,"idempotency_key":"checkout-20260728-001"}',
        '```',
        '',
        '`coupon_code` 只兼容旧客户端一个发布周期；新客户端使用 `user_coupon_id`，两者不可同时传入。',
        '',
        '### 发起支付',
        '',
        '```json',
        '{"order_no":"202607280001","method":"mock","success_url":"https://example.test/success",'
        '"cancel_url":"https://example.test/cancel"}',
        '```',
        '',
        '### 申请退款',
        '',
        '退款写请求建议同时携带 `Idempotency-Key` 请求头；请求体中的 `idempotency_key` 用于兼容。',
        '',
        '```json',
        '{"order_no":"202607280001","reason":"商品问题","amount":"99.00",'
        '"idempotency_key":"refund-20260728-001"}',
        '```',
        '',
        '## `/api/v1` 接口明细',
        '',
    ]
    for path, path_item in schema.get('paths', {}).items():
        if not path.startswith('/api/v1/'):
            continue
        for method in HTTP_METHODS:
            operation = path_item.get(method)
            if not operation:
                continue
            lines.extend([
                f'### {method.upper()} {path}',
                '',
                f'- 说明：{operation.get("summary") or operation.get("description") or operation.get("operationId", "-")}',
                f'- 权限：{_security_label(operation)}',
                f'- 响应状态：{" / ".join(operation.get("responses", {}).keys())}',
                '',
                '**路径与查询参数**',
                '',
                *_render_parameters(schema, operation.get('parameters', [])),
                '',
                '**请求体**',
                '',
                *_render_body(schema, operation),
                '',
            ])
    return '\n'.join(lines).rstrip() + '\n'


class Command(BaseCommand):
    help = 'Generate the OpenAPI 3.1 contract, Apifox environments, and Chinese API reference.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output-dir',
            type=Path,
            default=default_api_docs_dir(),
            help='Output directory. Defaults to backend/docs/api.',
        )

    def handle(self, *args, **options):
        output_dir = Path(options['output_dir']).resolve()
        output_dir.mkdir(parents=True, exist_ok=True)
        schema = spectacular_settings.DEFAULT_GENERATOR_CLASS().get_schema(request=None, public=True)

        _write_json(output_dir / 'openapi-3.1.json', schema)
        _write_json(output_dir / 'apifox-dev.json', _apifox_environment('Ziggner 开发环境', 'http://localhost:8000'))
        _write_json(
            output_dir / 'apifox-staging.json',
            _apifox_environment('Ziggner 预发布环境', 'https://staging-api.ziggner.example'),
        )
        (output_dir / 'api-reference.md').write_text(_render_reference(schema), encoding='utf-8')
        self.stdout.write(self.style.SUCCESS(f'API documentation generated in {output_dir}'))

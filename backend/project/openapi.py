"""OpenAPI customisation kept separate from request handling code."""

from copy import deepcopy
import re

from drf_spectacular.extensions import (
    OpenApiAuthenticationExtension,
    OpenApiSerializerExtension,
    OpenApiSerializerFieldExtension,
    OpenApiViewExtension,
)
from drf_spectacular.generators import SchemaGenerator
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema
from rest_framework import serializers


class ZiggnerSchemaGenerator(SchemaGenerator):
    """Load all project schema extensions before endpoint introspection."""


class SerializerMethodFieldSchema(OpenApiSerializerFieldExtension):
    """Describe computed fields without coupling business serializers to schema tooling."""

    target_class = 'rest_framework.fields.SerializerMethodField'
    priority = 1

    _INTEGER_METHODS = {
        'get_item_count',
        'get_payment_remaining_seconds',
        'get_unread_count',
    }
    _OBJECT_METHODS = {
        'get_card_data',
        'get_last_message',
        'get_spu_info',
    }
    _OBJECT_LIST_METHODS = {
        'get_replies',
        'get_spec_values',
    }
    _DECIMAL_METHODS = {'get_min_price'}

    def map_serializer_field(self, auto_schema, direction):
        method_name = self.target.method_name or f'get_{self.target.field_name}'
        if method_name in self._INTEGER_METHODS:
            return {'type': 'integer'}
        if method_name in self._OBJECT_METHODS:
            return {'type': ['object', 'null'], 'additionalProperties': {}}
        if method_name in self._OBJECT_LIST_METHODS:
            return {
                'type': 'array',
                'items': {'type': 'object', 'additionalProperties': {}},
            }
        if method_name in self._DECIMAL_METHODS:
            return {'type': ['string', 'null'], 'format': 'decimal'}
        return {'type': 'string'}


class UsersJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = 'utils.api_jwt_authentication.UsersJWTAuthentication'
    name = 'BearerAuth'
    priority = 1

    def get_security_definition(self, auto_schema):
        return deepcopy(_SECURITY_SCHEMES['BearerAuth'])


class CookieJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = 'apps.users.session_auth.CookieJWTAuthentication'
    name = 'CookieJWT'
    priority = 1

    def get_security_definition(self, auto_schema):
        return deepcopy(_SECURITY_SCHEMES['CookieJWT'])


class AdminTokenAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = 'utils.admin_authentication.ExpiringTokenAuthentication'
    name = 'AdminToken'
    priority = 1

    def get_security_definition(self, auto_schema):
        return deepcopy(_SECURITY_SCHEMES['AdminToken'])


class SupportConversationListSerializerSchema(OpenApiSerializerExtension):
    target_class = 'apps.support.serializers.ConversationListSerializer'

    def get_name(self, auto_schema, direction):
        return 'SupportConversationList'


class SupportCreateConversationSerializerSchema(OpenApiSerializerExtension):
    target_class = 'apps.support.serializers.CreateConversationSerializer'

    def get_name(self, auto_schema, direction):
        return 'SupportCreateConversation'


class SupportConversationDetailSerializerSchema(OpenApiSerializerExtension):
    target_class = 'apps.support.serializers.ConversationDetailSerializer'

    def get_name(self, auto_schema, direction):
        return 'SupportConversationDetail'


class SupportSendMessageSerializerSchema(OpenApiSerializerExtension):
    target_class = 'apps.support.serializers.SendMessageSerializer'

    def get_name(self, auto_schema, direction):
        return 'SupportSendMessage'


class SupportMessageSerializerSchema(OpenApiSerializerExtension):
    target_class = 'apps.support.serializers.MessageSerializer'

    def get_name(self, auto_schema, direction):
        return 'SupportMessage'


class BrowserLoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, help_text='用户名或登录标识。')
    password = serializers.CharField(write_only=True, help_text='用户密码。')


_CSRF_HEADER_PARAMETER = OpenApiParameter(
    name='X-CSRFToken',
    type=OpenApiTypes.STR,
    location=OpenApiParameter.HEADER,
    required=True,
    description='先获取 csrftoken Cookie，再将其值写入此请求头。',
)


class CSRFCookieViewSchema(OpenApiViewExtension):
    target_class = 'apps.users.session_auth.CSRFCookieView'

    def view_replacement(self):
        class SchemaView(self.target_class):
            @extend_schema(
                request=None,
                responses={204: OpenApiResponse(description='已设置 csrftoken Cookie。')},
            )
            def get(self, request, *args, **kwargs):
                return super().get(request, *args, **kwargs)

        return SchemaView


class BrowserLoginViewSchema(OpenApiViewExtension):
    target_class = 'apps.users.session_auth.BrowserLoginView'

    def view_replacement(self):
        class SchemaView(self.target_class):
            @extend_schema(
                request=BrowserLoginSerializer,
                parameters=[_CSRF_HEADER_PARAMETER],
                responses={200: OpenApiResponse(description='登录成功，并设置两个 HttpOnly 认证 Cookie。')},
            )
            def post(self, request, *args, **kwargs):
                return super().post(request, *args, **kwargs)

        return SchemaView


class BrowserRefreshViewSchema(OpenApiViewExtension):
    target_class = 'apps.users.session_auth.BrowserRefreshView'

    def view_replacement(self):
        class SchemaView(self.target_class):
            @extend_schema(
                request=None,
                parameters=[_CSRF_HEADER_PARAMETER],
                responses={200: OpenApiResponse(description='会话已续期，并更新 HttpOnly Cookie。')},
            )
            def post(self, request, *args, **kwargs):
                return super().post(request, *args, **kwargs)

        return SchemaView


class BrowserLogoutViewSchema(OpenApiViewExtension):
    target_class = 'apps.users.session_auth.BrowserLogoutView'

    def view_replacement(self):
        class SchemaView(self.target_class):
            @extend_schema(
                request=None,
                parameters=[_CSRF_HEADER_PARAMETER],
                responses={204: OpenApiResponse(description='会话已退出，认证 Cookie 已清除。')},
            )
            def post(self, request, *args, **kwargs):
                return super().post(request, *args, **kwargs)

        return SchemaView


class AvatarUploadSerializer(serializers.Serializer):
    avatar = serializers.ImageField(help_text='头像图片，最大 5MB。')


class AdminOrderCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, max_length=500, help_text='后台取消原因。')


class RoleMatrixUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(
        choices=['customer', 'admin_member', 'admin_leader', 'ops'],
        help_text='待调整的角色；superadmin 权限不可修改。',
    )
    perm_codes = serializers.ListField(
        child=serializers.CharField(max_length=100),
        help_text='授予该角色的权限码完整列表。',
    )


class UserRoleAssignSerializer(serializers.Serializer):
    roles = serializers.ListField(
        child=serializers.ChoiceField(choices=['customer', 'ops', 'superadmin']),
        help_text='目标用户的可手工分配角色完整列表。',
    )


class UserNicknameUpdateSerializer(serializers.Serializer):
    nickname = serializers.CharField(max_length=150, help_text='新的用户昵称。')


class AvatarUploadViewSchema(OpenApiViewExtension):
    target_class = 'apps.users.views.AvatarUploadView'

    def view_replacement(self):
        class SchemaView(self.target_class):
            @extend_schema(
                request=AvatarUploadSerializer,
                responses={200: OpenApiResponse(description='上传成功，返回 avatar_url。')},
            )
            def post(self, request, *args, **kwargs):
                return super().post(request, *args, **kwargs)

        return SchemaView


class UserMeViewSchema(OpenApiViewExtension):
    target_class = 'apps.users.views.UserMeView'

    def view_replacement(self):
        class SchemaView(self.target_class):
            @extend_schema(responses={200: OpenApiTypes.OBJECT})
            def get(self, request, *args, **kwargs):
                return super().get(request, *args, **kwargs)

            @extend_schema(request=UserNicknameUpdateSerializer, responses={200: OpenApiTypes.OBJECT})
            def patch(self, request, *args, **kwargs):
                return super().patch(request, *args, **kwargs)

        return SchemaView


class ConversationReleaseViewSchema(OpenApiViewExtension):
    target_class = 'apps.customer_service.views.ConversationReleaseView'

    def view_replacement(self):
        class SchemaView(self.target_class):
            @extend_schema(
                request=None,
                responses={200: OpenApiResponse(description='会话已释放。')},
            )
            def post(self, request, *args, **kwargs):
                return super().post(request, *args, **kwargs)

        return SchemaView


class OrderAdminCancelViewSchema(OpenApiViewExtension):
    target_class = 'apps.order.admin_views.OrderAdminCancelView'

    def view_replacement(self):
        class SchemaView(self.target_class):
            @extend_schema(
                request=AdminOrderCancelSerializer,
                responses={200: OpenApiResponse(description='待支付订单已由后台取消。')},
            )
            def post(self, request, *args, **kwargs):
                return super().post(request, *args, **kwargs)

        return SchemaView


class RoleMatrixViewSchema(OpenApiViewExtension):
    target_class = 'apps.rbac.views.RoleMatrixView'

    def view_replacement(self):
        class SchemaView(self.target_class):
            @extend_schema(responses={200: OpenApiTypes.OBJECT})
            def get(self, request, *args, **kwargs):
                return super().get(request, *args, **kwargs)

            @extend_schema(request=RoleMatrixUpdateSerializer, responses={200: OpenApiTypes.OBJECT})
            def put(self, request, *args, **kwargs):
                return super().put(request, *args, **kwargs)

        return SchemaView


class UserRoleListViewSchema(OpenApiViewExtension):
    target_class = 'apps.rbac.views.UserRoleListView'

    def view_replacement(self):
        class SchemaView(self.target_class):
            @extend_schema(
                parameters=[
                    OpenApiParameter('role', OpenApiTypes.STR, description='按角色筛选。'),
                    OpenApiParameter('search', OpenApiTypes.STR, description='按用户名或邮箱搜索。'),
                    OpenApiParameter('page', OpenApiTypes.INT, description='页码，默认 1。'),
                    OpenApiParameter('size', OpenApiTypes.INT, description='每页数量，最大 100。'),
                ],
                responses={200: OpenApiTypes.OBJECT},
            )
            def get(self, request, *args, **kwargs):
                return super().get(request, *args, **kwargs)

        return SchemaView


class UserRoleDetailViewSchema(OpenApiViewExtension):
    target_class = 'apps.rbac.views.UserRoleDetailView'

    def view_replacement(self):
        class SchemaView(self.target_class):
            @extend_schema(request=UserRoleAssignSerializer, responses={200: OpenApiTypes.OBJECT})
            def put(self, request, *args, **kwargs):
                return super().put(request, *args, **kwargs)

        return SchemaView


_SECURITY_SCHEMES = {
    'BearerAuth': {
        'type': 'http',
        'scheme': 'bearer',
        'bearerFormat': 'JWT',
        'description': '供 Apifox、移动端和服务端客户端使用。请求头：Authorization: Bearer <access_token>。',
    },
    'CookieJWT': {
        'type': 'apiKey',
        'in': 'cookie',
        'name': 'ziggner_access',
        'description': (
            '仅供浏览器第一方会话使用。访问与刷新令牌保存在 HttpOnly Cookie；'
            '所有写请求还必须携带 X-CSRFToken。'
        ),
    },
    'AdminToken': {
        'type': 'apiKey',
        'in': 'header',
        'name': 'Authorization',
        'description': '仅后台管理接口使用。请求头：Authorization: Token <admin_token>。',
    },
}


_ERROR_RESPONSE = {
    'description': '统一错误响应。限流时响应头包含 Retry-After。',
    'content': {
        'application/json': {
            'schema': {'$ref': '#/components/schemas/ErrorEnvelope'},
        },
    },
}


def postprocess_zh_cn_schema(result, generator, request, public):
    """Add stable cross-cutting API contract metadata after DRF introspection."""
    components = result.setdefault('components', {})
    schemas = components.setdefault('schemas', {})
    components['securitySchemes'] = deepcopy(_SECURITY_SCHEMES)
    schemas.setdefault(
        'ErrorEnvelope',
        {
            'type': 'object',
            'description': '所有非 2xx API 错误使用此结构。',
            'required': ['code', 'message', 'details', 'request_id'],
            'properties': {
                'code': {'type': 'string', 'description': '稳定的业务错误码。'},
                'message': {'type': 'string', 'description': '面向用户的中文错误信息。'},
                'details': {'type': 'object', 'additionalProperties': {}, 'description': '字段级校验或补充信息。'},
                'request_id': {'type': 'string', 'description': '用于日志追踪的请求编号。'},
            },
        },
    )
    schemas['BrowserLoginRequest'] = {
        'type': 'object',
        'required': ['username', 'password', 'turnstile_token'],
        'properties': {
            'username': {'type': 'string', 'maxLength': 150, 'description': '用户名或登录标识。'},
            'password': {'type': 'string', 'writeOnly': True, 'description': '用户密码。'},
            'turnstile_token': {
                'type': 'string',
                'minLength': 1,
                'writeOnly': True,
                'description': '完成 Cloudflare Turnstile 人机验证后获得的一次性令牌。',
            },
        },
    }
    schemas.setdefault(
        'PaymentLifecycleStatus',
        {
            'type': 'string',
            'description': '支付流水状态。',
            'enum': ['pending', 'success', 'failed', 'refunded', 'cancelled'],
        },
    )

    endpoint_security = {}
    for path, _path_regex, method, callback in generator.endpoints:
        authentication_classes = getattr(callback.cls, 'authentication_classes', ())
        class_names = {
            f'{authentication_class.__module__}.{authentication_class.__name__}'
            for authentication_class in authentication_classes
        }
        if 'utils.admin_authentication.ExpiringTokenAuthentication' in class_names:
            security = [{'AdminToken': []}]
        else:
            security = []
            if 'utils.api_jwt_authentication.UsersJWTAuthentication' in class_names:
                security.append({'BearerAuth': []})
            if 'apps.users.session_auth.CookieJWTAuthentication' in class_names:
                security.append({'CookieJWT': []})
        endpoint_security[(path, method.lower())] = security

    operation_ids = set()
    for path, path_item in result.get('paths', {}).items():
        is_legacy = path.startswith('/api/') and not path.startswith('/api/v1/')
        for method, operation in path_item.items():
            if method not in {'get', 'put', 'post', 'delete', 'patch', 'head', 'options'}:
                continue
            route_name = re.sub(r'[^A-Za-z0-9_]+', '_', path.replace('{', '').replace('}', '')).strip('_')
            operation_id = f'{method}_{route_name}'
            if operation_id in operation_ids:
                operation_id += '_trailing_slash' if path.endswith('/') else '_alternate'
            suffix = 2
            unique_operation_id = operation_id
            while unique_operation_id in operation_ids:
                unique_operation_id = f'{operation_id}_{suffix}'
                suffix += 1
            operation['operationId'] = unique_operation_id
            operation_ids.add(unique_operation_id)
            operation['security'] = endpoint_security.get((path, method), operation.get('security', []))
            if is_legacy:
                operation['deprecated'] = True
                operation['description'] = (
                    '兼容接口，将在下一主版本移除。请迁移到 /api/v1 对应路径。\n\n'
                    + operation.get('description', '')
                ).strip()

            responses = operation.setdefault('responses', {})
            for status_code in ('400', '401', '403', '429', '500'):
                error_response = responses.setdefault(status_code, deepcopy(_ERROR_RESPONSE))
                if status_code == '429':
                    error_response.setdefault('headers', {})['Retry-After'] = {
                        'description': '建议客户端等待的秒数。',
                        'schema': {'type': 'integer', 'minimum': 1},
                    }

    csrf_parameter = {
        'name': 'X-CSRFToken',
        'in': 'header',
        'required': True,
        'description': '先获取 csrftoken Cookie，再将其值写入此请求头。',
        'schema': {'type': 'string'},
    }
    for prefix in ('/api/users/session/', '/api/v1/users/session/'):
        login = result.get('paths', {}).get(f'{prefix}login/', {}).get('post')
        if login:
            login['description'] = '浏览器会话登录。令牌仅写入 HttpOnly Cookie，不会出现在响应 JSON 中。'
            login['requestBody'] = {
                'required': True,
                'content': {
                    'application/json': {
                        'schema': {'$ref': '#/components/schemas/BrowserLoginRequest'},
                    },
                },
            }
            parameters = login.setdefault('parameters', [])
            if not any(parameter.get('name') == 'X-CSRFToken' for parameter in parameters):
                parameters.append(deepcopy(csrf_parameter))
        for action in ('refresh', 'logout'):
            operation = result.get('paths', {}).get(f'{prefix}{action}/', {}).get('post')
            if operation:
                parameters = operation.setdefault('parameters', [])
                if not any(parameter.get('name') == 'X-CSRFToken' for parameter in parameters):
                    parameters.append(deepcopy(csrf_parameter))

    checkout = schemas.get('CheckoutRequest', {}).get('properties', {})
    if 'user_coupon_id' in checkout:
        checkout['user_coupon_id']['description'] = '本次结算使用的用户优惠券 ID；每单最多一张。'
    if 'coupon_code' in checkout:
        checkout['coupon_code']['description'] = (
            '兼容旧客户端的券码字段，将在一个发布周期后移除；'
            '新客户端必须使用 user_coupon_id，且两者不能同时传入。'
        )
    return result

from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed
from apps.users.models import ExpiringToken


class ExpiringTokenAuthentication(TokenAuthentication):
    model = ExpiringToken

    def authenticate_credentials(self, key):
        try:
            token = self.model.objects.get(key=key)
        except self.model.DoesNotExist:
            raise AuthenticationFailed('无效的 token')
        except Exception:
            raise AuthenticationFailed('认证失败')
        if token.is_expired():
            token.delete()
            raise AuthenticationFailed('token 已过期，请重新登录')
        return (token.user, token)
"""开发用 SMTP 后端 —— 跳过 SSL 证书验证"""
import ssl
from django.core.mail.backends.smtp import EmailBackend as SMTPBackend


class DevEmailBackend(SMTPBackend):
    def _get_ssl_context(self):
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx

    def open(self):
        if self.use_ssl or getattr(self, 'ssl_context', None):
            self.connection = self.connection_class(
                self.host, self.port,
                timeout=self.timeout,
                context=self._get_ssl_context(),
            )
        else:
            self.connection = self.connection_class(
                self.host, self.port,
                timeout=self.timeout,
            )
        return True

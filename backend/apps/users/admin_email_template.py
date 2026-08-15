"""邮件模板管理 —— 管理后台可编辑发送的邮件内容"""
from django.db.models import Q
from rest_framework.response import Response

from apps.rbac.permissions import HasPerm
from apps.users.models import EmailTemplate
from utils.api_base_view import BaseApiView


class EmailTemplateListView(BaseApiView):
    """邮件模板列表"""
    permission_classes = [HasPerm('users.email_template.read')]

    def get(self, request):
        templates = EmailTemplate.objects.all().order_by('template_type')
        data = [{
            'template_type': t.template_type,
            'subject': t.subject,
            'html_body': t.html_body,
            'text_body': t.text_body,
            'is_active': t.is_active,
            'updated_at': t.updated_at.strftime('%Y-%m-%d %H:%M') if t.updated_at else None,
        } for t in templates]
        return Response({'code': 0, 'data': data})


class EmailTemplateUpdateView(BaseApiView):
    """更新邮件模板（不存在则创建）"""
    permission_classes = [HasPerm('users.email_template.write')]

    def post(self, request, template_type):
        subject = (request.data.get('subject') or '').strip()
        html_body = request.data.get('html_body') or ''
        text_body = request.data.get('text_body') or ''
        is_active = request.data.get('is_active', True)
        if not subject:
            return Response({'code': 400, 'message': '邮件主题不能为空'}, status=400)

        tpl, _ = EmailTemplate.objects.update_or_create(
            template_type=template_type,
            defaults={
                'subject': subject,
                'html_body': html_body,
                'text_body': text_body,
                'is_active': bool(is_active),
            },
        )
        return Response({
            'code': 0,
            'data': {
                'template_type': tpl.template_type,
                'subject': tpl.subject,
                'is_active': tpl.is_active,
            },
        })


class EmailTemplateResetView(BaseApiView):
    """恢复默认模板（删除数据库记录，回退内置默认）"""
    permission_classes = [HasPerm('users.email_template.write')]

    def post(self, request, template_type):
        EmailTemplate.objects.filter(template_type=template_type).delete()
        return Response({'code': 0, 'message': '已恢复默认模板'})

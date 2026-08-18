"""
Seed the default `admin_welcome` email template.

便于运营在后台邮件模板管理页编辑欢迎邮件文案。占位符统一使用单花括号
{platform_name}{real_name}{username}{email}{role}{login_url}{support_url}{year}
（与 EmailTemplate.render 的替换机制一致）；另含 {verify_url} 验证链接占位符。
"""
from django.db import migrations


SUBJECT = '欢迎加入 {platform_name} 管理后台'

HTML_BODY = '''<div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;background:#fff;border-radius:8px;">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="6" fill="#1a56db"/><text x="16" y="23" text-anchor="middle" fill="#ffffff" font-size="18" font-family="Arial, sans-serif" font-weight="bold">Z</text></svg>
    <div style="font-size:22px;font-weight:600;letter-spacing:-0.5px;">{platform_name}</div>
  </div>
  <div style="font-size:18px;font-weight:600;margin-bottom:12px;">欢迎，{real_name}！</div>
  <div style="font-size:14px;line-height:1.7;color:#444;margin-bottom:16px;">
    您的后台管理员账号已创建成功。以下是您的登录信息：
  </div>
  <div style="background:#f5f7ff;border-radius:6px;padding:16px 20px;margin-bottom:20px;font-size:14px;color:#333;line-height:1.9;">
    <div><span style="color:#888;">用户名：</span><b>{username}</b></div>
    <div><span style="color:#888;">邮箱：</span><b>{email}</b></div>
    <div><span style="color:#888;">角色：</span><b>{role}</b></div>
  </div>
  <div style="font-size:14px;line-height:1.7;color:#444;margin-bottom:20px;">
    请先点击下方按钮验证邮箱，以确保您能正常接收系统通知与登录验证码：
  </div>
  <div style="text-align:center;margin-bottom:24px;">
    <a href="{verify_url}" style="display:inline-block;background:#1a56db;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;">验证邮箱并登录</a>
  </div>
  <div style="font-size:12px;line-height:1.5;color:#888;">
    如按钮无法点击，请复制以下链接到浏览器打开：<br/>{verify_url}
  </div>
  <div style="border-top:1px solid #eee;margin-top:24px;padding-top:16px;font-size:11px;color:#aaa;text-align:center;">
    {platform_name} · 本邮件由系统自动发送，请勿直接回复。<br/>
    需要帮助？请访问 <a href="{support_url}" style="color:#1a56db;text-decoration:none;">支持中心</a> · © {year} {platform_name}
  </div>
</div>'''

TEXT_BODY = '''欢迎加入 {platform_name}！

您的后台管理员账号已创建成功：
用户名：{username}
邮箱：{email}
角色：{role}

请先验证邮箱以确保能正常接收系统通知与登录验证码：
{verify_url}

需要帮助？请访问 {support_url}
© {year} {platform_name}'''


def seed_admin_welcome_template(apps, schema_editor):
    EmailTemplate = apps.get_model('users', 'EmailTemplate')
    EmailTemplate.objects.get_or_create(
        template_type='admin_welcome',
        defaults={
            'subject': SUBJECT,
            'html_body': HTML_BODY,
            'text_body': TEXT_BODY,
            'is_active': True,
        },
    )


def revert_admin_welcome_template(apps, schema_editor):
    EmailTemplate = apps.get_model('users', 'EmailTemplate')
    EmailTemplate.objects.filter(template_type='admin_welcome').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0007_userprofile_new_fields'),
    ]

    operations = [
        migrations.RunPython(seed_admin_welcome_template, revert_admin_welcome_template),
    ]

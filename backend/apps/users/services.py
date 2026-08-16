from datetime import timedelta
from logging import getLogger

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.utils import IntegrityError
from django.utils import timezone

from apps.users.models import UserProfile

_logger = getLogger('biz')

User = get_user_model()
_cfg = getattr(settings, 'USERS_SETTINGS', {})


class UserService:
    """用户业务逻辑层 —— 注册、Profile 管理、注销、用户名修改"""

    # ============================================================
    # 注册
    # ============================================================

    @staticmethod
    @transaction.atomic
    def create_user(username, password, email='', country_code=None, phone=None):
        """
        在事务中创建 User 和 UserProfile。
        若用户名/邮箱/手机号已存在，抛出 ValueError。
        """
        # 检查用户名唯一性
        if User.objects.filter(username=username).exists():
            raise ValueError('USERNAME_EXISTS')

        # 检查邮箱唯一性
        if email and User.objects.filter(email=email).exists():
            raise ValueError('EMAIL_EXISTS')

        # 检查手机号唯一性
        if phone and country_code:
            if UserProfile.objects.filter(
                country_code=country_code, phone=phone
            ).exclude(phone='').exists():
                raise ValueError('PHONE_EXISTS')

        user = User.objects.create_user(
            username=username,
            password=password,
            email=email,
            is_active=True,
        )

        UserProfile.objects.create(
            user=user,
            country_code=country_code or '',
            phone=phone or '',
        )

        return user

    # ============================================================
    # Profile
    # ============================================================

    @staticmethod
    def get_or_create_profile(user):
        """获取用户的 Profile，不存在则自动创建"""
        profile, _ = UserProfile.objects.get_or_create(user=user)
        return profile

    @staticmethod
    def update_profile(user, **data):
        """部分更新用户 Profile 字段（country_code, phone）"""
        profile = UserService.get_or_create_profile(user)
        changed = False

        for field in ('country_code', 'phone'):
            if field in data:
                setattr(profile, field, data[field])
                changed = True

        if changed:
            try:
                profile.save()
            except IntegrityError:
                raise ValueError('PHONE_ALREADY_TAKEN')

        return profile

    # ============================================================
    # 修改用户名（带冷却期）
    # ============================================================

    @staticmethod
    @transaction.atomic
    def change_username(user, new_username):
        """
        修改用户名。
        - 检查是否重复
        - 检查冷却期（默认 30 天内只能改一次）
        """
        new_username = new_username.strip().lower()

        # 检查是否与原用户名相同
        if user.username == new_username:
            raise ValueError('SAME_USERNAME')

        # 检查唯一性
        if User.objects.filter(username=new_username).exists():
            raise ValueError('USERNAME_ALREADY_TAKEN')

        # 检查冷却期
        profile = UserService.get_or_create_profile(user)
        cooldown_days = _cfg.get('USERNAME_CHANGE_COOLDOWN_DAYS', 30)
        if profile.username_changed_at:
            next_available = profile.username_changed_at + timedelta(days=cooldown_days)
            if timezone.now() < next_available:
                raise ValueError('USERNAME_CHANGE_COOLDOWN')

        user.username = new_username
        user.save(update_fields=['username'])

        profile.username_changed_at = timezone.now()
        profile.save(update_fields=['username_changed_at'])

        return user

    @staticmethod
    def change_password(user, old_password, new_password):
        """修改密码 —— 校验旧密码后设置新密码"""
        if not user.check_password(old_password):
            raise ValueError('OLD_PASSWORD_INCORRECT')
        user.set_password(new_password)
        user.save(update_fields=['password', 'updated_at'])
        return user

    # ============================================================
    # 注销账号（软删除）
    # ============================================================

    @staticmethod
    def deactivate_user(user):
        """软删除：将 is_active 设为 False"""
        user.is_active = False
        user.save(update_fields=['is_active'])

    # ============================================================
    # 登出（JWT refresh token 黑名单）
    # ============================================================

    @staticmethod
    def logout(refresh_token):
        """将 refresh token 加入黑名单，使其无法再获取新 access token"""
        from rest_framework_simplejwt.tokens import RefreshToken
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception as e:
            # token 已过期或无效，不影响登出结果
            _logger.warning('Token blacklist failed: %s', e, exc_info=True)

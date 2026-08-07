"""文件存储工具类 —— 工厂模式 (Local / Cloudflare R2)

Usage:
    from utils.storage import get_storage

    storage = get_storage()
    result = storage.upload(file_name, file_content, content_type='image/jpeg')
    url = storage.get_url(file_name)
    storage.delete(file_name)
"""

import logging
import traceback
from abc import ABC, abstractmethod
from django.conf import settings

logger = logging.getLogger(__name__)


# ==================== 抽象基类 ====================

class BaseStorage(ABC):
    """存储后端抽象基类"""

    def __init__(self):
        self.max_file_size = int(getattr(settings, 'FILE_STORAGE_MAX_SIZE', 10)) * 1024 * 1024

    def check_file_size(self, size: int):
        if size > self.max_file_size:
            raise ValueError(f'文件大小超过 {self.max_file_size // 1024 // 1024}MB 限制')

    def check_file_type(self, content_type: str):
        allowed = getattr(settings, 'FILE_STORAGE_ALLOWED_TYPES', [])
        if allowed and content_type not in allowed:
            raise ValueError(f'不支持的文件类型: {content_type}')

    @abstractmethod
    def upload(self, file_name: str, file_content: bytes, content_type: str = None) -> dict:
        """上传文件，返回 {'url': str, 'message': str}"""
        ...

    @abstractmethod
    def delete(self, file_name: str) -> bool:
        """删除文件，返回是否成功"""
        ...

    @abstractmethod
    def get_url(self, file_name: str) -> str:
        """获取文件访问 URL"""
        ...


# ==================== Cloudflare R2 ====================

class R2Storage(BaseStorage):
    """Cloudflare R2 (S3 兼容)"""

    def __init__(self):
        super().__init__()
        import boto3

        account_id = getattr(settings, 'R2_ACCOUNT_ID', '')
        access_key = getattr(settings, 'R2_ACCESS_KEY_ID', '')
        secret_key = getattr(settings, 'R2_SECRET_ACCESS_KEY', '')
        self.bucket_name = getattr(settings, 'R2_BUCKET', '')

        endpoint = f'https://{account_id}.r2.cloudflarestorage.com'
        self.client = boto3.client(
            's3',
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
        )
        self.base_url = getattr(settings, 'R2_PUBLIC_URL', f'{endpoint}/{self.bucket_name}')

    def upload(self, file_name: str, file_content: bytes, content_type: str = None) -> dict:
        try:
            self.check_file_size(len(file_content))
            if content_type:
                self.check_file_type(content_type)

            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type

            self.client.put_object(
                Bucket=self.bucket_name,
                Key=file_name,
                Body=file_content,
                **extra_args,
            )
            url = f'{self.base_url}/{file_name}'
            return {'url': url, 'message': '上传成功'}
        except Exception as e:
            logger.error(f'R2 上传失败: {file_name}\n{e}')
            return {'url': None, 'message': str(e)}

    def delete(self, file_name: str) -> bool:
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=file_name)
            return True
        except Exception as e:
            logger.error(f'R2 删除失败: {file_name}: {e}')
            return False

    def get_url(self, file_name: str) -> str:
        return f'{self.base_url}/{file_name}'


# ==================== 本地存储 (兼容旧代码) ====================

class LocalStorage(BaseStorage):
    """本地文件存储 (开发/降级用)"""

    def __init__(self):
        super().__init__()
        from django.core.files.storage import default_storage
        self.default_storage = default_storage
        self.base_url = getattr(settings, 'DOMAIN', 'http://localhost:8000')

    def upload(self, file_name: str, file_content: bytes, content_type: str = None) -> dict:
        try:
            self.check_file_size(len(file_content))
            from django.core.files.base import ContentFile
            cf = ContentFile(file_content, name=file_name)
            self.default_storage.save(file_name, cf)
            url = self.default_storage.url(file_name)
            return {'url': f'{self.base_url}{url}', 'message': '上传成功'}
        except Exception as e:
            logger.error(f'本地 上传失败: {file_name}\n{e}')
            return {'url': None, 'message': str(e)}

    def delete(self, file_name: str) -> bool:
        try:
            self.default_storage.delete(file_name)
            return True
        except Exception as e:
            logger.error(f'本地 删除失败: {file_name}: {e}')
            return False

    def get_url(self, file_name: str) -> str:
        url = self.default_storage.url(file_name)
        return f'{self.base_url}{url}'


# ==================== 工厂函数 ====================

__storage__ = None


def get_storage() -> BaseStorage:
    """根据 FILE_STORAGE 配置返回对应存储后端"""
    global __storage__
    if __storage__ is not None:
        return __storage__

    backend = getattr(settings, 'FILE_STORAGE', 'local')
    if backend == 'r2':
        __storage__ = R2Storage()
    else:
        __storage__ = LocalStorage()

    logger.info(f'存储后端已初始化: {__storage__.__class__.__name__}')
    return __storage__
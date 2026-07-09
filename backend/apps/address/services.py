from datetime import datetime

from django.db import transaction
from utils.cache import Cache
from .models import Address

_cache = Cache('address')


def _address_to_dict(addr: Address) -> dict:
    """将 Address 模型对象转为字典（保留 datetime，set_json 自动序列化）"""
    return {
        'id': addr.id,
        'name': addr.name,
        'phone': addr.phone,
        'country': addr.country,
        'region': addr.region,
        'city': addr.city,
        'address_line': addr.address_line,
        'postal_code': addr.postal_code,
        'is_default': addr.is_default,
        'created_at': addr.created_at,
        'updated_at': addr.updated_at,
    }


# ==================== 缓存读写 ====================

def _get_cached_list(user) -> list | None:
    """从缓存获取地址列表，未命中返回 None"""
    return _cache.get_json(f'list:{user.id}')


def _get_cached_default(user) -> dict | None:
    """从缓存获取默认地址，未命中返回 None"""
    return _cache.get_json(f'default:{user.id}')


def _build_and_cache_list(user) -> list:
    """从 DB 构建地址列表并写入缓存"""
    result = [_address_to_dict(addr) for addr in Address.objects.filter(user=user)]
    _cache.set_json(f'list:{user.id}', result, 120)
    return result


def _build_and_cache_default(user) -> dict | None:
    """从 DB 查询默认地址并写入缓存"""
    addr = Address.objects.filter(user=user, is_default=True).first()
    if addr:
        data = _address_to_dict(addr)
        _cache.set_json(f'default:{user.id}', data, 120)
        return data
    return None


def _sync_cache(user, addr_list: list):
    """同步缓存：写入 list 和 default"""
    _cache.set_json(f'list:{user.id}', addr_list, 120)
    default = next((a for a in addr_list if a['is_default']), None)
    if default:
        _cache.set_json(f'default:{user.id}', default, 120)
    else:
        _cache.delete(f'default:{user.id}')


def _invalidate(user):
    """清除缓存"""
    _cache.delete(f'list:{user.id}')
    _cache.delete(f'default:{user.id}')


# ==================== Service ====================

class AddressService:

    @staticmethod
    def list_addresses(user):
        cached = _get_cached_list(user)
        if cached is not None:
            return cached
        return _build_and_cache_list(user)

    @staticmethod
    def get_address(user, address_id):
        # 优先从缓存的列表中取
        cached = _get_cached_list(user)
        if cached is not None:
            target = next((a for a in cached if a['id'] == address_id), None)
            if target is not None:
                return target
        # 缓存未命中或未找到，回退 DB
        addr = Address.objects.filter(user=user, pk=address_id).first()
        return _address_to_dict(addr) if addr else None

    @staticmethod
    def get_default(user):
        cached = _get_cached_default(user)
        if cached is not None:
            return cached
        return _build_and_cache_default(user)

    # ========== 写操作：先改缓存，再改 DB ==========

    MAX_ADDRESSES = 20

    @staticmethod
    @transaction.atomic
    def create(user, *, name, phone, country, region, city, address_line,
               postal_code='', is_default=False):
        # 1. 从缓存获取当前列表（缓存未命中则从 DB 构建）
        cached = _get_cached_list(user)
        addr_list = cached if cached is not None else _build_and_cache_list(user)

        # 2. 数量上限检查
        if len([a for a in addr_list if a['id'] is not None]) >= AddressService.MAX_ADDRESSES:
            raise ValueError('ADDRESS_LIMIT_REACHED')

        # 3. 计算新地址的 is_default
        if not addr_list or is_default:
            is_default = True
            for a in addr_list:
                a['is_default'] = False

        # 4. 构造新地址字典（用 None 作为占位 id，DB 写入后更新）
        new_addr = {
            'id': None,
            'name': name,
            'phone': phone,
            'country': country,
            'region': region,
            'city': city,
            'address_line': address_line,
            'postal_code': postal_code,
            'is_default': is_default,
            'created_at': datetime.now(),
            'updated_at': datetime.now(),
        }
        addr_list.insert(0, new_addr)

        # 5. 写入缓存
        _sync_cache(user, addr_list)

        # 6. 写入 DB
        if is_default:
            Address.objects.filter(user=user, is_default=True).update(is_default=False)
        db_addr = Address.objects.create(
            user=user, name=name, phone=phone,
            country=country, region=region, city=city,
            address_line=address_line, postal_code=postal_code,
            is_default=is_default,
        )
        new_addr['id'] = db_addr.id
        new_addr['created_at'] = db_addr.created_at
        new_addr['updated_at'] = db_addr.updated_at
        _sync_cache(user, addr_list)

        return db_addr

    @staticmethod
    @transaction.atomic
    def update(user, address_id, **kwargs):
        # 1. 从缓存获取当前列表
        cached = _get_cached_list(user)
        addr_list = cached if cached is not None else _build_and_cache_list(user)

        target = next((a for a in addr_list if a['id'] == address_id), None)
        if target is None:
            raise ValueError('ADDRESS_NOT_FOUND')

        # 2. 设默认时先清除其它默认标记
        if kwargs.get('is_default'):
            for a in addr_list:
                a['is_default'] = False

        # 3. 更新缓存中的字段
        # 🔒 字段白名单：防止批量赋值攻击
        _allowed = {'name', 'phone', 'country', 'region', 'city', 'address_line', 'postal_code', 'is_default'}
        for k, v in kwargs.items():
            if k in target and k in _allowed:
                target[k] = v
        target['updated_at'] = datetime.now()

        # 5. 写入缓存
        _sync_cache(user, addr_list)

        # 6. 写入 DB
        db_addr = Address.objects.filter(user=user, pk=address_id).first()
        if db_addr is None:
            raise ValueError('ADDRESS_NOT_FOUND')
        if kwargs.get('is_default'):
            Address.objects.filter(user=user, is_default=True).update(is_default=False)
        for k, v in kwargs.items():
            if k in _allowed:
                setattr(db_addr, k, v)
        db_addr.save()

        return db_addr

    @staticmethod
    @transaction.atomic
    def set_default(user, address_id):
        # 1. 从缓存获取当前列表
        cached = _get_cached_list(user)
        addr_list = cached if cached is not None else _build_and_cache_list(user)

        target = next((a for a in addr_list if a['id'] == address_id), None)
        if target is None:
            raise ValueError('ADDRESS_NOT_FOUND')

        # 2. 更新缓存：清除旧默认，设置新默认
        for a in addr_list:
            a['is_default'] = (a['id'] == address_id)
        target['updated_at'] = datetime.now()

        # 3. 写入缓存
        _sync_cache(user, addr_list)

        # 4. 写入 DB
        db_addr = Address.objects.filter(user=user, pk=address_id).first()
        if db_addr is None:
            raise ValueError('ADDRESS_NOT_FOUND')
        db_addr.set_default()

        return _address_to_dict(db_addr)

    @staticmethod
    @transaction.atomic
    def delete(user, address_id):
        # 1. 从缓存获取当前列表
        cached = _get_cached_list(user)
        addr_list = cached if cached is not None else _build_and_cache_list(user)

        target = next((a for a in addr_list if a['id'] == address_id), None)
        if target is None:
            raise ValueError('ADDRESS_NOT_FOUND')
        was_default = target['is_default']

        # 2. 从缓存移除
        addr_list = [a for a in addr_list if a['id'] != address_id]
        if was_default and addr_list:
            addr_list[0]['is_default'] = True

        # 3. 写入缓存
        _sync_cache(user, addr_list)

        # 4. 写入 DB
        db_addr = Address.objects.filter(user=user, pk=address_id).first()
        if db_addr is None:
            raise ValueError('ADDRESS_NOT_FOUND')
        db_addr.delete()
        if was_default:
            first = Address.objects.filter(user=user).first()
            if first:
                first.is_default = True
                first.save(update_fields=['is_default'])

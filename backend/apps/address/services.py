from django.db import transaction

from utils.cache import Cache
from .models import Address


_cache = Cache('address')


def _address_to_dict(addr: Address) -> dict:
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


def _get_cached_list(user):
    return _cache.get_json(f'list:{user.id}')


def _get_cached_default(user):
    return _cache.get_json(f'default:{user.id}')


def _build_and_cache_list(user):
    result = [_address_to_dict(addr) for addr in Address.objects.filter(user=user)]
    _cache.set_json(f'list:{user.id}', result, 120)
    return result


def _build_and_cache_default(user):
    addr = Address.objects.filter(user=user, is_default=True).first()
    if addr is None:
        _cache.delete(f'default:{user.id}')
        return None
    data = _address_to_dict(addr)
    _cache.set_json(f'default:{user.id}', data, 120)
    return data


def _invalidate(user):
    _cache.delete(f'list:{user.id}')
    _cache.delete(f'default:{user.id}')


class AddressService:
    MAX_ADDRESSES = 20
    _ALLOWED_FIELDS = {
        'name', 'phone', 'country', 'region', 'city', 'address_line',
        'postal_code', 'is_default',
    }

    @staticmethod
    def list_addresses(user):
        cached = _get_cached_list(user)
        if cached is not None:
            return cached
        return _build_and_cache_list(user)

    @staticmethod
    def get_address(user, address_id):
        cached = _get_cached_list(user)
        if cached is not None:
            target = next((item for item in cached if item['id'] == address_id), None)
            if target is not None:
                return target
        addr = Address.objects.filter(user=user, pk=address_id).first()
        return _address_to_dict(addr) if addr else None

    @staticmethod
    def get_default(user):
        cached = _get_cached_default(user)
        if cached is not None:
            return cached
        return _build_and_cache_default(user)

    @staticmethod
    @transaction.atomic
    def create(user, *, name, phone, country, region, city, address_line,
               postal_code='', is_default=False):
        type(user).objects.select_for_update().get(pk=user.pk)
        existing_count = Address.objects.filter(user=user).count()
        if existing_count >= AddressService.MAX_ADDRESSES:
            raise ValueError('ADDRESS_LIMIT_REACHED')

        is_default = is_default or existing_count == 0
        if is_default:
            Address.objects.filter(user=user, is_default=True).update(is_default=False)
        address = Address.objects.create(
            user=user,
            name=name,
            phone=phone,
            country=country,
            region=region,
            city=city,
            address_line=address_line,
            postal_code=postal_code,
            is_default=is_default,
        )
        transaction.on_commit(lambda: _invalidate(user))
        return address

    @staticmethod
    @transaction.atomic
    def update(user, address_id, **kwargs):
        address = Address.objects.select_for_update().filter(user=user, pk=address_id).first()
        if address is None:
            raise ValueError('ADDRESS_NOT_FOUND')

        changes = {
            key: value for key, value in kwargs.items()
            if key in AddressService._ALLOWED_FIELDS
        }
        if changes.get('is_default'):
            Address.objects.filter(user=user, is_default=True).exclude(pk=address.pk).update(is_default=False)
        for key, value in changes.items():
            setattr(address, key, value)
        address.save()
        transaction.on_commit(lambda: _invalidate(user))
        return address

    @staticmethod
    @transaction.atomic
    def set_default(user, address_id):
        address = Address.objects.select_for_update().filter(user=user, pk=address_id).first()
        if address is None:
            raise ValueError('ADDRESS_NOT_FOUND')
        address.set_default()
        transaction.on_commit(lambda: _invalidate(user))
        return _address_to_dict(address)

    @staticmethod
    @transaction.atomic
    def delete(user, address_id):
        address = Address.objects.select_for_update().filter(user=user, pk=address_id).first()
        if address is None:
            raise ValueError('ADDRESS_NOT_FOUND')

        was_default = address.is_default
        address.delete()
        if was_default:
            replacement = Address.objects.filter(user=user).first()
            if replacement is not None:
                replacement.is_default = True
                replacement.save(update_fields=['is_default'])
        transaction.on_commit(lambda: _invalidate(user))

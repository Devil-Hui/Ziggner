import { useState, useCallback, useEffect } from 'react';
import { publicAPI } from '../api/public';
import type { ShippingAddress } from '../types/order';

export function useAddress() {
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAddresses = useCallback(async () => {
    try {
      const data = await publicAPI.getAddresses();
      setAddresses(Array.isArray(data) ? data as ShippingAddress[] : []);
    } catch {
      // keep existing data on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const addAddress = useCallback(async (addr: Omit<ShippingAddress, 'id'>) => {
    const created = await publicAPI.createAddress(addr);
    setAddresses(prev => [...prev, created as unknown as ShippingAddress]);
    return created;
  }, []);

  const updateAddress = useCallback(async (id: number, addr: Partial<ShippingAddress>) => {
    const updated = await publicAPI.updateAddress(id, addr);
    setAddresses(prev => prev.map(a => a.id === id ? updated as unknown as ShippingAddress : a));
    return updated;
  }, []);

  const deleteAddress = useCallback(async (id: number) => {
    await publicAPI.deleteAddress(id);
    setAddresses(prev => prev.filter(a => a.id !== id));
  }, []);

  return { addresses, isLoading, addAddress, updateAddress, deleteAddress, refresh: fetchAddresses };
}

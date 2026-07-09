/**
 * 从后端 API 获取优惠券数据，与 admin 后台操作保持一致。
 */

import { useState, useEffect } from 'react';
import { publicAPI, type UserCoupon } from '../api/public';

/** 前端展示用的优惠券格式 */
export interface DisplayCoupon {
  id: number;
  amount: number;
  minSpend: number;
  title: string;
  description: string;
  expireDate: string;
  code: string;
  used: boolean;
}

function mapCoupon(userCoupon: UserCoupon): DisplayCoupon {
  const coupon = userCoupon.coupon;
  return {
    id: userCoupon.id,
    amount: Number(coupon.amount) || 0,
    minSpend: Number(coupon.min_amount) || 0,
    title: coupon.code || `Coupon #${coupon.id}`,
    description: coupon.discount_type === 'percent'
      ? `${coupon.amount}% off`
      : `$${coupon.amount} off`,
    expireDate: coupon.end_time?.split('T')[0] || '',
    code: coupon.code,
    used: userCoupon.status === 'used',
  };
}

export function useCoupons() {
  const [coupons, setCoupons] = useState<DisplayCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    publicAPI.getMyCoupons()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCoupons(data.map(mapCoupon));
        }
      })
      .catch((err: any) => {
        setError(err?.message || 'Failed to load coupons');
      })
      .finally(() => setLoading(false));
  }, []);

  return { coupons, loading, error };
}
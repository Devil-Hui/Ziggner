/**
 * 用户条款 API
 */
import { get } from './request';

export interface Term {
  id: number;
  title: string;
  type: string;
  type_display: string;
  content: string;
  version: string;
  is_active: boolean;
  effective_date: string;
  created_at: string;
  updated_at: string;
}

/** 获取所有生效中的条款 */
export function getActiveTerms() {
  return get<{ code: number; data: Term[] }>('/terms/');
}

/** 按类型获取条款（如 privacy, terms, refund, shipping, cookies） */
export function getTermByType(type: string) {
  return get<{ code: number; data: Term }>(`/terms/${type}/`);
}

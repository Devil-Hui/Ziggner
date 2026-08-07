/** 用户相关类型定义 */

export interface User {
  id: number
  name: string
  email: string
  phone: string
  gender: string
  registerTime: string
  level?: string
  avatar?: string
  nickname?: string
}
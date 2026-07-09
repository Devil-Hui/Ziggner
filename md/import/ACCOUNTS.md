# Ziggner 种子数据账号列表

> 初始化命令: `docker exec ziggner-django python manage.py init_p0_data`

## 超级管理员 (Super Admin)

| 用户名 | 密码 | 权限 |
|--------|------|------|
| `admin` | `admin123` | 全部权限 |

## Agent 组

| 用户名 | 密码 | 角色 |
|--------|------|------|
| `agent_admin` | `123456` | 组长 (Leader) |
| `agent1` | `123456` | 组员 (Member) |
| `agent2` | `123456` | 组员 (Member) |

## Service 组

| 用户名 | 密码 | 角色 |
|--------|------|------|
| `service_admin` | `123456` | 组长 (Leader) |
| `service1` | `123456` | 组员 (Member) |
| `service2` | `123456` | 组员 (Member) |

## 普通用户

| 用户名 | 密码 | 说明 |
|--------|------|------|
| `testuser` | `123456` | 无特殊权限的普通用户 |

---

## 种子数据内容

初始化后会创建：
- **2 个管理组**: Agent 组 (id=1), Service 组 (id=2)
- **1 个品牌**: Ziggner (id=1)
- **2 个类目**: Agent 类目 (id=1), Service 类目 (id=2)
- **3 个 SPU 商品**: Agent 组 2 个 + Service 组 1 个
- **2 张优惠券**: GREEN-FULL (满减), GREEN-REDUCE (折扣)
- **6 个标签**: 新品、热销、推荐、限时、特价、精选

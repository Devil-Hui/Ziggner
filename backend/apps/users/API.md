# Users API

Base: `/api/users/`

---

## 1. 注册

**POST** `/api/users/register/`

邮箱/手机二选一验证。

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | yes | 3-15 chars |
| `password` | string | yes | 6-25 chars, 含大小写+数字 |
| `verification_token` | string | no | 邮箱验证 token |
| `country_code` | string | no | e.g. `+86` |
| `phone` | string | no | 手机号 |
| `verification_code` | string | no | 短信验证码 |

---

## 2. 登录

**POST** `/api/users/login/`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | yes | |
| `password` | string | yes | |

Response `200`: `{"access": "...", "refresh": "..."}`

---

## 3. 刷新 Token

**POST** `/api/users/refresh/`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `refresh` | string | yes | Refresh token |

---

## 4. 登出

**POST** `/api/users/logout/` （需登录）

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `refresh` | string | yes | |

---

## 5. 注销账号

**POST** `/api/users/deactivate/` （需登录）

---

## 6. 个人信息

**GET** `/api/users/profile/` （需登录）

**PATCH** `/api/users/profile/` （需登录）

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `country_code` | string | no | e.g. `+86` |
| `phone` | string | no | |

---

## 7. 修改用户名

**PATCH** `/api/users/username/` （需登录，30天冷却）

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | yes | 3-15 chars |

---

## 8. 图片验证码

**GET** `/api/users/captcha/`

---

## 9. 邮箱验证码 [测试中]

**POST** `/api/users/email/send/` — 发送
**POST** `/api/users/email/verify/` — 校验

---

## 10. 短信验证码 [测试中]

**POST** `/api/users/sms/send/` — 发送
**POST** `/api/users/sms/verify/` — 校验

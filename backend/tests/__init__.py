# 支付/安全回归测试包。可用两种方式运行：
#   pytest tests/test_payment_security.py -v          （需 pytest-django，版本兼容时）
#   python manage.py test tests -v 2                  （Django 自带 runner，零额外依赖）
# 注意：测试库需要 CREATE/DROP 权限——docker-compose.test.yml 下请以 root 连接
#       （官方 mysql 镜像只给业务用户授 `库名\_%`.* 权限，Django 测试库名不匹配该模式）。

FROM docker.m.daocloud.io/library/mysql:8.0.36-debian

RUN install -d -m 0750 -o mysql -g mysql /run/ziggner-mysql

COPY --chmod=0644 my.cnf /etc/mysql/conf.d/ziggner.cnf

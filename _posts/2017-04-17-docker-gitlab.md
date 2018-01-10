---
layout: post
title: 基于Docker的Gitlab服务器搭建
comments: 1
code: 1
keywords: Gitlab环境搭建, Gitlab on Docker, Gitlab, docker-compose
description: 手动搭建 Gitlab 个人仓库，基于Docker，建议使用工具 docker-compose
tags: [gitlab,docker,opensource]
---

是不是每个爱折腾的人都有搭建一套自己的Gitlab服务器的冲动~ 作为一个爱折腾的人，我曾经也搭建过内网Gitlab，装Redis，装PostgreSQL，装Ruby，装Gitlab，尤其是配置Ruby环境跑Gitlab的时候，不知遇到了多少坑！不过今天，我再次搭建Gitlab服务，用的是大神已经配置好的Gitlab Docker镜像，一条命令即可启动！

> Tips: Docker环境用的是Mac 下的[docker-machine](https://docs.docker.com/machine/)，其他环境如Linux、Windows也有对应的Docker一键环境，很方便的，这里我们重点讨论的不是如何安装Docker，所以这里略过。


## 概述
Gitlab的Docker镜像已经由印度大牛做好，地址 [https://github.com/sameersbn/docker-gitlab](https://github.com/sameersbn/docker-gitlab)， 其实里面已经说明了如何使用该环境，这里我相当于转述和完善一下而已。

> _该镜像做了四件事_：
>
> 1. 建立Redis环境 [sameersbn/redis]
> 2. 建立PostgreSQL环境 [sameersbn/postgresql]
> 3. 建立Ruby环境和Gitlab [sameersbn/gitlab]
> 4. 把各个镜像跑起来形成最终环境，开放端口供使用

<!--
> PS: 上面的redis、postsql、gitlab用的是作者自己的镜像，其实完全也可以换用官方的镜像，只不过他自己的有一些环境变量设置，和该gitlab镜像更加适配，便于我们使用而已。
-->

## 实现步骤

### 一、完全手动安装执行

> Tips: 不推荐这么使用，因为每次启动之前都要手动启动redis、postgresql等，比较繁琐，容易出错

#### 1. 启动 Redis 容器

```shell
# 拉取镜像
docker pull sameersbn/redis:latest

# 启动容器
docker run --name gitlab-redis -d  \
  --publish 6379:6379 \
  --volume /srv/docker/redis:/var/lib/redis \
  sameersbn/redis:latest

# 此时访问运行docker的机器ip:6379端口应该正常连接redis
# 我的是 redis-cli -h 192.168.99.100 -p 6379
```

#### 2. 启动 Postresql 容器

```shell
# 拉取镜像
docker pull sameersbn/postgresql:latest

# 启动容器
docker run --name gitlab-postgresql -itd \
  --publish 5432:5432 \
  --env 'DB_USER=gitlab' \
  --env 'DB_PASS=password' \
  --env 'DB_NAME=gitlabhq_production' \
  --env 'DB_EXTENSION=pg_trgm' \
  --volume /srv/docker/postgresql:/var/lib/postgresql \
  sameersbn/postgresql:latest

  # 此时访问运行docker的机器ip:5432应该能连接上数据库
  # 我的是 pgcli -h 192.168.99.100 -p 5432 -U gitlab -d gitlabhq_production
```

#### 3. 启动 Gitlab 容器

```shell
# 镜像拉取
docker pull sameersbn/gitlab:latest

# 启动gitlab容器
docker run --name gitlab -d \
    --link gitlab-postgresql:postgresql --link gitlab-redis:redisio \
    --publish 10022:22 --publish 10080:80 \
    --env 'GITLAB_PORT=10080' --env 'GITLAB_SSH_PORT=10022' \
    --env 'GITLAB_SECRETS_DB_KEY_BASE=long-and-random-alpha-numeric-string' \
    --env 'GITLAB_SECRETS_SECRET_KEY_BASE=long-and-random-alpha-numeric-string' \
    --env 'GITLAB_SECRETS_OTP_KEY_BASE=long-and-random-alpha-numeric-string' \
    --volume /srv/docker/gitlab/gitlab:/home/git/data \
    sameersbn/gitlab:latest
```

#### 4. 访问10080端口

> 访问地址 [http://192.168.99.100:10080/](http://192.168.99.100:10080/) 理论上可以见到初始化更改密码的界面了，注意ip改成运行docker的机器ip

> **_`Tips`_**: 这里会有个坑，理论上启动了gitlab容器之后就能立即访问的，但实际上却是`502`响应，其实是 gitlab 正在执行初始化过程，需要一定的时间，稍等一两分钟再访问即可...

-----

### 二、使用docker-compose进行启动

> **强烈推荐**
<br>docker-compose 类似于 node 使用 package.json， php 使用 composer.json 的方式，是通过配置文件管理依赖的方法。具体文档见 [https://docs.docker.com/compose/](https://docs.docker.com/compose/)，使用方法如下

```shell
# 根据 docker-compose.xml 启动docker 容器
# -c 指定启动的配置文件路径
docker-compose -f docker-compose.xml up
```

大神已经写好了docker-compose.xml启动文件，我们下载下来

```shell
wget https://raw.githubusercontent.com/sameersbn/docker-gitlab/master/docker-compose.yml
```

该文件内容如下，省略了部分不必要的变量，是能跑起来的最简设置：

```shell
version: '2'

services:
  redis:
    restart: always
    image: sameersbn/redis:latest
    # 如果拉取失败，呵呵，换用下面的阿里云源即可
    # image: registry.cn-hangzhou.aliyuncs.com/acs-sample/redis-sameersbn
    volumes:
    - /srv/docker/gitlab/redis:/var/lib/redis:Z

  postgresql:
    restart: always
    image: sameersbn/postgresql:latest
    # 如果拉取失败，呵呵，换用下面的阿里云源即可
    # image: registry.cn-hangzhou.aliyuncs.com/acs-sample/postgresql-sameersbn
    volumes:
    - /srv/docker/gitlab/postgresql:/var/lib/postgresql:Z
    environment:
    - DB_USER=gitlab
    - DB_PASS=password
    - DB_NAME=gitlabhq_production
    - DB_EXTENSION=pg_trgm

  gitlab:
    restart: always
    image: sameersbn/gitlab:latest
    # 如果拉取失败，呵呵，换用下面的阿里云源即可
    # image: registry.cn-hangzhou.aliyuncs.com/acs-sample/gitlab-sameersbn
    depends_on:
    - redis
    - postgresql
    ports:
    - "10080:80"
    - "10022:22"
    volumes:
    - /srv/docker/gitlab/gitlab:/home/git/data:Z
    environment:
    # - DEBUG=false

    # postgresql 配置
    - DB_ADAPTER=postgresql
    - DB_HOST=postgresql
    - DB_PORT=5432
    - DB_USER=gitlab
    - DB_PASS=password
    - DB_NAME=gitlabhq_production

    # redis 配置
    - REDIS_HOST=redis
    - REDIS_PORT=6379

    # 端口配置
    - GITLAB_PORT=10080
    - GITLAB_SSH_PORT=10022

    # CI 所使用的加密密钥
    - GITLAB_SECRETS_DB_KEY_BASE=long-and-random-alphanumeric-string
    # Session 加密密钥
    - GITLAB_SECRETS_SECRET_KEY_BASE=long-and-random-alphanumeric-string
    # 数据库2FA密钥
    - GITLAB_SECRETS_OTP_KEY_BASE=long-and-random-alphanumeric-string

    # restart=always 配置容器退出后自动重启
```

#### 开始启动

```shell
# 启动配置中的所有依赖容器
docker-compose -f docker-compose.xml up

# 或者加上 -d 参数以后台 daemon 形式运行，但就看不到初始化过程了
# docker-compose -f docker-compose.xml up -d

# 顺利的话就开始执行初始化操作，步骤如下
# 1. postgresql
# 2. redis
# 3. gitlab
```

控制台会输出当前初始化过程，时间有点长，如果没完成就访问的话会报 `502` ，上面也提到过，等待1-2分钟即可

> **_`Tips`_**: 启动的时候很可能在镜像拉取的时候失败，原因你知道的，The Grate Wall ，解决方法也很简单，翻墙，或者，将上买呢配置文件中的 image 字段改为注释里写的阿里云源即可。


## 开始体验

> 访问你装有 Docker 的机器ip:10080端口，我的是[http://192.168.99.100:10080/](http://192.168.99.100:10080/)，注意不是127.0.0.1，因为你的Docker环境IP可能是独立的，看看发什么什么吧~


![gitlab success running](https://ww1.sinaimg.cn/large/71405cably1ffdzq63rm5j21lg0x2tec.jpg)




最后 : 放 Gitlab CE 源码地址 [https://github.com/gitlabhq/gitlabhq](https://github.com/gitlabhq/gitlabhq)， 有兴趣的同学可以不用Docker环境，完全自己搭建一套试一试 ಥ_ಥ

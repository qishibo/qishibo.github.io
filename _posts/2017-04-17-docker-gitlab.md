---
layout: post
title: 基于Docker的Gitlab服务器搭建
comments: 1
code: 1
keywords: Gitlab环境搭建, Docker, Gitlab, docker-compose
description: 手动搭建Gitlab个人仓库，基于Docker，避免每次Ruby配置想死的冲动...建议使用工具docker-compose
tags: [gitlab,docker,opensource]
---

**是不是每个爱折腾的人都有搭建一套自己的Gitlab服务器的冲动~** 哼哼，我就是一个爱折腾的人，曾经也搭建过Gitlab环境，装Redis，装PostgreSQL，装Ruby，装Gitlab，，，尤其是配置Ruby环境跑Gitlab的时候，卧槽那个坑！不过今天，我再次搭建Gitlab服务，用的是大神已经配置好的Gitlab Docker镜像，哈哈，轻松极了~

Docker环境用的是Mac 下的[docker-machine](https://docs.docker.com/machine/)，其他环境如Linux、Windows也有对应的Docker一键环境，很方便的，这里我们重点讨论的不是如何搭建Docker环境，所以这里略过。

<br>

Gitlab的Docker镜像已经由印度大牛做好，地址 [https://github.com/sameersbn/docker-gitlab](https://github.com/sameersbn/docker-gitlab)， 其实里面已经说明了如何使用该环境，这里我相当于转述和完善一下而已。

> 该镜像做了四件事：
>
> 1. 建立Redis环境 [sameersbn/redis]
> 2. 建立PostgreSQL环境 [sameersbn/postgresql:9.6-2]
> 3. 建立Ruby环境和Gitlab [sameersbn/gitlab]
> 4. 把各个镜像跑起来形成最终环境，开放端口供使用

> PS: 上面的redis、postsql、gitlab用的是作者自己的镜像，其实完全也可以换用官方的镜像，只不过他自己的有一些环境变量设置，和该gitlab镜像更加适配，便于我们使用而已。

## 实现步骤

### 一、完全手动安装执行 [不推荐]

```shell
    # docker pull 进行镜像下载
    1. docker pull sameersbn/gitlab:9.0.5
    2. docker pull sameersbn/gitlab:latest
    3. docker build -t sameersbn/gitlab github.com/sameersbn/docker-gitlab

    # 启动sameersbn/postgresql:9.6-2 镜像
    4. docker run --name gitlab-postgresql -d \
    --env 'DB_NAME=gitlabhq_production' \
    --env 'DB_USER=gitlab' --env 'DB_PASS=password' \
    --env 'DB_EXTENSION=pg_trgm' \
    --volume /srv/docker/gitlab/postgresql:/var/lib/postgresql \
    sameersbn/postgresql:9.6-2

    # 启动sameersbn/redis:latest 镜像
    5. docker run --name gitlab-redis -d \
    --volume /srv/docker/gitlab/redis:/var/lib/redis \
    sameersbn/redis:latest

    # 启动sameersbn/gitlab:9.0.5 镜像
    6. docker run --name gitlab -d \
    --link gitlab-postgresql:postgresql --link gitlab-redis:redisio \
    --publish 10022:22 --publish 10080:80 \
    --env 'GITLAB_PORT=10080' --env 'GITLAB_SSH_PORT=10022' \
    --env 'GITLAB_SECRETS_DB_KEY_BASE=long-and-random-alpha-numeric-string' \
    --env 'GITLAB_SECRETS_SECRET_KEY_BASE=long-and-random-alpha-numeric-string' \
    --env 'GITLAB_SECRETS_OTP_KEY_BASE=long-and-random-alpha-numeric-string' \
    --volume /srv/docker/gitlab/gitlab:/home/git/data \
    sameersbn/gitlab:9.0.5
```

### 二、使用docker-compose进行启动 [推荐]

> `docker-compose.xml`类似于node的`package.json`  或者 php的`composer.json`，是一组依赖和操作的集合，比如可以将步骤1、步骤2写成配置文件，然后每次`docker-compose -f docker-compose.xml up`即可启动对应的镜像并执行操作，具体文档见[https://docs.docker.com/compose/](https://docs.docker.com/compose/)

大神已经写好了docker-compose.xml启动文件，我们下载下来

`wget https://raw.githubusercontent.com/sameersbn/docker-gitlab/master/docker-compose.yml`

该文件内容如下：

```docker
version: '2'

services:
  redis:
    restart: always
    image: sameersbn/redis:latest
    command:
    - --loglevel warning
    volumes:
    - /srv/docker/gitlab/redis:/var/lib/redis:Z

  postgresql:
    restart: always
    image: sameersbn/postgresql:9.6-2
    volumes:
    - /srv/docker/gitlab/postgresql:/var/lib/postgresql:Z
    environment:
    - DB_USER=gitlab
    - DB_PASS=password
    - DB_NAME=gitlabhq_production
    - DB_EXTENSION=pg_trgm

  gitlab:
    restart: always
    image: sameersbn/gitlab:9.0.5
    depends_on:
    - redis
    - postgresql
    ports:
    - "10080:80"
    - "10022:22"
    volumes:
    - /srv/docker/gitlab/gitlab:/home/git/data:Z
    environment:
    - DEBUG=false

    - DB_ADAPTER=postgresql
    - DB_HOST=postgresql
    - DB_PORT=5432
    - DB_USER=gitlab
    - DB_PASS=password
    - DB_NAME=gitlabhq_production

    - REDIS_HOST=redis
    - REDIS_PORT=6379

    - TZ=Asia/Kolkata
    - GITLAB_TIMEZONE=Kolkata

    - GITLAB_HTTPS=false
    - SSL_SELF_SIGNED=false

    - GITLAB_HOST=localhost
    - GITLAB_PORT=10080
    - GITLAB_SSH_PORT=10022
    - GITLAB_RELATIVE_URL_ROOT=
    - GITLAB_SECRETS_DB_KEY_BASE=long-and-random-alphanumeric-string
    - GITLAB_SECRETS_SECRET_KEY_BASE=long-and-random-alphanumeric-string
    - GITLAB_SECRETS_OTP_KEY_BASE=long-and-random-alphanumeric-string

    - GITLAB_ROOT_PASSWORD=
    - GITLAB_ROOT_EMAIL=

    - GITLAB_NOTIFY_ON_BROKEN_BUILDS=true
    - GITLAB_NOTIFY_PUSHER=false

    - GITLAB_EMAIL=notifications@example.com
    - GITLAB_EMAIL_REPLY_TO=noreply@example.com
    - GITLAB_INCOMING_EMAIL_ADDRESS=reply@example.com

    - GITLAB_BACKUP_SCHEDULE=daily
    - GITLAB_BACKUP_TIME=01:00

    - SMTP_ENABLED=false
    - SMTP_DOMAIN=www.example.com
    - SMTP_HOST=smtp.gmail.com
    - SMTP_PORT=587
    - SMTP_USER=mailer@example.com
    - SMTP_PASS=password
    - SMTP_STARTTLS=true
    - SMTP_AUTHENTICATION=login

    - IMAP_ENABLED=false
    - IMAP_HOST=imap.gmail.com
    - IMAP_PORT=993
    - IMAP_USER=mailer@example.com
    - IMAP_PASS=password
    - IMAP_SSL=true
    - IMAP_STARTTLS=false

    - OAUTH_ENABLED=false
    - OAUTH_AUTO_SIGN_IN_WITH_PROVIDER=
    - OAUTH_ALLOW_SSO=
    - OAUTH_BLOCK_AUTO_CREATED_USERS=true
    - OAUTH_AUTO_LINK_LDAP_USER=false
    - OAUTH_AUTO_LINK_SAML_USER=false
    - OAUTH_EXTERNAL_PROVIDERS=

    - OAUTH_CAS3_LABEL=cas3
    - OAUTH_CAS3_SERVER=
    - OAUTH_CAS3_DISABLE_SSL_VERIFICATION=false
    - OAUTH_CAS3_LOGIN_URL=/cas/login
    - OAUTH_CAS3_VALIDATE_URL=/cas/p3/serviceValidate
    - OAUTH_CAS3_LOGOUT_URL=/cas/logout

    - OAUTH_GOOGLE_API_KEY=
    - OAUTH_GOOGLE_APP_SECRET=
    - OAUTH_GOOGLE_RESTRICT_DOMAIN=

    - OAUTH_FACEBOOK_API_KEY=
    - OAUTH_FACEBOOK_APP_SECRET=

    - OAUTH_TWITTER_API_KEY=
    - OAUTH_TWITTER_APP_SECRET=

    - OAUTH_GITHUB_API_KEY=
    - OAUTH_GITHUB_APP_SECRET=
    - OAUTH_GITHUB_URL=
    - OAUTH_GITHUB_VERIFY_SSL=

    - OAUTH_GITLAB_API_KEY=
    - OAUTH_GITLAB_APP_SECRET=

    - OAUTH_BITBUCKET_API_KEY=
    - OAUTH_BITBUCKET_APP_SECRET=

    - OAUTH_SAML_ASSERTION_CONSUMER_SERVICE_URL=
    - OAUTH_SAML_IDP_CERT_FINGERPRINT=
    - OAUTH_SAML_IDP_SSO_TARGET_URL=
    - OAUTH_SAML_ISSUER=
    - OAUTH_SAML_LABEL="Our SAML Provider"
    - OAUTH_SAML_NAME_IDENTIFIER_FORMAT=urn:oasis:names:tc:SAML:2.0:nameid-format:transient
    - OAUTH_SAML_GROUPS_ATTRIBUTE=
    - OAUTH_SAML_EXTERNAL_GROUPS=
    - OAUTH_SAML_ATTRIBUTE_STATEMENTS_EMAIL=
    - OAUTH_SAML_ATTRIBUTE_STATEMENTS_NAME=
    - OAUTH_SAML_ATTRIBUTE_STATEMENTS_FIRST_NAME=
    - OAUTH_SAML_ATTRIBUTE_STATEMENTS_LAST_NAME=

    - OAUTH_CROWD_SERVER_URL=
    - OAUTH_CROWD_APP_NAME=
    - OAUTH_CROWD_APP_PASSWORD=

    - OAUTH_AUTH0_CLIENT_ID=
    - OAUTH_AUTH0_CLIENT_SECRET=
    - OAUTH_AUTH0_DOMAIN=

    - OAUTH_AZURE_API_KEY=
    - OAUTH_AZURE_API_SECRET=
    - OAUTH_AZURE_TENANT_ID=
```

然后执行`docker-compose up`即可启动【没有指定配置xml文件，会自动寻找当前目录的docker-compose.xml】

**访问你Docker 机器的10080端口【我的是[http://192.168.99.100:10080/](http://192.168.99.100:10080/)，注意不是127.0.0.1，因为你的Docker环境IP可能是独立的】，看看发什么什么吧~**

-------

`当然，如果你没有翻墙的话，镜像很可能会在下载阶段报错的，，毕竟伟大的墙还是存在的嘛。。所以 我改了改docker-compose.xml文件，使用阿里云的源来下载，这样快了很多~，更改后的xml文件如下`

```
version: '2'

services:
  redis:
    restart: always
    #image: sameersbn/redis:latest
    image: registry.cn-hangzhou.aliyuncs.com/acs-sample/redis-sameersbn
    command:
    - --loglevel warning
    volumes:
    - /srv/docker/gitlab/redis:/var/lib/redis:Z

  postgresql:
    restart: always
    #image: sameersbn/postgresql:9.6-2
    image: registry.cn-hangzhou.aliyuncs.com/acs-sample/postgresql-sameersbn
    volumes:
    - /srv/docker/gitlab/postgresql:/var/lib/postgresql:Z
    environment:
    - DB_USER=gitlab
    - DB_PASS=password
    - DB_NAME=gitlabhq_production
    - DB_EXTENSION=pg_trgm

  gitlab:
    restart: always
    #image: sameersbn/gitlab:9.0.4
    image: registry.cn-hangzhou.aliyuncs.com/acs-sample/gitlab-sameersbn
    depends_on:
    - redis
    - postgresql
    ports:
    - "10080:80"
    - "10022:22"
    volumes:
    - /srv/docker/gitlab/gitlab:/home/git/data:Z
    environment:
    - DEBUG=false

    - DB_ADAPTER=postgresql
    - DB_HOST=postgresql
    - DB_PORT=5432
    - DB_USER=gitlab
    - DB_PASS=password
    - DB_NAME=gitlabhq_production

    - REDIS_HOST=redis
    - REDIS_PORT=6379

    - TZ=Asia/Kolkata
    - GITLAB_TIMEZONE=Kolkata

    - GITLAB_HTTPS=false
    - SSL_SELF_SIGNED=false

    - GITLAB_HOST=localhost
    - GITLAB_PORT=10080
    - GITLAB_SSH_PORT=10022
    - GITLAB_RELATIVE_URL_ROOT=
    - GITLAB_SECRETS_DB_KEY_BASE=long-and-random-alphanumeric-string
    - GITLAB_SECRETS_SECRET_KEY_BASE=long-and-random-alphanumeric-string
    - GITLAB_SECRETS_OTP_KEY_BASE=long-and-random-alphanumeric-string

    - GITLAB_ROOT_PASSWORD=
    - GITLAB_ROOT_EMAIL=

    - GITLAB_NOTIFY_ON_BROKEN_BUILDS=true
    - GITLAB_NOTIFY_PUSHER=false

    - GITLAB_EMAIL=notifications@example.com
    - GITLAB_EMAIL_REPLY_TO=noreply@example.com
    - GITLAB_INCOMING_EMAIL_ADDRESS=reply@example.com

    - GITLAB_BACKUP_SCHEDULE=daily
    - GITLAB_BACKUP_TIME=01:00

    - SMTP_ENABLED=false
    - SMTP_DOMAIN=www.example.com
    - SMTP_HOST=smtp.gmail.com
    - SMTP_PORT=587
    - SMTP_USER=mailer@example.com
    - SMTP_PASS=password
    - SMTP_STARTTLS=true
    - SMTP_AUTHENTICATION=login

    - IMAP_ENABLED=false
    - IMAP_HOST=imap.gmail.com
    - IMAP_PORT=993
    - IMAP_USER=mailer@example.com
    - IMAP_PASS=password
    - IMAP_SSL=true
    - IMAP_STARTTLS=false

    - OAUTH_ENABLED=false
    - OAUTH_AUTO_SIGN_IN_WITH_PROVIDER=
    - OAUTH_ALLOW_SSO=
    - OAUTH_BLOCK_AUTO_CREATED_USERS=true
    - OAUTH_AUTO_LINK_LDAP_USER=false
    - OAUTH_AUTO_LINK_SAML_USER=false
    - OAUTH_EXTERNAL_PROVIDERS=

    - OAUTH_CAS3_LABEL=cas3
    - OAUTH_CAS3_SERVER=
    - OAUTH_CAS3_DISABLE_SSL_VERIFICATION=false
    - OAUTH_CAS3_LOGIN_URL=/cas/login
    - OAUTH_CAS3_VALIDATE_URL=/cas/p3/serviceValidate
    - OAUTH_CAS3_LOGOUT_URL=/cas/logout

    - OAUTH_GOOGLE_API_KEY=
    - OAUTH_GOOGLE_APP_SECRET=
    - OAUTH_GOOGLE_RESTRICT_DOMAIN=

    - OAUTH_FACEBOOK_API_KEY=
    - OAUTH_FACEBOOK_APP_SECRET=

    - OAUTH_TWITTER_API_KEY=
    - OAUTH_TWITTER_APP_SECRET=

    - OAUTH_GITHUB_API_KEY=
    - OAUTH_GITHUB_APP_SECRET=
    - OAUTH_GITHUB_URL=
    - OAUTH_GITHUB_VERIFY_SSL=

    - OAUTH_GITLAB_API_KEY=
    - OAUTH_GITLAB_APP_SECRET=

    - OAUTH_BITBUCKET_API_KEY=
    - OAUTH_BITBUCKET_APP_SECRET=

    - OAUTH_SAML_ASSERTION_CONSUMER_SERVICE_URL=
    - OAUTH_SAML_IDP_CERT_FINGERPRINT=
    - OAUTH_SAML_IDP_SSO_TARGET_URL=
    - OAUTH_SAML_ISSUER=
    - OAUTH_SAML_LABEL="Our SAML Provider"
    - OAUTH_SAML_NAME_IDENTIFIER_FORMAT=urn:oasis:names:tc:SAML:2.0:nameid-format:transient
    - OAUTH_SAML_GROUPS_ATTRIBUTE=
    - OAUTH_SAML_EXTERNAL_GROUPS=
    - OAUTH_SAML_ATTRIBUTE_STATEMENTS_EMAIL=
    - OAUTH_SAML_ATTRIBUTE_STATEMENTS_NAME=
    - OAUTH_SAML_ATTRIBUTE_STATEMENTS_FIRST_NAME=
    - OAUTH_SAML_ATTRIBUTE_STATEMENTS_LAST_NAME=

    - OAUTH_CROWD_SERVER_URL=
    - OAUTH_CROWD_APP_NAME=
    - OAUTH_CROWD_APP_PASSWORD=

    - OAUTH_AUTH0_CLIENT_ID=
    - OAUTH_AUTH0_CLIENT_SECRET=
    - OAUTH_AUTH0_DOMAIN=

    - OAUTH_AZURE_API_KEY=
    - OAUTH_AZURE_API_SECRET=
    - OAUTH_AZURE_TENANT_ID=

```

主要改了3行，把对应的image镜像地址改为`registry.cn-hangzhou.aliyuncs.com`阿里云而已。

然后再次执行`docker-compose up` ，访问 `Docker machine IP:10080`看看有什么神奇吧~


附截图 [http://192.168.99.100:10080/]， 如果实在访问失败的话，手动登进Docker机器里`curl localhost:80`也是能验证的哦:

![gitlab success running](http://ww1.sinaimg.cn/large/71405cably1feprr3mvmjj20yp0odtbv.jpg)




PS : 最后放Gitlab CE源码地址 [https://github.com/gitlabhq/gitlabhq](https://github.com/gitlabhq/gitlabhq)， 有兴趣的同学可以不用Docker环境，完全自己搭建一套试一试 ಥ_ಥ

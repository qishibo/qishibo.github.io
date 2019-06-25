---
layout: post
title: 如何用免费的方式让网站支持HTTPS
comments: 1
code: 1
keywords: HTTPS, Let's Encrypt, 免费https证书, 升级https
description: 简单几步, 让你的网站、个人博客支持HTTPS访问, 让你看到熟悉的绿色小锁头
tags: [https, nginx]
---

前两天,用4G访问自己的博客的时候,发现右下角出现了那个可恶的"流量球",相信大家肯定有见过的,显而易见,这是运营商劫持了我的流量,并且给网站注入了一些内容,以此来推销他们的套餐. 作为一个有理想的咸鱼,怎么能让运营商如此肆意妄为?于是乎,开始了我的博客https改造之路.


## 实现原理
使用 [Let's Encrypt](https://letsencrypt.org/) 提供的免费证书, 放到自己博客服务器中, 并且在nginx配置好证书路径, 这样使用浏览器访问的时候就会见到熟悉的绿色小锁头了. 需要注意证书必须颁发给某个域名, 所以ip地址无效.
> Tips: 如果是 [GitHub Pages](https://pages.github.com/) 搭建的博客, 由于Pages的服务器我们无法控制, 所以只能通过其他方式实现, 文章结尾会专门说明.

## 实现步骤

### 1. 证书申请

1.1 安装工具certbot, 实际上就是一个bash文件, 他会帮你执行复杂的操作

```bash
git clone https://github.com/certbot/certbot
cd certbot
chmod +x certbot-auto

# certbot-auto 即为自动化脚本工具, 他会判断你的服务是nginx还是apache, 然后执行对应逻辑
./certbot-auto --help
```

1.2 生成证书

> 由于我的服务器是在运行中, 所以我只需要生成证书, 然后手动配置即可


```bash
# webroot代表webroot根目录模式, certonly代表只生成证书 邮箱亲测没啥大用, 域名一定要和自己要申请证书的域名一致
./certbot-auto certonly --webroot --agree-tos -v -t --email 你的邮箱 -w 服务器根目录 -d 你要申请的域名

# 实际如下 用 qii404.me 域名做测试, 实际需换为你的域名
./certbot-auto certonly --webroot --agree-tos -v -t --email qii404@126.com -w /usr/share/nginx/html/ -d qii404.me
```

然后会在`/etc/letsencrypt/`目录下生成如下目录结构

```
/etc/letsencrypt/
├── accounts
│   └── acme-v01.api.letsencrypt.org
│       └── directory
├── archive
│   └── qii04.me
│       ├── cert1.pem
│       ├── chain1.pem
│       ├── fullchain1.pem
│       └── privkey1.pem
├── csr
│   └── 0000_csr-certbot.pem
├── keys
│   └── 0000_key-certbot.pem
├── live
│   └── qii04.me
│       ├── cert.pem -> ../../archive/qii04.me/cert1.pem
│       ├── chain.pem -> ../../archive/qii04.me/chain1.pem
│       ├── dhparams.pem
│       ├── fullchain.pem -> ../../archive/qii04.me/fullchain1.pem
│       ├── privkey.pem -> ../../archive/qii04.me/privkey1.pem
│       └── README
├── renewal
│   └── qii04.me.conf
└── renewal-hooks
    ├── deploy
    ├── post
    └── pre
```

你所需要的证书其实是在`/etc/letsencrypt/live/qii404.me/`目录中的

`fullchain.pem`可以看作是证书公钥, `privkey.pem`是证书私钥, 是我们下面需要使用到的两个文件.

### 2. 证书配置

需要配置nginx, 使其支持https即443端口的访问, 同时需要把证书路径配置进去, 才能生效.

> 编辑`/etc/nginx/sites-enabled/default`配置文件, 当然路径可能和我的不一样，也可能直接写在了`/etc/nginx/nginx.conf`里，将下面的443 server部分追加到配置中即可（和80端口的server并列的位置）。当然环境不同，直接复制可能会导致`location`部分有问题，最简单的办法是复制你自己80端口的server中`location`配置一份，替换下面443中的location配置即可。

```conf
# https 443端口配置
server{
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;

    server_name _;

    # 此处需要改为你的代码root目录 和80端口root一致即可
    root /usr/share/nginx/html;
    index index.php index.html index.htm

    # 打开ssl传输
    ssl on;
    # 配置公钥路径
    ssl_certificate "/etc/letsencrypt/live/qii404.me/fullchain.pem";
    # 配置私钥路径
    ssl_certificate_key "/etc/letsencrypt/live/qii404.me/privkey.pem";

    # 下面因人而异，直接把80端口的所有location配置复制到此处即可
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass 127.0.0.1:9000;
    }
}
```

80和443共存结构如下

```conf
# 80端口配置
server{
    listen 80;
    root xxx;

    location / {
        xxx;
    }
}

# https 443端口配置
server{
    listen 443;
    root xxx;

    ssl on;
    # 配置公钥路径
    ssl_certificate "/etc/letsencrypt/live/qii404.me/fullchain.pem";
    # 配置私钥路径
    ssl_certificate_key "/etc/letsencrypt/live/qii404.me/privkey.pem";

    location / {
        xxx;
    }
}
```


### 3. 重启 nginx

```bash
sudo service nginx restart
```

## HTTPS验证

重启nginx之后, 再次访问你的网站地址, https://你的域名, 如 https://qii404.me, 看看会不会出现小绿锁头吧~

![https验证通过标志](https://imgup.qii404.me/blog/5d11c0c7c8bb0.jpg)

> Tips: 如果完成上述操作后浏览器还是没有绿色锁头, 可能是因为你的网站中有一些资源如css、img、js引用的地址是http方式的, 这种情况下即使你的网站地址是https, 但只要有一个标签src属性是非https方式, 浏览器就会提示不安全, 绿色小锁头就不会出现. 所以, 必须得保证你的站点及站点引用的所有资源必须为https方式才行.

## 关于使用GithubPages搭建的个人博客

&nbsp;&nbsp;&nbsp;&nbsp;其实我的博客就是搭建在 [Pages](https://pages.github.com/)上的, 地址[https://github.com/qishibo/qishibo.github.io](https://github.com/qishibo/qishibo.github.io) , 但是添加证书这种操作我们是没有办法在人家的服务器上进行的, 所以不能直接复述上述操作.

间接方法是使用CDN, 然后添加自己域名的CNAME到CDN域名, 实际上就是访问你的域名时, 会转到CDN域名进行访问, 也就是访问CDN域名等价于在访问你的域名, 这时候CDN上如果配置了证书的话, 一样会出现绿色的小锁头.

目前用的是 [又拍云](https://www.upyun.com/products/cdn)的免费cdn服务, PS 这真不是一个广告, 哈哈, 新用户送一张61块钱的代金券, 够使用好长时间了, 然后再在上面使用 [证书服务](https://www.upyun.com/products/ssl) 可以申请一个免费的 Let's Encrypt 证书, 然后cdn服务配合ssl证书就实现了https访问.

![又拍云ssl证书申请](https://imgup.qii404.me/blog/5d11c0c83c250.jpg)

但目前的**坑**是又拍云的cdn有效期只能有三个月, 三个月后免费的这个就失效了, 即使你花钱续费, 续费的有效期也是三个月而已, 所以需要一直关注, 比较蛋疼; 并且,,,,,重要的一点, 他的cdn服务需要域名备案...


## 写在最后

[Let's Encrypt](https://letsencrypt.org/) 提供了各个版本系统、各个web server的申请方式, 如果有兴趣, 可以自己实现更多定制化的需求, 官网 [https://certbot.eff.org/](https://certbot.eff.org/), 官方说明如下图所示,
 ![certbot工具](https://imgup.qii404.me/blog/5d11c0c8d7f3b.jpg)

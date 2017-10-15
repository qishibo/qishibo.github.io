---
layout: post
title: nginx php文件显示空白
comments: 1
code: 1
keywords: nginx, php-fpm, php文件空白
description: nginx下html文件显示正常，php文件显示空白，并且fpm报错ERROR: failed to retrieve TCP_INFO for socket: Invalid argument (22)
tags: [nginx, fpm, wsl]
---

今天在bash on windows鼓捣php环境的时候偶然遇到一个坑，就是nginx启动以后，访问index.html可以正常显示，但访问index.php的时候页面一片空白，啥都没有！根据以往在linux下的经验，我的配置完全正确，肯定可行，但在wsl下却跑不通，摸索过程记录如下。

## 复现情景

### nginx

正常启动，配置如下（其实就是wsl下apt安装的nginx默认配置），

> Tips: 贴上在wsl下启动nginx的坑：

> - fastcig_pass不能像linux下一样使用套接字：`unix:/var/run/php5-fpm.sock`，所以只能让fpm监听端口，然后fastcig_pass监听端口即可
> - 不能使用master模式（master模式即nginx会fork出n多salve进程处理请求，master只做管理），这根wsl下的fork限制有关，所以必须在nginx.conf最外面关闭，可以在`worker_processes`后面加上这句 `master_process off;`

```ini

location / {
        # First attempt to serve request as file, then
        # as directory, then fall back to displaying a 404.
        try_files $uri $uri/ =404;
        # Uncomment to enable naxsi on this location
        # include /etc/nginx/naxsi.rules
}

location ~ \.php$ {
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
#       # NOTE: You should have "cgi.fix_pathinfo = 0;" in php.ini
#
#       # With php5-cgi alone:
        fastcgi_pass 127.0.0.1:9000;
#       # With php5-fpm:
        #fastcgi_pass unix:/var/run/php5-fpm.sock;
        fastcgi_index index.php;
}

```

### fpm

正常启动，监听9000端口

```ini
; 不使用sock
;listen = /var/run/php5-fpm.sock
listen = 127.0.0.1:9000
```

### index.php

随便写了个php文件

```php
<?php

phpinfo();
```

结果就是访问index.html文件正常，但访问index.php的时候页面空白，没有返回，查看access日志也是显示200，并没有错误。但如果查看fpm错误日志的话，会得到`ERROR: failed to retrieve TCP_INFO for socket: Invalid argument (22)`参数错误的提示。

## 解决方法

在nginx配置中`location ~ \.php$`模块里增加如下参数

```ini

# 主要增加如下两行
# 1、引入fastcgi相关参数，用于请求实现了fastcgi协议的守护进程，如fpm
include fastcgi_params;
# 2、重新定义 fastcgi的 SCRIPT_FILENAME参数， 因为如果要实现fastcgi协议，必须指定 SCRIPT_FILENAME 参数
fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;

# 更改之后为：

location ~ \.php$ {
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
#       # NOTE: You should have "cgi.fix_pathinfo = 0;" in php.ini
#
#       # With php5-cgi alone:
        fastcgi_pass 127.0.0.1:9000;
#       # With php5-fpm:
        #fastcgi_pass unix:/var/run/php5-fpm.sock;
        fastcgi_index index.php;

        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
}

```

重启nginx即可

## 问题探究

在nginx的fastcgi协议模式中，是需要指定运行文件位置的，即`SCRIPT_FILENAME`变量，这样fastcgi接口才能知道到底要去执行哪个文件，才能将这个文件路径作为参数正确请求fpm进行处理。然后wsl下默认的nginx配置是没有这句配置的，所以nginx不知道拿哪个文件去请求fpm，这样fpm就会报参数错误,`ERROR: failed to retrieve TCP_INFO for socket: Invalid argument (22)`，最终返回给nginx的内容为空白。

`SCRIPT_FILENAME` 如果不指定，默认值配置在`/etc/nginx/fastcgi_params`中，为`$request_filename`。我们在配置中使用`include fastcgi_params`这其实就是引入fastcgi实现的相关参数，后续nginx通过这些参数才可以去请求实现了fastcgi接口的守护进程，如fpm等。内容如下：

```conf
fastcgi_param   QUERY_STRING            $query_string;
fastcgi_param   REQUEST_METHOD          $request_method;
fastcgi_param   CONTENT_TYPE            $content_type;
fastcgi_param   CONTENT_LENGTH          $content_length;

# 这句指定了默认 $request_filename 如 index.php
fastcgi_param   SCRIPT_FILENAME         $request_filename;
fastcgi_param   SCRIPT_NAME             $fastcgi_script_name;
fastcgi_param   REQUEST_URI             $request_uri;
fastcgi_param   DOCUMENT_URI            $document_uri;
# 这句指定了 $document_root 如 /var/share/nginx/html/
fastcgi_param   DOCUMENT_ROOT           $document_root;
fastcgi_param   SERVER_PROTOCOL         $server_protocol;

fastcgi_param   GATEWAY_INTERFACE       CGI/1.1;
fastcgi_param   SERVER_SOFTWARE         nginx/$nginx_version;

fastcgi_param   REMOTE_ADDR             $remote_addr;
fastcgi_param   REMOTE_PORT             $remote_port;
fastcgi_param   SERVER_ADDR             $server_addr;
fastcgi_param   SERVER_PORT             $server_port;
fastcgi_param   SERVER_NAME             $server_name;

fastcgi_param   HTTPS                   $https if_not_empty;

# PHP only, required if PHP was built with --enable-force-cgi-redirect
fastcgi_param   REDIRECT_STATUS         200;
```

所以在不覆盖`SCRIPT_FILENAME`参数情况下默认值是`$request_filename`，即请求资源的路径，形如 index.php，这类似于相对路径，某些系统上nginx是找不到对应文件的；
然后我们加入的下面这句配置就是手动指定了实现fastcgi协议的 `SCRIPT_FILENAME` 参数，并且指定为了绝对路径

```conf
fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
```

即指定为`$document_root$fastcgi_script_name`，最终会被解析为`/usr/share/nginx/html/index.php`，这样nginx就会拿着正确的参数去请求fpm，fpm也就能正确返回了。

-----

总结起来就是解决很简单，贵在探究，嗯。

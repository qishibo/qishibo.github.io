---
layout: post
title: Nginx+PHP 实现带权限验证的静态文件服务
comments: 1
code: 1
keywords: Nginx+PHP静态文件服务 缩略图生成 fileserver
description: 基于Nginx+PHP实现的带权限验证的静态文件服务器，如某些情景需要校验参数后才能返回资源，或者缩略图生成等。
tags: [image, Nginx]
---

本文主要介绍基于Nginx+PHP实现的带权限验证的静态文件服务，如某些情景需要校验参数后才能进行文件下载，或者实现权限认证的图片请求，亦或是缩略图生成等静态文件服务相关。

## 实现原理

> 本质上是使用了`X-sendfile`功能实现，类似于直接借用系统`sendfile`命令，减少了数据拷贝操作，也减少了上下文切换，将文件直接通过代理服务器发送出去。

相比应用程序(PHP)读取文件到内存然后再通过echo方法输出到前端这种方法，极大地减少了内存开销(实际上这种方法本来就是不可取的，因为请求量大了会直接把服务器内存耗尽)，同时图片可以通过Etag等方法自动实现缓存机制，能够正常返回`304`头部，保证了静态文件服务器的性能。

## 实现步骤

### 1、Nginx配置

> 1、静态文件存储在`download`中，会被设置为`internal`，即只能内部访问不允许外部直接访问
<br>2、所有静态资源请求均打到PHP程序上，经过权限验证后才能访问


```nginx
# 图片真实存储路径 /download 禁止外部直接访问
location ^~ /download {
    internal;
    # alias可选 用于额外配置实际路径，即非download目录
    #alias  /home/qii/imgtest/download;
}

# 图片文件捕获 可以添加自己对应的静态资源后缀
location ~* \.(png|jpg|jpeg|gif)$ {
    #如果文件不存在,则rewrite到PHP脚本文件进行处理
    if (!-f $request_filename) {
        rewrite ^/.*$ /autoimg.php;
    }
    #如果文件存在,则设置过期时间，实际上是在PHP脚本文件处理后交给nginx时会到此逻辑
    if ( -f $request_filename ) {
        expires 30d;
    }
}

# pass PHP scripts to FastCGI server
#安全性考虑,文件服务器,只固定脚本文件的范围提交给php处理
location ~ autoimg.php$ {
    #fastcgi_pass   127.0.0.1:9000;
    fastcgi_pass unix:/var/run/php/php7.2-fpm.sock;
    #fastcgi_index  index.php;
    #fastcgi_param  SCRIPT_FILENAME  /var/www/http/filefs.domain.com$fastcgi_script_name;
    #include        /usr/local/Nginx/conf/fastcgi_params;
    include snippets/fastcgi-php.conf;
}
```

### 2、PHP处理脚本

```php
<?php
// autoimg.php

// 假设sign参数为校验参数，有该参数即可通过验证，否则不通过
if (!isset($_GET['sign'])) {
    exit('get img failed!');
}

// 图片真实存放路径
$imagePath = $_SERVER['DOCUMENT_ROOT'] . '/download/';

// 获取url中的图片名 如 http://localhost/111.jpg 获取值为111.jpg
$image = trim(parse_url($_SERVER['REQUEST_URI'])['path'], '/');

// 拼接图片真实全路径 如 /home/qii/imgtest/download/111.jpg
$fullPath = $imagePath . $image;

// 获取图片mime信息 设置Content-type头
$mime = getimagesize($fullPath)['mime'];
header("Content-Type: $mime");

// 设置sendfile头部，让nginx跳转到download下查找对应图片 相当于交给nginx进行后续处理
header("X-Accel-Redirect: /download/$image");
```

## 最终效果

文件结构最终如下

```bash
# 网站根目录　/home/qii/imgtest

/home/qii/imgtest
.
├── autoimg.php
└── download
    └── 111.jpg

1 directory, 2 files

```


- 访问路径为 `http://localhost/111.jpg?sign` 成功
- 访问路径为 `http://localhost/111.jpg` 失败
- 如直接访问 `http://localhost/download/111.jpg` 失败，因为download文件夹只能内部访问


## Nginx Rewrite分析

如果打开了Nginx的rewrite日志的话，可以看到如下信息：

```
.."^/.*$" matches "/111.jpg", .. request: "GET /111.jpg?sign ..
..rewritten data: "/autoimg.php", args: "sign", .. request: "GET /111.jpg?sign ..
```


1. 因为我们访问的是根目录 [http://localhost/111.jpg?sign](http://localhost/111.jpg?sign)，而图片实际存储在`download`文件夹中，所以nginx判断文件不存在则交给PHP脚本处理。
2. PHP处理完之后发给nginx一个`X-sendfile`头部，nginx此时便会跳转到真实图片路径并且判断图片存在，直接按照正常静态资源请求的方式返回图片。

-----------

## 缩略图实现

上述理解后，缩略图逻辑也不难实现，只需要更改PHP脚本为如下即可，主要增加了`file_exists`判断和生成缩略图的逻辑


```php
<?php

// 假设sign参数为校验参数，有该参数即可通过验证，否则不通过
if (!isset($_GET['sign'])) {
    exit('get img failed!');
}

// 图片真实存放路径
$imagePath = $_SERVER['DOCUMENT_ROOT'] . '/download/';

// 获取url中的图片名 如 http://localhost/111.jpg 获取值为111.jpg
$image = trim(parse_url($_SERVER['REQUEST_URI'])['path'], '/');

// 拼接图片真实全路径 如 /home/qii/imgtest/download/111.jpg
$fullPath = $imagePath . $image;

//////////////////////////////////

// 首次访问时，生成缩略图
if (!file_exists($fullPath)) {
    // 根据业务逻辑生成缩略图 伪逻辑，生成后放到 $fullPath 中
    file_put_contents($fullPath, 'img data...');
}

//////////////////////////////////

// 获取图片mime信息 设置Content-type头
$mime = getimagesize($fullPath)['mime'];
header("Content-Type: $mime");

// 设置sendfile头部，让nginx跳转到download下查找对应图片 相当于交给nginx进行后续处理
header("X-Accel-Redirect: /download/$image");

```

这样能够保证缩略图在首次访问时自动生成，再次访问时能够直接返回`304`状态码，不会重复生成。


## 说在最后


`X-sendfile`只是一个功能概述，并不是一个固定的header，每个代理服务器都有自己不同的实现，注意需要根据自己需要更改

|Wbe Server|Header|
|----|----|
|Nginx|X-Accel-Redirect|
|Apache|X-Sendfile|
|Lighttpd|X-LIGHTTPD-send-file|


并且`X-sendfile`也有自己的缺点，因为你把文件传输的权限交给了Web Server，这样你就失去了对文件传输的完全控制。比如只允许用户下载文件一次这种需求是没法做到的，因为PHP脚本无法知道下载是否成功，自然也就无法限定。


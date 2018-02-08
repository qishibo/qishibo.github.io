---
layout: post
title: Windows下Charles抓取Https时移动设备访问chls.pro/ssl无法安装证书，页面无响应
comments: 1
code: 1
keywords: charles http
description: Windows下，用Charles抓取Https请求时，Ios设备在请求chls.pro/ssl时无法安装移动证书，页面没有响应
tags: [charles, https]
---

情景是使用Charles抓取手机端Https请求，至于详细步骤，网上教程一大堆，请自行搜索。Mac下无此问题，本文适用的是Windows下移动设备无法安装证书的情景。

**需要注意的是**

1. 手机和PC要在同一wifi下
2. 抓包时Charles不能关闭
3. 手机wifi代理要设置为PC端ip

实际上，移动设备在安装Charles证书时，访问 [chls.pro/ssl](http://chls.pro/ssl) 无响应是因为PC端在装根证书时出现了错误，重新安装根证书即可，如下操作

1.PC端安装根证书

![](http://7xsudm.com1.z0.glb.clouddn.com/%E6%B7%B1%E5%BA%A6%E6%88%AA%E5%9B%BE_%E9%80%89%E6%8B%A9%E5%8C%BA%E5%9F%9F_20180208162325.png)

2.选择证书存储时一定注意要选择 **受信任的根证书颁发机构** 这个才行

![](http://7xsudm.com1.z0.glb.clouddn.com/QQ%E5%9B%BE%E7%89%8720180208162521.png)

3.手机链接PC代理后，Safari访问 [chls.pro/ssl](http://chls.pro/ssl) 安装证书即可

> 注意，如果是较新版本的ios，证书安装完毕后，还需要二次确认的过程， `设置`->`通用`->`关于本机`->`证书信任设置`->`打开 Charles Proxy CA 证书开关`

![](http://7xsudm.com1.z0.glb.clouddn.com/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20180208174349.jpg)



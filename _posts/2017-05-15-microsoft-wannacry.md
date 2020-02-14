---
layout: post
title: Windows勒索病毒WannaCry防护方法 | Windows关闭445端口
comments: 1
keywords: MS17-010, Windows关闭445端口, wannacry, windows 445
description: Windows 下勒索病毒 Wanna Cry 补丁安装方法，以及如何彻底修复MS17-010漏洞，并关闭危险445端口
tags: [windows, wanna cry]
---

5月12日侵袭全世界的“蠕虫式”勒索软件 WanaCry (也称作WannaCry或WanaCry0r 2.0)，已致中国部分行业企业内网、教育网大规模感染。这种病毒依靠美国国家安全局开发的核弹级侵入工具-深蓝  EternalBlue 在局域网内疯狂传播，即使没有连接外网也难以避免。也就是说，即使你没有点击病毒软件，只要和你一个局域网络的任何一个小白误点了病毒，那么整个网络内都会惨遭毒手。


![wanna cry](https://imgup.qii404.xyz/blog/5d11c0bbeb0b1.jpg)
<!-- ![haha](https://imgup.qii404.xyz/blog/5d11c0bc77c70.jpg){:style="width:40%"} -->

## 病毒传播原理

Windows下默认会打开`445`端口用于文件共享相关功能，但该端口一直存在漏洞，不幸的是微软官方之前也一直没有发现该漏洞。而核弹级蠕虫病毒-深蓝 正是通过该漏洞进行传播，它会在局域网内扫描445端口发现局域网内所有机器，并通过漏洞远程执行病毒程序，比如现在大家都看到过的文件加密勒索程序。

### 漏洞名称：

> Microsoft Windows SMB远程任意代码执行漏洞 (MS17-010)

### 漏洞描述：

> SMBv1 server 是其中的一个服务器协议组件。
<br>Microsoft Windows 中的SMBv1服务器存在远程代码执行漏洞。
<br>远程攻击者可借助特制的数据包利用该漏洞执行任意代码。
<!-- <br>以下版本受到影响：Microsoft Windows Vista SP2，Windows Server 2008 SP2和R2 SP1，Windows 7 SP1，Windows 8.1，Windows Server 2012 Gold和R2，Windows RT 8.1，Windows 10 Gold，1511和1607，Windows Server 2016。 -->

----

## 解决方法

立刻安装补丁

> Windows 于3月份其实已经发布了应对该漏洞的补丁，即使是已经宣布停止更新的XP系统也针对性的提供了补丁，所以一直打开自动更新的用户其实并没有什么危险的，危险的是一直关闭自动更新的那些用户，现在赶紧安装！

### Windows XP

Windows XP SP2 x64 :  [https://www.microsoft.com/en-us/download/details.aspx?id=55250](https://www.microsoft.com/en-us/download/details.aspx?id=55250)

Windows XP SP3 x86 : [https://www.microsoft.com/zh-CN/download/details.aspx?id=55245](https://www.microsoft.com/zh-CN/download/details.aspx?id=55245)

### Windows 2003

Windows Server 2003 SP2 x64 : [https://www.microsoft.com/zh-CN/download/details.aspx?id=55244](https://www.microsoft.com/zh-CN/download/details.aspx?id=55244)

Windows Server 2003 SP2 x86: [https://www.microsoft.com/zh-CN/download/details.aspx?id=55248](https://www.microsoft.com/zh-CN/download/details.aspx?id=55248)

### 其他

> 由于其他产品微软还支持补丁更新，所以打开更新程序手动更新即可
<br>或者手动去补丁下载页面自行下载安装，需要选择对应的Windows版本
<br>官方地址 [https://technet.microsoft.com/zh-cn/library/security/MS17-010](https://technet.microsoft.com/zh-cn/library/security/MS17-010)

------

## 彻底解决

> 安装上述补丁之后如果还不放心，那你就需要彻底解决该问题，怎么办呢？关闭漏洞依赖的对应端口即可，危险端口包括`445` `135 ` `137` `138` `139`，并`关闭文件共享`

### 关闭危险端口

#### 1. 左下角搜索框里输入“防火墙”，打开防火墙设置
![打开防火墙设置](https://imgup.qii404.xyz/blog/5d11c0bd1a420.jpg)

#### 2. 首先保证防火墙是启用的
![保证防火墙是启用的](https://imgup.qii404.xyz/blog/5d11c0bd9a1bc.jpg)

#### 3. 然后点击“高级设置”
![高级设置](https://imgup.qii404.xyz/blog/5d11c0be253d6.jpg)

#### 4. 在“入站规则”上右键-“新建规则”
![新建规则](https://imgup.qii404.xyz/blog/5d11c0be8c71f.jpg)

#### 5. 选择“端口”
![端口](https://imgup.qii404.xyz/blog/5d11c0bf2ed79.jpg)

#### 6. 选择“TCP”， “特定端口”输入 445,135,137,138,139
![输入 445，135，137，138，139](https://imgup.qii404.xyz/blog/5d11c0bfacfa6.jpg)

#### 7. 选择“阻止连接”
![阻止连接](https://imgup.qii404.xyz/blog/5d11c0c01f835.jpg)

#### 8. 默认选择三个域
![默认选择三个域](https://imgup.qii404.xyz/blog/5d11c0c085abb.jpg)

#### 9. 随便输入名称即可
![输入名称](https://imgup.qii404.xyz/blog/5d11c0c1177f2.jpg)

### 关闭 SMB 文件共享

#### 1. 左下角搜索 启用或关闭Windows功能
![启用或关闭Windows功能](https://imgup.qii404.xyz/blog/5d11c0c1968b9.jpg)

#### 2. 取消`SMB 1.0/CIFS文件共享支持`
> 需要重启

![取消](https://imgup.qii404.xyz/blog/5d11c0c2210b7.jpg)

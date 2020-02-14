---
layout: post
title: ssh自动登录 | ssh免密码登录
comments: 1
code: 1
keywords: ssh自动登录, ssh免密码登录, session clone, 克隆终端
description: ssh免密码登录，让你的终端像securtCRT一样支持session克隆，首次登陆过之后，再ssh直接自动登录
tags: [hacker]
---

经常远程登录服务器然后进行操作的程序猿童鞋们对于 ssh 肯定不会陌生，`ssh name@host`之后直接输入密码即可登录到远端主机，不过稍稍麻烦的地方是每次都需要输入密码，如果密码固定还好说，可以用终端的Trigger或者用Linux的expect自动输入密码；但如果是需要token的那种，每次都要输入固定密码前缀，然后再找出token输入，这样的话难免让人着急。

> 那么有没有类似于记住密码的那种功能呢？只登陆一次再开新tab就能免密登录呢
<br>或者类似secureCRT那样有个 clone session 的功能，直接能复制已经建立的连接呢

-----

当然是有的，作为一个懒惰的程序员，我已经帮你找好了，你有以下几种方法：

### 1. 使用secureCRT

> 没啥好说的，第一个tab需要输入密码，然后右键 clone session 即可复制当前连接到新tab
<br>_既适合固定密码，也适合token密码_

### 2. 使用iTem2

> iTem 支持自动交互，比如它检测到屏幕有 password: 时，会自动输入你设置好的内容
<br>_只是模拟人工输入而已，所以只支持固定密码_
<br>Perferences -> Profiles -> Advanced -> Triggers

![Triggers](https://imgup.qii404.xyz/blog/5d11c0c2a0ef8.jpg)
![Password](https://imgup.qii404.xyz/blog/5d11c0c35d6dd.jpg)

下次你 `ssh qishibo@10.10.10.10` 的时候，iTem就会自动输入122345\n，最后`\n`等价于Enter

### 3. 使用Expect 自动输入

> Expect 是Linux 下的自动输入工具，跟iTem的Trigger很像，它会检测屏幕输出，符合规则的话输入密码
<br> _同理，最适合与固定密码，不适合token密码_

```shell
#!/usr/bin/expect

# 执行ssh 登录命令
spawn ssh qishibo@10.10.10.10

# 检测屏幕输出，如果发现 password: 字样
expect "*password:"
# 就会自动输入 123456\n
send "123456\n"

# 恢复用户交互，用户可以继续登录后的操作
interact
```

### 4. sshConfig登录 - 强烈推荐

> 类似于Cookie的方式，哈哈，登录一次，再ssh连接的话直接登录，无需密码~
<br>我用的就是这个，_**既支持固定密码，也支持token密码**_

`vi ~/.ssh/config`, 没有的话则创建一个，将下面的内容写入

```conf
host *
ControlMaster auto
ControlPath ~/.ssh/master-%r@%h:%p
```

第一次登陆时放心的`ssh qishibo@10.10.10.10`输入你的密码，然后新打开一个tab，再 ssh qishibo@10.10.10.10 , 看看还需要密码么？是不是直接就登陆进去了~

>其实他会在`~/.ssh`目录中生成一个类似`master-qishibo@10.10.10.10:21`的文件，记录的就是你已经登陆过这个连接了，姑且把它看成Cookie吧，下次开新tab就能直接免密码了。

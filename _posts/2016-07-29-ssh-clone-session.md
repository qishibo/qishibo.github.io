---
layout: post
title: 免密码登陆，让终端像secureCRT一样支持session克隆
comments: 1
keywords: 免密码ssh, session clone, 克隆终端, secureCRT
description: 让你的终端像securtCRT一样支持session克隆，登陆过之后，下次直接免密码ssh
tags: [hacker]
---

用过跳板机【也有叫通道机、门神、中转机】的码农同学们肯定对ssh登陆不陌生，这种其实就是所谓的中介，通过他连接到我们的测试机或者线上机，从而进行相关操作。

>不过，这种登陆方式的密码一般不是固定的密码，通常是采用【固定密码+toke】的方式，即密码每次都不是固定的，那么终端中每次新打开一个tab都要重新输入固定密码，等待token变化，然后输入token，这样才能连接上，那么那么有没有类似于记住密码、只登陆一次再开新tab就不用输入的方法呢？？哈哈 ，作为一个懒惰的码农，我已经弄好了：


`vi ~/.ssh/config`, 没有的话则创建一个，将下面的内容写入

```
host *
ControlMaster auto
ControlPath ~/.ssh/master-%r@%h:%p
```

恩恩，效果实现了，第一次登陆时放心的`ssh 你的机器`输入你的密码+token【或者直接是密码】，然后新打开一个tab，直接`ssh 你刚才的机器`, 看看还需要密码么？是不是直接就登陆进去了~

>其实他会在`~/.ssh`目录中生成一个类似`master-xx@10.112.12.113:21`的文件，记录的就是你已经登陆过这个了，姑且把它看成cookie吧，下次开新tab就能直接免密码了。

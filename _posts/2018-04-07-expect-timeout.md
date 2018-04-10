---
layout: post
title: expect脚本执行异常，手动执行命令成功
comments: 1
code: 1
keywords: expect shell
description: 通过crontab执行的expect脚本，执行时异常，手动执行expect中的shell命令却执行成功
tags: [expect, shell]
---

情景是有个expect脚本，通过crontab定时去某台机器上rsync拉取数据作为备份。开始的时候运行正常，后来随着需要备份的数据变大之后发现脚本执行异常，并没有按照预期得到数据。更诡异的是如果不用脚本，而是通过手动执行rsync命令的话，一切正常。

## 问题复现

至于什么是`expect`，不多说，详细资料请自行谷歌

> 模拟人工与linux机器进行交互的工具，比如你通过脚本定时ssh登陆某台机器，执行过程中expect可以帮助你在出现`password`关键字的时候输入机器密码，从而完成登陆过程


脚本拉取逻辑如下：

```shell
#!/usr/bin/expect

# 通过rsync从 192.168.1.140 拉取数据，备份到本地文件夹中
spawn rsync -avzP  root@192.168.1.140:/root/gitlab-zh/data/backups/ /home/qii/gitlab_backup/

# 自动交互，需要密码时输入password
expect "*password:*"
send "YourPassword\r\n"

# 结束expect过程
expect eof
```

结果就是随着要备份文件的增大，脚本执行时并没有按照预期拉取成功，但手动执行脚本中的rsync语句却按照预期。


## 问题解决

查看了相关资料，找到了坑：

> The default timeout period is 10 seconds but may be set, for example to 30, by the command "set timeout 30".  An infinite timeout may be designated by the value -1.


expect脚本中有个超时的概念，默认是10秒，如果脚本执行时间超过10秒就会放弃当前响应体，从而导致rsync失败。解决方法也很简单，设置永不超时即可

```bash
#!/usr/bin/expect

# 设置永不超时
set timeout -1

# 或者设置具体的超时时间 单位 秒
set timeout 100

# 要执行的命令
```

恩，就是多加一句话的事，问题就解决了

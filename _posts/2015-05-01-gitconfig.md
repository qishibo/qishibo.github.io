---
layout: post
title: 一份好用的gitconfig
keywords: gitconfig, git, git高亮, git配置
description: 一份好用的gitconfig，我自己的配置，直接在家目录下.gitconfig
comments: 1
code: 1
tags: [git]
---

推荐一份好用的gitconfig，我是直接在家目录下写了个.gitconfig文件，内容如下：

`不过要记住，user里面的name和email要换成你自己的啊.`

```ini
# git的alias设置，比如想提交的时候直接git ci -m'xxx'
[alias]
    co = checkout
    ci = commit
    br = branch
    st = status
    di = diff

# 默认的用户名和邮箱[改成你自己的啊...]
[user]
    name = qii404
    email = qii404@126.com

# 默认的高亮设置，比如git diff、status、branch 的时候会高亮现实
[color]
    status = auto
    branch = auto
    diff = auto
    interactive = auto

# 如果你用用户名密码的方式进行认证，可以加上这个，这样只会在第一次的时候输入密码，以后就会记住了
[credential]
    helper = store

```



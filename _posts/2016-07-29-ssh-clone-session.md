---
layout: post
title: 让你的终端像securtCRT一样支持session克隆
comments: 1
keywords:
description: 让你的终端像securtCRT一样支持session克隆
tags: [hacker]
---

```
host *
ControlMaster auto
ControlPath ~/.ssh/master-%r@%h:%p
```

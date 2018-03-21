---
layout: post
title: Git提交时自动检测PHP文件是否有语法错误
comments: 1
code: 1
keywords: php check on git commit
description: 本地Git添加Hook钩子，提交时自动对修改的PHP文件进行语法检测，如果失败则无法继续Commit
tags: [githook, php]
---

老话题了，不过最近在公司普及[Gitlab](https://qii404.me/2017/04/17/docker-gitlab.html)的时候又提到了，索性就记录下来。原理是使用`php -l phpfile`对PHP文件进行语法检测，如果不通过的话，则无法继续Commit操作。

### 实现流程

> 只是为了避免低级错误提交到仓库


1. 在本地仓库中编辑`.git/hooks/pre-commit`文件，没有则建立，内容如下

    ```bash
    #!/bin/sh

    changed_files=`git diff-index --cached --name-only HEAD --`
    for f in $changed_files ;do
        ext=${f##*.}
        if test "$ext" = "php" ;then
            if test -e "$f";then
                php -l $f
            fi
        fi
    done

    ```
2. 更改权限`chmod +x .git/hooks/pre-commit`

<br>
故意提交一个错误语法试试，会见到报错信息，提交失败，修改后重新提交即可。

```bash
PHP Parse error:  syntax error, unexpected 'fsdafasdf' (T_STRING), expecting function (T_FUNCTION) in app/controllers/IndexController.php on line 21
Errors parsing app/controllers/IndexController.php
```

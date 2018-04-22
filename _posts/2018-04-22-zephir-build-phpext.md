---
layout: post
title: 使用zephir构建php拓展
comments: 1
code: 1
keywords: zephir php-extension
description: 通过使用zephir来构建自己的php拓展，简单方便，像写php代码一样构建拓展。
tags: [zephir, php, php-extension]
---

使用php拓展代替原生php代码来实现某些功能，这样效率必然会有明显的提升，尤其涉及到某些重复计算的特殊情景时。但传统的php拓展需要用c/c++实现，入门成本高，还容易造成内存泄露，对开发十分不友好。今天我们使用[zephir](https://github.com/phalcon/zephir)工具来构建拓展，让你像写php代码一样来写拓展。

## zephir简介

zephir是由开发[Phalcon](https://github.com/phalcon/cphalcon/)【费尔康，一款类似于[yaf](https://github.com/laruence/yaf)用拓展实现的框架，不过其设计思路更贴近现代框架】的团队在开发框架时，为了方便操作，自己实现的一套开发工具。该工具主要是为了摆脱php框架必须由c/c++实现的现状，让开发者能够使用一种高级语言的写法来实现拓展，从而实现高效开发。


## 安装

> 下面二选一，建议1

1. 自行编译

    ```bash
    git clone https://github.com/phalcon/zephir.git
    cd zephir
    ./install -c

    # 验证安装
    zephir help
    ```

2. composer 安装

    ```bash
    composer global require phalcon/zephir

    # 验证安装
    zephir help
    ```

## 创建拓展

1. 初始化

    ```bash
    # 初始化，会在当前目录下新增 myextension 文件夹
    zephir init myExtension

    cd myextension

    # 目录结构如下

    ├── config.json
    ├── ext
    └── myextension
    ```

2. 编写实现逻辑，新增 `myextension/my.zep`， 内容如下

    ```java
    // 命名空间，要和 myextension 文件夹相对应，并且必须为大驼峰形式
    namespace MyExtension;

    // 类名，要和文件名相对应，最好也为大驼峰形式
    class My
    {
        // 常量定义
        const MY_CONST = "qii404";

        // 静态方法定义
        public static function sum(int a, int b) -> int
        {
            return a+b;
        }

        // 对象方法定义
        public function who()
        {
            return "I am qii404";
        }
    }

    ```

    当前目录结构如下：

    ```bash
    .
    ├── compile-errors.log # 编译错误日志
    ├── compile.log # 编译日志
    ├── config.json
    ├── ext
    │   ├── acinclude.m4
    │   └── ...
    └── myextension
        └── my.zep # 业务实现代码

    ```

3. 进行编译

    ```bash
    zephir build

    # 如果看到如下输出，则说明编译成功
    Compiling...
    Installing...
    Extension installed!
    Don't forget to restart your web server
    ```

4. `php.ini`增加配置，注意自己更改的是cli的还是fpm的

    ```ini
    ...
    ; 增加如下
    extension=myextension.so
    ```

## PHP调用

```php
<?php
use MyExtension\My;

// 常量
var_dump(My::MY_CONST);

// 静态方法
var_dump(My::sum(11, 22));

// 实例方法
$a = new My();
var_dump($a->who());
```

会得到如下输出

```
string(6) "qii404"
int(33)
string(11) "I am qii404"
```

## 相关配置

执行`php --ri myextension`可以展示拓展详细情况，默认情况下如下：

```bash
myextension

myextension => enabled
Author =>
Version => 0.0.1
Build Date => Apr 22 2018 14:09:59
Powered by Zephir => Version 0.10.7-8059e66568
```

我们可以编辑`config.json`文件来更改相关信息和编译属性，详细信息请参考 [官方说明](https://github.com/phalcon/zephir-docs/blob/master/zh/config.rst)

```json
{
    ...
    # namespace
    "namespace": "myextension",
    # 名称
    "name": "myextension",
    # 描述
    "description": "this is a extension by qii404",
    # 作者
    "author": "qii404",
    # 版本
    "version": "0.1.1",
    "verbose": false,
    # 需要额外的拓展依赖
    "requires": {
        "extensions": []
    }

}
```

重新执行`zephir build`编译后，再执行`php --ri myextension`即可看到我们添加的作者信息:

```bash
myextension

this is a extension by qii404
myextension => enabled
Author => qii404
Version => 0.1.1
Build Date => Apr 22 2018 14:38:52
Powered by Zephir => Version 0.10.7-8059e66568
```

## 写在后面

上面只是简单举例说明了如何使用zephir编写拓展，作为一门特殊的”语言“， 还有许多细节去学习的，比如类型限定，方法调用，语法逻辑等，具体可以参考官方文档 [https://github.com/phalcon/zephir-docs/tree/master/zh](https://github.com/phalcon/zephir-docs/tree/master/zh) 来实践。

---
layout: post
title: create_function导致cpu占用激增的坑
comments: 1
code: 1
keywords: create_function, cpu占用, php, hhvm
description: 关于php+hhvm情境下使用create_function导致cpu占用激增的坑
tags: [php, hhvm]
---

工作生产环境是`hhvm` + `php5.2` ,是的，php版本有点低，然后在不支持Closure这类callback的情况下，用了`create_function`方法代替了callback，结果出坑了，线上机器cpu400%占用...

### 说说背景

比如`array_map`, `array_filter` 这类需要callback的函数，在php > 5.2情境下，完全可以跟js一样优雅的用匿名函数实现：

```php
$a = [1, 2, 3];

$b = array_map(function ($v){
    return $v * 2;
}, $a);

var_dump($b);

// result:
array(3) {
  [0] =>
  int(2)
  [1] =>
  int(4)
  [2] =>
  int(6)
}
```

当然，在5.2的情境下完全可以这么用

```php
$a = [1, 2, 3];

function double($v)
{
    return $v * 2;
}

$b = array_map('double', $a);

var_dump($b);
```

可是懒惰的我并不想额外定义一个function，然后再把函数名传进去，于是这么干的

```php
$a = [1, 2, 3];

$b = array_map(create_function('$v', 'return $v * 2;'), $a);

var_dump($b);
```

上面的方法都能实现，可是坑就在最后一种实现上出现了。

### 先科普一下HHVM：

> HHVM (HipHop Virtual Machine)会将PHP代码转换成高级别的字节码（通常称为中间语言）。然后在运行时通过即时（JIT）编译器将这些字节码转换为x64的机器码。在这些方面，HHVM十分类似与C#的CLR和Java的JVM。

就是说，HHVM会把php语句翻译成C++的代码，然后像执行C++代码一样去执行php，这样效率就会高很多。最终编译好的机器码会被缓存，重复使用。

然而，当你使用了`create_function`  `eval` 等等动态函数时，坑就来了，这样会导致hhvm重复、并且每次请求都会进行编译，因为这类函数的参数是`自定义的php代码字符串`，如 `eval('echo 555;')`,这样`每次请求重复编译代码，cpu占用就会蹭蹭的往上涨，涨到你想象不到的程度呢`...


> 所以，尽量或者杜绝在hhvm情境下使用eval 或者 create_function 函数，以免cpu废掉。

-------

### Tips:

还有几点需要在使用hhvm需要注意的，都会引起性能问题

> 1. global scope *未将代码放在函数内执行,不执行jit*
> 2. Exception
> 3. exit 函数

---
layout: post
title: php create_function导致cpu占用激增
comments: 1
code: 1
keywords: create_function cpu占用, create_function cause cpu usage, php, hhvm
description: 关于php+hhvm情境下使用create_function导致cpu占用增加的坑
tags: [php, hhvm]
---

工作生产环境是`hhvm` + `php5.2` ，是的，php版本有点低，然后在不支持 Closure [其实就是匿名函数] 这种作为 callback 函数的情况下，用了`create_function`方法代替了callback，结果出坑了，线上机器 cpu400% 占用...

## 说说背景

比如php中的`array_map`, `array_filter` 这类需要回调函数的函数，在php > 5.2情境下，完全可以跟javascript一样优雅的用匿名函数实现：

```php?start_inline=1
// 每个数组元素都乘以 2 的实现方法
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

当然，如果非要在php <= 5.2的情境下，也可以这么用

```php?start_inline=1
$a = [1, 2, 3];

function double($v)
{
    return $v * 2;
}

$b = array_map('double', $a);

var_dump($b);
```

可是懒惰的我并不想额外定义一个function，然后再把函数名传进去，毕竟不好看啊，于是这么干的

```php?start_inline=1
$a = [1, 2, 3];

$b = array_map(create_function('$v', 'return $v * 2;'), $a);

var_dump($b);
```

> 上面提到的三种都能实现，可是坑就在 **hhvm + php <= 5.2** 这个特定环境下，在最后一种方法上出现了，最终结果就是我的线上机器 **CPU 400%** 占用！！

### 科普一下HHVM：

> HHVM (HipHop Virtual Machine)会将PHP代码转换成高级别的字节码（通常称为中间语言）。然后在运行时通过即时（JIT）编译器将这些字节码转换为x64的机器码。在这些方面，HHVM十分类似与C#的CLR和Java的JVM。

## 原因分析

HHVM会把php语句翻译成C++代码，然后像执行C++代码一样去执行php，这样效率就会大大提升。并且最终编译好的机器码也会被缓存，重复使用，避免每次重新编译。

**然而**，当你使用了`create_function` 、 `eval` 等等动态函数时，坑就来了，这样会导致HHVM重复编译，并且是每次请求都会进行编译！！

因为这类函数的参数是`动态的php代码字符串`，如 `eval('echo 555;')`，解释器不知道你这样的动态代码会不会发生变化，所以干脆不缓存编译好的机器码，每次请求重新编译该部分，cpu占用就会蹭蹭的往上涨，涨到你想象不到的程度呢...

## 解决方法

> 没啥解决方法。。
<br>尽量或者杜绝在 HHVM 情境下使用 eval 或者 create_function 函数
<br>或者说只要是 PHP 代码就尽量避免，不管什么环境，以免cpu废掉

-------

## Tips:

还有几点是在使用 HHVM 时需要注意的，这些都可能会引起性能问题

> 1. global scope *未将代码放在函数内执行,不触发 Jit*
> 2. Exception
> 3. exit 函数

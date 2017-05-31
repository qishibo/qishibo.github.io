---
layout: post
title: simple-html-dom内存泄露的坑
comments: 1
code: 1
keywords: simple-html-dom, 内存泄露, 内存溢出
description: 关于用simple-html-dom解析html节点，内存泄露导致内存超限的问题
tags: [php]
---

**情景**： 后台抓取脚本，负责处理抓取到的HTML字符串，提取其中的某些dom元素进行处理。用到了simple-html-dom 这个开源库，主页在 [http://simplehtmldom.sourceforge.net](http://simplehtmldom.sourceforge.net/) ，主要用它将HTML字符串格式化成dom对象，然后对dom对象进行属性替换和内容读取。

后台是在循环里连续执行的嘛，可能需要处理几千几万个html结构，由于我的html字符串是本地存好的，所以直接用

`$html = str_get_html($content)`

来格式化dom，他会返回封装好的

`simple_html_dom`对象，

其中的子节点是

`simple_html_dom_node`对象，


并且每个子节点其中有个`$dom`属性，直接指向最上层的`simple_html_dom`对象，这样就形成了对象的环形引用，注意，*坑就是在这里出现的*。

---

首先说说什么是环形引用：

对于php版本`>=5.3`的来说，由于启用了新的垃圾回收机制，可能不太会出现内存溢出导致内存爆满的情况，但不幸的是，我所使用的环境是`php5.2`，这个版本的php垃圾回收还是简单的引用计数方式，所以对于这种环形引用的变量不能很好的进行资源回收。

他是这样产生的：

```php?start_inline=1
$a   = array( 'one' );
$a[] = & $a;
xdebug_debug_zval( 'a' );
```

以上例程的输出类似于：

```shell
a: (refcount=2, is_ref=1)=array (
   0 => (refcount=1, is_ref=0)='one',
   1 => (refcount=2, is_ref=1)=...
)
```

图示：

![image](http://php.net/manual/zh/images/12f37b1c6963c1c5c18f30495416a197-loop-array.png)

能看到数组变量 (a) 同时也是这个数组的第二个元素(1) 指向的变量容器中“refcount”为 2。上面的输出结果中的"..."说明发生了递归操作, 显然在这种情况下意味着"..."指向原始数组。

对$a变量进行unset操作之后

```php?start_inline=1
unset($a);
xdebug_debug_zval($a);
```

输出类似于：

```shell
(refcount=1, is_ref=1)=array (
   0 => (refcount=1, is_ref=0)='one',
   1 => (refcount=1, is_ref=1)=...
)
```

跟刚刚一样，对一个变量调用unset，将删除这个符号，且它指向的变量容器中的引用次数也减1。所以，如果我们在执行完上面的代码后，对变量$a调用unset, 那么变量 $a 和数组元素 "1" 所指向的变量容器的引用次数减1, 从"2"变成"1". 下例可以说明:

![image](http://php.net/manual/zh/images/12f37b1c6963c1c5c18f30495416a197-leak-array.png)

这样，其实$a变量已经不需要了，但是由于他的ref_count还是1，并不为0，对于php5.3以下的版本来说，单纯的引用计数垃圾回收认为这个变量还是有用的，所以不会被回收，内存也不会被释放。

类似上面的`对象元素有对自身的引用，即形成了环形引用`，数组也是一样，这样的结构在单纯的计数垃圾回收机制中是不可被释放的，随着程序执行时间的增加，内存占用也会一直增加，直至达到限制。

*至于新的垃圾回收机制怎么实现对环形引用的回收，本文不做过多阐述，请参考[标色模拟](http://php.net/manual/zh/features.gc.collecting-cycles.php)*

---

好了，知道了环形引用的结构，我们就知道为什么在php5.2版本中使用simple-html-dom可能会造成的内存泄露的原因了。

解决办法也很简单：

```php?start_inline=1
// 我的逻辑是在循环里的，所以初始化simple_html_dom对象的次数非常多
foreach ($xxx as $x){
    $html = str_get_html('<html><body><div><img src="xxx"></div></body></html>');
    // ... 逻辑处理
    // 逻辑结束，需要进入到下一次循环中，这时候需要执行clear方法，清理掉本次使用的对象，防止内存泄露
    $html->clear();
}
```

> 关键就在于`$html->clear()`这里

其实，在simple_html_dom的clear方法中，人家特意标明了是专门为了解决环形引用的问题，只是当时用的时候没注意看而已。。诶

![image](http://ww3.sinaimg.cn/large/71405cabjw1f59kzioi0sj20v80akt9x.jpg)

好了，问题就这样愉快的解决了，我再跑脚本，跑他成千上万次，跑他到地老天荒都没问题了😄



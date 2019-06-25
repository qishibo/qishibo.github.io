---
layout: post
title: simple-html-dom内存泄露的坑
comments: 1
code: 1
keywords: simple-html-dom内存泄漏, simple-html-dom memory
description: 关于用simple-html-dom解析html节点，内存泄露导致程序退出的问题
tags: [php]
---

后台抓取脚本，负责处理抓取到的 HTML 字符串，提取其中的某些 dom 元素进行处理。用到了simple-html-dom 这个开源库，主页在 [http://simplehtmldom.sourceforge.net](http://simplehtmldom.sourceforge.net/) ，主要用它将HTML字符串格式化成 dom 对象，然后对 dom 对象进行属性替换和内容读取。

## 基本用法


```php?start_inline=1

// 假设这是要处理的html字符串
$content = '<div><p>hello</p><p>world</p></div>';

// 将给定的字符串进行格式化，返回 simple_html_dom 对象
$html = str_get_html($content);

foreach($html->find('p') as $element) {
	var_dump($element->text());
}

```

> `$html`是封装好的 simple_html_dom 对象，类似于浏览器渲染的树状dom结构，顶层节点包含底层节点 [simple_html_dom_node对象] 的引用，底层节点也包含顶层节点的引用，有点像双向链表，通过 $children $parent 等属性可以互相追溯节点。

## 情景复现

```php?start_inline=1

// 我的逻辑是在循环里的，所以初始化 simple_html_dom 对象的次数非常多
// 循环10000次模拟大量处理
foreach ($i= 0; $i < 10000; $i ++;){
    $html = str_get_html('<html><body><div><img src="xxx"></div></body></html>');
    // ... 逻辑处理
    var_dump($html);


    // 逻辑结束 继续下一次循环处理
}

```

我的脚本是在后台执行，每次可能处理成千上万个 HTML 结构，所以每次都会重复上述代码，这时候问题就来了：脚本没有额外设置内存限制，但运行一段时间之后总是莫名奇妙的死掉，看log是因为内存超限！


直觉上肯定是由于内存泄漏导致的，并且我的环境是`php5.2`，所以一定和老的GC机制有关。后来看了看 simple_html_dom 的底层代码，基本肯定了我的猜想，因为他处理的每个dom对象都是一个标准的环形引用样例！



## 环形引用 && 引用计数：

首先说说什么是环形引用，对于php版本`>=5.3`的来说，由于启用了新的垃圾回收机制，可能不太会出现由于环形引用导致内存爆满的情况，但不幸的是，我所使用的环境是`php5.2`，这个版本的php垃圾回收还是简单的引用计数方式，所以对于这种环形引用的变量不能很好的进行资源回收。

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

![image](https://php.net/manual/zh/images/12f37b1c6963c1c5c18f30495416a197-loop-array.png)

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

跟刚刚一样，对一个变量调用unset，将删除这个符号，且它指向的变量容器中的引用次数也减1。所以，变量 $a 和数组元素 "1" 所指向的变量容器的引用次数减1, 从"2"变成"1". 下例可以说明:

![image](https://php.net/manual/zh/images/12f37b1c6963c1c5c18f30495416a197-leak-array.png)

这样，其实$a变量已经不需要了，但是由于他的ref_count还是1，并不为0，对于php5.3以下的版本来说，单纯的引用计数垃圾回收认为这个变量还是有用的，所以不会被回收，内存也不会被释放。



## 问题解决


> 知道了环形引用，我们就知道了为什么 simple-html-dom 的数据结构会在5.2版本下导致内存溢出。因为他的链式DOM结构会有`对象元素有对自身的引用，形成了环形引用`，这样的结构在单纯的计数垃圾回收机制中是不可被释放的，随着程序执行时间的增加，内存占用也会一直增加，直至达到限制。


解决办法也很简单：手动unset掉对应的指针引用属性即可，但其实人家已经提供了对应的方法：

```php?start_inline=1

foreach ($xxx as $x){
    $html = str_get_html('<html><body><div><img src="xxx"></div></body></html>');
    // ... 逻辑处理
    var_dump($html);


    // 逻辑结束，需要进入到下一次循环中，这时候需要执行clear方法，清理掉本次使用的对象，防止内存泄露
    $html->clear();
}

```

> 关键就在于`$html->clear()`这里，这里会清除dom对象之间的各种链表指针属性，从而破坏环形引用。

其实，在simple_html_dom的`clear`方法中，人家特意标明了是专门为了解决环形引用的问题，只是当时用的时候没注意看代码而已。。

![image](https://imgup.qii404.me/blog/5d11c0ca07762.jpg)

好了，问题就这样愉快的解决了，我再跑脚本，跑他成千上万次，跑他到地老天荒都没问题了😄

*至于新的垃圾回收机制怎么实现对环形引用的回收，本文不做过多阐述，请参考官方说明 [http://php.net/manual/zh/features.gc.collecting-cycles.php](http://php.net/manual/zh/features.gc.collecting-cycles.php)*



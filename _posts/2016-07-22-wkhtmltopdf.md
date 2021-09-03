---
layout: post
title: wkhtmltopdf 转换HTML为PDF时不显示中文
comments: 1
code: 1
keywords: wkhtmltopdf使用, wkhtmltopdf不显示中文, 中文乱码
description: wkhtmltopdf将html文件转化为pdf文件后后，英文和数字正常显示，但中文全部丢失
tags: [opensource]
---

最近在使用开源工具 wkhtmltopdf 把 HTML 文件转换为 PDF，这货功能很强大，自带webkit浏览器内核，可以完全模拟浏览器特性，解析css样式、运行javascript进行dom渲染，从而完美的将HTML内容渲染为PDF，就像在浏览器上截屏一样，神奇的一笔

## 工具介绍

wkhtmltopdf

> 主页和wiki在官网 [http://wkhtmltopdf.org/](http://wkhtmltopdf.org/){:target="_blank"}，同时也在github上开源，是个星星大户
<br>仓库地址 [https://github.com/wkhtmltopdf/wkhtmltopdf](https://github.com/wkhtmltopdf/wkhtmltopdf){:target="_blank"}

官网的宣传图

![官网的宣传图](https://cdn.jsdelivr.net/gh/qishibo/img/1630656201322-5d11c0d27f426.jpg)

## 用法简介

基本用法很简单，只需要一个本地html文件

```shell
# 将本地 source.html 文件转换为 target.pdf
wkhtmltopdf source.html target.pdf

# 如有乱码需指定编码
wkhtmltopdf --encoding utf-8 source.html target.pdf
```

也可以直接根据 **url** 进行转换

```shell
# 将百度首页转换为 target.pdf
wkhtmltopdf http://www.baidu.com target.pdf

# 如有乱码需指定编码
wkhtmltopdf --encoding utf-8 http://www.baidu.com target.pdf
```

![wkhtmltopdf](https://cdn.jsdelivr.net/gh/qishibo/img/1630656203159-5d11c0d323e5d.jpg)

同时还有许多其他高级用法，细节参考`wkhtmltopdf -H` 或者官方wiki [http://wkhtmltopdf.org/usage/wkhtmltopdf.txt](http://wkhtmltopdf.org/usage/wkhtmltopdf.txt)

### 为pdf生成脚注

```shell
# 为pdf生成脚注
wkhtmltopdf --footer-left '这句话会在每页pdf的左下角' source.html target.pdf

# 为pdf生成脚注 同时设置字体
wkhtmltopdf --footer-left '这句话会在每页pdf的左下角' --footer-font-name 'Arial' source.html target.pdf
```

### 设置缩放级别

> Mac 下这个问题比较突出，有时候缩放的太小，加了 --disable-smart-shrinking 参数也不生效
<br>Linux 下目前还没有缩放问题，所以可以忽略该项

```shell
# --zoom 指定缩放级别，默认1，自测 Mac 下 13.3 还算合适 打印出的 pdf 大小适中
wkhtmltopdf --zoom 13.3 source.html target.pdf
```

### 为pdf生成页码

```shell
# 为pdf在右下角生成页码  [page] 可以认为是程序会自动转换的特殊参数，他会转化为页码 footer-right让他右侧显示
wkhtmltopdf --footer-right [page] source.html target.pdf
```

> 上面实现页码时使用了`[page]`这个内建参数，凡是在头部、脚步需要该参数的地方，[page]参数都能被自动解析成页码，也就是说，凡是`--header-*` `--footer-*`的地方能可以用该参数，这样类似的参数还有很多，具体可以参考wiki

```shell
   # 我只把我用过的标注上，其他的没尝试过
   # 页码
   * [page]       Replaced by the number of the pages currently being printed
   # 日期
   * [date]       Replaced by the current date in system local format
   # 时间
   * [time]       Replaced by the current time in system local format
   # 文档标题
   * [title]      Replaced by the title of the of the current page object

   * [frompage]   Replaced by the number of the first page to be printed
   * [topage]     Replaced by the number of the last page to be printed
   * [webpage]    Replaced by the URL of the page being printed
   * [section]    Replaced by the name of the current section
   * [subsection] Replaced by the name of the current subsection
   * [isodate]    Replaced by the current date in ISO 8601 extended format
   * [doctitle]   Replaced by the title of the output document
   * [sitepage]   Replaced by the number of the page in the current site being converted
   * [sitepages]  Replaced by the number of pages in the current site being converted
```


### 自定义头部&脚注

> 如果要显示的头部尾部内容很多，或者逻辑很复杂，我们还可以将要显示的内容放进 footer.html 、 header.html 中用js去执行渲染结果，最终作为页面的页头或者页脚展示

```shell
# 脚注用一个html来实现 他会把 footer.html 进行dom渲染 然后放在脚注
wkhtmltopdf --footer-html './footer.html' source.html target.pdf

# 同理上面的也适用于头部注释，把参数改为header-xxx即可
wkhtmltopdf --header-html './header.html' source.html target.pdf

```

> footer.html 内容如下，原理也很简单，程序在生成每一页pdf的时候，会分配给每页一个唯一的url，并且在url中加上page time等参数，那么footer.html里的js就能获取url中的参数，进行html渲染，最终加进pdf的脚部

```html
<!--将下面的保存为footer.html 然后 wkhtmltopdf --footer-html './footer.html' source.html target.pdf-->
<!--原理很简单，程序再生成每一页pdf的时候，会自动给加上page time等参数，下面的js获取url中的参数进行html渲染，然后加进pdf的脚步即可-->

<html>
<head>
  <script>
  function subst() {
    var vars={};
    var x=window.location.search.substring(1).split('&');
    for (var i in x) {var z=x[i].split('=',2);vars[z[0]] = unescape(z[1]);}
    var x=['frompage','topage','page','webpage','section','subsection','subsubsection'];
    for (var i in x) {
      var y = document.getElementsByClassName(x[i]);
      for (var j=0; j<y.length; ++j) y[j].textContent = vars[x[i]];
    }
  }
  </script></head><body style="border:0; margin: 0;" onload="subst()">
  <table style="border-bottom: 1px solid black; width: 100%">
    <tr>
      <td class="section"></td>
      <td>
        当前时间：<span class="time"></span>
      </td>
      <td style="text-align:right">
        第 <span class="page"></span>页 共 <span class="topage"></span>页
      </td>
    </tr>
  </table>
  </body>
</html>

```

## Tips:

wkhtmltopdf 的强大还不只这些，还支持缩放 ，`禁止渲染js`，`禁止图片渲染`，`cookie`，`dpi设置`，`svg渲染`，`代理`等等等等...简直就是一个原生浏览器啊...

---

## 问题解决

好了，说了这么半天功能，回归正题，说说我遇到的那个坑，在 Cent 环境下转换时，中文完全不显示！而在其他另外一台机器上，一样的语句去执行，中文就能正常显示！

> 后来查阅，原来程序在转换的时候需要对应的字体，以便用于文字渲染，但当你需要转换的html中包含本机环境没有的字体时，程序就会默认转为**宋体**来渲染，这其实应该是WebKit内核的设定，所以说，`你的机器上至少应该有宋体！！`，否则的话中文其实是没法显示的。

那么 Linux 下怎么安装宋体呢，也很简单

>  1. 下载宋体字体 对应文件名其实是`simsun.ttc` or `simsun.ttf`
2. 放到`/dev/share/fonts/`下，或者`~/.fonts/`下
3. 再进行 pdf 转换试试看~

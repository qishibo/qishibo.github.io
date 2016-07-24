---
layout: post
title: wkhtmltopdf不显示中文
comments: 1
keywords: wkhtmltopdf, 不显示中文, 中文乱码, wkhtmltopdf用法
description: wkhtmltopdf生成pdf后，不显示中文，英文和数字正常显示
tags: [opensource]
---

最近在使用wkhtmltopdf把html生成pdf，这货功能很强大，自带webkit浏览器内核，可以完全模拟浏览器特性，解析css样式，解析javascript进行dom渲染。

主页和wiki在官网 [http://wkhtmltopdf.org/](http://wkhtmltopdf.org/){:target="_blank"}，同时也在github上开源了,是个星星大户，仓库地址 [https://github.com/wkhtmltopdf/wkhtmltopdf](https://github.com/wkhtmltopdf/wkhtmltopdf){:target="_blank"}

官网的宣传图

![官网的宣传图](http://ww4.sinaimg.cn/mw690/71405cabgw1f64wndz50ej20rs0b4ad1.jpg)

基本用法很简单，需要一个本地html文件，这个是待转换的，还有就是这个工具，直接`wkhtmltopdf source.html target.pdf`，这样就会把本地的source.html文件转换为target.pdf了;也可以根据url进行转换，`wkhtmltopdf http://www.baidu.com target.pdf`。

![wkhtmltopdf](http://ww4.sinaimg.cn/mw690/71405cabgw1f64wlp7ab6j209k03c0st.jpg)

同时还有许多其他高级用法，细节参考`wkhtmltopdf -H` 或者他的官方wiki [http://wkhtmltopdf.org/usage/wkhtmltopdf.txt](http://wkhtmltopdf.org/usage/wkhtmltopdf.txt)【感觉这个会更详细】

```
// 为pdf生成脚注
wkhtmltopdf --footer-left '这句话会在每页pdf的左下角' source.html target.pdf

// 为pdf生成脚注 同时设置字体
wkhtmltopdf --footer-left '这句话会在每页pdf的左下角' --footer-font-name 'Arial' source.html target.pdf

// 为pdf在右下角生成页码  [page] 可以认为是程序会自动转换的特殊参数，他会转化为页码 footer-right让他右侧显示
wkhtmltopdf --footer-right [page] source.html target.pdf

// 脚注用一个html来实现 他会把footer.html进行dom渲染 然后放在脚步
wkhtmltopdf ---footer-html './footer.html' source.html target.pdf

// 同理上面的也适用于头部注释，把参数改为header-xxx即可 如下
wkhtmltopdf --header-center [page] source.html target.pdf

// ps 上面参数可以同时出现在一句shell里，可以混合使用

```

上面实现页码时使用了`[page]`这个内建参数，凡是在头部、脚步需要该参数的地方，[page]参数都能被解析成页码,也就是说，凡是`--header-*` `--footer-*`的地方能可以用该参数，这样的参数还有如下：

```
   * [page]       Replaced by the number of the pages currently being printed
   * [frompage]   Replaced by the number of the first page to be printed
   * [topage]     Replaced by the number of the last page to be printed
   * [webpage]    Replaced by the URL of the page being printed
   * [section]    Replaced by the name of the current section
   * [subsection] Replaced by the name of the current subsection
   * [date]       Replaced by the current date in system local format
   * [isodate]    Replaced by the current date in ISO 8601 extended format
   * [time]       Replaced by the current time in system local format
   * [title]      Replaced by the title of the of the current page object
   * [doctitle]   Replaced by the title of the output document
   * [sitepage]   Replaced by the number of the page in the current site being converted
   * [sitepages]  Replaced by the number of pages in the current site being converted
```

page不仅可以上面的用法，还可以放进footer.html或者header.html中，作为页面的页头或者页脚，同时还可以用上其他参数

```html
<!--将下面的保存为footer.html 然后 wkhtmltopdf ---footer-html './footer.html' source.html target.pdf-->
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

他的强大还不只这些，还支持缩放 ，`禁止渲染js`，`禁止图片渲染`，`cookie`，`dpi设置`，`svg渲染`，`代理`等等等等...

---

好了，大概功能讲完了，回归正题，说说我遇到的那个坑，在cent环境下转换时，中文完全不显示！！！而在其他另外一台机器上，一样的语句去执行，中文就能正常显示，真是哔了狗了。。

后来查阅，原来程序在转换的时候需要默认字体，即你需要转换的html中无论规定了啥字体，当本机环境下没有改字体时，都会默认转为宋体来渲染，这其实应该是webkit内核的设定，所以说，`你的机器上至少应该有宋体！！`。

问题来了，linux下怎么安装呢，也很简单

>  下载宋体字体 对应文件名其实是`simsun.ttc` or `simsun.ttf`，放到`/dev/share/fonts/`下，或者`~/.fonts/`下，就等价于完成安装了。然后再进行pdf转换试试看~

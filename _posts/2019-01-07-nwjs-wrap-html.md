---
layout: post
title: 使用nw.js封装网页，打包成独立应用 | nwjs入门指南
comments: 1
code: 1
keywords: nw.js 网页封装 独立应用 nwjs入门指南
description: nw.js初探索，封装网页成为跨平台的独立应用。本文以Ubuntu封装微信网页版为例，Windows和Mac类似。
tags: [nwjs]
---

[nw.js](https://github.com/nwjs/nw.js)原名node-webkit，它通过Chromium内核，可以在node环境下模拟浏览器运行时，因此可以将js封装成独立应用如.deb, .exe, .app等，从而实现跨平台运行。此外，他还直接兼容Chrome打包程序(Packaged Apps)，尤其适合在Chrome商店2016年停止上架新的打包程序之后，可以让原程序直接运行。

## nw.js 安装

1、官网地址[https://nwjs.io/](https://nwjs.io/)，选择对应你自己的系统，选择`Normal`下的最新安装包下载到本地，我的是Ubuntu64位，所以下载文件是[nwjs-v0.35.4-linux-x64.tar.gz](https://dl.nwjs.io/v0.35.4/nwjs-v0.35.4-linux-x64.tar.gz)；

或者直接打开[http://dl.nwjs.io/](http://dl.nwjs.io/)选择版本、平台进行下载，个人感觉速度会快

2、解压进入

```bash
tar -zxvf nwjs-v0.35.4-linux-x64.tar.gz
cd nwjs-v0.35.4-linux-x64
```

3、检测能否正常运行，如果出现下图窗口，证明运行成功

```
./nw
```

![nwjs运行](https://imgup.qii404.xyz/blog/5d11c0c3de23e.jpg)

## 封装网页

> 1.微信网页版地址为[https://wx.qq.com/](https://wx.qq.com/)<br>
2.下面所有操作均在刚才解压的nwjs目录中！！！如 `nwjs-v0.35.4-linux-x64`

1、创建`wechat.html`用于包裹网页的html文件

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>WeChat</title>
  </head>
  <body>
    <iframe src='https://wx.qq.com/' height=760px; width=900px;></iframe>
  </body>
</html>
```

2、创建`package.json`清单文件，其中`main`字段指定加载上面创建的网页文件，具体解释见[下文](#packagejson文件配置项详解)

```json
{
  "name":"WeChat",
  "main":"wechat.html",
  "window":{
        "id": "wechat",
        "title":"WeChat",
        "toolbar":false,
        "frame":true,
        "position":"center",
        "always-on-top":true,
        "width":1000,
        "height":728,
        "as_desktop": true,
        "show_in_taskbar": true
    },
    "domain": "wechat_app",
    "version": "1.0",
    "dependencies": {}
}
```


3、运行应用

```bash
# 在nwjs的解压目录中执行
./nw .
```

正常的话会看到熟悉的网页微信登录界面，扫码登录即可

![nwjs网页微信登录](https://imgup.qii404.xyz/blog/5d11c0c488524.jpg)

## 各个系统平台打包

### Windows打包

1. 下载好nwjs模板文件，如[nwjs-v0.35.4-win-x64.zip](http://dl.nwjs.io/v0.35.4/nwjs-v0.35.4-win-x64.zip)，解压缩，**进入**到里面的`nwjs-v0.35.4-win-x64`文件夹
2. 新建上文中的`package.json`和`wechat.html`
3. 右键选中`package.json`和`wechat.html`这俩文件，添加到zip文件，生成`wechat.zip`，必须保证zip文件打开直接就是这俩文件，里面没有嵌套文件夹
4. 打开cmd，同样进入到`nwjs-v0.35.4-win-x64`文件夹，执行`copy /b nw.exe+wechat.zip wechat.exe`
5. 上述步骤会生成`wechat.exe`应用程序，双击打开即可

Tips: 如果报错如下：

```
The program can't start because nw_elf.dll is missing from your computer. Try reinstalling the program to fix this program.
```

原因是你生成的`wechat.exe`不是在上文的`nwjs-v0.35.4-win-x64`模板目录中，很可能是因为移动位置导致了目录错误，因为生成的exe文件不能脱离模板目录独立运行。解决方法也很简单，将exe文件重新放回nwjs模板目录中，双击即可运行。即如果需要移动目录安装位置或者给别人使用，需要将`nwjs-v0.35.4-win-x64`作为整体移动。

### Linux && Mac打包

1. 下载好nwjs模板文件，如[nwjs-v0.35.4-linux-x64.tar.gz](https://dl.nwjs.io/v0.35.4/nwjs-v0.35.4-linux-x64.tar.gz)
2. 解压，里面有`nwjs-v0.35.4-linux-x64`文件夹，并**进入**文件夹
4. 新建上文中提到的`package.json`和`wechat.html`
5. 将`package.json`和`wechat.html`俩文件添加到`wechat.zip`压缩包中，`zip wechat.zip package.json wechat.html`
6. 将`nw`和`wecaht.zip`叠加到`wechat`中，`cat nw wechat.zip > wechat`
7. 赋予执行权限`chmod +x wechat`
8. `./wechat`打开应用

Tips: 如果报错如下

```
/home/qii/wechat: error while loading shared libraries: libnw.so: cannot open shared object file: No such file or directory
```

跟windows下原因一致，因为生成的可执行文件不能脱离nwjs模板目录运行，将执行文件放回到`nwjs-v0.35.4-linux-x64`再执行即可。如果安装目录需要移动或者给别人使用，需要将`nwjs-v0.35.4-linux-x64`整体移动。


### Linux下桌面图标生成

新建`/usr/share/applications/wechatweb.desktop`桌面文件如下，下次桌面直接双击即可运行

```shell
[Desktop Entry]
# 如果未生成wechat可执行文件，用下面的这句exec 替换成你自己的绝对路径
#Exec=/home/qii/Desktop/nwjs-v0.35.4-linux-x64/nw /home/qii/Desktop/nwjs-v0.35.4-linux-x64
# 如果生成了wecaht可执行文件，用下面的这句exec 绝对路径
Exec=/home/qii/Desktop/nwjs-v0.35.4-linux-x64/wechat
Name=WeChatWeb
StartupNotify=false
Terminal=false
Type=Application
# 应用图标 自己替换即可
Icon=/home/qii/Desktop/nwjs-v0.35.4-linux-x64/wechat.jpg
```

## package.json文件配置项详解

> 详情可参考官网地址[http://docs.nwjs.io/en/latest/References/Manifest%20Format/](http://docs.nwjs.io/en/latest/References/Manifest%20Format/)

|配置项|说明
|--|--|
|name|应用名称|
|main|主加载文件，如index.html或者app.js|
|domain|chrome拓展唯一id，设置为xxx，最终url地址为`chrome-extension://xxx`|
|bg-script|后台脚本，应用加载时运行|
|user-agent|自定义ua|
|crash_report_url|应用crash是报告地址|
|inject_js_start|程序开始时注入的js脚本|
|inject_js_end|程序结束时注入的js脚本|
|`window`|应用窗口设置，子配置项如下|
|id|程序唯一id，同一id程序相关操作会被记录，如上次打开的窗口位置等|
|title|默认窗口名称|
|width|窗口宽度|
|height|窗口高度|
|icon|应用icon|
|frame|边框模式，false时窗口无边框包裹|
|position|打开窗口时的位置，可选项 null center mouse|
|min_width|最小宽度|
|min_height|最小高度|
|max_width|最大宽度|
|max_height|最大高度|
|resizable|窗口是否可以拖动调整尺寸|
|as_desktop|linux专用，官方解释  show as desktop background window under X11 environment|
|show|应用打开时是否隐藏应用|


## Chrome打包程序兼容

> Chrome开发者平台通告：自2016年11月21日起，所有新发布的封装应用或托管应用都仅限 Chrome 操作系统用户使用（Windows、Mac 或 Linux 用户均无法使用这些应用）。
我们将于 2017 年 12 月中旬从 Chrome 网上应用店的搜索和浏览功能中移除所有封装应用和托管应用。现有的应用均继续适用于各大平台，并会继续收到更新。

所以2016.11.21之后的打包应用只能用于Chrome OS，如果想在Mac Linux Windwos继续使用的话，可以通过nwjs本地实现，操作如下：

1、直接进入PackagedApps项目文件夹，如果你本地没有，用下面[便签应用](https://github.com/qishibo/MinimalistNote)例子

```bash
# github clone下来
git clone https://github.com/qishibo/MinimalistNote.git
# 进入应用目录
cd MinimalistNote
```

2、运行应用

```bash
# 运行命令，其中nw执行路径要为绝对路径
# 有个坑 nwjs-v0.35.4-linux-x64目录下需要删除掉刚才创建的package.json文件，否则nw优先找到自己所在目录的package.json，而不是以当前目录为数据目录
/home/qii/Desktop/nwjs-v0.35.4-linux-x64/nw .
```

便签应用效果如下

![nwjs便签应用](https://imgup.qii404.xyz/blog/5d11c0c600d5e.jpg)

## 遇到的一些坑

1. `/path_to_nw/nw .`运行应用时，其实是以`nw可执行文件`所在目录(即nw安装目录`nwjs-v0.35.4-linux-x64`)为根目录，找到里面的`package.json`运行，而不会以当前执行命令所在目录执行！所以在当前目录无论怎么修改`package.json`都不会生效。表面现象就是无论怎么修改文件，nwjs应用永远不会刷新，不会更改

2. nwjs生成的网页封装应用会同正常浏览器一样缓存Cookie数据，LocalStorage数据等，如果需要强制删除，其实缓存文件都在`~/.config/WeChat`下，一个应用一个文件夹，删除文件夹即可

3. 如果报错`清单文件缺失或不可读取`，则表明nw没有找到对应的`package.json`文件，确保你的`which nw`目录或者`nw可执行文件`所在目录存在`package.json`文件
```
无法加载以下来源的扩展程序： /home/qii/Desktop/nwjs-v0.35.4-linux-x64. 清单文件缺失或不可读取
```

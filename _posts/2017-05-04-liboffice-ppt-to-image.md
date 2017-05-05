---
layout: post
title: 命令行下 将PPT文件转换为图片
comments: 1
code: 1
keywords: ppt转图片, ppt to image, libreoffice
description: 基于libreoffice，将ppt文件转换为图片格式，同理可以将word转换为图片
tags: [opensource, libreoffice, ppt]
---

之前做需求的时候有这么一个，输入是一个ppt文件，要求输出是每页ppt的图片格式，相当于把ppt分页转换为图片，然后图片再做后续的逻辑处理。如果在window下或者说有office的情况下，手动执行太简单，文件->导出为图片 即可实现，可视化操作，那么问题是我这个功能要作为服务运行，在非人工干预的情况下，所有操作都要由脚本实现，所以折腾了一下，这里记录下来。

## 使用工具
1. #### libreoffice
    > 官网 [https://zh-cn.libreoffice.org/](https://zh-cn.libreoffice.org/)<br>
    > OpenOffice的现代衍生品，一个全平台下的office套件，支持命令行调用
2. #### convert
    > 官网 [http://www.imagemagick.org/script/](http://www.imagemagick.org/script/)<br>
    > ImageMagick 下的工具之一<br>
    > 其实ImageMagick这货强大的狠，各种图片转换、调整...绝对不止本文用到的这点
3. #### 思路
    > 首先用libreoffice将ppt转换为pdf格式，然后再用convert将pdf转换为图片

## 工具安装
1. #### libreoffice

    _Mac下_：
    1. App Store 搜索`libreoffice`安装。和下面的方法2任选其一<br>
    2. `brew cask install libreoffice` 至于cask，请自行安装 [https://caskroom.github.io/](https://caskroom.github.io/)<br>
    3. `brew install ghostscript` 这是Mac下额外要安装的gs库<br>
<br>

    _Linux 下_：
    1. 下载rpm \| deb包 ，下载地址[https://zh-cn.libreoffice.org/download/](https://zh-cn.libreoffice.org/download/libreoffice-still/?version=5.2&lang=zh-CN#change)，自行选择对应版本
    2. Debian/Ubuntu系统 (.deb包):

        ```bash
        /*解压 如果版本号不同请自行更改文件名*/
        tar -zxvf LibreOffice_5.2.6_Linux_x86-64_deb.tar.gz
        /* 安装主安装程序的所有deb包 */
        $ sudo dpkg -i ./LibreOffice_5.2.6.2_Linux_x86-64_rpm/DEBS/*.deb
        ```
    3. Fedora/SUSE/Mandriva系统 (.rpm包):

        ```bash
        /*解压 如果版本号不同请自行更改文件名*/
        tar -zxvf LibreOffice_5.2.6_Linux_x86-64_rpm.tar.gz
        /* 安装主安装程序的所有rpm包 */
        $ sudo yum install ./LibreOffice_5.2.6.2_Linux_x86-64_rpm/RPMS/*.rpm
        ```

2. #### convert

    _Mac下_：

    ```bash
    # 安装 imagemagick
    brew install imagemagick
    ```

    _Linux下：_

    ```bash
    # 安装 imagemagick CentOS
    sudo yum install ImageMagick

    # 如果是ubuntu
    apt-get install ImageMagick
    ```

3. #### 安装验证
    > Tips: `soffice`命令在Linux下安装后可能没有被放到 /usr/local/bin 中，这时候应该执行如下操作

    ```shell
    # 手动更新locate数据库
    sudo updatedb

    # 查找soffice命令安装位置 我的是在 /opt/libreoffice5.2/program/下
    locate soffice

    # 在/usr/local/bin中建立软链，便于使用
    ln -s /opt/libreoffice5.2/program/soffice /usr/local/bin/soffice
    ```

    开始验证

    ```bash
    $ soffice -h

    # 看到如下输出即可
    LibreOffice 5.2.6.2 a3100ed2409ebf1c212f5048fbe377c281438fdc

    Usage: soffice [options] [documents...]

    $ convert -h

    # 看到如下输出即可
    Version: ImageMagick 6.7.2-7 2017-03-22 Q16 http://www.imagemagick.org
    Copyright: Copyright (C) 1999-2011 ImageMagick Studio LLC
    Features: OpenMP

    Usage: convert [options ...] file [ [options ...] file ...] [options ...] file
    ```


## 开始转换

### 1. ppt -> pdf

```shell
# 将ppt转换为pdf格式，理论上会再当前文件夹下生成同名sample.pdf
soffice --convert-to pdf:writer_pdf_Export sample.ppt
```

### 2. pdf -> jpg

```shell
# 将pdf文件的每一页存为jpg图片，会在当前文件夹下生成 sample-0.jpg sample-1.jpg ...
# 图片后缀的数字是ppt的页码索引
convert sample.pdf sample.jpg
```


---
layout: post
title: Python write 函数写文件失败
comments: 1
code: 1
keywords: Python Write Failed, python write, python文件写失败
description: Python的write函数写入文件后，程序内立即进行读取操作，结果是文件被创建，但读取内容为空
tags: [python]
---

工作中涉及到了内容抓取的需求，用 Python 根据Url抓取对应的Html页面，并存储到本地文件，然后程序内继续将本地文件的路径作为参数，调用Node进行杂质过滤和内容提取。但怪的是在Python执行期间，已经完成了write操作，Node读取该文件的时候却得不到任何内容！这让我很尴尬


## 复现情景

#### 伪代码如下

```python
# filename: spider.py

# 要写入的html路径
html_file_path = 'xxx.html'

# request进行抓取
response = requests.get(url)
content = response.content

# 进行文件写入
html_handler = open(html_file_path, "w")
html_handler.write(content) # 注意这里完成了write操作

# 调用Node进行内容过滤，Node会读取刚刚写入的 Html 文件
shell = 'node filter.js --input ' + html_file_path
# 执行shell命令
process = subprocess.Popen(shell)
process.communicate()

```

其中filter.js中是这么读取输入文件的：

``` js
filename = 'xxx.html'
var sourceContent = fs.readFileSync(filename, {
    encoding: 'utf8'
});

console.log(sourceContent);
...

```

#### 开始执行
```shell
python spider.py

# 但却啥内容都没有打印出
```
执行的时候发现xxx.html文件是已经被创建了的，但Node在读取时总是空，手动打开xxx.html也是空文件！

#### 初步猜想

> 1. 文件编码问题，Node是按照utf-8读取文件的，而文件写入的非u8
> 2. 磁盘已满，文件写入失败


#### 验证猜想

1. 最好验证的是2，`df -h` 即可看到磁盘空间，然而并没有满
2. 编码问题，恩，常见问题之一，开始追查

> - 把程序断到write之后，打开文件查看编码，就是u8，并没有问题！
> - 那么继续怀疑难道是Node读取的时候出错了？
> - 写了个u8的文件让Node去读，也能正常读到！
> - 怪了，py生成的u8，Node读取也按照u8，为啥就是失败呢？

> 中间有一个有意思的事情，那就是本来程序先写入xxx.html, 然后执行shell让Node去读取的，后来我提前手写了这个xxx.html文件，然后在python里注释掉了*html_handler.write(content)*写文件的过程，然后继续shell调用Node，竟然读取成功了！！

------

**所以说，肯定是写文件的环节出了什么问题！在脚本运行期间，导致Python没有写入成功，所以Node读取时失败！**

-------

#### 问题发现和解决

> 无意间发现，write部分的代码好像有点别扭呢，是不是少了个`close()`呢！！
<br>恩 ，发现bug就是这么随意...

然后在python的write步骤之后加上了下面的代码

```python
# 关闭文件句柄
html_handler.close()
```

恩，世界就圆满了！一切都正常了！


## 问题总结

> Python的write方法是`AIO [Asynchronous Input/Output]`  类型，即异步输入输出，类似于MySQL的落地机制，文件通过write方法写入文件时，并不是及时的写入系统磁盘，而是首先写入到自己的缓存区[内存]，当缓存区满了的时候才会异步写入到磁盘进行落地，否则永远不会写入真实磁盘文件

当然，有两种情况可以改变上述异步写入的行为：
> 1. 手动对文件句柄执行`close()`操作，这样解释器会立即刷新缓存到文件，立即写入
> 2. 程序终止时如`exit()`，解释器会自动进行内存清理、缓存区最终落地等操作，文件也会被写入

这和PHP的垃圾回收机制也很像嘛，默认在垃圾堆【根缓存区】满了的时候自动进行变量清除，或者你手动执行gc_collect_cycles()函数释放垃圾变量，强制立即回收内存。

### 回顾
再回顾之所以开始我用exit方法在write处打断点时即使没close文件也是被写入的，看来是命中了情况2。
<br>后来加了close方法是命中了情景1，所以两种情况文件都被写入了。



<br><br>

恩，找bug找了大半天时间，结果就是因为简单的close函数，ಥ_ಥ


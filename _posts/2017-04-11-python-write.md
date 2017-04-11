---
layout: post
title: Python write 函数写文件失败
comments: 1
keywords: Python, write, 文件写失败
description: Python的write函数写入文件后，文件被创建，但内容为空
tags: [python]
---

工作中涉及到了内容抓取的过程，用Python抓取对应的html页面，存储到本地文件，然后将本地文件的路径作为参数，调用本地Node进行杂质过滤和内容提取。大致过程是这样的：

``` shell
python spider.py --output xxx.html // 抓取HTML文件写入xxx.html
node filter.js --input xxx.html // Node读取xxx.html进行内容过滤 并将结果输出到标准输出

```

然后今天要说的坑出现在Python逻辑部分，伪代码如下

```python
# 要写入的html路径
html_file_path = 'xxx.html'

# request进行抓取
response = requests.get(url)
content = response.content

# 进行文件写入
html_handler = open(html_file_path, "w")
html_handler.write(content)

# 调用Node进行内容过滤
shell = 'node filter.js --input ' + html_file_path
# 执行shell命令
process = subprocess.Popen(shell)
process.communicate()

```

其中filter.js中是这么读取输入文件的：

```
filename = 'xxx.html'
var sourceContent = fs.readFileSync(filename, {
    encoding: 'utf8'
});

...

```

`执行的时候发现xxx.html文件是已经被创建了的，但Node在读取时总是空，手动打开xxx.html也是空文件！`一开始猜想原因如下：

> 1. 文件编码问题 Node是按照utf-8读取文件的，如果文件写入的非u8，那么肯定会出问题
> 2. 磁盘已满，文件写入失败
> 3. popen方式执行shell时环境异常

恩 首先怀疑的就是第一点，编码问题，后来把程序断到write之后，手动打开文件查看编码，发现写入的就是u8，完完全全的utf-8啊，，，并没有什么问题！那么继续怀疑难道是Node读取的时候出错了？又手动 写了个u8的文件让Node去读，擦嘞，也能正常读到啊！怪了，py生成的u8，Node读取也按照u8，为啥就是失败呢。

> 中间有一个有意思的事情，那就是本来程序先写入xxx.html, 然后执行shell让Node去读取的，后来我提前手写了这个xxx.html文件，然后在py里注释掉了`html_handler.write(content) ...`写文件的过程，然后继续shell调用Node，竟然成功了！！

所以说，肯定是写文件的环节出了什么问题！在脚本运行期间，导致Python没有写入成功，所以Node读取时失败！

然后，无意间发现，write部分的代码好像有点别扭呢，是不是少了个`close()`呢！！

**卧槽，加上`html_handler.close()`之后世界就圆满了！一切都正常了！**之所以开始我在write方法打断点时看文件是写入的，是因为Python程序在结束时解释器会自动进行内存清理、文件最终落地等操作，所以文件即使没close也会被写入的。

------

> 所以Python的write方法一定是`AIO`类型，即类似于MySQL的落地机制，文件通过write方法写入文件时，并不是及时的写入系统磁盘，而是首先写入到自己的缓存区，当缓存区满了的时候才会异步写入到磁盘进行落地，否则永远不会写入到真实磁盘文件，**除非你手动执行了close操作，因为这也能达到类似的效果**

这和PHP的垃圾回收机制也很像嘛，默认在垃圾堆【根缓存区】满了的时候自动进行变量清除，或者你手动执行gc_collect_cycles()函数释放垃圾变量，回收内存。

<br><br>

恩，找bug找了大半天时间，结果就是因为简单的close函数，ಥ_ಥ


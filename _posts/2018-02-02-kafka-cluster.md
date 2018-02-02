---
layout: post
title: Kafka集群搭建过程和简单使用
comments: 1
code: 1
keywords: kafka, 卡夫卡
description: 详解Kafka集群模式的搭建过程以及简单使用，最新版本Kafka，基于JDK1.8
tags: [kafka, cluster]
---

Kafka是由Apache软件基金会开发的一个开源流处理平台，由Scala和Java编写，是一种高吞吐量的分布式发布订阅消息系统。由于负载能力高，存储容量大，通常被我们用在大规模的日志收集和处理上，下面就来说说如何构建Kafka集群。当然，你也可以同时参考官网的教程 [http://kafka.apache.org/](http://kafka.apache.org/)。


## 环境依赖

>本教程中Kafka是官方最新稳定版 1.0.0，即 kafka_2.11-1.0.0，所以要求JDK版本为**1.8**, 低版本无法运行。
<br>本教程以Ubuntu 14.04为基础环境，其他环境类似
<br>集群实现用三台虚拟机完成，ip为 10.20.1.153, 10.20.1.154, 10.20.1.155

 - jdk 1.8
 - zookeeper
 - scala
 - kafka 1.0.0

### 1. JDK安装

```bash
# 安装jdk的ppa源，因为默认的源可能没有1.8
sudo add-apt-repository ppa:openjdk-r/ppa
sudo apt-get update

# 安装jdk1.8
apt-get install openjdk-8-jdk

# 如果安装了多版本jdk，执行该命令进行版本切换
update-alternatives --config java

# 验证安装
java -version

openjdk version "1.8.0_141"
OpenJDK Runtime Environment (build 1.8.0_141-8u141-b15-3~14.04-b15)
OpenJDK 64-Bit Server VM (build 25.141-b15, mixed mode)
```

### 2. Zookeeper安装和集群配置

```bash
# 安装zookeeper
sudo apt-get install zookeeper
```

完成后配置文件位于`/etc/zookeeper/conf`中，编辑 zoo.cfn 增加如下集群配置，三台机器该配置文件**完全一致**

```conf
# 假设三台机器要部署zk集群，需要将三台机器全部写入
# 格式为 server.[唯一id，一般用ip后三位]=[ip]:[follower和leader交互端口]:[master选举端口]
# 端口按照如下默认即可

server.153=10.20.1.153:2888:3888
server.154=10.20.1.154:2888:3888
server.155=10.20.1.155:2888:3888
```

编辑`myid`，注意三台机器该配置文件应该不一致，该id表明每个节点唯一身份id，也用ip后三位即可；如果不用ip需要注意要和上面`server.[id]=`中的id对应

```conf
# 10.20.2.153 /etc/zookeeper/conf/myid
153

# 10.20.2.154 /etc/zookeeper/conf/myid
154

# 10.20.2.155 /etc/zookeeper/conf/myid
155
```

在每台节点上执行下面命令，启动zookeeper集群

```bash
# zkServer.sh 命令位置可能会因操作系统而不同，默认如下
/usr/share/zookeeper/bin/zkServer.sh start
```

验证zk是否成功，在任意节点上执行下面命令

```bash
/usr/share/zookeeper/bin/zkCli.sh

# 正常的话会有如下显示
Connecting to localhost:2181
Welcome to ZooKeeper!
JLine support is enabled

WATCHER::

WatchedEvent state:SyncConnected type:None path:null
[zk: localhost:2181(CONNECTED) 0]

# 输入help得到常用命令

# 输入 'ls /' 应该会有如下输出
> [zookeeper]

```

### 3. Scala安装

```bash
# 安装scala
apt-get install scala

# 验证安装
scala -version
> Scala code runner version 2.9.2 -- Copyright 2002-2011, LAMP/EPFL
```

### 4. Kafka安装和集群配置

去官网下载最新release版本，地址 [http://kafka.apache.org/downloads](http://kafka.apache.org/downloads)，或者直接wget获取

```bash
# 下载
wget http://apache.javapipe.com/kafka/1.0.0/kafka_2.12-1.0.0.tgz

# 解压
tar -zxvf kafka_2.12-1.0.0.tgz

cd kafka_2.12-1.0.0
```

配置文件在`config`文件夹中，分别编辑每个节点的`server.properties`服务配置文件，注意下面是三段，拆开写到三个节点的配置中去，而不是直接复制到一个配置中！

```conf
# 设置broker id，可以认为是每个节点的唯一id，并且三台机器该值不能相同
# listeners 为监听ip和端口
# zookeepers.connect 为zk集群ip port

# 第一段 写到 10.20.1.153上server.properties配置
broker.id=0
listeners=PLAINTEXT://10.20.1.153:9092
zookeeper.connect=10.20.1.153:2181,10.20.1.154:2181,10.20.1.155:2181

# 第二段 写到 10.20.1.154上server.properties配置
broker.id=0
listeners=PLAINTEXT://10.20.1.154:9092
zookeeper.connect=10.20.1.153:2181,10.20.1.154:2181,10.20.1.155:2181

# 第三段 写到 10.20.1.155上server.properties配置
broker.id=0
listeners=PLAINTEXT://10.20.1.155:9092
zookeeper.connect=10.20.1.153:2181,10.20.1.154:2181,10.20.1.155:2181
```


每台机器分别执行下面命令启动集群

```bash
# 保证你在kafka_2.12-1.0.0文件夹下
bin/kafka-server-start.sh config/server.properties
```

启动过程可能会报错

```
Exception in thread "main" java.lang.UnsupportedClassVersionError: kafka/Kafka : Unsupported major.minor version 52.0
```

这是由于最新版本的Kafka需要至少`JDK1.8`的支持，升级或者重新安装即可，上面已经说过了，如下即可

```bash
# 安装jdk的ppa源，因为默认的源可能没有1.8
sudo add-apt-repository ppa:openjdk-r/ppa
sudo apt-get update

# 安装jdk1.8
apt-get install openjdk-8-jdk

# 如果安装了多版本jdk，执行该命令进行版本切换
update-alternatives --config java
```

版本对应如下

```
J2SE 9 = 53
J2SE 8 = 52
J2SE 7 = 51
J2SE 6.0 = 50
J2SE 5.0 = 49
JDK 1.4 = 48
JDK 1.3 = 47
JDK 1.2 = 46
JDK 1.1 = 45
```

还有一种情景可能会报如下错误

```
# 实际上 kafka-master 会是你的主机名
java.net.UnknownHostException: [kafka-master]: [kafka-master]: Name or service not known
```

这是由于你所使用的机器很有可能是虚拟机，然后主机名无法被解析成ip，编辑`/etc/hosts`增加域名解析即可，正常情况下我们增加了`listeners`参不会出现这个错误，所以也不需要执行下面操作。

```conf
# /etc/hosts
# 编辑时注意把后面换成你的主机名，就是执行 hostname 的输出

# 10.20.1.153
10.20.1.153 kafka-master

# 10.20.1.154
10.20.1.154 kafka-node

# 10.20.1.155
10.20.1.155 kafka-node2
```

### 开始使用

创建 Topic，在任意节点执行均可

```bash
# --zookeeper 为zk集群地址，使用任意一个节点都行
# --replication-factor 为复制的份数，Kafka实际上会将一个消息复制多份存储，保证不丢失
# --partitions 分区，真实的物理节点

bin/kafka-topics.sh --create --zookeeper 10.20.1.153:2181 --replication-factor 3 --partitions 1 --topic my-test
```

查看Topic

```bash
# --zookeeper 为zk集群地址，使用任意一个节点都行
bin/kafka-topics.sh --describe --zookeeper 10.20.1.153:2181
```

查看Topic 列表

```bash
bin/kafka-topics.sh --list --zookeeper 10.20.1.153:2181
```

创建生产者，在任意节点执行均可

```bash
# --broker-list broker 节点列表，即三台服务器节点列表，实际上写成其中一个、两个或者三个均可，中间逗号隔开

bin/kafka-console-producer.sh --broker-list 10.20.1.155:9092,10.20.1.154:9092,10.20.1.153:9092 --topic my-test

# 输入111111测试发送一条消息
[2018-02-02 08:21:53,580] INFO Updated PartitionLeaderEpoch. New: {epoch:5, offset:32}, Current: {epoch:4, offset20} for Partition: my-replicated-topic-0. Cache now contains 3 entries. (kafka.server.epoch.LeaderEpochFileCache)

>111111

```

创建消费者，在任意节点执行均可

```bash
# --broker-server broker 节点列表，类似于上面的 --broker-list
# 即三台服务器节点列表，实际上写成其中一个、两个或者三个均可，中间逗号隔开
# --from-beginning 表明从头获取，而不是从接入时间获取之后的消息

bin/kafka-console-consumer.sh --bootstrap-server 10.20.1.155:9092,10.20.1.154:9092,10.20.1.153:9092 --from-beginning --topic my-test

# 正常会打出生产者发送的1111
> 111111
```

### 基于OpenStack虚拟机部署时的坑

该情况下的虚拟机`对外ip`[暴露的ip]和`真实ip`[ifconfig显示的ip]可能只是映射关系，用户访问对外ip时，OpenStack会转发到对应的真实ip实现访问。但此时如果 Kafka `server.properties`配置中的`listeners=PLAINTEXT://10.20.1.153:9092`中的ip配置为[对外ip]的时候无法启动，因为socket无法绑定监听，报如下错误

```
kafka.common.KafkaException: Socket server failed to bind to 10.20.1.154:9092: Cannot assign requested address
```

解决方法也很简单，`listeners=PLAINTEXT://10.20.1.153:9092`中的ip改为真实ip[ifconfig中显示的ip]即可，其他使用时正常使用对外ip即可，跟真实ip就没有关系了。

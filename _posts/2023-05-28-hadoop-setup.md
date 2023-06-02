---
layout: post
title: Hadoop搭建及相关配套组件sqoop\flume\hive)说明
comments: 1
code: 1
keywords: HADOOP
description: 本文介绍Hadoop搭建以及周边组件使用，如sqoop、flume、hive的安装等，配置为能跑起来的最简配置，主要演示Hadoop运行过程
tags: [HADOOP,sqoop,flume,hive]
---


## 运行版本概述

```
/opt
├── apache-flume-1.8.0-bin
├── apache-hive-3.1.2-bin
├── hadoop-2.9.2
├── jdk1.8.0_371
└── sqoop-1.4.7.bin__hadoop-2.6.0
```

## Hadoop核心配置文件

> 详细配置项可参考https://blog.51cto.com/u_13836096/2532831 ，默认端口配置参考https://blog.csdn.net/Hu_wen/article/details/73481296

### core-site.xml

> 所有节点的defaultFS均为master，指定为同一个

```xml
<configuration>
        <property>
                <name>fs.defaultFS</name>
                <value>hdfs://master:9000</value>
        </property>
        <property>
                <name>hadoop.tmp.dir</name>
                <value>/opt/hadoop-2.9.2/data/tmp</value>
        </property>
</configuration>

```

### hadoop-env.sh

> 只需要配置JAVA_HOME即可，可以通过读取环境变量的方式，也可以显式声明

```bash
# export JAVA_HOME=${JAVA_HOME}
export JAVA_HOME=/opt/jdk1.8.0_371/
```

### hdfs-site.xml

> replication配置为节点数即可，`namenode.secondary.http-address`配置为第二个节点

```xml
<configuration>
<property>
        <name>dfs.replication</name>
        <value>3</value>
</property>
<property>
        <name>namenode.secondary.http-address</name>
        <value>slave2:50090</value>
</property>
</configuration>

```

### mapred-env.sh

> 只需要配置JAVA_HOME即可，可以通过读取环境变量的方式，也可以显式声明

```bash
# export JAVA_HOME=${JAVA_HOME}
export JAVA_HOME=/opt/jdk1.8.0_371/
```

### mapred-site.xml

> 更改framework为yarn服务

```xml
<configuration>
<property>
        <name>mapreduce.framework.name</name>
        <value>yarn</value>
</property>
</configuration>

```

### yarn-env.sh

> 只需要配置JAVA_HOME即可，可以通过读取环境变量的方式，也可以显式声明

```bash
# export JAVA_HOME=${JAVA_HOME}
export JAVA_HOME=/opt/jdk1.8.0_371/
```

### yarn-site.xml

> 指定resourcemanager的节点，master即可，测试中slave1 slave2启动均失败，只能启动resourcemanager，无法启动nodemanager，需要指定hostname为master且在master启动【或者将该配置文件configuration中内容全部删除后再在master启动】

```xml
<configuration>
<!-- Site specific YARN configuration properties -->
    <property>
            <name>yarn.resourcemanager.hostname</name>
            <value>master</value>
    </property>
    <property>
            <name>yarn.nodemanager.aux-services</name>
            <value>mapreduce_shuffle</value>
    </property>
</configuration>

```

### masters

> 指定的master节点，只填写为master即可，所有节点均需要配置此项

```
master
```

### slaves

> 指定的slave节点，填写为slave1 slave2，注意只有master节点才需要填写，slave节点不需要更改此配置

```
slave1
slave2
```

## 启动Hadoop

```bash
# 只在master节点执行，通过master启动其他slave，前提是配置好ssh免登录
start-hdfs.sh
```

## 启动Yarn

```bash
# 需要在ResourceManager节点启动Yarn，实际上只在master执行即可，其他节点执行会有问题
start-yarn.sh
```

## 可视化访问

HDFS主页面 http://master:50070
Yarn管理页面 http://master:8088


## 其他相关命令

### sqoop导入hdfs

> 保证mysql可以通过非localhost远程访问，使用下面命令导入. 注意mysql后面的地址为其他节点可访问的地址，不可用localhost

```bash
sqoop import --connect "jdbc:mysql://master:3306/ttt" --delete-target-dir --username root --password 123 --table staff -m 1 --target-dir /ttt/sqoop_import
```

### Flume

监听端口

```bash
flume-ng agent --conf conf/ --conf-file conf/netcat-logger.conf --name a1 -Dflume.root.logger=INFO,console
```

```ini
# netcat-logger.conf
# 示例配置方案: 单节点 Flume 配置

#为agent各组件命名
a1.sources = r1
a1.sinks = k1
a1.channels = c1

# 描述并配置sources组件（数据类型、采集数据源的应用地址）
a1.sources.r1.type = netcat
a1.sources.r1.bind = localhost
a1.sources.r1.port = 44444

# 描述并配置sinks组件(采集后数据流出的类型)
a1.sinks.k1.type = logger

# 描述并配置channels
a1.channels.c1.type = memory
a1.channels.c1.capacity = 1000
a1.channels.c1.transactionCapacity = 100

# 将source 和 sink 通过同一个channel连接绑定
a1.sources.r1.channels = c1
a1.sinks.k1.channel = c1
```

监听新增文件，并传入到hdfs

```bash
flume-ng agent -c conf -f conf/hdfs.conf -n agent1 -Dflume.root.logger=INFO,console
```

```ini
# hdfs.conf
#定义三大组件的名称
agent1.sources = source1
agent1.sinks = sink1
agent1.channels = channel1

# 配置source组件
agent1.sources.source1.type = spooldir
agent1.sources.source1.spoolDir = /opt/apache-flume-1.8.0-bin/mylogs/
agent1.sources.source1.fileHeader = false

# 配置拦截器
agent1.sources.source1.interceptors = i1
agent1.sources.source1.interceptors.i1.type = host
agent1.sources.source1.interceptors.i1.hostHeader = hostname

# 配置sink组件
agent1.sinks.sink1.type = hdfs
agent1.sinks.sink1.hdfs.path =hdfs://master:9000/weblog/%Y%m%d-%H-%M
agent1.sinks.sink1.hdfs.filePrefix = access_log
agent1.sinks.sink1.hdfs.maxOpenFiles = 5000
agent1.sinks.sink1.hdfs.batchSize= 100
agent1.sinks.sink1.hdfs.fileType = DataStream
agent1.sinks.sink1.hdfs.writeFormat =Text
agent1.sinks.sink1.hdfs.rollSize = 102400
agent1.sinks.sink1.hdfs.rollCount = 1000000
agent1.sinks.sink1.hdfs.rollInterval = 60
#agent1.sinks.sink1.hdfs.round = true
#agent1.sinks.sink1.hdfs.roundValue = 10
#agent1.sinks.sink1.hdfs.roundUnit = minute
agent1.sinks.sink1.hdfs.useLocalTimeStamp = true

# Use a channel which buffers events in memory
agent1.channels.channel1.type = memory
agent1.channels.channel1.keep-alive = 120
agent1.channels.channel1.capacity = 500000
agent1.channels.channel1.transactionCapacity = 600

# Bind the source and sink to the channel
agent1.sources.source1.channels = channel1
agent1.sinks.sink1.channel = channel1
```

### Hive

下载Hive

```bash
wget https://mirrors.tuna.tsinghua.edu.cn/apache/hive/hive-3.1.2/apache-hive-3.1.2-bin.tar.gz
```

1. 编辑`conf/hive-env.sh`文件（没有则从template文件复制），增加如下两项
	```ini
	# Set HADOOP_HOME to point to a specific hadoop install directory
	HADOOP_HOME=/opt/hadoop-2.9.2/
	# Hive Configuration Directory can be controlled by:
	export HIVE_CONF_DIR=/opt/apache-hive-3.1.2-bin/conf
	```

1. 执行`schematool -dbType derby -initSchema`进行数据库初始化，会在当前目录生成`metastore_db`文件夹，即metadata数据库

1. 执行hive命令即可

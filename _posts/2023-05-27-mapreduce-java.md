---
layout: post
title: MapReduce实现WordCount词数统计入门教程
comments: 1
code: 1
keywords: MapReduce HADOOP WordCount
description: Java实现MapReduce逻辑完成WordCount单词统计功能，使用命令行对java文件进行编译和JAR包生成，服务器直接执行即可，不需要其他额外依赖
tags: [MapReduce, HADOOP]
---

WordCount单词统计是MapReduce的入门程序，用于统计文本文件中每个单词出现的个数，该文章用于记录实现过程。


## 新建WordCount.java文件

```java
import java.io.IOException;
import java.util.StringTokenizer;

import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.io.IntWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Job;
import org.apache.hadoop.mapreduce.Mapper;
import org.apache.hadoop.mapreduce.Reducer;
import org.apache.hadoop.mapreduce.lib.input.FileInputFormat;
import org.apache.hadoop.mapreduce.lib.output.FileOutputFormat;

public class WordCount {

  public static class TokenizerMapper
       extends Mapper<Object, Text, Text, IntWritable>{

    private final static IntWritable one = new IntWritable(1);
    private Text word = new Text();

    public void map(Object key, Text value, Context context
                    ) throws IOException, InterruptedException {
      StringTokenizer itr = new StringTokenizer(value.toString());
      while (itr.hasMoreTokens()) {
        word.set(itr.nextToken());
        context.write(word, one);
      }
    }
  }

  public static class IntSumReducer
       extends Reducer<Text,IntWritable,Text,IntWritable> {
    private IntWritable result = new IntWritable();

    public void reduce(Text key, Iterable<IntWritable> values,
                       Context context
                       ) throws IOException, InterruptedException {
      int sum = 0;
      for (IntWritable val : values) {
        sum += val.get();
      }
      result.set(sum);
      context.write(key, result);
    }
  }

  public static void main(String[] args) throws Exception {
    Configuration conf = new Configuration();
    Job job = Job.getInstance(conf, "word count");
    job.setJarByClass(WordCount.class);
    job.setMapperClass(TokenizerMapper.class);
    job.setCombinerClass(IntSumReducer.class);
    job.setReducerClass(IntSumReducer.class);
    job.setOutputKeyClass(Text.class);
    job.setOutputValueClass(IntWritable.class);
    FileInputFormat.addInputPath(job, new Path(args[0]));
    FileOutputFormat.setOutputPath(job, new Path(args[1]));
    System.exit(job.waitForCompletion(true) ? 0 : 1);
  }
}

```

## 编译java文件

> 编译前请确保环境变量已成功配置`HADOOP_HOME`和`CLASSPATH`，否则编译会报错

```bash
javac WordCount.java

# 会生成如下class类文件
# 'WordCount$IntSumReducer.class'  'WordCount$TokenizerMapper.class'   WordCount.class

# 确保环境变量存在，一般都配置好了，该步骤可忽略
# export HADOOP_HOME="/opt/hadoop-2.9.2/"
# export CLASSPATH="$($HADOOP_HOME/bin/hadoop classpath):$CLASSPATH"
```

## 把class文件打包成jar

```bash
jar -cvf WordCount.jar WordCount*.class

# 会生成WordCount.jar文件，输出如下
# added manifest
# adding: WordCount$IntSumReducer.class(in = 1739) (out= 739)(deflated 57%)
# adding: WordCount$TokenizerMapper.class(in = 1736) (out= 754)(deflated 56%)
# adding: WordCount.class(in = 1491) (out= 814)(deflated 45%)
```

## 上传数据文件到HDFS

```bash
# words.txt在master节点或者slave节点均可，内容为任意一段话或者一篇英文文章
hadoop fs -copyFromLocal ./words.txt /data/words.txt
```

## 使用HADOOP运行jar包

```bash
# WordCount为主类名称，前面的java文件中定义的，/data/words.txt为hadf上需要统计的文本文件，/output/result指定输出目录
hadoop jar WordCount.jar WordCount /data/words.txt /output/result

# 正常执行输出如下
# INFO client.RMProxy: Connecting to ResourceManager at master/192.168.36.130:8032
# WARN mapreduce.JobResourceUploader: Hadoop command-line option parsing not performed. Implement the Tool interface and execute your application with ToolRunner to remedy this.
# INFO input.FileInputFormat: Total input files to process : 1
# INFO mapreduce.JobSubmitter: number of splits:1
# INFO Configuration.deprecation: yarn.resourcemanager.system-metrics-publisher.enabled is deprecated. Instead, use yarn.system-metrics-publisher.enabled
# INFO mapreduce.JobSubmitter: Submitting tokens for job: job_1683783058362_0016
# INFO impl.YarnClientImpl: Submitted application application_1683783058362_0016
# INFO mapreduce.Job: The url to track the job: http://master:8088/proxy/application_1683783058362_0016/
# INFO mapreduce.Job: Running job: job_1683783058362_0016
# INFO mapreduce.Job: Job job_1683783058362_0016 running in uber mode : false
# INFO mapreduce.Job:  map 0% reduce 0%
# INFO mapreduce.Job:  map 100% reduce 0%
# INFO mapreduce.Job:  map 100% reduce 100%
# INFO mapreduce.Job: Job job_1683783058362_0016 completed successfully
# INFO mapreduce.Job: Counters: 49

# File System Counters...
# Job Counters...
# Map-Reduce Framework...
# Shuffle Errors...
# File Input Format Counters...
# File Output Format Counters...
```

## 查看结果

```bash
hadoop dfs -cat /output/result/part-r-00000

# 如下内容
#qii     1
#this    1
#tool    1
#world   1
#aha     2
#hello   1
#yes     2
```

## 报错说明

### 如果报错权限问题如下

```
Caused by: org.apache.hadoop.ipc.RemoteException(org.apache.hadoop.security.AccessControlException): Permission denied: user=xx, access=EXECUTE, inode="/tmp":root:supergroup:drwx------
        at org.apache.hadoop.hdfs.server.namenode.FSPermissionChecker.check(FSPermissionChecker.java:350)
        at org.apache.hadoop.hdfs.server.namenode.FSPermissionChecker.checkTraverse(FSPermissionChecker.java:311)
        at org.apache.hadoop.hdfs.server.namenode.FSPermissionChecker.checkPermission(FSPermissionChecker.java:238)
        at org.apache.hadoop.hdfs.server.namenode.FSPermissionChecker.checkPermission(FSPermissionChecker.java:189)
        at org.apache.hadoop.hdfs.server.namenode.FSPermissionChecker.checkTraverse(FSPermissionChecker.java:539)
```

则说明HFDFS目录之前为root用户创建，当前用户为非root，没有权限，切换到root用户再执行即可。`sudo`执行可能会存在环境变量读取不到的问题，需要执行`sudo -s`切换root再进行操作。

### 如果编译时报错不存在

```
WordCount.java:4: error: package org.apache.hadoop.conf does not exist
import org.apache.hadoop.conf.Configuration;
                             ^
WordCount.java:5: error: package org.apache.hadoop.fs does not exist
import org.apache.hadoop.fs.Path;
                           ^
WordCount.java:6: error: package org.apache.hadoop.io does not exist
import org.apache.hadoop.io.IntWritable;

```

说明hadoop相关类名没有找到，需要配置class环境变量，可以手动执行命令，或者将其复制到`~/.bashrc`中

```bash
export HADOOP_HOME="/opt/hadoop-2.9.2/" # 改为实际目录
export CLASSPATH="$($HADOOP_HOME/bin/hadoop classpath):$CLASSPATH"
```

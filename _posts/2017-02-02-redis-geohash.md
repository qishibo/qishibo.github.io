---
layout: post
title: Redis GeoHash 地理位置结构
comments: 1
code: 1
keywords: Redis, GeoHash, Redis地理位置, 基于距离的位置推荐
description: Redis 在3.2版本支持了地理位置相关方法，能根据经纬度进行相关推荐计算，找到附近推荐数据
tags: [redis, geohash, opensource]
---

Redis在3.2版本悄悄的加入了一个地理位置的功能，哈哈，3.2版本推出已经好久了，一直没有机会尝试一下，今天专门敲数据使用了一番，新增了一共6个方法，看了看相关数据结构和特点，了解了大概的轮廓，今天就来记录一下。

----

### 先简单说说GeoHash的原理吧

#### 定义
>GeoHash通过切分地图区域的方式将二维的经纬度转换成字符串，切分次数越多字符串越长，表示的范围越精确。字符串相似的表示距离相近，这样可以利用字符串的前缀匹配来查询附近的POI信息。

#### 切分方法
>切分方法是矩形切分，通过二分法依次缩小范围，所以GeoHash字符串最终定位的是某一个矩形区域，可以看作是一个范围，当范围足够小的时候，就无限接近一个点了

#### Tips
>但其实没有必要精确到点，矩形刚好反映元素的位置范围，不是具体的位置点，所以能很好的保护隐私。

<br>

### 以北海公园为例

#### A. 算出纬度序列

>地球纬度区间是[-90, 90]， 北海公园的纬度是`39.928167`，可以通过下面算法对纬度进行二分逼近编码:

1. 区间[-90, 90]进行二分为[-90, 0), [0, 90]，称为左右区间，可以确定39.928167属于右区间[0, 90]，给标记为1；
2. 接着将区间[0, 90]进行二分为 [0, 45), [45, 90]，可以确定39.928167属于左区间 [0, 45)，给标记为0；
3. 递归上述过程39.928167总是属于某个区间[a, b]。随着每次迭代区间[a, b]总在缩小，并越来越逼近39.928167；


| 标记 | 左边界值 | 中间值 | 右边界值 |
| ------| ------ | ------ | ------ |
| 1 | -90.000 | 0.000 `[hits]` | 90.000 |
| 0 | 0.000 `[hits]` | 45.000 | 90.000 |
| 1 | 0.000 | 22.500 `[hits]` | 45.000 |
| 1 | 22.500 | 33.750 `[hits]` | 45.000 |
| 1 | 33.750 | 39.375 `[hits]` | 45.000 |

>规定：给定的纬度x（39.928167）属于左区间，则记录0，如果属于右区间则记录1，这样随着算法的深入会产生一个序列`10111 00011 ...`【递归次数越多，区块划分越细，精度越高，当然数字也就越长】。

#### B. 同理算出经度序列为`11010 01011`

#### C. 奇数位放纬度，偶数位放经度，把2串编码组合生成新串：`11100 11101 00100 01111`

#### D. 然后将新串转化为10进制 `28 29 4 15`

#### E. 对十进制数字进行Base32编码，即转换为32进制，得到`wx4g`，即为GeoHash字符串

----

## Redis 中的 GeoHash

3.2中关于GeoHash新加入的方法有6个

1. `geoadd`: 增加地理位置的坐标
2. `geodist`: 获取两个地理位置的距离
3. `geohash`: 获取地理位置的GeoHash值
4. `geopos`: 获取地理位置的坐标
5. `georadius`: 根据给定经纬度坐标获取指定范围内的地理位置集合
6. `georadiusbymember`: 根据给定对象获取该对象范围内的地理位置集合

### GEOADD

> 把一个对象的经纬度位置添加到库中

```shell
geoadd someKeyYouDecided 43.34567 49.34567 aaa
# (integer) 1

# 一次添加多个
geoadd someKeyYouDecided 43.34567 49.34567 aaa 44.34567 50.34567 bbb
# (integer) 1
```

### GEODIST

> 返回两个对象之间的距离

```shell
geodist someKeyYouDecided aaa bbb [可选返回值单位 km千米 mi英里 ft英尺 ]
# "132343.9786"
```

### GEOHASH

> 返回对象对应的GeoHash字符串

```shell
geohash someKeyYouDecided aaa
# 1) "ubybdr57770"

geohash someKeyYouDecided aaa bbb
# 1) "ubybdr57770"
# 2) "ubzw3j5sc10"
```

### GEOPOS

> 返回对象的经纬度信息

```shell
geopos someKeyYouDecided aaa
# 1) 1) "43.34566980600357056"
#    2) "49.34566890860142507"
```

### GEORADIUS

> 根据经纬度信息，返回周围范围内的其他对象[位置]

```shell
# 返回距离经纬度坐标[43.345669, 49.345669] 10000m范围内的其他对象
georadius someKeyYouDecided 43.345669 49.345669 10000 m [WITHDIST WITHCOORD WITHHASH ASC|DESC]
# 1) "aaa"

# 返回距离[43.345669, 49.345669] 经纬度10000m范围内的其他对象 并返回距离
georadius someKeyYouDecided 43.345669 49.345669 10000 m WITHDIST
# 1) 1) "aaa"
#    2) "0.0593"

# 返回距离[43.345669, 49.345669] 经纬度10000m范围内的其他对象 并返回距离、经纬度坐标
georadius someKeyYouDecided 43.345669 49.345669 10000 m WITHDIST WITHCOORD
# 1) 1) "aaa"
#    2) "0.0593"
#    3) 1) "43.34566980600357056"
#       2) "49.34566890860142507"
```

### GEORADIUSBYMEMBER

> 根据对象，返回其范围内的其他对象[位置]

```shell
# 返回距离aaa对象1000m范围内的其他对象 包括aaa自己
georadiusbymember someKeyYouDecided aaa  1000 m
# 1) "aaa"

# 返回距离aaa对象1000m范围内的其他对象、距离 包括aaa自己
georadiusbymember someKeyYouDecided aaa  1000 m WITHDIST
# 1) 1) "aaa"
#    2) "0.0000"

# 返回距离aaa对象1000m范围内的其他对象、距离、经纬度坐标 包括aaa自己
georadiusbymember someKeyYouDecided aaa  1000 m WITHDIST WITHCOORD
# 1) 1) "aaa"
#    2) "0.0000"
#    3) 1) "43.34566980600357056"
#       2) "49.34566890860142507"
```

-----

## Redis 实现原理

>注意到上述操作中第二个参数都是一个string类型的key，其实Redis是把对应的数据存到了一个`zset`有序集合中，其中`someKeyYouDecided`就是zset的key，对象名称aaa bbb为zset的member，对象的GeoHash的int值为zset的value，如果你`zrange someKeyYouDecided 0 -1 withscores`就会窥探这个zset的真实数据如下

```shell
1) "aaa"
2) "3710624661911432"
3) "bbb"
4) "3710839010869441"
```

所以Redis关于地理位置的方法没有删除，因为zrem(key, member)即可实现

>核心方法`georadius` 其实就是根据经纬度换算成GeoHash值，然后根据查询范围换算出上下浮动的range范围，然后`zrangebyscore(GeoHash - range, GeoHash + range)`查询附近[上下]的几个对象即可

>核心方法`georadiusbymember` 同理，根据member得到该对象的GeoHash，后续计算与georadius相同





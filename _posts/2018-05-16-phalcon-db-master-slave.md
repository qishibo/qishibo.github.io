---
layout: post
title: Phalcon框架数据库读写分离的实现方法
comments: 1
code: 1
keywords: phalcon mysql master-slave
description: Phalcon框架数据库读写分离操作，区分主从进行读写的设置方法
tags: [phalcon, php]
---

[Phalcon](https://github.com/phalcon/cphalcon)框架和[Yaf](https://github.com/laruence/yaf)类似，是一款用C实现的拓展级别的框架，不过其功能实现更加丰富，设计思路基于依赖注入、容器等方式，更符合现代框架思想。本文主要针对Phalcon框架数据库层的读写分离进行说明，权当记录。

## 前提准备

既然需要主从分离，那么数据库连接至少得有两个，即将主库和从库分别作为服务注册到di容器，如下

```php?start_inline=1

// app/config/services.php
use Phalcon\Db\Adapter\Pdo\Mysql;

// 设置主库
$di->setShared('dbMaster', function () {
    $params = [
        'host'     => '127.0.0.1',
        'username' => 'root',
        'password' => 'root',
        'dbname'   => 'phalcon_test',
        'charset'  => 'utf8',
        'port'     => 3306,
    ];

    return new Mysql($params);
});

// 设置从库 本地测试 和主库用一个mysql实例即可
$di->setShared('dbSlave', function () {
    $params = [
        'host'     => '127.0.0.1',
        'username' => 'root',
        'password' => 'root',
        'dbname'   => 'phalcon_test',
        'charset'  => 'utf8',
        'port'     => 3306,
    ];

    return new Mysql($params);
});

```

## 实现方法一

> 基于Model初始化时的读写分离设置

Model配置如下，例子是写在每个Model的`initialize`方法中，当然你也可以统一写到BaseModel中，然后每个Model继承即可。

```php?start_inline=1

// app/models/Users.php
use Phalcon\Mvc\Model;

class Users extends Model
{
    /**
     * 设置Model主从切换
     */
    public function initialize()
    {
        // 写操作 使用dbMaster连接
        $this->setWriteConnectionService('dbMaster');
        // 读操作 使用dbSlave连接
        $this->setReadConnectionService('dbSlave');
    }

    /**
     * 表名
     */
    public function getSource()
    {
        return 'table_xxx';
    }
}

```

## 实现方法二

> 基于modelsManager实现的读写分离

1、首先需要自定义modelsManager实现，用于替换框架自带的Manager

```php?start_inline=1

// app/library/ModelsManager.php
use Phalcon\Mvc\Model\Manager;

class ModelsManager extends Manager
{
    /**
     * 读操作 返回dbSlave
     *
     * @param \Phalcon\Mvc\ModelInterface $model
     *
     * @return \Phalcon\Db\Adapter\Pdo\Mysql
     */
    public function getReadConnection(\Phalcon\Mvc\ModelInterface $model)
    {
        return $this->getDI()->get('dbSlave');
    }

    /**
     * 写操作 返回dbMaster
     *
     * @param \Phalcon\Mvc\ModelInterface $model
     *
     * @return \Phalcon\Db\Adapter\Pdo\Mysql
     */
    public function getWriteConnection(\Phalcon\Mvc\ModelInterface $model)
    {
        return $this->getDI()->get('dbMaster');
    }
}

```

2、将自定义modelsManage注册到di容器

```php?start_inline=1
// app/config/services.php

use app/library/ModelsManager;

/**
 * 设置自定义modelsManager
 */
$di->setShared(
    'modelsManager',
    new ModelsManager()
);
```



## 实现效果

> 按照上述方法实现后，你所用到的Phalcon实现的SQL查询均可自动实现主从切换，包括`Query`、`QueryBuilder`、`AR`、`PHQL`等。

当然，如果你某些情境下需要强制指定主库或者从库操作怎么办，如下即可：

```php?start_inline=1

// di容器
$di = \Phalcon\Di\FactoryDefault::getDefault();

// 获取主库链接直接操作
$di->get('dbMaster')->execute('update table_xxx set age = 100 where id = 1');

// 获取从库链接直接操作
$di->get('dbSlave')->query('select * from table_xxx');
```

## 如何验证

> 空口无凭，我怎么知道所有的读操作都发生在了从库上，所有的写操作都发生在了主库上；别担心，每次查询的时候写个日志记录一下不就完了。

需要更改最上面注册`dbMaster`和`dbSlave`时的逻辑，如下：

```php?start_inline=1
// app/config/services.php

use Phalcon\Db\Adapter\Pdo\Mysql;

// 设置主库
$di->setShared('dbMaster', function () {
    $params = [
        'host'     => '127.0.0.1',
        'username' => 'root',
        'password' => 'root',
        'dbname'   => 'phalcon_test',
        'charset'  => 'utf8',
        'port'     => 3306,
    ];

    $connection = new Mysql($params);

    // 记录每次sql查询日志
    $logger        = new \Phalcon\Logger\Adapter\File('/tmp/phalcon_sqls.log');
    $eventsManager = new \Phalcon\Events\Manager();

    // 注册记录sql的event
    $eventsManager->attach('db', function ($event, $connection) use ($logger) {
        ($event->getType() == 'beforeQuery') && $logger->log('Master: ' . $connection->getRealSQLStatement());
    });

    // 设置事件管理器
    $connection->setEventsManager($eventsManager);

    return $connection;
});

// 设置从库 本地测试 和主库用一个mysql实例即可
$di->setShared('dbSlave', function () {
    $params = [
            'host'     => '127.0.0.1',
            'username' => 'root',
            'password' => 'root',
            'dbname'   => 'phalcon_test',
            'charset'  => 'utf8',
            'port'     => 3306,
        ];

        $connection = new Mysql($params);

        // 记录每次sql查询日志
        $logger        = new \Phalcon\Logger\Adapter\File('/tmp/phalcon_sqls.log');
        $eventsManager = new \Phalcon\Events\Manager();

        // 注册记录sql的event
        $eventsManager->attach('db', function ($event, $connection) use ($logger) {
            ($event->getType() == 'beforeQuery') && $logger->log('Slave: ' . $connection->getRealSQLStatement());
        });

        // 设置事件管理器
        $connection->setEventsManager($eventsManager);

        return $connection;
});
```

完成之后查看`/tmp/phalcon_sqls.log`日志，如下，即代表成功进行了分离

```
[Wed, 16 May 18 11:18:43 +0800][DEBUG] Slave: SELECT `table_xxx`.`id` FROM `table_xxx`
[Wed, 16 May 18 11:18:43 +0800][DEBUG] Master: UPDATE `table_xxx` SET `name` = 'xxx'
```

## 优劣比较

> 个人觉得两种方法实现各有优劣，需要结合自己的业务进行选取.

- 使用方法一时，可以单独设置每个Model使用的db链接，适用于多个库中同名表操作的不同情境，更加灵活。
- 使用方法二时比较固定，直接使用Manager返回固定db链接，不再做其他处理逻辑，比较死板，但性能会高于方法一。

建议如果只是为了使用主从切换功能的话，方法二会更适合，性能会更高，毕竟实际业务可能没有那么多切换库的逻辑。

## 写在最后

上述两种方法可以同时存在，但优先级是方法二 > 方法一，即`modelsManager`的优先级高于`Model`中定义。本质原因是因为Model中执行SQL查询时，也会向modelsManager索取db实例，框架源代码文件如下

```php?start_inline=1
// phalcon/mvc/model.zep

/**
 * Gets the connection used to read data for the model
 */
public function getReadConnection() -> <AdapterInterface>
{
    var transaction;

    let transaction = <TransactionInterface> this->_transaction;
    if typeof transaction == "object" {
        return transaction->getConnection();
    }

    return (<ManagerInterface> this->_modelsManager)->getReadConnection(this);
}

/**
 * Gets the connection used to write data to the model
 */
public function getWriteConnection() -> <AdapterInterface>
{
    var transaction;

    let transaction = <TransactionInterface> this->_transaction;
    if typeof transaction == "object" {
        return transaction->getConnection();
    }

    return (<ManagerInterface> this->_modelsManager)->getWriteConnection(this);
}
```

可以看出读写Model进行查询时db实例的获取会通过modelsManager的`getReadConnection`和`getWriteConnection`方法实现，默认情况下Manager会返回Model注册时的实例，即方法一的实现，但如果同时使用了方法二，会直接覆盖原本Manager的实现，不会再使用Model中注册的逻辑。


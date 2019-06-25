---
layout: post
title: Supervisor 进程管理
keywords: supervisor, 进程管理， linux进程控制
description: Linux、Mac环境下使用 Supervisor 管理进程，守护进程运行
comments: 1
code: 1
tags: [supervisor, opensource]
---

使用Linux、 Mac系统的同学们一定遇到过这样的问题：我要打开一个进程，或者说跑一个脚本，但是呢，这个脚本有些不稳定，时不时的抽一下风，自己可能就会挂掉了，然后我要手动重启。当然一次两次我手动重启还是可以接受的，但当我要启动的这个程序要作为Service服务运行的时候，那么我就必须得一直得ps看着他还在不在，不在了就得人工参与启动服务。

这样的日子过够了之后，一些聪明的程序猿可能就会想一些法子了，比如自己写一个daemon守护进程，一直ps盯着程序是否还在，如果不在就启动，否则不处理。类似下面的shell脚本，通过crontab的方式定时检测

```shell
exists=`ps ux |grep 'program.xxx'`

if [$exists = '' ];then
    echo 'not running'
    run program
else
    echo 'running, exit'
fi
```

上面的方法简单经济实惠，哼哼，感觉能满足大部分常规检测的需求，但今天我要说的是一个专业的进程守护工具， **Supervisor**，这货在基hub开源，由Python实现，地址 [https://github.com/Supervisor/supervisor](https://github.com/Supervisor/supervisor)

------

## 安装
4种方法

-   `pip install supervisor`  [常规python安装]
-   `apt-get install supervisor` [Linux系统 ubuntu]
-   `yum install supervisor` [Linux系统 cent]
-   `brew install supervisor` [Mac OS]

-----

## 使用
> 安装好了supervisor之后，系统主要会多出两个命令，`supervisord` `supervisorctl`，由于supervisor是类似CS的，`supervisord`其实就是服务端，真实的控制着程序运行，而`supervisorctl`就是客户端，可以连接服务端进行控制。


### 配置文件
很贴心，怕你不会写配置，程序帮你写好了一份样板，如下使用
`echo_supervisord_conf` 这个命令会输出配置样例，我们把输出写到文件中

```shell
echo_supervisord_conf > /usr/local/etc/supervisord.ini
```

之后`/usr/local/etc/supervisord.ini`文件中内容如下，忽略了一些不常用的配置项

```ini
; Sample supervisor config file.
;
; For more information on the config file, please see:
; http://supervisord.org/configuration.html
;
; Notes:
;  - Shell expansion ("~" or "$HOME") is not supported.  Environment
;    variables can be expanded using this syntax: "%(ENV_HOME)s".
;  - Comments must have a leading space: "a=b ;comment" not "a=b;comment".

[unix_http_server]
file=/usr/local/var/run/supervisor.sock   ; (the path to the socket file)
;chmod=0700                 ; socket file mode (default 0700)
;chown=nobody:nogroup       ; socket file uid:gid owner
;username=user              ; (default is no username (open server))
;password=123               ; (default is no password (open server))

;[inet_http_server]         ; inet (TCP) server disabled by default
;port=127.0.0.1:9001        ; (ip_address:port specifier, *:port for all iface)
;username=user              ; (default is no username (open server))
;password=123               ; (default is no password (open server))

[supervisord]
logfile=/usr/local/var/log/supervisord.log ; (main log file;default $CWD/supervisord.log)
logfile_maxbytes=50MB        ; (max main logfile bytes b4 rotation;default 50MB)
logfile_backups=10           ; (num of main logfile rotation backups;default 10)
loglevel=info                ; (log level;default info; others: debug,warn,trace)
pidfile=/usr/local/var/run/supervisord.pid ; (supervisord pidfile;default supervisord.pid)
nodaemon=false               ; (start in foreground if true;default false)
minfds=1024                  ; (min. avail startup file descriptors;default 1024)
minprocs=200                 ; (min. avail process descriptors;default 200)
;umask=022                   ; (process file creation umask;default 022)
;user=chrism                 ; (default is current user, required if root)
;identifier=supervisor       ; (supervisord identifier, default is 'supervisor')
;directory=/tmp              ; (default is not to cd during start)
;nocleanup=true              ; (don't clean up tempfiles at start;default false)
;childlogdir=/tmp            ; ('AUTO' child log dir, default $TEMP)
;environment=KEY="value"     ; (key value pairs to add to environment)
;strip_ansi=false            ; (strip ansi escape codes in logs; def. false)

; the below section must remain in the config file for RPC
; (supervisorctl/web interface) to work, additional interfaces may be
; added by defining them in separate rpcinterface: sections
[rpcinterface:supervisor]
supervisor.rpcinterface_factory = supervisor.rpcinterface:make_main_rpcinterface

[supervisorctl]
serverurl=unix:///usr/local/var/run/supervisor.sock ; use a unix:// URL  for a unix socket
;serverurl=http://127.0.0.1:9001 ; use an http:// url to specify an inet socket
;username=chris              ; should be same as http_username if set
;password=123                ; should be same as http_password if set
;prompt=mysupervisor         ; cmd line prompt (default "supervisor")
;history_file=~/.sc_history  ; use readline history if available

; The [include] section can just contain the "files" setting.  This
; setting can list multiple files (separated by whitespace or
; newlines).  It can also contain wildcards.  The filenames are
; interpreted as relative to this file.  Included files *cannot*
; include files themselves.

; ......

[include]
files = /usr/local/etc/supervisor.d/*.ini
```
<br>
我们要改的主要是如下部分：

`1、浏览器登录管理`

```ini
; http服务地址，我们可以在浏览器中进行进程管理
; 去掉注释改成下面的样子即可

[inet_http_server]         ; inet (TCP) server disabled by default
port=127.0.0.1:9001        ; (ip_address:port specifier, *:port for all iface) ; 服务器监听地址
username=user              ; (default is no username (open server)) ; 认证登录时的用户名
password=123               ; (default is no password (open server)) ; 认证登录时的密码
```

`2、运行程序配置`

可以看到主配置最后include了`supervisor.d`文件夹下的`*.ini`配置文件，这些被引入的配置其实就是你要启动和守护的程序配置，都要写在这个文件夹里，稍后还会详细说明

```ini
[include]
files = /usr/local/etc/supervisor.d/*.ini
```
<br>

### 运行Supervisor主程序

```shell
# -c 是指定了配置文件的位置
supervisord -c /usr/local/etc/supervisord.ini
```

> 如果控制台没有输出，并且ps有supervisor进程在，恭喜，你已经成功启动了！

<br>

### 加入你要守护的程序配置

在`/usr/local/etc/supervisor.d/`文件夹中增加你的程序配置，最好的是一个程序一个配置文件，易于管理，像这样

```ini
# filename: jenkins.ini 控制jenkins进程的配置

# 程序概述名
[program:jenkins-daemon]

# 程序运行时显示的名字 默认这样即可
process_name=%(program_name)s_%(process_num)02d

# 下面command配置是你的启动命令 如 /usr/bin/php /users/qii404/xxx.php ，绝对路径，不支持$HOME类似的变量
command=/usr/bin/java -jar /Users/qii404/jenkins/jenkins.war

# 该程序是否随着supervisor启动时自动启动
autostart=true

# 挂掉之后自动重新启动
autorestart=true

# 启动用户
user=baidu
numprocs=1
redirect_stderr=true

# 程序日志文件
stdout_logfile=/Users/qii404/jenkins_daemon.log
```

<br>

### 通过supervisorctl进入控制台

1. 执行`supervisorctl`，根据提示输入你在`/usr/local/etc/supervisord.ini`配置中的用户名和密码
2. 执行`help`可以找到你需要的命令列表
3. 此时，你新加入的jenkins配置还没剩生效，要手动引入，`reread`命令重新载入配置
4. `avail`可以看到你加入的程序和状态，如果看到了新加的jenkins，说明配置读取成功
5. `reload`重启程序，此时也会把你的jenkins启动
6. `status`可以看到目前正在运行的程序

```shell
supervisor> status
jenkins-daemon:jenkins-daemon_00                   RUNNING   pid 45418, uptime 0:10:23
```

如果看到上面输出，恭喜，你的jenkins已经被启动了~

如果想关闭，在控制台执行`stop jenkins-daemon:jenkins-daemon_00`即可

<br>

### 通过可视化界面控制
上面配置中还说了一个`port=127.0.0.1:9001 `的配置项起始就是为了浏览器控制台准备的，打开浏览器输入`127.0.0.1:9001`， 输入刚刚配置中的用户名和密码：

![supervisor登录](https://imgup.qii404.me/blog/5d11c0e7925fe.jpg)

![supervisor可视化控制台](https://imgup.qii404.me/blog/5d11c0e85038d.jpg)

我们可以方便的进行重启、停止等操作，甚至还能监控程序的日志输出哦~





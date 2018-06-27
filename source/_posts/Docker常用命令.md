---
title: Docker常用命令
tags:
  - docker
categories:
  - docker
alink: docker-command
date: 2018-06-27 13:58:29
---

# Docker镜像

## 搜索镜像
```bash
docker search mysql
```

## 拉取镜像
```bash
docker pull mysql:latest #latest:是指镜像最高版本号
```

## 查看镜像列表
```bash
docker images
```

## 查看镜像构建过程
```bash
Usage: docker history [OPTIONS] IMAGE
Show the history of an image
Options:
        ‐‐format string 使用Go模板的美观的打印镜像。
    ‐H, ‐‐human 打印人类可读的大小和日期格式(default true)
        ‐‐no‐trunc 不截断输出
    ‐q, ‐‐quiet 只显示镜像编号
```

## 删除镜像
```bash
Usage: docker rmi [OPTIONS] IMAGE [IMAGE...]
Remove one or more images
Options:
    ‐f, ‐‐force 强制删除镜像
        ‐‐no‐prune 不移除该镜像的过程镜像，默认移除
```

# Docker容器

## 查看配置信息
```bash
docker info
```

## 查看容器列表
```bash
Usage: docker ps [OPTIONS]
List containers
Options:
    ‐a, ‐‐all 显示所有容器 (默认显示运行)
    ‐f, ‐‐filter filter 根据提供的条件过滤显示的内容
        ‐‐format string 使用Go模板的美观的打印容器。
    ‐n, ‐‐last int 显示最后一个创建的容器 (includes all states) (default ‐1)
    ‐l, ‐‐latest 显示最新创建的容器。(includes all states)
        ‐‐no‐trunc 不截断输出
    ‐q, ‐‐quiet 只显示容器编号
    ‐s, ‐‐size 显示总的文件大小
```

## 创建并运行容器

```bash
Usage: docker run [OPTIONS]
Options:
    -d 后台运行
    -it 进入容器
    --name 给容器取名
```

### 示例

```bash
docker run mysql:latest
```

- 随机映射端口
```bash
docker run -d -P --name mynginx nginx
```
- 指定映射端口
```bash
docker run -d -p 8080:80 --name mynginx nginx
```
- 映射宿主机文件目录
```bash
docker run -it --name volume-test1 -h nginx -v /data centos
```
- 查看宿主机文件目录
```bash
docker inspect --format "{{.Mounts}}" volume-test1
```
- 映射宿主机指定文件目录
```bash
docker run -it --name volume-test2 -h nginx -v /root/blog:/root/blog centos
```


## 启动、停止、重启容器

### 启动
```bash
Usage: docker start [OPTIONS] CONTAINER [CONTAINER...]
Start one or more stopped containers
Options:
    ‐a, ‐‐attach 启动一个容器并打印输出结果和错误
        ‐‐checkpoint string 从这个检查点恢复
        ‐‐checkpoint‐dir string 使用一个自定义检查点存储目录
        ‐‐detach‐keys string 重写分离容器的键序列
    ‐i, ‐‐interactive 启动一个容器并进入交互模式
```


### 重启
```bash
Usage: docker restart [OPTIONS] CONTAINER [CONTAINER...]
Restart one or more containers
Options:
    ‐t, ‐‐time int 停止或者重启容器的超时时间（秒），超时后系统将杀死进程(default 10)
停止
```

### 停止
```bash
Usage: docker stop [OPTIONS] CONTAINER [CONTAINER...]
Stop one or more running containers
Options:
    ‐t, ‐‐time int 停止或者重启容器的超时时间（秒），超时后系统将杀死进程(default 10)
```

## 删除容器
```bash
Usage: docker rm [OPTIONS] CONTAINER [CONTAINER...]
Remove one or more containers
Options:
    ‐f, ‐‐force 强制移除正在运行的容器(uses SIGKILL)
    ‐l, ‐‐link 删除指定的链接
    ‐v, ‐‐volumes 删除与容器关联的卷
```

## 查看日志
```bash
Usage: docker logs [OPTIONS] CONTAINER
Fetch the logs of a container
Options:
        ‐‐details 向日志显示额外的详细信息。
    ‐f, ‐‐follow  跟踪日志输出
        ‐‐since string 显示某个开始时间的所有日志 (e.g. 2013‐01‐02T13:23:37) or relative
        (e.g. 42m for 42 minutes)
        ‐‐tail string 从日志末尾显示的行数
        (default "all")
    ‐t, ‐‐timestamps 显示时间戳
        ‐‐until string 显示某个时间戳之前的日志 (e.g. 2013‐01‐02T13:23:37) or relative
    (e.g. 42m for 42 minutes)
```

- 示例
```
docker logs -t -f --tail=500 PID
```

## 查看容器内的进程
```bash
Usage: docker top [OPTIONS] CONTAINER [ps OPTIONS]
# 例如：
sudo docker top name/id
```

## 深入容器信息
包括配置信息，名称，命令、网路配置以及很多有用数据
```bash
Usage: docker inspect [OPTIONS] NAME|ID [NAME|ID...]
Return low‐level information on Docker objects
Options:
    ‐f, ‐‐format string 使用给定的Go模板格式化输出
    ‐s, ‐‐size 如果类型为容器，则显示总文件大小
        ‐‐type string 返回指定类型的JSON
```

- 示例
```bash
## 首先获取容器的pid
docker inspect --format "{{.State.Pid}}" 容器名
## 根据进程号进入挂载
nsenter --target 进程号(Pid) --mount --uts --ipc --net --pid
```

### 小技巧
创建一个快速进入容器的脚本

- 创建脚本
```
vim in.sh
```

- 内容如下
```bash
#!/bin/bash
CNAME=$1
CPID=$(docker inspect --format "{{.State.Pid}}" $CNAME)
nsenter --target "$CPID" --mount --uts --ipc --net --pid
```

- 使用方式
```bash
./in.sh mynginx
```


### 查看网络配置
```bash
docker inspect ‐‐format '{{.NetworkSettings}}' 容器ID
```
### 查看容器IP地址
```bash
docker inspect ‐‐format '{{.NetworkSettings.IPAddress}}' 容器ID
```
### 查看所有容器的IP地址
```bash
docker inspect ‐‐format='{{.Name}} ‐ {{range .NetworkSettings.Networks}}{{.IPAddress}}
{{end}}' $(docker ps ‐aq)
```
# Docker容器开机自动启动
在使用`docker run`启动容器时，使用`–restart`参数来设置：
```bash
docker run ‐m 512m ‐‐memory‐swap 1G ‐it ‐p 58080:8080 ‐‐restart=always ‐‐name bvrfis ‐‐
volumes‐from logdata mytomcat:4.0 /root/run.sh
```
- 命令说明：
    –restart具体参数值详细信息：
    no - 容器退出时，不重启容器；
    on-failure - 只有在非0状态退出时才从新启动容器；
    always - 无论退出状态是如何，都重启容器。

如果创建时未指定 `–restart=always` ,可通过`update` 命令设置
```bash
docker update ‐‐restart=always xxx
```
还可以在使用 `on-failure` 策略时，指定Docker将尝试重新启动容器的最大次数。默认情况下，Docker将尝试永远重新
启动容器。
```bash
sudo docker run ‐‐restart=on‐failure:10 redis
```

# Docker容器进入的4种方式

## SSH登陆进容器
- 方法1：需要在容器中启动sshd，存在开销和攻击面增大的问题。同时也违反了Docker所倡导的一个容器一个进程
的原则。
- 方法2：需要额外学习使用第三方工具。

## nsenter、nsinit等第三方工具
所以大多数情况最好还是使用Docker原生方法，Docker目前主要提供了`docker exec`和`docker attach`两个命
令。

## Docker attach
Docker attach可以attach到一个已经运行的容器的`stdin`，然后进行命令执行的动作。
但是需要注意的是，如果从这个`stdin`中`exit`，会`导致容器停止`。

1. 必须使用`/bin/bash`命令创建的容器才能使用Docker attach进入容器：
```bash
sudo docker run ‐itd ubuntu:14.04 /bin/bash
```

2. 然后我们使用`docker ps`查看到该容器信息，接下来就使用`docker attach`进入该容器：
```bash
sudo docker attach 44fc0f0582d9
```

## Docker exec
关于-i、-t参数
- -i
可以看出只用-i时，由于没有分配伪终端，看起来像pipe执行一样。但是执行结果、命令返回值都可以正确
获取。
- -it
    使用-it时，则和我们平常操作console界面类似。而且也不会像`attach`方式因为退出，导致整个容器退出。
这种方式可以替代`ssh`或者`nsenter`、`nsinit`方式，在容器内进行操作。
- -t
    如果只使用-t参数，则可以看到一个console窗口，但是执行命令会发现由于没有获得stdin的输出，无法看
到命令执行情况。
关于-d参数
- -d
    在后台执行一个进程。可以看出，如果一个命令需要长时间进程，使用-d参数会很快返回。 程序在后台运
行。 如果不使用`-d`参数，由于命令需要长时间执行，`docker exec`会卡住，一直等命令执行完成 才返回。

使用`docker exec`进入容器
```bash
sudo docker exec ‐it 775c7c9ee1e1 /bin/bash
```


# 小技巧

## 停止容器 & 删除容器所有容器 (慎用)
```bash
docker stop $(docker ps -q) & docker rm $(docker ps -aq)
```



## 清除坏的`<none>:<none>`镜像
- 坏的镜像的产生
`docker build` 或是 `pull` 命令就会产生临时镜像。如果我们用`dockerfile`创建一个helloworld镜像后，因为版本更新需要重新创建，那么以前那个版本的镜像就会
成为临时镜像。这个是需要删除的。删除命令见下。
```bash
docker rmi $(docker images -f "dangling=true" -q)
```



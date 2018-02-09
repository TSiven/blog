---
title: RocketMQ集群搭建
tags:
  - RocketMQ
  - Cluster
  - rocketmq-console
categories:
  - RocketMQ
abbrlink: d91bf2fe
date: 2018-02-09 13:57:49
---

# 前言

推荐的几种`Broker`集群部署方式，这里的`Slave`不可写，但可读，类似于 Mysql主备方式。

## 多Master模式（2m-noslave）
一个集群无Slave，全是Master，例如2个Master或者3个Master
- 优点：配置简单，单个Master宕机或重启维护对应用无影响，在磁盘配置为RAID10时，即使机器宕机不可恢复情况下，由于RAID10磁盘非常可靠，消息也不会丢（异步刷盘丢失少量消息，同步刷盘一条不丢）。性能最高。
- 缺点：单台机器宕机期间，这台机器上未被消费的消息在机器恢复之前不可订阅，消息实时性会受到受到影响。

<!-- more -->

## 多Master多Slave模式，异步复制（2m-2s-async）
每个Master配置一个Slave，有多对Master-Slave，HA采用异步复制方式，主备有短暂消息延迟，毫秒级。
- 优点：即使磁盘损坏，消息丢失的非常少，且消息实时性不会受影响，因为Master宕机后，消费者仍然可以从Slave消费，此过程对应用透明。不需要人工干预。性能同多Master模式几乎一样。
- 缺点：Master宕机，磁盘损坏情况，会丢失少量消息。

## 多Master多Slave模式，同步双写（2m-noslave）
每个Master配置一个Slave，有多对Master-Slave，HA采用同步双写方式，主备都写成功，向应用返回成功。
- 优点：数据与服务都无单点，Master宕机情况下，消息无延迟，服务可用性与数据可用性都非常高
- 缺点：性能比异步复制模式略低，大约低10%左右，发送单个消息的RT会略高。目前主宕机后，备机不能自动切换为主机，后续会支持自动切换功能。



# 集群部署

## 多Master模式搭建

### 总体架构
![](http://qiniu-pic.siven.net/blog/2018-02-09-094447.png)

### 服务器环境

序号 | IP           | 角色                    | 架构模式
-----|--------------|-------------------------|-----------------------
1    | 10.211.55.14 | nameserver、brokerserver | Master1（双Master模式）
2    | 10.211.55.15 | nameserver、brokerserver | Master2（双Master模式）

---
> **注:** 以下配置需要同时在以上两台服务器中进行


### Hosts添加信息
```bash
vim /etc/hosts
```

配置如下:
```
# rocketmq hosts
10.211.55.14 rocketmq-nameserver1
10.211.55.14 rocketmq-master1
10.211.55.15 rocketmq-nameserver2
10.211.55.15 rocketmq-master2
```
重启网卡
```bash
service network restart
```

### 下载并解压
RocketMQ官网: [http://rocketmq.apache.org/](http://rocketmq.apache.org/)
```bash
wget http://mirror.bit.edu.cn/apache/rocketmq/4.2.0/rocketmq-all-4.2.0-bin-release.zip
unzip rocketmq-all-4.2.0-bin-release.zip
mv rocketmq-all-4 /usr/local/rocketmq
```

### 环境变量配置
```bash
vim /etc/profile
```
在profile文件的末尾加入如下命令
```bash
#set rocketmq
ROCKETMQ_HOME=/usr/local/rocketmq
PATH=$PATH:$ROCKETMQ_HOME/bin
export ROCKETMQ_HOME PATH
```
输入:wq! 保存并退出， 并使得配置立刻生效：
```bash
source /etc/profile
```

### 创建存储路径
```bash
mkdir /usr/local/rocketmq/store
mkdir /usr/local/rocketmq/store/commitlog
mkdir /usr/local/rocketmq/store/consumequeue
mkdir /usr/local/rocketmq/store/index
```

### RocketMQ配置文件
```bash
vim /usr/local/rocketmq/conf/2m-noslave/broker-a.properties
vim /usr/local/rocketmq/conf/2m-noslave/broker-b.properties
```

修改配置如下:
```
#所属集群名字
brokerClusterName=rocketmq-cluster
#broker名字，注意此处不同的配置文件填写的不一样
brokerName=broker-a|broker-b
#0 表示 Master，>0 表示 Slave
brokerId=0
#nameServer地址，分号分割
namesrvAddr=rocketmq-nameserver1:9876;rocketmq-nameserver2:9876
#在发送消息时，自动创建服务器不存在的topic，默认创建的队列数
defaultTopicQueueNums=4
#是否允许 Broker 自动创建Topic，建议线下开启，线上关闭
autoCreateTopicEnable=true
#是否允许 Broker 自动创建订阅组，建议线下开启，线上关闭
autoCreateSubscriptionGroup=true
#Broker 对外服务的监听端口
listenPort=10911
#删除文件时间点，默认凌晨 4点
deleteWhen=04
#文件保留时间，默认 48 小时
fileReservedTime=120
#commitLog每个文件的大小默认1G
mapedFileSizeCommitLog=1073741824
#ConsumeQueue每个文件默认存30W条，根据业务情况调整
mapedFileSizeConsumeQueue=300000
#destroyMapedFileIntervalForcibly=120000
#redeleteHangedFileInterval=120000
#检测物理文件磁盘空间
diskMaxUsedSpaceRatio=88
#存储路径
storePathRootDir=/usr/local/rocketmq/store
#commitLog 存储路径
storePathCommitLog=/usr/local/rocketmq/store/commitlog
#消费队列存储路径存储路径
storePathConsumeQueue=/usr/local/rocketmq/store/consumequeue
#消息索引存储路径
storePathIndex=/usr/local/rocketmq/store/index
#checkpoint 文件存储路径
storeCheckpoint=/usr/local/rocketmq/store/checkpoint
#abort 文件存储路径
abortFile=/usr/local/rocketmq/store/abort
#限制的消息大小
maxMessageSize=65536
#flushCommitLogLeastPages=4
#flushConsumeQueueLeastPages=2
#flushCommitLogThoroughInterval=10000
#flushConsumeQueueThoroughInterval=60000
#Broker 的角色
#- ASYNC_MASTER 异步复制Master
#- SYNC_MASTER 同步双写Master
#- SLAVE
brokerRole=ASYNC_MASTER
#刷盘方式
#- ASYNC_FLUSH 异步刷盘
#- SYNC_FLUSH 同步刷盘
flushDiskType=ASYNC_FLUSH
#checkTransactionMessageEnable=false
#发消息线程池数量
#sendMessageThreadPoolNums=128
#拉消息线程池数量
#pullMessageThreadPoolNums=128
```

### 修改日志配置文件
```bash
mkdir -p /usr/local/rocketmq/logs
cd /usr/local/rocketmq/conf && sed -i 's#${user.home}#/usr/local/rocketmq#g' *.xml
```

### 修改启动脚本参数

#### runbroker.sh
```bash
vim /usr/local/rocketmq/bin/runbroker.sh
```

需要根据内存大小进行适当的对JVM参数进行调整：
```
#===========================================================================================
# 开发环境配置 JVM Configuration
#===========================================================================================
JAVA_OPT="${JAVA_OPT} -server -Xms1g -Xmx1g -Xmn512m"
```

本机为虚拟机，就设置小点，1-2g内存，如下：
![](http://qiniu-pic.siven.net/blog/2018-02-09-083045.png)


#### runserver.sh

```bash
vim /usr/local/rocketmq/bin/runserver.sh
```

```
#===========================================================================================
# 开发环境配置 JVM Configuration
#===========================================================================================
JAVA_OPT="${JAVA_OPT} -server -Xms1g -Xmx1g -Xmn512g -XX:MetaspaceSize=128m -XX:MaxMetaspaceSize=320m"
```

![](http://qiniu-pic.siven.net/blog/2018-02-09-083329.png)

### 服务启动

#### 启动NameServer (master1、master2)
```bash
cd /usr/local/rocketmq/bin
nohup sh mqnamesrv &
```

#### 启动BrokerServer A (master1)
```bash
cd /usr/local/rocketmq/bin
nohup sh mqbroker -c /usr/local/rocketmq/conf/2m-noslave/broker-a.properties &
```

#### 启动BrokerServer B (master2)
```bash
cd /usr/local/rocketmq/bin
nohup sh mqbroker -c /usr/local/rocketmq/conf/2m-noslave/broker-b.properties &
```
**注：** 在master2上的名称为`broker-b.properties`

#### 查看进程状态
- jps
![](http://qiniu-pic.siven.net/blog/2018-02-09-095032.png)

- netstat -ntlp
![](http://qiniu-pic.siven.net/blog/2018-02-09-095002.png)

#### 查看日志
```bash
# 查看nameServer日志
tail -500f /usr/local/rocketmq/logs/rocketmqlogs/namesrv.log
# 查看broker日志
tail -500f /usr/local/rocketmq/logs/rocketmqlogs/broker.log
```


### 数据清理
```bash
cd /usr/local/rocketmq/bin
sh mqshutdown broker
sh mqshutdown namesrv
# --等待停止
rm -rf /usr/local/rocketmq/store
mkdir /usr/local/rocketmq/store
mkdir /usr/local/rocketmq/store/commitlog
mkdir /usr/local/rocketmq/store/consumequeue
mkdir /usr/local/rocketmq/store/index
# --按照上面步骤重启NameServer与BrokerServer
```


# RocketMQ Console (监控平台)

## 概述
`RocketMQ`有一个对其扩展的开源项目[incubator-rocketmq-externals](https://github.com/apache/rocketmq-externals)，这个项目中有一个子模块叫`rocketmq-console`，这个便是管理控制台项目了，先将[incubator-rocketmq-externals](https://github.com/apache/rocketmq-externals)拉到本地，因为我们需要自己对`rocketmq-console`进行编译打包运行。

![](http://qiniu-pic.siven.net/blog/2018-02-09-084750.png)

## 下载并编译
```bash
git clone https://github.com/apache/rocketmq-externals
cd rocketmq-console
mvn clean package -Dmaven.test.skip=true
```

如下图：
![](http://qiniu-pic.siven.net/blog/2018-02-09-084620.png)

此时在`rocketmq-console/target`目录下生成了一个叫`rocketmq-console-ng-1.0.0.jar`的jar包，如下图：

![](http://qiniu-pic.siven.net/blog/2018-02-09-084727.png)

## 启动运行
启动rocketmq-console，执行命令：
```bash
java -jar rocketmq-console-ng-1.0.0.jar --server.port=8080 --rocketmq.config.namesrvAddr=10.211.55.14:9876;10.211.55.15:9876
```
这里注意需要设置两个参数：`--server.port`为运行的这个web应用的端口，如果不设置的话默认为`8080`；`--rocketmq.config.namesrvAddr`为RocketMQ命名服务地址，如果不设置的话默认为“”。或者修改`rocketmq-console-ng-1.0.0.jar`文件，找到配置文件application.properties，并按照自己需求进行配置。例如：
```
rocketmq.config.namesrvAddr=namesrv服务地址（ip1：port;ip2:port）
```
配置好之后, 就不需要指定`--rocketmq.config.namesrvAddr`参数


启动成功后，我们就可以通过浏览器访问`http://localhost:8080`进入控制台界面了，如下图：
![](http://qiniu-pic.siven.net/blog/2018-02-09-092909.png)

集群节点:
![](http://qiniu-pic.siven.net/blog/2018-02-09-093021.png)

---
title: Redis Sentinel集群方案--单机版
date: 2017-09-15 08:46:51
tags:
 - Redis
 - Sentinel
 - Redis 集群
categories: 
 - Redis
 - Sentinel
---

> 简单介绍下Redis-sentinel：
Redis-sentinel是Redis实例的监控管理、通知和实例失效备援服务，是Redis集群的管理工具。在一般的分布式中心节点数据库中，Redis-sentinel的作用是中心节点的工作，监控各个其他节点的工作情况并且进行故障恢复，来提高集群的高可用性。
> Sentinel是一个独立于Redis之外的进程，不对外提供key/value服务，存在redis的安装目录下Redis-sentinel。主要用来监控redis-server进程，进行master/slave管理，如果Redis没有运行在master/slave模式下，则不需要设置sentinel。

下面例子中用了3个redis-server和3个redis-sentinel来进行安装演示，实际上redis-sentinel的个数不一定要和redis-sever对应，1~n 个都可以，建议redis-server为偶数个。

<!-- more -->

## 部署规划
**注：** 以下各个节点都在同一个服务器中进行演练
master:`7000`
slave1: `7001`
slave2: `7002`
master-sentinel: `8000`
slave1-sentinel: `8001`
slave2-sentinel: `8002`

## 下载安装redis
``` bash
cd
wget http://download.redis.io/releases/redis-2.8.3.tar.gz
tar –zxvf redis-2.8.3.tar.gz
cd redis-2.8.3
make
make install(此处可用PREFIX参数将redis安装到其他目录)
```


## 配置环境

### 创建目录
``` bash
cd /usr/local
mkdir redis_cluster
mkdir redis_cluster/master_7000
mkdir redis_cluster/slave_7001
mkdir redis_cluster/slave_7002
```

### 复制配置文件
从安装包中复制`redis.conf`,`sentinel.conf`配置文件到新建的各个节点目录, 如下: 

#### 复制文件到`master`目录
``` bash
cp ~/redis-2.8.3/redis.conf ./redis_cluster/master_7000/
cp ~/redis-2.8.3/sentinel.conf ./redis_cluster/master_7000/sentinel.conf
```
#### 复制文件到`slave1`目录
``` bash
cp ~/redis-2.8.3/redis.conf ./redis_cluster/slave_7001/
cp ~/redis-2.8.3/sentinel.conf ./redis_cluster/slave_7001/sentinel.conf
```
#### 复制文件到`slave2`目录
``` bash
cp ~/redis-2.8.3/redis.conf ./redis_cluster/slave_7002/
cp ~/redis-2.8.3/sentinel.conf ./redis_cluster/slave_7002/sentinel.conf
```

### 配置文件

#### 配置Master节点

##### redis.conf
```
daemonize yes
pidfile /var/run/redis_7000.pid
port 7000
requirepass servyou   #从服务器从主服务器同步时的认证密码，如果master设置了，slave密码必须设置，反之master没设置，则slave也无需设置
masterauth  servyou  #设置Redis连接密码,如果配置了连接密码,客户端在连接Redis时需要通过AUTH <password>命令提供密码
appendonly no
slave-read-only yes
```

##### sentinel.conf
```
daemonize yes
logfile "/usr/local/redis_cluster/master_7000/log/sentinel_log.log"
#指定sentinel使用的端口，不能与redis-server运行实例的端口冲突
port 8000 
#指定工作目录
dir /tmp 
####sentinel需要监控的master信息：<mastername> <masterIP> <masterPort> <quorum>.
####<quorum>应该小于集群中slave的个数,只有当至少<quorum>个sentinel实例提交"master失效" 才会认为master为ODWON("客观"失效) .
s
sentinel monitor mymaster 127.0.0.1 7000  2  
#设置访问mymaster的密码
sentinel auth-pass mymaster servyou 
#表示如果3s内mymaster没响应，就认为SDOWN
sentinel down-after-milliseconds mymaster 30000 
#表示如果15秒后,mysater仍没活过来，则启动failover，从剩下的slave中选一个升级为master
sentinel failover-timeout mymaster  15000 
#表示如果master重新选出来后，其它slave节点能同时并行从新master同步缓存的台数有多少个，显然该值越大，所有slave节点完成同步切换的整体速度越快，但如果此时正好有人在访问这些slave，可能造成读取失败，影响面会更广。最保定的设置为1，只同一时间，只能有一台干这件事，这样其它slave还能继续服务，但是所有slave全部完成缓存更新同步的进程将变慢。
sentinel parallel-syncs mymaster  1
```

#### 配置Slave1节点

##### redis.conf
```
daemonize yes
pidfile /var/run/redis_7001.pid
port 7001
requirepass servyou
masterauth servyou
appendonly no
slave-read-only yes
slave of 127.0.0.1 7000
```

##### sentinel.conf
```
daemonize yes
logfile "/usr/local/redis_cluster/slave_7001/log/sentinel_log.log"
port 8001
dir /tmp
sentinel monitor mymaster 127.0.0.1 7000 2
sentinel auth-pass mymaster servyou
sentinel down-after-milliseconds mymaster 30000
sentinel parallel-syncs mymaster  1
sentinel failover-timeout mymaster  15000
```

#### 配置Slave2节点
配置与`Slave1`几乎一致

##### redis.conf
```
daemonize yes
pidfile /var/run/redis_7002.pid
port 7002
requirepass servyou
masterauth servyou
appendonly no
slave-read-only yes
slave of 127.0.0.1 7000
```

##### sentinel.conf
```
daemonize yes
logfile "/usr/local/redis_cluster/slave_7002/log/sentinel_log.log"
port 8002
dir /tmp
sentinel monitor mymaster 127.0.0.1 7000 2
sentinel auth-pass mymaster servyou
sentinel down-after-milliseconds mymaster 30000
sentinel parallel-syncs mymaster  1
sentinel failover-timeout mymaster  15000
```

## 启动服务
注意：首次构建sentinel环境时，必须首先启动master。

### 启动master和master-sentinel
``` bash
redis-server /usr/local/redis_cluster/master_7000/redis.conf
redis-sentinel usr/local/redis_cluster/master_7000/sentinel.conf
```

### 启动slave1和slave1-sentinel
```bash
redis-server /usr/local/redis_cluster/slave_7001/redis.conf
redis-sentinel /usr/local/redis_cluster/slave_7001/sentinel.conf
```

### 启动slave2和slave2-sentinel
```bash
redis-server /usr/local/redis_cluster/slave_7002/redis.conf
redis-sentinel /usr/local/redis_cluster/slave_7002/sentinel.conf
```

### 查看进程
![](http://ow1k5uxqk.bkt.clouddn.com/2017-09-15-144135.jpg)

## 查看状态
> info Replication

### 查看master状态
```bash
redis-cli -h 127.0.0.1 -p 7000
```
![](http://ow1k5uxqk.bkt.clouddn.com/2017-09-15-144330.jpg)



### 查看slave1状态
```bash
redis-cli -h 127.0.0.1 -p 7001
```
![](http://ow1k5uxqk.bkt.clouddn.com/2017-09-15-144440.jpg)


### 查看slave2状态
```bash
redis-cli -h 127.0.0.1 -p 7002
```
![](http://ow1k5uxqk.bkt.clouddn.com/2017-09-15-144544.jpg)


## 场景测试

### 场景1: slave宕机
关闭slave1：
![](http://ow1k5uxqk.bkt.clouddn.com/2017-09-15-144813.jpg)
查看master的Replication信息：
此时只存在一个slave。
![](http://ow1k5uxqk.bkt.clouddn.com/2017-09-15-144908.jpg)


### 场景2：slave恢复
[重新开启slave1](#启动slave1和slave1-sentinel)

查看sentinel状态：
sentinel能快速的发现slave加入到集群中：
![](http://ow1k5uxqk.bkt.clouddn.com/2017-09-15-145043.jpg)
查看master的Replication信息：
![](http://ow1k5uxqk.bkt.clouddn.com/2017-09-15-145130.jpg)

### 场景3：master宕机
master-sentinel作为master 1的leader，会选取一个master 1的slave作为新的master。slave的选取是根据一个判断DNS情况的优先级来得到，优先级相同通过runid的排序得到，但目前优先级设定还没实现，所以直接获取runid排序得到slave 1。
然后发送命令slaveof no one来取消slave 1的slave状态来转换为master。当其他sentinel观察到该slave成为master后,就知道错误处理例程启动了。sentinel A然后发送给其他slave slaveof new-slave-ip-port 命令，当所有slave都配置完后，sentinel A从监测的masters列表中删除故障master，然后通知其他sentinels。
![](http://ow1k5uxqk.bkt.clouddn.com/2017-09-15-145400.jpg)



### 场景4：master恢复
[重新启动原来的master](#启动master和master-sentinel)

查看sentinel状态：
原来的master自动切换成slave，不会自动恢复成master：
![](http://ow1k5uxqk.bkt.clouddn.com/2017-09-15-145730.jpg)

连接到slave2,可以看到目前有两个子节点了
![](http://ow1k5uxqk.bkt.clouddn.com/2017-09-15-145803.jpg)

好了, 测试完成!

**注意：若在sentinel已选出新主但尚未完成其它实例的reconfigure之前，重启old master，则整个系统会出现无法选出new master的异常。**
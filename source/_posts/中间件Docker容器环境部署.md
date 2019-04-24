---
title: 中间件Docker容器环境部署
date: 2018-12-27 11:09:18
tags:
  - docker
categories:
  - Docker
alink: docker-middleware
---


## 一、mysql
### 1. 创建/data/mysql目录：
```
mkdir /data/mysql/
```

### 2. 在/data/mysql/conf目录下创建my.cnf文件
```
vim /data/mysql/conf/my.cnf
```

<!-- more -->

该文件为mysql配置文件，内容如下：
```     
[client]
default-character-set = utf8

[mysqld]

pid-file    = /var/run/mysqld/mysqld.pid
socket      = /var/run/mysqld/mysqld.sock
log-error   = /var/run/mysqld/logs/error.log
datadir     = /var/lib/mysql

user = mysql
tmpdir = /tmp

default-storage-engine=INNODB 
character-set-server=utf8
collation-server = utf8_general_ci 
sql_mode=STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION

```

### 3. 拉取mysql镜像：

```
docker pull mysql:5.6
```

### 4. 创建并运行mysql容器：

```
docker run \
    --name mysql \
    --restart=always \
    --privileged=true \
    -p 3306:3306 \
    -e TZ="Asia/Shanghai" \
    -v /etc/localtime:/etc/localtime \
    -v /data/mysql/my.cnf:/etc/mysql/mysql.conf.d/mysqld.cnf \
    -v /data/mysql/data:/var/lib/mysql \
    -e MYSQL_ROOT_PASSWORD=p@ssw0rd \
    -d mysql:5.6


docker run \
    --name mysql \
    --restart=always \
    --privileged=true \
    -p 3306:3306 \
    -v /data/mysql/data:/var/lib/mysql \
    -v /data/mysql/conf/my.cnf:/etc/mysql/conf.d/mysqld.cnf \
    -e MYSQL_ROOT_PASSWORD=p@ssw0rd \
    -d mysql:5.6
```

**命令说明**

- --name mysql：指定容器名称
- --restart=always：随docker主机启动而启动
- --privileged=true: 使用该参数，container内的root拥有真正的root权限, 否则，container内的root只是外部的一个普通用户权限。
- -p 3306:3306：将容器的3306端口映射到主机的3306端口
- -v /data/mysql/conf/my.cnf:/etc/mysql/conf.d/mysqld.cnf：将主机/data/mysql/cnf/my.cnf文件挂载到容器的/etc/mysql/mysql.conf.d/mysqld.cnf
- -v /data/mysql/data:/var/lib/mysql：将主机/data/mysql/data文件挂载到容器的/var/lib/mysql
- -e MYSQL_ROOT_PASSWORD=p@ssw0rd：初始化root用户的密码
- -d：后台运行容器，并返回容器ID
- mysql:5.6: mysql镜像名称

## 二、rabbitmq
### 1. 创建/data/rabbitmq目录：
```
mkdir /data/rabbitmq
```

### 2. 在/data/rabbitmq目录下创建rabbitmq.conf文件，该文件为rabbitmq配置文件，内容如下：
```
loopback_users.guest = false
listeners.tcp.default = 5672
default_pass = admin
default_user = admin
hipe_compile = false
```

### 3. 拉取rabbitmq镜像：
```
docker pull rabbitmq:management
```
### 4. 创建并运行rabbitmq容器：
```
docker run \
    --name rabbit \
    --restart=always \
    --privileged=true \
    -p 15672:15672 \
    -p 5672:5672 \
    -e TZ="Asia/Shanghai" \
    -v /etc/localtime:/etc/localtime \
    -v /data/rabbitmq:/var/lib/rabbitmq \
    -e RABBITMQ_DEFAULT_USER=admin \
    -e RABBITMQ_DEFAULT_PASS=admin \
    -d rabbitmq:3.7-management
```

**命令说明**

- --name rabbit：指定容器名称
- --restart=always：随docker主机启动而启动
- -p 15672:15672：将容器的15672端口映射到主机的15672端口
- -p 5672:5672：将容器的5672端口映射到主机的5672端口
- -v /data/rabbitmq:/var/lib/rabbitmq：将主机/data/rabbitmq文件挂载到容器的/var/lib/rabbitmq
- -e RABBITMQ_DEFAULT_USER=admin：初始化用户名
- -e RABBITMQ_DEFAULT_PASS=hongte888：初始化密码
- -d：后台运行容器，并返回容器ID
- rabbitmq:3.7-management: 镜像名称

### 5. 访问rabbitmq
```
http://127.0.0.1:15672/
账号密码：admin/admin
```
## 三、redis
### 1. 创建/data/redis目录：
```
mkdir /data/mysql
```
### 2. 在/data/redis目录下创建redis.conf文件（文件内容默认为空），该文件为redis的配置文件；

### 3. 拉取redis镜像：
```
docker pull redis:4.0.5
```
### 4. 创建并运行redis容器：
```
docker run \
    --name redis \
    --restart=always \
    --privileged=true \
    -p 6379:6379 \
    -e TZ="Asia/Shanghai" \
    -v /etc/localtime:/etc/localtime \
    -v /data/redis/redis.conf:/usr/local/etc/redis/redis.conf \
    -v /data/redis/data:/data  \
    -d redis:4.0.5 \
    redis-server /usr/local/etc/redis/redis.conf\
    --appendonly yes \
    --requirepass "admin"
```
**命令说明**

- --name redis：指定容器名称
- --restart=always：随docker主机启动而启动
- -p 6379:6379：将容器的3306端口映射到主机的3306端口
- -v /data/redis/redis.conf:/usr/local/etc/redis/redis.conf：将主机/data/redis/redis.conf文件挂载到容器的/usr/local/etc/redis/redis.conf
- -v /data/redis/data:/data：将主机/data/redis/data文件挂载到容器的/data
- -d：后台运行容器，并返回容器ID
- redis:4.0.5: 镜像名称
- --requirepass "admin"：redis访问密码

### 5. 连接redis的方法：
```
docker exec -it redis redis-cli -a hongte888
```
## 四、nexus
### 1. 创建/data/nexus/data目录：
```
mkdir /data/nexus && mkdir /data/nexus/data && chown -R 200 /data/nexus/data
```
### 2. 拉取nexus3镜像：
```
docker pull nexus3:3.8.0
```
### 3. 创建并运行nexus3容器：        
```
docker run \
    --name nexus \
    --restart=always \
    --privileged=true \
    -p 8081:8081 \
    -e TZ="Asia/Shanghai" \
    -v /etc/localtime:/etc/localtime \
    -v /data/nexus/data:/nexus-data \
    -d nexus3:3.8.0
```
**命令说明**

- --name nexus：指定容器名称
- --restart=always：随docker主机启动而启动
- -p 8081:8081：将容器的8081端口映射到主机的8081端口
- -v /data/nexus/data:/nexus-data：将主机/data/nexus/data文件挂载到容器的/nexus-data
- -d：后台运行容器，并返回容器ID
- nexus3:3.8.0: 镜像名称

### 4. 访问nexus
```
http://172.16.200.111:8081/
默认账号密码：admin/admin123
```

## 五、jenkins
### 1. 创建/data/jenkins目录：
```
mkdir /data/jenkins && chown -R 1000 /data/jenkins
```
### 2. 拉取jenkins镜像：
```
docker pull jenkins/jenkins:2.138.2
```
### 3. 创建并运行jenkins容器：  
```
docker run \
    --name jenkins \
    --restart=always \
    --privileged=true \
    --net=host \
    -e TZ="Asia/Shanghai" \
    -v /var/run/docker.sock:/var/run/docker.sock   \
    -v /usr/bin/docker:/usr/bin/docker  \
    -v /usr/lib64/libltdl.so.7:/usr/lib/x86_64-linux-gnu/libltdl.so.7 \
    -v /etc/localtime:/etc/localtime \
    -v /data/jenkins:/var/jenkins_home \
    -v /data/apache-maven-3.5.4:/data/apache-maven-3.5.4 \
    --env JAVA_OPTS="-Djava.util.logging.config.file=/var/jenkins_home/log.properties" \
    -d jenkins/jenkins:2.138.2
```
**命令说明**

- --name jenkins：指定容器名称
- --restart=always：随docker主机启动而启动
- -p 8080:8080：将容器的8080端口映射到主机的8080端口
- -p 50000:50000：将容器的50000端口映射到主机的50000端口
- -v /data/jenkins:/var/jenkins_home：将主机`/data/jenkins`文件挂载到容器的`/ver/jenkins_home`
- -v /data/apache-maven-3.5.2:/data/apache-maven-3.5.2：将主机`/data/apache-maven-3.5.2`文件挂载到容器的`/data/apache-maven-3.5.2`，由于jenkins容器内没有安装maven，所以需要外挂maven到容器内
- -d：后台运行容器，并返回容器ID
- jenkins:2.89.4: 镜像名称

**注意**
docker在容器内构建的时候，如果出现权限不够什么的。可以在宿主机中使用以下两种方式：
```
sudo chmod 777 /var/run/docker.sock
或者
usermod -a -G docker jenkin
``` 

### 4. 访问jenkins
```
http://172.16.200.111:8080/ 
```
## 六、mongo
### 1. 拉取mongo镜像：
```
docker pull mongo:3.4.1
```
### 2. 创建并运行mongo容器： 
```
docker run \
    --name mongo \
    --restart=always \
    --privileged=true \
    -p 27017:27017 \
    -e TZ="Asia/Shanghai" \
    -v /etc/localtime:/etc/localtime \
    -v /data/mongo/datadir:/data/db \
    -d mongo:3.4.1 --auth
```
**命令说明**

- --name mongo：指定容器名称
- --restart=always：随docker主机启动而启动
- -p 27017:27017：将容器的27017端口映射到主机的27017端口
- -v /data/mongo/datadir:/data/db：将主机`/data/mongo/datadir`文件挂载到容器的`/data/db`
- -d：后台运行容器，并返回容器ID
- mongo:3.4.1: 镜像名称

### 3. 创建账号密码：
```
docker exec -it mongo mongo admin

connecting to: admin
> db.createUser({ user: 'root', pwd: 'hongte888', roles: [ { role: "root", db: "admin" } ] });
Successfully added user: {
    "user" : "root",
    "roles" : [
        {
            "role" : "root",
            "db" : "admin"
        }
    ]
}
```
## 六、sonar
### 1. 在mysql数据库中创建sonar，并创建独立的账号密码用于操作sonar数据库。
### 2. 拉取sonar镜像：
```
docker pull sonarqube:7.0
```
### 3. 创建并且启动容器
```
docker run \
    --name sonar \
    --restart=always \
    --privileged=true \
    -p 9000:9000 \
    -p 9092:9092 \
    -e TZ="Asia/Shanghai" \
    -v /etc/localtime:/etc/localtime \
    -e SONARQUBE_JDBC_USERNAME=sonar \
    -e SONARQUBE_JDBC_PASSWORD=1vgne9Xu \
    -e SONARQUBE_JDBC_URL=jdbc:mysql://172.16.200.111:3306/sonar?useUnicode=true\&characterEncoding=utf8 \
    -d sonarqube:7.0
```
**命令说明**

- --name sonar：指定容器名称
- --restart=always：随docker主机启动而启动
- -p 9000:9000：将容器的9000端口映射到主机的9000端口
- -p 9092:9092：将容器的9092端口映射到主机的9092端口
- -e SONARQUBE_JDBC_USERNAME=sonar：连接数据库的账号
- -e SONARQUBE_JDBC_PASSWORD=1vgne9Xu：连接数据库的密码
- -e SONARQUBE_JDBC_URL=jdbc:mysql://mysql_server:3306/sonar?useUnicode=true\&characterEncoding=utf8：连接数据库的jdbcurl，注意`useUnicode=true\&characterEncoding=utf8`是必须加的
- -d：后台运行容器，并返回容器ID
- sonarqube:7.0: 镜像名称

### 4. 汉化sonar
### 1. [下载汉化包](https://github.com/SonarQubeCommunity/sonar-l10n-zh)
### 2. 载后，放入sonar目录，如：sonarqube-5.6\extensions\plugins
### 3. docker通过以下命令放入容器中：
```
docker cp /data/sonar/sonar-l10n-zh-plugin-1.20.jar sonar:/opt/sonarqube/extensions/plugins
```
### 4. 访问sonar
```
http://172.16.200.111:9000/
账号密码：admin/admin
```
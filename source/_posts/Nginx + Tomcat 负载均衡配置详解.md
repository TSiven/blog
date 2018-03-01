---
title: Tomcat + Nginx 负载均衡配置详解
tags:
  - Linux
  - CentOS
  - Nginx
  - Tomcat
categories:
  - Linux
alink: centos-install-nginx
abbrlink: 8bcfa124
date: 2018-01-06 13:00:38
---



# 前言
`Nginx` + `Tomcat`集群是大家常用的一种搭配， 好处有很多, 而我做这个的初衷就两个目的： 
1. 解决`Tomcat`的负载均衡问题； 
2. 当我上线的时候, 启动`Tomcat`, 能够做到外部访问不间断；

![](http://qiniu-pic.siven.net/blog/2018-03-01-122840.jpg)

<!-- more -->

# Nginx安装

参看 []()

# Tomcat服务器配置
> 
新建两个`Tomcat`服务器分别是：
Tomcat1，端口号：`8180`
Tomcat2，端口号：`8280`

## 编辑Tomcat配置文件tomcat1 
编辑配置文件: `/tomcat1/conf/server.xml`
```xml
<Server port="8105" shutdown="SHUTDOWN">
<Connector URIEncoding="UTF-8" connectionTimeout="20000" port="8180" protocol="HTTP/1.1" redirectPort="8443"/>
<Connector port="8109" protocol="AJP/1.3" redirectPort="8443"/>
```

这3个关键子地方的port, 很好记, 我现在修改后都是以 81开头的, 而之后的tomcat2 我就会以82开头:

## 编辑Tomcat配置文件tomcat2 
编辑配置文件: `/tomcat2/conf/server.xml`
```xml
<Server port="8205" shutdown="SHUTDOWN">
<Connector URIEncoding="UTF-8" connectionTimeout="20000" port="8280" protocol="HTTP/1.1" redirectPort="8243"/>
<Connector port="8209" protocol="AJP/1.3" redirectPort="8243"/>
```

---

分别启动两个Tomcat服务器：

```
sh /service/tomcat1/bin/startup.sh
sh /service/tomcat1/bin/startup.sh
```

---

访问地址查看Tomcat结果：
Tomcat1：http://127.0.0.1:8180/
![](http://qiniu-pic.siven.net/blog/2018-01-06-052625.png)

Tomcat2：http://127.0.0.1:8280/
![](http://qiniu-pic.siven.net/blog/2018-01-06-052709.png)

# Nginx负载均衡配置


## 编辑配置文件
```bash
vi /usr/local/nginx/conf/nginx.conf
```


## 我的简单配置
```
worker_processes  1;
pid  logs/nginx.pid;
events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    
    sendfile        on;
    
    keepalive_timeout  65;
    
    upstream mysvr {  
        #ip_hash;
        server 127.0.0.1:8180 weight=1;
        server 127.0.0.1:8280 weight=2;
    }  

    server {
        listen       80;
        server_name  127.0.0.1;
        index index.jsp;

        charset utf-8;
        location / {
            proxy_pass  http://mysvr;  
        }
        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }
    }
}
```


## 访问测试
请求`Nginx`访问地址：http://127.0.0.1:80/


- 参考资料： 
[Nginx + Tomcat集群, 测试OK](http://my.oschina.net/vernon/blog/282925?p=1)
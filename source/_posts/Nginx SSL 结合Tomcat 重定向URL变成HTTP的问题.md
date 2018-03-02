---
title: Nginx SSL 结合Tomcat 重定向URL变成HTTP的问题
abbrlink: d925bb5d
date: 2018-01-05 20:05:55
tags:
  - Tomcat
  - Nginx
  - SSL
alink: nginx-ssl-redirect-problem
categories:
  - Nginx
---


> 参考资料: [《Nginx SSL 结合Tomcat 重定向URL变成HTTP的问题》](http://emacsist.github.io/2016/01/19/Nginx-SSL-结合Tomcat-重定向URL变成HTTP的问题/)
> 以下内容对该文章进行实践的过程进行记录说明


## 问题描述
由于要配置服务器(Nginx + Tomcat）的SSL的问题（Nginx同时监听`HTTP`和`HTTPS`)，但是，如果用户访问的是`HTTPS`协议，然后Tomcat进行重定向的时候，却变成了`HTTP`.

<!-- more -->


## 逐步实践过程
在网上找了一些资料，有些是通过修改Nginx配置即可解决，也有只对Tomcat配置进行调整解决的... 各说不一，以下对尝试的解决过程进行记录：


### 实践一：Nginx新增配置
> HTTP协议制转为https

Nginx代理的配置，要添加以下内容:
```
location / {
    proxy_pass http://test-server;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    # 必须配置:
    proxy_set_header X-Forwarded-Proto  $scheme;

    # 作用是对发送给客户端的URL进行修改, 将http协议强制转为https
    proxy_redirect   http:// https://;
}
```

为了方便测试`proxy_redirect`强制转换, http（80）、https（443）共存
```
server {
    listen  80;  
    listen  443 ssl;  
    ...
}
```

#### 重定向测试
- JAVA CODE：
```java
HttpServletResponse resp = (HttpServletResponse)response;
resp.sendRedirect("/static/html/index.html");
```
- 使用`HTTP`协议访问`nginx`代理地址之后,URL被重定向为`HTTPS`协议了， 如下图所示:
![](http://qiniu-pic.siven.net/blog/2018-01-05-095224.png)


- 当然直接使用HTTPS协议访问, 肯定也是没有问题的，如下图所示:
![](http://qiniu-pic.siven.net/blog/2018-01-05-095340.png)


#### 转发测试
- JAVA CODE：
```java
HttpServletResponse resp = (HttpServletResponse)response;
req.getRequestDispatcher("/static/html/index.html").forward(request, response);
```

- 测试结果与重定向一致, 无异常情况;

#### 测试总结
实际应用场景中,如果要求`HTTP`与`HTTPS`协议共存的时候(请求的协议与响应的协议一致)就会出现`HTTP`请求被强转为`HTTPS`，尝试将Nginx配置`proxy_redirect   http:// https://;`注释，最终使用`HTTPS`协议亦无法正常跳转;


### 实践二：Tomcat新增配置
>不修改Nginx的情况下, 仅对Tomcat配置进行调整

在`server.xml`的`Engine`模块下面配置多一个以下的`Valve`
```xml
<Valve  className="org.apache.catalina.valves.RemoteIpValve" 
        remoteIpHeader="X-Forwarded-For" 
        protocolHeader="X-Forwarded-Proto" 
        protocolHeaderHttpsValue="https"/>
```

#### 重定向测试
使用`HTTPS`协议访问时,最终被重定向到`HTTP`
![](http://qiniu-pic.siven.net/blog/2018-01-05-112959.png)

#### 转发测试
使用`HTTPS`协议访问，转发动作未出现问题
![](http://qiniu-pic.siven.net/blog/2018-01-05-113147.png)


#### 测试总结
重定向的时候, `HTTPS`协议被转为`HTTP`，测试结果不通过。


### 实践三：终极方案
#### Nginx 配置
对过程一Nginx配置进行调整注释或删除`proxy_redirect`，最终如下：
```
location / {
    proxy_pass http://test-server;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    # 必须配置:
    proxy_set_header X-Forwarded-Proto  $scheme;
}
```

#### Tomcat 配置
参看：[Tomcat配置](#实践二tomcat新增配置
)

#### 测试过程

##### HTTP协议请求
![](http://qiniu-pic.siven.net/blog/2018-01-05-115344.png)


##### HTTPS协议请求
![](http://qiniu-pic.siven.net/blog/2018-01-05-115431.png)

#### 测试结果
测试通过，无论使用HTTP访问还是HTTPS访问，最终返回都是根据请求的协议进行响应，问题解决。

## 完整配置
- Nginx

```
worker_processes  1;

events {
    worker_connections  1024;
}


http {
    include       mime.types;
    default_type  application/octet-stream;

    sendfile        on;

    keepalive_timeout  65;

    upstream test-server {  
        server 10.15.16.6:8280 weight=1;
    }

    server {
        listen       80;
        listen       443 ssl;
        server_name  localhost;

        #ssl_certificate      cert.pem;
        #ssl_certificate_key  cert.key;

        ssl_certificate      server.crt;
        ssl_certificate_key  server.key;

       # ssl_session_cache    shared:SSL:1m;
       #ssl_session_timeout  5m;

       # ssl_ciphers  HIGH:!aNULL:!MD5;
       # ssl_prefer_server_ciphers  on;


        location / {
            proxy_pass http://test-server;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

            proxy_set_header X-Forwarded-Proto  $scheme;
            # proxy_redirect   http:// https://;
        }

    }

}
```



---
title: Nginx安装及配置详解
tags:
  - Linux
  - CentOS
  - Nginx
categories:
  - Linux
abbrlink: 3347f9ca
date: 2018-01-06 12:00:38
---

# 前言

`Nginx`是一个web服务器也可以用来做负载均衡及反向代理使用，目前使用最多的就是负载均衡，具体简介我就不介绍了百度一下有很多，下面直接进入安装步骤；

- Nginx相关地址
源码：https://trac.nginx.org/nginx/browser
官网：http://www.nginx.org/

<!-- more -->

# 安装Nginx及相关组件


**Nginx依赖以下模块**
- gzip模块需要 zlib 库
- rewrite模块需要 pcre 库 
- ssl 功能需要openssl库


## 下载安装PCRE
1. 获取pcre编译安装包，在[官网](http://www.pcre.org/)上可以获取当前最新的版本 
  文章使用的版本： [点击下载](http://heanet.dl.sourceforge.net/project/pcre/pcre/8.38/pcre-8.38.tar.bz2)
2. 解压缩pcre-xx.tar.bz2包。
3. 进入解压缩目录，执行./configure。
4. make & make install

```bash
tar -zxcf pcre-8.38.tar.bz2
cd pcre-8.38
sudo ./configure --prefix=/usr/local/pcre
sudo make
sudo make install
```

## 下载安装zlib库
1. 获取zlib编译安装包，在[官网](http://www.zlib.net/)上可以获取当前最新的版本。
文章使用的版本：[点击下载](http://liquidtelecom.dl.sourceforge.net/project/libpng/zlib/1.2.6/zlib-1.2.6.tar.gz)
2. 解压缩zlib-1.2.6.tar.gz 包。
3. 进入解压缩目录，执行./configure。
4. make & make install

```bash
tar -zxvf zlib-1.2.6.tar.gz 
cd zlib-1.2.6
./configure --prefix=/usr/local/zlib
sudo make
sudo make install
```

## 下载安装OpenSSL
1.  获取openssl编译安装包，在[官网](http://www.openssl.org/source/)上可以获取当前最新的版本。
文章使用的版本：[点击下载](https://www.openssl.org/source/openssl-1.0.1t.tar.gz)
2.  解压缩openssl-xx.tar.gz包。
3. 进入解压缩目录，执行./config。
4. make & make install

```bash
tar -zxvf openssl-1.0.1t.tar.gz
cd openssl-1.0.1t
sudo ./configure --prefix=/usr/local/openssl
sudo make
sudo make install
```

## 下载安装Nginx
1. 获取nginx，在[官网](http://nginx.org/en/download.html)上可以获取当前最新的版本。
文章使用的版本：[点击下载](http://nginx.org/download/nginx-1.9.15.tar.gz)
2. 解压缩nginx-xx.tar.gz包。
3. 进入解压缩目录，执行./configure
4. make & make install

```bash
tar -zxvf nginx-1.9.15.tar.gz
cd nginx-1.9.15
sudo ./configure --prefix=/usr/local/nginx
sudo make
sudo make install
```
>若安装时找不到上述依赖模块，使用--with-openssl=< openssl_dir>、--with-pcre=< pcre_dir>、--with-zlib=< zlib_dir>指定依赖的模块目录 (模块源码的安装包目录，而非安装后的目录)。


# 启动Nginx
```bash
/usr/local/nginx/sbin/nginx -c /usr/local/nginx/conf/nginx.conf
```
启动`nginx`之后，浏览器中输入`http://localhost`可以验证是否安装启动成功。


## 常用命令
```bash
# 停止Nginx
sudo /usr/local/nginx/sbin/nginx -s 
# 启动Nginx
sudo /usr/local/nginx/sbin/nginx
# 加载Nginx配置
sudo /usr/local/nginx/sbin/nginx -c /usr/local/nginx/conf/nginx.conf
```

# Nginx配置文件详细说明
**编辑配置文件**
```bash
vi /usr/local/nginx/conf/nginx.conf
```
在此记录下Nginx服务器nginx.conf的配置文件说明, 部分注释收集与网络，[Nginx配置文件详细说明](http://www.cnblogs.com/xiaogangqq123/archive/2011/03/02/1969006.html)
```
#运行用户
user www-data;    
#启动进程,通常设置成和cpu的数量相等
worker_processes  1;

#全局错误日志及PID文件
error_log  /var/log/nginx/error.log;
pid        /var/run/nginx.pid;

#工作模式及连接数上限
events {
    use   epoll;             #epoll是多路复用IO(I/O Multiplexing)中的一种方式,但是仅用于linux2.6以上内核,可以大大提高nginx的性能
    worker_connections  1024;#单个后台worker process进程的最大并发链接数
    # multi_accept on; 
}

#设定http服务器，利用它的反向代理功能提供负载均衡支持
http {
    #设定mime类型,类型由mime.type文件定义
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    #设定日志格式
    access_log    /var/log/nginx/access.log;

    #sendfile 指令指定 nginx 是否调用 sendfile 函数（zero copy 方式）来输出文件，对于普通应用，
    #必须设为 on,如果用来进行下载等应用磁盘IO重负载应用，可设置为 off，以平衡磁盘与网络I/O处理速度，降低系统的uptime.
    sendfile        on;
    #tcp_nopush     on;

    #连接超时时间
    #keepalive_timeout  0;
    keepalive_timeout  65;
    tcp_nodelay        on;
    
    #开启gzip压缩
    gzip  on;
    gzip_disable "MSIE [1-6]\.(?!.*SV1)";

    #设定请求缓冲
    client_header_buffer_size    1k;
    large_client_header_buffers  4 4k;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;

    #设定负载均衡的服务器列表
    upstream mysvr {
        #weigth参数表示权值，权值越高被分配到的几率越大
        #本机上的Squid开启3128端口
        server 192.168.8.1:3128 weight=5;
        server 192.168.8.2:80  weight=1;
        server 192.168.8.3:80  weight=6;
    }


    server {
        #侦听80端口
        listen       80;
        #定义使用www.xx.com访问
        server_name  www.xx.com;

        #设定本虚拟主机的访问日志
        access_log  logs/www.xx.com.access.log  main;

        #默认请求
        location / {
            root   /root;      #定义服务器的默认网站根目录位置
            index index.php index.html index.htm;   #定义首页索引文件的名称

            fastcgi_pass  www.xx.com;
            fastcgi_param  SCRIPT_FILENAME  $document_root/$fastcgi_script_name; 
            include /etc/nginx/fastcgi_params;
        }

        # 定义错误提示页面
        error_page   500 502 503 504 /50x.html;  
            location = /50x.html {
            root   /root;
        }

        #静态文件，nginx自己处理
        location ~ ^/(images|javascript|js|css|flash|media|static)/ {
            root /var/www/virtual/htdocs;
            #过期30天，静态文件不怎么更新，过期可以设大一点，如果频繁更新，则可以设置得小一点。
            expires 30d;
        }
        #PHP 脚本请求全部转发到 FastCGI处理. 使用FastCGI默认配置.
        location ~ \.php$ {
            root /root;
            fastcgi_pass 127.0.0.1:9000;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME /home/www/www$fastcgi_script_name;
            include fastcgi_params;
        }
        #设定查看Nginx状态的地址
        location /NginxStatus {
            stub_status            on;
            access_log              on;
            auth_basic              "NginxStatus";
            auth_basic_user_file  conf/htpasswd;
        }
        #禁止访问 .htxxx 文件
        location ~ /\.ht {
            deny all;
        }
     }
}

```


以上是一些基本的配置，使用Nginx最大的好处就是负载均衡，如果要使用负载均衡的话,可以修改配置http节点如下：

```
#设定http服务器，利用它的反向代理功能提供负载均衡支持
http {
     #设定mime类型,类型由mime.type文件定义
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    #设定日志格式
    access_log    /var/log/nginx/access.log;

    #省略上文有的一些配置节点

    #。。。。。。。。。。

    #设定负载均衡的服务器列表
    upstream mysvr {
        #weigth参数表示权值，权值越高被分配到的几率越大
        server 192.168.8.1x:3128 weight=5;#本机上的Squid开启3128端口
        server 192.168.8.2x:80  weight=1;
        server 192.168.8.3x:80  weight=6;
    }

    upstream mysvr2 {
        #weigth参数表示权值，权值越高被分配到的几率越大
        server 192.168.8.x:80  weight=1;
        server 192.168.8.x:80  weight=6;
    }

    #第一个虚拟服务器
    server {
        #侦听192.168.8.x的80端口
        listen       80;
        server_name  192.168.8.x;

        #对aspx后缀的进行负载均衡请求
        location ~ .*\.aspx$ {

            root   /root;      #定义服务器的默认网站根目录位置
            index index.php index.html index.htm;   #定义首页索引文件的名称

            proxy_pass  http://mysvr ;#请求转向mysvr 定义的服务器列表

            #以下是一些反向代理的配置可删除.

            proxy_redirect off;

            #后端的Web服务器可以通过X-Forwarded-For获取用户真实IP
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            client_max_body_size 10m;    #允许客户端请求的最大单文件字节数
            client_body_buffer_size 128k;  #缓冲区代理缓冲用户端请求的最大字节数，
            proxy_connect_timeout 90;  #nginx跟后端服务器连接超时时间(代理连接超时)
            proxy_send_timeout 90;        #后端服务器数据回传时间(代理发送超时)
            proxy_read_timeout 90;         #连接成功后，后端服务器响应时间(代理接收超时)
            proxy_buffer_size 4k;             #设置代理服务器（nginx）保存用户头信息的缓冲区大小
            proxy_buffers 4 32k;               #proxy_buffers缓冲区，网页平均在32k以下的话，这样设置
            proxy_busy_buffers_size 64k;    #高负荷下缓冲大小（proxy_buffers*2）
            proxy_temp_file_write_size 64k;  #设定缓存文件夹大小，大于这个值，将从upstream服务器传

        }

    }
} 
```


- 参考资料： 
[Nginx安装与使用](http://www.cnblogs.com/skynet/p/4146083.html)
[CentOS6.5安装nginx及负载均衡配置](http://www.cnblogs.com/zhongshengzhen/p/nginx.html)
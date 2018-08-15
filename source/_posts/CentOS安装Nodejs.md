---
title: CentOS安装Nodejs
abbrlink: 33b4e017
date: 2018-01-06 12:43:13
tags:
  - Linux
  - CentOS
  - Nodejs
categories:
  - Linux
alink: centos-install-nodejs
---


# 下载Nodejs

[Node官网](https://nodejs.org/en/)

![](http://qiniu-pic.siven.net/blog/htryo.png)

```
wget https://npm.taobao.org/mirrors/node/v8.0.0/node-v8.0.0-linux-x64.tar.xz
```

# 解压 & 移动目录
```
tar -xvf node-v8.0.0-linux-x64.tar.xz
mv node-v8.0.0-linux-x64 /usr/local/node
```

<!-- more -->

# 配置环境变量
```
vim /etc/profile

#set for nodejs
export NODE_HOME=/usr/local/node
export PATH=$NODE_HOME/bin:$PATH


source /etc/profile
```

# 测试安装
```
node -v
npm -v
```

# 淘宝NPM镜像
```
npm install -g cnpm --registry=https://registry.npm.taobao.org
```
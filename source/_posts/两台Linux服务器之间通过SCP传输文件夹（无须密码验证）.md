---
title: 两台Linux服务器之间通过SCP传输文件夹（无须密码验证）
tags:
  - Linux
  - SCP
categories:
  - Linux
permalink: >-
  two-linux-servers-transfer-folders-through-scp-(without-pasword-authentication)
date: 2017-09-05 21:00:10
---

原文参考：http://buddie.iteye.com/blog/1988730

最近因工作需要，要在两台Linux服务器之间传输文件夹。
Linux命令选择是SCP，SCP命令的基本格式如下：

``` bash
scp -p port user@serverip:/home/user/filename /home/user/filename  
```

以上端口p 为参数，port 端口；
user 为远程服务器的用户；
serverip 为远程服务器ip或者域名；
第一个/home/user/filename 为要传输的远程服务器的文件名；
第二个/home/user/filename 为本地服务服务器的文件名。

<!-- more -->

如果端口是默认，则可省略-p port；如果传传输的为文件夹，则要加-r参数。如下所示：
``` bash
scp -r user@serverip:/home/user/folder /home/user/folder  
```

以上是从serverip这台服务器上下载文件夹/home/user/folder到本服务器的/home/user/folder中。
如果要从本地上传文件夹到远程服务器，那就是下面的类似指令：
 
``` bash
scp -r /home/user/folder user@serverip:/home/user/folder
```
 这样就实现了两台Linux服务器之间的文件、文件夹传输。
 
可是每次都要输入密码验证，很麻烦。
为了不用每次输入密码验证，需要在两个服务器这间建立互信通信。
首先，使用ssh-keygen生成密钥文件和私钥文件
``` bash
ssh-keygen -t rsa  
```

其中rsa为一种加密方式，另一种为dsa
这时，服务器会提醒你输入密钥文件的文件名，默认为/root/.ssh/id_rsa
直接回车
这时，服务器会提醒你输入密码。如果想以后通过该密钥在两台服务器这间通信时，不需要再输入密码的话，这个时候，就不用输入任务字符，直接回车就好！
系统会再确认一下密码，仍然回车。
这样就在/root/.ssh/目录下，生成了id_rsa.pub和id_rsa两上文件。
 
接下来，就要将id_rsa.pub文件上传到目标服务器的/root/.ssh/目录下，重命名为authorized_keys

``` bash
scp -r /root/.ssh/id_rsa.pub user@serverip:/root/.ssh/authorized_keys  
```

这时，输入目标服务器的密码，待文件传输完成后即可。
如果目标服务器上，已经存在了authorized_keys，那么就将id_rsa.pub中的内容追加到目标服务器的authorized_keys文件中

``` bash
cat /root/.ssh/id_rsa.pub | ssh user@serverip 'cat >> /root/.ssh/authorized_keys'
```
此时，再使用scp在这两台服务器这间传输文件，只有第一次，需要输入密码外，以后就再也不用输入密码验证了。


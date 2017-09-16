---
title: 让Mac也能拥有apt-get类似的功能——Brew
date: 2017-09-05 21:03:13
tags: 
  - MAC OS
  - Brew
categories: 
  - MAC OS
---
原文地址：http://snowolf.iteye.com/blog/774312

之前一直怀念ubuntu下的apt-get，因为实在是方便，需要安装什么，一个命令搞定，相关的依赖包统统由apt-get维护。下载，编译，安装，那叫一个痛快。什么软件用着不爽，一个命令卸载！

怀念apt-get之余，发现了替代工具MacPorts，据说也可以解决我的问题。但可惜，我总是无法更新本地软件索引库！

homebrew主页对brew进行了详细的描述，不过我们更希望下载下来实战演练！

<!-- more -->


## 1.安装brew：

``` bash
curl -LsSf http://github.com/mxcl/homebrew/tarball/master | sudo tar xvz -C/usr/local --strip 1
```

上述命令，在官网上可以找到！


## 2.使用brew安装软件

别的工具不说，wget少不了，但是mac上默认没有！
就先拿它来开刀了：


``` bash
brew install wget
```

甚至是安装tomcat：


``` bash
brew install tomcat
```

## 3.使用brew卸载软件

安装简单，卸载就更简单了：

``` bash
brew uninstall unrar
```

## 4.使用brew检索软件

看看我们能搜到什么：

``` bash
brew search /apache*/
```

/apache*/使用的是正则表达式，注意使用/分隔！


---
title: 'idea无法下载依赖包的source,使用maven下载source'
tags:
  - IDEA
  - Maven
categories:
  - Maven
permalink: >-
  idea-can't-download-the-source-of-the-dependency-package,-and-download-source-with-maven
date: 2017-09-10 12:08:07
---

## 问题描述
使用Idea时，想查看依赖包的源码，但出现无法下载的提示：
> idea Sources for ‘spring-context-4.3.2.RELEASE.jar’ not found

## 解决方法
### 方法1
使用Maven命令。经过测试，好用。下载了所有POM里的依赖包的source，这点不是想要的，原来只想下载想看的依赖的source。参考：IDEA-165800 Can’t download dependency’s source code
``` 
mvn dependency:resolve -Dclassifier=sources
```
### 方法2
1.下载POM文件依赖的包的source
```
mvn dependency:sources
```
2.下载POM文件依赖的包的javadoce
```
mvn dependency:resolve -Dclassifier=javadoc
```
3.下载指定依赖包（artifactId）的source。这个很不错，是我想要的。
```
mvn dependency:sources -DincludeArtifactIds=guava
```
参考：[Get source JARs from Maven repository](https://stackoverflow.com/questions/2059431/get-source-jars-from-maven-repository)
　 
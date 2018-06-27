
---
title: GIT初始化仓库
tags:
  - git
categories:
  - git
alink: git-init-repository
date: 2018-06-27 09:44:13
---


# 提交代码到GIT仓库

## 命令行指令

### Git 全局设置
```
git config --global user.name "名称"
git config --global user.email "你的邮箱"
```

### 创建新版本库
```
git clone git@172.16.200.102:dev1/sims-ui.git
cd sims-ui
touch README.md
git add README.md
git commit -m "add README"
git push -u origin master
```

<!-- more -->

### 已存在的文件夹
```
cd existing_folder
git init
git remote add origin git@172.16.200.102:dev1/sims-ui.git
git add .
git commit -m "Initial commit"
git push -u origin master
```

### 已存在的 Git 版本库
```
cd existing_repo
git remote rename origin old-origin
git remote add origin git@172.16.200.102:dev1/sims-ui.git
git push -u origin --all
git push -u origin --tags
```
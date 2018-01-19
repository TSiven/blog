---
title: 并发模型（二）——Master-Worker模式
tags:
  - JAVA
  - 设计模式
  - 并发编程
categories:
  - JAVA
abbrlink: 7d7b0ef9
date: 2018-01-19 15:12:54
---

# 前言
`Master-Worker`模式是常用的并行模式之一，它的核心思想是，系统有两个进程协作工作：`Master`进程，负责接收和分配任务；`Worker`进程，负责处理子任务。当`Worker`进程将子任务处理完成后，结果返回给`Master`进程，由`Master`进程做归纳汇总，最后得到最终的结果。

<!-- more -->

# 什么是Master-Worker模式
该模式的结构图:
![](http://qiniu-pic.siven.net/blog/2018-01-19-071423.jpg)

结构图
![](http://qiniu-pic.siven.net/blog/2018-01-19-071441.jpg)

- `Worker`：用于实际处理一个任务；
- `Master`：任务的分配和最终结果的合成；
- `Main`：启动程序，调度开启Master。

# 代码实现
下面的是一个简易的Master-Worker框架实现。

## 定义一个Task
```java
/**
 * 任务
 */
public class Task {

    private int id;
    private int price;

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getPrice() {
        return price;
    }

    public void setPrice(int price) {
        this.price = price;
    }
}
```

## Master的实现
```java
public class Master {

    /**
     * 1 有一个盛放任务的容器
     */
    private ConcurrentLinkedQueue<Task> workQueue = new ConcurrentLinkedQueue<Task>();

    /**
     * 2 需要有一个盛放worker的集合
     */
    private HashMap<String, Thread> workers = new HashMap<String, Thread>();

    /**
     * 3 需要有一个盛放每一个worker执行任务的结果集合
     */
    private ConcurrentHashMap<String, Object> resultMap = new ConcurrentHashMap<String, Object>();

    /**
     * 4 Master的构造，需要一个Worker进程逻辑，和需要Worker进程数量
     *
     * @param worker      进程逻辑
     * @param workerCount 进程数量
     */
    public Master(Worker worker, int workerCount) {
        worker.setWorkQueue(this.workQueue);
        worker.setResultMap(this.resultMap);

        for (int i = 0; i < workerCount; i++) {
            this.workers.put(Integer.toString(i), new Thread(worker));
        }
    }

    /**
     * 5 需要一个提交任务的方法
     *
     * @param task
     */
    public void submit(Task task) {
        this.workQueue.add(task);
    }

    /**
     * 6 需要有一个执行的方法，启动所有的worker方法去执行任务
     */
    public void execute() {
        for (Map.Entry<String, Thread> me : workers.entrySet()) {
            me.getValue().start();
        }
    }

    /**
     * 7 判断是否运行结束的方法
     *
     * @return
     */
    public boolean isComplete() {
        for (Map.Entry<String, Thread> me : workers.entrySet()) {
            if (me.getValue().getState() != Thread.State.TERMINATED) {
                return false;
            }
        }
        return true;
    }

    /**
     * 8 计算结果方法
     *
     * @return
     */
    public int getResult() {
        int priceResult = 0;
        for (Map.Entry<String, Object> me : resultMap.entrySet()) {
            priceResult += (Integer) me.getValue();
        }
        return priceResult;
    }
}
```

## Worker的实现
```java
public abstract class Worker implements Runnable {

    /**
     *  任务队列，用于取得子任务
     */
    private ConcurrentLinkedQueue<Task> workQueue;
    /**
     * 子任务处理结果集
     */
    private ConcurrentHashMap<String, Object> resultMap;

    public void setWorkQueue(ConcurrentLinkedQueue<Task> workQueue) {
        this.workQueue = workQueue;
    }

    public void setResultMap(ConcurrentHashMap<String, Object> resultMap) {
        this.resultMap = resultMap;
    }

    @Override
    public void run() {
        while (true) {
            //获取子任务
            Task input = this.workQueue.poll();
            if (input == null) break;
            
            //处理子任务
            Object output = handle(input);
            this.resultMap.put(Integer.toString(input.getId()), output);
        }
    }

    /**
     * 抽象子任务处理的逻辑，在子类中实现具体逻辑
     * @param input
     * @return
     */
    public abstract Object handle(Task input);

}
```

## Worker抽象方法handle的实现
```java
public class MyWoker extends Worker {

    @Override
    public Object handle(Task input) {
        Object output = null;
        try {
            //处理任务的耗时。。 比如说进行操作数据库。。。
            Thread.sleep(500);
            output = input.getPrice();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        return output;
    }
}
```

## 进行计算的Main函数
```java
public class Main {

    public static void main(String[] args) {
        //获取系统可用的线程数
        int i1 = Runtime.getRuntime().availableProcessors();
        System.out.println(i1);
        Master master = new Master(new MyWoker(), i1);

        //构造Task并提交master任务
        Random r = new Random();
        for (int i = 1; i <= 100; i++) {
            Task t = new Task();
            t.setId(i);
            t.setPrice(r.nextInt(1000));
            master.submit(t);
        }
        //执行
        master.execute();
        long start = System.currentTimeMillis();

        while (true) {
            if (master.isComplete()) {
                long end = System.currentTimeMillis() - start;
                int priceResult = master.getResult();
                System.out.println("最终结果：" + priceResult + ", 执行时间：" + end);
                break;
            }
        }

    }
}
```

# 总结：
`Master-Worker`模式是一种将串行任务并行化的方案，被分解的子任务在系统中可以被并行处理，同时，如果有需要，`Master`进程不需要等待所有子任务都完成计算，就可以根据已有的部分结果集计算最终结果集。


---
参考文章: [并发模型（二）——Master-Worker模式](http://blog.csdn.net/lmdcszh/article/details/39698189)
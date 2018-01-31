---
title: Java Future模式：Callable、Future和FutureTask浅析
tags:
  - JAVA
  - 设计模式
  - 并发编程
categories:
  - JAVA
abbrlink: b1cdc354
date: 2018-01-31 15:21:19
---

# 前言
在Java中一般通过继承`Thread`类或者实现`Runnable`接口这两种方式来创建多线程，但是这两种方式都有个缺陷，就是不能在执行完成后获取执行的结果，因此Java 1.5之后提供了`Callable`和`Future`接口，通过它们就可以在任务执行完毕之后得到任务的执行结果。本文会简要的介绍使用方法，然后会从源代码角度分析下具体的实现原理。
![](http://qiniu-pic.siven.net/blog/2018-01-31-080956.png)

<!-- more -->

# Callable<V>接口
对于需要执行的任务需要实现`Callable`接口，`Callable`接口定义如下:
```java
public interface Callable<V> {
    /**
     * Computes a result, or throws an exception if unable to do so.
     *
     * @return computed result
     * @throws Exception if unable to compute a result
     */
    V call() throws Exception;
}
```
可以看到`Callable`是个泛型接口，泛型V就是要`call()`方法返回的类型。`Callable`接口和`Runnable`接口很像，都可以被另外一个线程执行，但是正如前面所说的，`Runnable`不会返回数据也不能抛出异常。

# Future<V>接口
`Future`接口代表异步计算的结果，通过`Future`接口提供的方法可以查看异步计算是否执行完成，或者等待执行结果并获取执行结果，同时还可以取消执行。`Future`接口的定义如下:
```java
public interface Future<V> {
    boolean cancel(boolean mayInterruptIfRunning);
    boolean isCancelled();
    boolean isDone();
    V get() throws InterruptedException, ExecutionException;
    V get(long timeout, TimeUnit unit)
        throws InterruptedException, ExecutionException, TimeoutException;
}
```
方法解析：

- cancel():用来取消异步任务的执行。如果异步任务已经完成或者已经被取消，或者由于某些原因不能取消，则会返回false。如果任务还没有被执行，则会返回true并且异步任务不会被执行。如果任务已经开始执行了但是还没有执行完成，若mayInterruptIfRunning为true，则会立即中断执行任务的线程并返回true，若mayInterruptIfRunning为false，则会返回true且不会中断任务执行线程。
- isCanceled():判断任务是否被取消，如果任务在结束(正常执行结束或者执行异常结束)前被取消则返回true，否则返回false。
- isDone():判断任务是否已经完成，如果完成则返回true，否则返回false。需要注意的是：任务执行过程中发生异常、任务被取消也属于任务已完成，也会返回true。
- get():获取任务执行结果，如果任务还没完成则会阻塞等待直到任务执行完成。如果任务被取消则会抛出CancellationException异常，如果任务执行过程发生异常则会抛出ExecutionException异常，如果阻塞等待过程中被中断则会抛出InterruptedException异常。
- get(long timeout,Timeunit unit):带超时时间的get()版本，如果阻塞等待过程中超时则会抛出TimeoutException异常。

# FutureTask实现类
`Future`只是一个接口，不能直接用来创建对象，`FutureTask`是`Future`的实现类，`FutureTask`的继承图如下:
![](http://qiniu-pic.siven.net/blog/2018-01-31-073411.png)
可以看到,`FutureTask`实现了`RunnableFuture`接口，则`RunnableFuture`接口继承了`Runnable`接口和`Future`接口，所以`FutureTask`既能当做一个`Runnable`直接被`Thread`执行，也能作为`Future`用来得到`Callable`的计算结果。

# 举个栗子
`FutureTask`一般配合`ExecutorService`来使用，也可以直接通过`Thread`来使用。
```java
public class UseFuture {

    public static void main(String[] args) throws Exception {

        /**
         * 第一种方式:Future + ExecutorService
         * Task task = new Task();
         * ExecutorService service = Executors.newCachedThreadPool();
         * Future<Integer> future = service.submit(task1);
         * service.shutdown();
         */


        /**
         * 第二种方式: FutureTask + ExecutorService
         * ExecutorService executor = Executors.newCachedThreadPool();
         * Task task = new Task();
         * FutureTask<Integer> futureTask = new FutureTask<Integer>(task);
         * executor.submit(futureTask);
         * executor.shutdown();
         */

        /**
         * 第三种方式:FutureTask + Thread
         */
        // 2. 新建FutureTask,需要一个实现了Callable接口的类的实例作为构造函数参数
        FutureTask<Integer> futureTask = new FutureTask<Integer>(new Task());
        // 3. 新建Thread对象并启动
        Thread thread = new Thread(futureTask);
        thread.setName("Task thread");
        thread.start();

        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        System.out.println("Thread [" + Thread.currentThread().getName() + "] is running");

        // 4. 调用isDone()判断任务是否结束
        if (!futureTask.isDone()) {
            System.out.println("Task is not done");
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
        int result = 0;
        try {
            // 5. 调用get()方法获取任务结果,如果任务没有执行完成则阻塞等待
            result = futureTask.get();
        } catch (Exception e) {
            e.printStackTrace();
        }

        System.out.println("result is " + result);

    }

    // 1. 继承Callable接口,实现call()方法,泛型参数为要返回的类型
    static class Task implements Callable<Integer> {

        @Override
        public Integer call() throws Exception {
            System.out.println("Thread [" + Thread.currentThread().getName() + "] is running");
            int result = 0;
            for (int i = 0; i < 100; ++i) {
                result += i;
            }

            Thread.sleep(3000);
            return result;
        }
    }
}
```

运行结果：
```
Thread [Task thread] is running
Thread [main] is running
Task is not done
result is 4950
```


# 总结
`FutureTask`的实现还是比较简单的，当用户实现`Callable`接口定义好任务之后，把任务交给其他线程进行执行。FutureTask内部维护一个任务状态，任何操作都是围绕着这个状态进行，并随时更新任务状态。任务发起者调用get*()获取执行结果的时候，如果任务还没有执行完毕，则会把自己放入阻塞队列中然后进行阻塞等待。当任务执行完成之后，任务执行线程会依次唤醒阻塞等待的线程。调用cancel()取消任务的时候也只是简单的修改任务状态，如果需要中断任务执行线程的话则调用Thread.interrupt()中断任务执行线程。


---

> 参考文章
[深入学习 FutureTask](http://www.importnew.com/25286.html)
---
title: 并发模型（一）——Future模式
tags:
  - JAVA
  - 设计模式
  - 并发编程
categories:
  - JAVA
abbrlink: e3120e4f
date: 2018-01-19 14:57:31
---

# 前言
多线程开发可以更好的发挥多核cpu性能，常用的多线程设计模式有：`Future`、`Master-Worker`、`Guard Susperionsion`、不变、生产者-消费者 模式；jdk除了定义了若干并发的数据结构，也内置了多线程框架和各种线程池锁（分为内部锁、重入锁、读写锁）、ThreadLocal、信号量等在并发控制中发挥着巨大的作用。这里重点介绍第一种并发——`Future模型`。

<!-- more -->

# 什么是Future模型
该模型是将异步请求和代理模式联合的模型产物。类似商品订单模型。见下图：
![](http://qiniu-pic.siven.net/blog/2018-01-19-070110.jpg)
客户端发送一个长时间的请求，服务端不需等待该数据处理完成便立即返回一个伪造的代理数据（相当于商品订单，不是商品本身），用户也无需等待，先去执行其他的若干操作后，再去调用服务器已经完成组装的真实数据。该模型充分利用了等待的时间片段。


# Future模式的核心结构
![](http://qiniu-pic.siven.net/blog/2018-01-19-070203.jpg)

- `Main`：启动系统，调用Client发出请求；

- `Client`：返回Data对象，理解返回FutureData，并开启ClientThread线程装配RealData；

- `Data`：返回数据的接口；

- `FutureData`：Future数据，构造很快，但是是一个虚拟的数据，需要装配RealData；

- `RealData`：真实数据，构造比较慢。

# 代码实现

## Main函数
```java
public class Main {

	public static void main(String[] args)  {
		
		FutureClient fc = new FutureClient();
		Data data = fc.request("请求参数");
		System.out.println("请求发送成功!");
		System.out.println("做其他的事情...");
		
		String result = data.getRequest();
		System.out.println(result);
		
	}
}
```

## Client的实现
```java
public class FutureClient {

	public Data request(final String queryStr){
		//1 我想要一个代理对象（Data接口的实现类）先返回给发送请求的客户端，告诉他请求已经接收到，可以做其他的事情
		final FutureData futureData = new FutureData();
		//2 启动一个新的线程，去加载真实的数据，传递给这个代理对象
		new Thread(new Runnable() {
			@Override
			public void run() {
				//3 这个新的线程可以去慢慢的加载真实对象，然后传递给代理对象
				RealData realData = new RealData(queryStr);
				futureData.setRealData(realData);
			}
		}).start();
		
		return futureData;
	}
	
}
```

## Data的实现
```java
public interface Data {

	String getRequest();

}
```

## FutureData的实现
```java
/** 
 * 是对RealData的一个包装 
 */ 
public class FutureData implements Data {

    private RealData realData;

    private boolean isReady = false;

    public synchronized void setRealData(RealData realData) {
        //如果已经装载完毕了，就直接返回
        if (isReady) {
            return;
        }
        //如果没装载，进行装载真实对象
        this.realData = realData;
        isReady = true;
        //进行通知
        notify();
    }

    @Override
    public synchronized String getRequest() {
        //如果没装载好 程序就一直处于阻塞状态
        while (!isReady) {
            try {
                wait();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
        //装载好直接获取数据即可
        return this.realData.getRequest();
    }
}
```

## RealData的实现
```java
public class RealData implements Data{

	private String result ;
	
	public RealData (String queryStr){
		System.out.println("根据" + queryStr + "进行查询，这是一个很耗时的操作..");
		try {
			Thread.sleep(5000);
		} catch (InterruptedException e) {
			e.printStackTrace();
		}
		System.out.println("操作完毕，获取结果");
		result = "查询结果";
	}
	
	@Override
	public String getRequest() {
		return result;
	}

}
```

# 总结
- FutureData是对RealData的包装，是对真实数据的一个代理，封装了获取真实数据的等待过程。它们都实现了共同的接口，所以，针对客户端程序组是没有区别的；

- 客户端在调用的方法中，单独启用一个线程来完成真实数据的组织，这对调用客户端的main函数式封闭的；

- 因为在FutureData中的notify和wait函数，主程序会等待组装完成后再会继续主进程，也就是如果没有组装完成，main函数会一直等待。


---
> 参考文章: [并发模型（一）——Future模式](http://blog.csdn.net/lmdcszh/article/details/39696357)
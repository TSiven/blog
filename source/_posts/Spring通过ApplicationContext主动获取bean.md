---
title: Spring通过ApplicationContext主动获取bean
tags:
  - JAVA
  - Spring
categories:
  - JAVA
permalink: spring-active-aces-to-bean-through-aplicationcontext
date: 2017-09-10 11:40:41
---

最近在做项目的时候我发现一个问题：Spring的IOC容器不能在Web中被引用(或者说不能被任意地引用)。我们在配置文件中让Spring自动装配，但并没有留住ApplicationContext的实例。我们如果希望在我们的项目中任何位置都能拿到同一个ApplicationContext来获取IOC容器中的资源，就要让Spring将上下文环境填充到我们能获取的地方，比如下面的做法：
- 方法一: 实现自ApplicationContextAware接口
- 方法二，使用了注解和静态化的方式来产生SpringFactory对象

<!-- more -->

# 方法一: 实现自ApplicationContextAware接口
自定义一个工具类，实现自ApplicationContextAware接口，接口的方法是setApplicationContext，我们实现它，并让其为我们服务，因为Spring在load自己的时候会将上下文环境填充进来。我们所要做的就是将得到的ApplicationContext保存下来用。

## 关键代码

```java
import org.springframework.context.ApplicationContext;  
import org.springframework.context.ApplicationContextAware;  

public class SpringContextUtil implements ApplicationContextAware {  
    private static ApplicationContext applicationContext;  
  
    /** 
     * 实现ApplicationContextAware接口的context注入函数, 将其存入静态变量. 
     */  
    public void setApplicationContext(ApplicationContext applicationContext) {  
        SpringContextUtil.applicationContext = applicationContext; // NOSONAR  
    }  
  
    /** 
     * 取得存储在静态变量中的ApplicationContext. 
     */  
    public static ApplicationContext getApplicationContext() {  
        checkApplicationContext();  
        return applicationContext;  
    }  
  
    /** 
     * 从静态变量ApplicationContext中取得Bean, 自动转型为所赋值对象的类型. 
     */  
    @SuppressWarnings("unchecked")  
    public static <T> T getBean(String name) {  
        checkApplicationContext();  
        return (T) applicationContext.getBean(name);  
    }  
  
    /** 
     * 从静态变量ApplicationContext中取得Bean, 自动转型为所赋值对象的类型. 
     */  
    @SuppressWarnings("unchecked")  
    public static <T> T getBean(Class<T> clazz) {  
        checkApplicationContext();  
        return (T) applicationContext.getBeansOfType(clazz);  
    }  
  
    /** 
     * 清除applicationContext静态变量. 
     */  
    public static void cleanApplicationContext() {  
        applicationContext = null;  
    }  
  
    private static void checkApplicationContext() {  
        if (applicationContext == null) {  
            throw new IllegalStateException("applicaitonContext未注入,请在applicationContext.xml中定义SpringContextHolder");  
        }  
    }  
}  
```

## SPRING配置
上文的类就是我们要用的，而其中的setApplicationContext是接口中需要实现的，Spring会自动进行填充。我们在Spring的配置文件中注册一下：
```xml
<bean id="springContextUtil" class="xxx.xx.SpringContextUtil" />
```

## 使用示例
这样就可以了，Spring把我们需要的东西给我们了。
我们就可以在需要的地方这样做：
```java
YouClass obj = (YouClass)SpringUtil.getObject("beanid");
```


# 方法二，使用了注解和静态化的方式来产生SpringFactory对象
上文的方法有个麻烦的地方：需要配置。而Spring2.5及之后的版本实际上加入了注解的方式进行依赖项的注入，使用如下代码也许更好：
```java
public class SpringContextUtil extends SpringBeanAutowiringSupport {

    @Autowired
    private BeanFactory beanFactory;

    //静态方法初始化类
    private static SpringContextUtil instance;

    static {
        instance = new SpringContextUtil();
    }

    //根据bean的id，获取对应类对象
    //根据bean的id获取bean对象要比根据class获取bean对象效率高，但容易出现人为错误
    public <T> T getBean(String beanId) {
        return (T)beanFactory.getBean(beanId);
    }

    //根据bean的类型，获取对应类对象，
    //不容易出现认为错误，但效率不如根据id获取bean对象，因为spring内部是把class转换为name，然后再进行查找
    @SuppressWarnings({"unchecked", "rawtypes"})
    public <T> T getBean(Class<T> classT) {
        return beanFactory.getBean(classT);
    }

    public static SpringContextUtil getInstance() {
        return instance;
    }

}
```

## 注解扫描
如果使用@Autowired注解自动装配的话，继承SpringBeanAutowiringSupport类是不能少的。当然，使用@Component等注解也是可以的。使用注解的话配置就需要改动了，不过因为我们为支持Spring注解的配置是可以多用的，所以还好。如下：
```xml
<context:component-scan base-package="org.ahe"></context:component-scan>
```
配置即可让org.ahe下所有包(您依然可以通过子标签的正则表达式匹配来进行更多设置)下的注解起作用。

## 使用示例
这样就可以了，Spring把我们需要的东西给我们了。
我们就可以在需要的地方这样做：
```java
MyTestBean myTestBean = (MyTestBean ) SpringUtil.getInstance().getBean(MyTestBean.class);
MyTestBean myTestBean1 = (MyTestBean) SpringUtil.getInstance().getBean("myTestBean");
```

# 系统初始化无法获取bean
目前又做了个系统初始化的东东SystemInit，然后发现上面的getBean()用不了了。看了下发现是因为在系统初始化的时候SpringContextUtil还没有初始化，导致在SystemInit类里面的东西getBean()失败。 
于是小改造了下，把ApplicationContextAware放在SystemInit类，然后注入到SpringContextUtil，这样就保证了在执行系统初始化方法之前，applicationContext一定不是null。

## SpringContextUtil
```java
/**
 * spring上下文配置
 * @author Mingchenchen
 *
 */
public class SpringContextUtil {
    private static Logger logger = Logger.getLogger(SpringContextUtil.class);

    //@Autowired 沿用springTest的这种方法 是否会更好？
    //ApplicationContext ctx;
    private static ApplicationContext applicationContext = null;

    public static void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        SpringContextUtil.applicationContext = applicationContext;
    }

    //注意此处变成了static
    public static ApplicationContext getApplicationContext() {
        return applicationContext;
    }

    /**
     * 注意 bean name默认 = 类名(首字母小写)
     * 例如: A8sClusterDao = getBean("k8sClusterDao")
     * @param name
     * @return
     * @throws BeansException
     */
    public static Object getBean(String name) throws BeansException {
        return applicationContext.getBean(name);
    }

    /**
     * 根据类名获取到bean
     * @param <T>
     * @param clazz
     * @return
     * @throws BeansException
     */
    @SuppressWarnings("unchecked")
    public static <T> T getBeanByName(Class<T> clazz) throws BeansException {
        try {
            char[] cs=clazz.getSimpleName().toCharArray();
            cs[0] += 32;//首字母大写到小写
            return (T) applicationContext.getBean(String.valueOf(cs));
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        } 
    }

    public static boolean containsBean(String name) {
        return applicationContext.containsBean(name);
    }

    public static boolean isSingleton(String name) throws NoSuchBeanDefinitionException {
        return applicationContext.isSingleton(name);
    }

}
```


## 系统初始化代码
```java
/**
 * Descripties: 系统初始化
 * @author wangkaiping
 * 2016年5月23日 上午11:58:09
 */
@Component
public class SystemInit implements InitializingBean,ApplicationContextAware{
    private static Logger logger = Logger.getLogger(SystemInit.class);
    @Autowired
    private ClusterDao clusterDao;

    @Override
    public void afterPropertiesSet() throws Exception {
        logger.info("--------------系统初始化中-------------------");
        initClusterCache();//初始化集群数据 必须最开始完成
        initRefreshAppStatusTask();
        initUpdateAppStatusToDB();
        initUpdateSession();
        logger.info("--------------系统初始化完成-------------------");
    }

    /**
     * 1.初始化集群数据
     */
    private void initClusterCache(){
        logger.info("1.初始化集群信息到缓存中:ClusterCache开始");
        //查询数据库所有的集群数据
        List<ClusterEntity> allClusterInfoList = clusterDao.selectAll(ClusterEntity.class, "delete_flag=0");
        for (ClusterEntity k8sClusterEntity : allClusterInfoList) {
            ClusterCache.put(k8sClusterEntity.getUuid() , k8sClusterEntity);//存入缓存
        }
        logger.info("1.初始化集群信息到缓存中:ClusterCache完成,总共" + allClusterInfoList.size() + "条数据");
    }

    /**
     * 2.初始化异步任务:刷新所有应用状态
     */
    private void initRefreshAppStatusTask() {
        logger.info("2.初始化任务:RefreshAllAppStatusTask 刷新应用下的k8s的pod状态并存入待更新队列");
        RefreshAppStatusExcutor.init();
        logger.info("2.初始化任务:RefreshAllAppStatusTask 完成");
    }

    /**
     * 3.初始化异步任务:更新状态到数据库
     */
    private void initUpdateAppStatusToDB() {
        logger.info("3.初始化任务:RefreshToDBTask 从待更新Appinstance队列取出数据并更新数据库");
        UpdateAppStatusToDBExcutor.init();
        logger.info("3.初始化任务:RefreshToDBTask 完成");
    }

    /**
     * 4. 初始化异步任务： 更新用户的所有session
     */
    private void initUpdateSession() {
        logger.info("4.初始化任务：更新session开始");
        UserSessionUpdateExcutor.init();
        logger.info("4.初始化任务：更新session结束");
    }

    ////////////////////////////////////////////////////////////////

    //此方法一定不要写成static
    @Override
    public void setApplicationContext(ApplicationContext applicationContext) 
                                                throws BeansException {
        //实际上是把applicationContext传入到了SpringContextUtil里面
        SpringContextUtil.setApplicationContext(applicationContext);
    }
}
```
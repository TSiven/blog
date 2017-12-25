---
title: 使用AOP 实现Redis缓存注解，支持SPEL
tags:
  - JAVA
  - Redis
  - Spring
  - AOP
categories:
  - JAVA
permalink: use-aop-to-implement-redis-caching-anotations-and-suport-spel
date: 2017-09-10 12:11:36
---

公司项目对Redis使用比较多，因为之前没有做AOP，所以缓存逻辑和业务逻辑交织在一起，维护比较艰难
所以最近实现了针对于Redis的@Cacheable，把缓存的对象依照类别分别存放到redis的Hash中，对于key也实现了SPEL支持。

## 定义缓存注解
创建注解，其实大部分数据都是以hash形式存储的（使的key易于管理），所以，注解中定义了fieldKey，用作Hash的field。

```java
/**
 * 数据缓存注解
 */
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface DataCacheable {

    String cacheName() default "";//缓存的名称, 默认取(类名 + 方法名)
    String[] fieldKey() ;//缓存的字段Key, 使用SPEL支持, 如:#userName
    long expireTime() default 0; //过期时效(秒) [-1永不过期]

}
```

<!-- more -->

## 定义切面,定义PointCut

```java

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.Signature;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;

import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;

import java.lang.reflect.Method;

/**
 * 数据缓存切面处理
 * http://www.cnblogs.com/DajiangDev/p/3770894.html
 * Created by SIVEN on 17/9/1.
 */
@Aspect
public class DataCacheableAspect {

    private final Logger logger = LoggerFactory.getLogger(this.getClass());

    /**
     * 可控的线程池
     */
    ExecutorService fixedThreadPool = Executors.newFixedThreadPool(10);


    @Value("#{config['redis.cache.time']}")
    Long DEFAULT_CACHE_TIME = 600L; //默认10分钟

    @Value("#{config['redis.cache.enable']}")
    boolean REDIS_CACHE_ENABLE;//启用缓存开关

    @Resource
    RedisClient redisClient;

    /**
     * 控制业务执行
     *
     * @param joinPoint
     * @throws Throwable
     */
    @Around("execution(* gov.etax.dzswj.nsrzx.services..service..*.*(..)) && @annotation(gov.etax.dzswj.nsrzx.component.cache.annotation.DataCacheable)")
    public Object doAround(ProceedingJoinPoint pjp) throws Throwable {

        if (!REDIS_CACHE_ENABLE) {
            logger.debug("缓存开关 >> [禁用]");
            return pjp.proceed();
        }

        Method method = getMethod(pjp);
        DataCacheable cacheable = method.getAnnotation(DataCacheable.class);
        String hashKey = getHashKey(pjp, cacheable);
        String fieldKey = parseKey(cacheable.fieldKey(), method, pjp.getArgs());
        long expireTime = cacheable.expireTime();

        //获取方法的返回类型,让缓存可以返回正确的类型
        Class returnType = ((MethodSignature) pjp.getSignature()).getReturnType();

        //使用redis 的hash进行存取，易于管理
        Object result = redisClient.getMapField(hashKey, fieldKey, returnType);
        if (result != null) {
            logger.debug("DataCacheableAspect: doAround() 查找缓存不为空, 返回缓存数据");
            setExpireTime(hashKey, expireTime);
            return result;
        }
        result = pjp.proceed();
        //后置处理, 将业务数据加入到缓存中
        doAfterReturning(hashKey, fieldKey, cacheable.expireTime(), result);
        return result;
    }


    /**
     * 后置处理方法 (写入缓存)
     *
     * @param point
     * @param returnValue
     */
    private void doAfterReturning(final String hashKey, final String fieldKey, final Long expireTime, final Object result) {
        //线程处理
        fixedThreadPool.execute(new Runnable() {
            @Override
            public void run() {
                logger.debug("DataCacheableAspect: doAfterReturning() 业务处理完毕, 异步将数据或写入缓存中..");
                //加入缓存
                redisClient.addMap(hashKey, fieldKey, result);
                //设置失效时长
                setExpireTime(hashKey, expireTime);
            }
        });
    }

    /**
     * 重置过期时间
     *
     * @param hashKey
     * @param expireTime
     */
    private void setExpireTime(final String hashKey, Long expireTime) {
        //设置失效时长
        Long cacheTime = expireTime;
        if (0 == expireTime) {
            cacheTime = DEFAULT_CACHE_TIME;
        }
        redisClient.expire(hashKey, cacheTime);
    }

    /**
     * 获取被拦截方法对象
     * <p>
     * MethodSignature.getMethod() 获取的是顶层接口或者父类的方法对象
     * 而缓存的注解在实现类的方法上
     * 所以应该使用反射获取当前对象的方法对象
     */
    public Method getMethod(JoinPoint pjp) {
        //获取参数的类型
        Object[] args = pjp.getArgs();
        Class[] argTypes = new Class[pjp.getArgs().length];
        for (int i = 0; i < args.length; i++) {
            argTypes[i] = args[i].getClass();
        }
        Method method = null;
        try {
            method = pjp.getTarget().getClass().getMethod(pjp.getSignature().getName(), argTypes);
        } catch (NoSuchMethodException e) {
            e.printStackTrace();
        } catch (SecurityException e) {
            e.printStackTrace();
        }
        return method;

    }

    /**
     * 获取缓存Hash Key
     *
     * @param cacheable
     * @param point
     * @return
     */
    private String getHashKey(JoinPoint point, DataCacheable cacheable) {
        if (StringHelper.isNotEmpty(cacheable.cacheName())) {
            return cacheable.cacheName();
        }
        Signature signature = point.getSignature();
        return signature.getDeclaringTypeName() + "." + signature.getName();//类名 + 方法名
    }

    /**
     * 获取缓存的key
     * key 定义在注解上，支持SPEL表达式
     *
     * @param pjp
     * @return
     */
    private String parseKey(String[] keys, Method method, Object[] args) {
        //获取被拦截方法参数名列表(使用Spring支持类库)
        LocalVariableTableParameterNameDiscoverer u =
                new LocalVariableTableParameterNameDiscoverer();
        String[] paraNameArr = u.getParameterNames(method);

        //使用SPEL进行key的解析
        ExpressionParser parser = new SpelExpressionParser();
        //SPEL上下文
        StandardEvaluationContext context = new StandardEvaluationContext();
        //把方法参数放入SPEL上下文中
        for (int i = 0; i < paraNameArr.length; i++) {
            context.setVariable(paraNameArr[i], args[i]);
        }

        StringBuffer parseKeyBuff = new StringBuffer();
        for (String key : keys) {
            parseKeyBuff.append("_").append(parser.parseExpression(key).getValue(context, String.class));
        }
        return parseKeyBuff.toString();
    }
}
```
## RedisClient相关封装
参见文章[Redis配置 & 常规操作类封装](http://blog.siven.net/2017/09/10/Redis配置%20&%20常规操作类封装/)

## AOP配置

## 使用示例
```java
@Service
public class NsrxxServiceImpl implements INsrxxService{
    @Override
    @DataCacheable(fieldKey = "#dto.queryObj.djxh")
    public ResultDto<NsrxxDto> queryNsrxxByDjxh(QueryDto<QueryByDjxh> dto) {
        INsrxxMapper mapper = SessionTemplateUtil.getMapper(INsrxxMapper.class);
        return ResultDtoHelper.success(mapper.queryNsrxxByDjxh(dto.getQueryObj()));
    }
}
```

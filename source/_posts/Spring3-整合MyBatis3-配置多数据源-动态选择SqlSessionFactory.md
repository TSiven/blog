---
title: Spring3 整合MyBatis3 配置多数据源 动态选择SqlSessionFactory
tags:
  - JAVA
  - Mybatis
  - Spring
categories:
  - JAVA
permalink: >-
  spring3-integrated-mybatis3-configuration-multiple-data-source-dynamic-selection-sqlsesionfactory
date: 2017-09-10 10:57:21
---

## 摘要

Spring整合MyBatis切换SqlSessionFactory有两种方法，第一、 继承SqlSessionDaoSupport，重写获取SqlSessionFactory的方法。第二、继承SqlSessionTemplate 重写getSqlSessionFactory、getConfiguration和SqlSessionInterceptor这个拦截器。其中最为关键还是继承SqlSessionTemplate 并重写里面的方法。

而Spring整合MyBatis也有两种方式，一种是配置MapperFactoryBean，另一种则是利用MapperScannerConfigurer进行扫描接口或包完成对象的自动创建。相对来说后者更方便些。MapperFactoryBean继承了SqlSessionDaoSupport也就是动态切换SqlSessionFactory的第一种方法，我们需要重写和实现SqlSessionDaoSupport方法，或者是继承MapperFactoryBean来重写覆盖相关方法。如果利用MapperScannerConfigurer的配置整合来切换SqlSessionFactory，那么我们就需要继承SqlSessionTemplate，重写上面提到的方法。在整合的配置中很多地方都是可以注入SqlSessionTemplate代替SqlSessionFactory的注入的。因为SqlSessionTemplate的创建也是需要注入SqlSessionFactory的。

<!-- more -->

## 实现代码

### 继承SqlSessionTemplate 重写getSqlSessionFactory、getConfiguration和SqlSessionInterceptor
```java
import static java.lang.reflect.Proxy.newProxyInstance;
import static org.apache.ibatis.reflection.ExceptionUtil.unwrapThrowable;
import static org.mybatis.spring.SqlSessionUtils.closeSqlSession;
import static org.mybatis.spring.SqlSessionUtils.getSqlSession;
import static org.mybatis.spring.SqlSessionUtils.isSqlSessionTransactional;
 
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.sql.Connection;
import java.util.List;
import java.util.Map;
 
import org.apache.ibatis.exceptions.PersistenceException;
import org.apache.ibatis.executor.BatchResult;
import org.apache.ibatis.session.Configuration;
import org.apache.ibatis.session.ExecutorType;
import org.apache.ibatis.session.ResultHandler;
import org.apache.ibatis.session.RowBounds;
import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.session.SqlSessionFactory;
import org.mybatis.spring.MyBatisExceptionTranslator;
import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.dao.support.PersistenceExceptionTranslator;
import org.springframework.util.Assert;
 
/**
 * <b>function:</b> 继承SqlSessionTemplate 重写相关方法
 * @author hoojo
 * @createDate 2013-10-18 下午03:07:46
 * @file CustomSqlSessionTemplate.java
 * @package com.hoo.framework.mybatis.support
 * @project SHMB
 * @blog http://blog.csdn.net/IBM_hoojo
 * @email hoojo_@126.com
 * @version 1.0
 */
public class CustomSqlSessionTemplate extends SqlSessionTemplate {
 
    private final SqlSessionFactory sqlSessionFactory;
    private final ExecutorType executorType;
    private final SqlSession sqlSessionProxy;
    private final PersistenceExceptionTranslator exceptionTranslator;
 
    private Map<Object, SqlSessionFactory> targetSqlSessionFactorys;
    private SqlSessionFactory defaultTargetSqlSessionFactory;
 
    public void setTargetSqlSessionFactorys(Map<Object, SqlSessionFactory> targetSqlSessionFactorys) {
        this.targetSqlSessionFactorys = targetSqlSessionFactorys;
    }
 
    public void setDefaultTargetSqlSessionFactory(SqlSessionFactory defaultTargetSqlSessionFactory) {
        this.defaultTargetSqlSessionFactory = defaultTargetSqlSessionFactory;
    }
 
    public CustomSqlSessionTemplate(SqlSessionFactory sqlSessionFactory) {
        this(sqlSessionFactory, sqlSessionFactory.getConfiguration().getDefaultExecutorType());
    }
 
    public CustomSqlSessionTemplate(SqlSessionFactory sqlSessionFactory, ExecutorType executorType) {
        this(sqlSessionFactory, executorType, new MyBatisExceptionTranslator(sqlSessionFactory.getConfiguration()
                .getEnvironment().getDataSource(), true));
    }
 
    public CustomSqlSessionTemplate(SqlSessionFactory sqlSessionFactory, ExecutorType executorType,
            PersistenceExceptionTranslator exceptionTranslator) {
 
        super(sqlSessionFactory, executorType, exceptionTranslator);
 
        this.sqlSessionFactory = sqlSessionFactory;
        this.executorType = executorType;
        this.exceptionTranslator = exceptionTranslator;
        
        this.sqlSessionProxy = (SqlSession) newProxyInstance(
                SqlSessionFactory.class.getClassLoader(),
                new Class[] { SqlSession.class }, 
                new SqlSessionInterceptor());
 
        this.defaultTargetSqlSessionFactory = sqlSessionFactory;
    }
 
    @Override
    public SqlSessionFactory getSqlSessionFactory() {
 
        SqlSessionFactory targetSqlSessionFactory = targetSqlSessionFactorys.get(CustomerContextHolder.getContextType());
        if (targetSqlSessionFactory != null) {
            return targetSqlSessionFactory;
        } else if (defaultTargetSqlSessionFactory != null) {
            return defaultTargetSqlSessionFactory;
        } else {
            Assert.notNull(targetSqlSessionFactorys, "Property 'targetSqlSessionFactorys' or 'defaultTargetSqlSessionFactory' are required");
            Assert.notNull(defaultTargetSqlSessionFactory, "Property 'defaultTargetSqlSessionFactory' or 'targetSqlSessionFactorys' are required");
        }
        return this.sqlSessionFactory;
    }
 
    @Override
    public Configuration getConfiguration() {
        return this.getSqlSessionFactory().getConfiguration();
    }
 
    public ExecutorType getExecutorType() {
        return this.executorType;
    }
 
    public PersistenceExceptionTranslator getPersistenceExceptionTranslator() {
        return this.exceptionTranslator;
    }
 
    /**
     * {@inheritDoc}
     */
    public <T> T selectOne(String statement) {
        return this.sqlSessionProxy.<T> selectOne(statement);
    }
 
    /**
     * {@inheritDoc}
     */
    public <T> T selectOne(String statement, Object parameter) {
        return this.sqlSessionProxy.<T> selectOne(statement, parameter);
    }
 
    /**
     * {@inheritDoc}
     */
    public <K, V> Map<K, V> selectMap(String statement, String mapKey) {
        return this.sqlSessionProxy.<K, V> selectMap(statement, mapKey);
    }
 
    /**
     * {@inheritDoc}
     */
    public <K, V> Map<K, V> selectMap(String statement, Object parameter, String mapKey) {
        return this.sqlSessionProxy.<K, V> selectMap(statement, parameter, mapKey);
    }
 
    /**
     * {@inheritDoc}
     */
    public <K, V> Map<K, V> selectMap(String statement, Object parameter, String mapKey, RowBounds rowBounds) {
        return this.sqlSessionProxy.<K, V> selectMap(statement, parameter, mapKey, rowBounds);
    }
 
    /**
     * {@inheritDoc}
     */
    public <E> List<E> selectList(String statement) {
        return this.sqlSessionProxy.<E> selectList(statement);
    }
 
    /**
     * {@inheritDoc}
     */
    public <E> List<E> selectList(String statement, Object parameter) {
        return this.sqlSessionProxy.<E> selectList(statement, parameter);
    }
 
    /**
     * {@inheritDoc}
     */
    public <E> List<E> selectList(String statement, Object parameter, RowBounds rowBounds) {
        return this.sqlSessionProxy.<E> selectList(statement, parameter, rowBounds);
    }
 
    /**
     * {@inheritDoc}
     */
    public void select(String statement, ResultHandler handler) {
        this.sqlSessionProxy.select(statement, handler);
    }
 
    /**
     * {@inheritDoc}
     */
    public void select(String statement, Object parameter, ResultHandler handler) {
        this.sqlSessionProxy.select(statement, parameter, handler);
    }
 
    /**
     * {@inheritDoc}
     */
    public void select(String statement, Object parameter, RowBounds rowBounds, ResultHandler handler) {
        this.sqlSessionProxy.select(statement, parameter, rowBounds, handler);
    }
 
    /**
     * {@inheritDoc}
     */
    public int insert(String statement) {
        return this.sqlSessionProxy.insert(statement);
    }
 
    /**
     * {@inheritDoc}
     */
    public int insert(String statement, Object parameter) {
        return this.sqlSessionProxy.insert(statement, parameter);
    }
 
    /**
     * {@inheritDoc}
     */
    public int update(String statement) {
        return this.sqlSessionProxy.update(statement);
    }
 
    /**
     * {@inheritDoc}
     */
    public int update(String statement, Object parameter) {
        return this.sqlSessionProxy.update(statement, parameter);
    }
 
    /**
     * {@inheritDoc}
     */
    public int delete(String statement) {
        return this.sqlSessionProxy.delete(statement);
    }
 
    /**
     * {@inheritDoc}
     */
    public int delete(String statement, Object parameter) {
        return this.sqlSessionProxy.delete(statement, parameter);
    }
 
    /**
     * {@inheritDoc}
     */
    public <T> T getMapper(Class<T> type) {
        return getConfiguration().getMapper(type, this);
    }
 
    /**
     * {@inheritDoc}
     */
    public void commit() {
        throw new UnsupportedOperationException("Manual commit is not allowed over a Spring managed SqlSession");
    }
 
    /**
     * {@inheritDoc}
     */
    public void commit(boolean force) {
        throw new UnsupportedOperationException("Manual commit is not allowed over a Spring managed SqlSession");
    }
 
    /**
     * {@inheritDoc}
     */
    public void rollback() {
        throw new UnsupportedOperationException("Manual rollback is not allowed over a Spring managed SqlSession");
    }
 
    /**
     * {@inheritDoc}
     */
    public void rollback(boolean force) {
        throw new UnsupportedOperationException("Manual rollback is not allowed over a Spring managed SqlSession");
    }
 
    /**
     * {@inheritDoc}
     */
    public void close() {
        throw new UnsupportedOperationException("Manual close is not allowed over a Spring managed SqlSession");
    }
 
    /**
     * {@inheritDoc}
     */
    public void clearCache() {
        this.sqlSessionProxy.clearCache();
    }
 
    /**
     * {@inheritDoc}
     */
    public Connection getConnection() {
        return this.sqlSessionProxy.getConnection();
    }
 
    /**
     * {@inheritDoc}
     * @since 1.0.2
     */
    public List<BatchResult> flushStatements() {
        return this.sqlSessionProxy.flushStatements();
    }
 
    /**
     * Proxy needed to route MyBatis method calls to the proper SqlSession got from Spring's Transaction Manager It also
     * unwraps exceptions thrown by {@code Method#invoke(Object, Object...)} to pass a {@code PersistenceException} to
     * the {@code PersistenceExceptionTranslator}.
     */
    private class SqlSessionInterceptor implements InvocationHandler {
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            final SqlSession sqlSession = getSqlSession(
                    CustomSqlSessionTemplate.this.getSqlSessionFactory(),
                    CustomSqlSessionTemplate.this.executorType, 
                    CustomSqlSessionTemplate.this.exceptionTranslator);
            try {
                Object result = method.invoke(sqlSession, args);
                if (!isSqlSessionTransactional(sqlSession, CustomSqlSessionTemplate.this.getSqlSessionFactory())) {
                    // force commit even on non-dirty sessions because some databases require
                    // a commit/rollback before calling close()
                    sqlSession.commit(true);
                }
                return result;
            } catch (Throwable t) {
                Throwable unwrapped = unwrapThrowable(t);
                if (CustomSqlSessionTemplate.this.exceptionTranslator != null && unwrapped instanceof PersistenceException) {
                    Throwable translated = CustomSqlSessionTemplate.this.exceptionTranslator
                        .translateExceptionIfPossible((PersistenceException) unwrapped);
                    if (translated != null) {
                        unwrapped = translated;
                    }
                }
                throw unwrapped;
            } finally {
                closeSqlSession(sqlSession, CustomSqlSessionTemplate.this.getSqlSessionFactory());
            }
        }
    }
}
```

重写后的getSqlSessionFactory方法会从我们配置的SqlSessionFactory集合targetSqlSessionFactorys或默认的defaultTargetSqlSessionFactory中获取Session对象。而改写的SqlSessionInterceptor 是这个MyBatis整合Spring的关键，所有的SqlSessionFactory对象的session都将在这里完成创建、提交、关闭等操作。所以我们改写这里的代码，在这里获取getSqlSessionFactory的时候，从多个SqlSessionFactory中获取我们设置的那个即可。

上面添加了targetSqlSessionFactorys、defaultTargetSqlSessionFactory两个属性来配置多个SqlSessionFactory对象和默认的SqlSessionFactory对象。

### CustomerContextHolder 设置SqlSessionFactory的类型

```java
/**
 * <b>function:</b> 多数据源
 * @author hoojo
 * @createDate 2013-9-27 上午11:36:57
 * @file CustomerContextHolder.java
 * @package com.hoo.framework.spring.support
 * @project SHMB
 * @blog http://blog.csdn.net/IBM_hoojo
 * @email hoojo_@126.com
 * @version 1.0
 */
public abstract class CustomerContextHolder {
 
    public final static String SESSION_FACTORY_MYSQL = "mysql";
    public final static String SESSION_FACTORY_ORACLE = "oracle";
    
    private static final ThreadLocal<String> contextHolder = new ThreadLocal<String>();  
    
    public static void setContextType(String contextType) {  
        contextHolder.set(contextType);  
    }  
      
    public static String getContextType() {  
        return contextHolder.get();  
    }  
      
    public static void clearContextType() {  
        contextHolder.remove();  
    }  
}
```
### 配置相关的文件applicationContext-session-factory.xml
```xml
<bean id="mysqlDataSource" class="com.alibaba.druid.pool.DruidDataSource" init-method="init" destroy-method="close">  
        <!-- 基本属性 url、user、password -->  
        <property name="url" value="${jdbc.url}" />  
        <property name="username" value="${jdbc.username}" />  
        <property name="password" value="${jdbc.password}" />  
        <!-- Filters -->  
        <!-- <property name="filters" value="config,stat" />  
        <property name="connectionProperties" value="config.decrypt=true" /> -->  
        <property name="filters" value="stat" />  
        <!-- 配置初始化大小、最小、最大 -->  
        <property name="initialSize" value="1" />  
        <property name="minIdle" value="1" />  
        <property name="maxActive" value="20" />  
        <!-- 配置获取连接等待超时的时间 -->  
        <property name="maxWait" value="60000" />  
        <!-- 配置间隔多久才进行一次检测，检测需要关闭的空闲连接，单位是毫秒 -->  
        <property name="timeBetweenEvictionRunsMillis" value="60000" />  
        <!-- 配置一个连接在池中最小生存的时间，单位是毫秒 -->  
        <property name="minEvictableIdleTimeMillis" value="300000" />  
        <property name="validationQuery" value="SELECT 'x'" />  
        <property name="testWhileIdle" value="true" />  
        <property name="testOnBorrow" value="false" />  
        <property name="testOnReturn" value="false" />  
        <!-- 打开PSCache，并且指定每个连接上PSCache的大小 -->  
        <property name="poolPreparedStatements" value="false" />  
        <property name="maxPoolPreparedStatementPerConnectionSize" value="20" />  
    </bean>  
      
    <!-- 数据源2 -->    
    <bean id="oracleDataSource" class="com.alibaba.druid.pool.DruidDataSource" init-method="init" destroy-method="close">    
        <!-- 基本属性 url、user、password -->    
        <property name="driverClassName" value="${dataSource2.driver}" />  
        <property name="url" value="${dataSource2.url}" />    
        <property name="username" value="${dataSource2.username}" />    
        <property name="password" value="${dataSource2.password}" />    
        <!-- 配置初始化大小、最小、最大 -->    
        <property name="initialSize" value="1" />    
        <property name="minIdle" value="1" />    
        <property name="maxActive" value="20" />    
        <!-- 配置获取连接等待超时的时间 -->    
        <property name="maxWait" value="60000" />    
        <!-- 配置间隔多久才进行一次检测，检测需要关闭的空闲连接，单位是毫秒 -->    
        <property name="timeBetweenEvictionRunsMillis" value="60000" />    
        <!-- 配置一个连接在池中最小生存的时间，单位是毫秒 -->    
        <property name="minEvictableIdleTimeMillis" value="300000" />    
        <property name="validationQuery" value="SELECT 'x' FROM DUAL" />    
        <property name="testWhileIdle" value="true" />    
        <property name="testOnBorrow" value="false" />    
        <property name="testOnReturn" value="false" />    
        <!-- 打开PSCache，并且指定每个连接上PSCache的大小 -->    
        <property name="poolPreparedStatements" value="true" />    
        <property name="maxPoolPreparedStatementPerConnectionSize" value="20" />    
        <!-- 配置监控统计拦截的filters -->    
        <property name="filters" value="stat" />    
    </bean>    
      
    <bean id="oracleSqlSessionFactory" class="org.mybatis.spring.SqlSessionFactoryBean">  
        <property name="dataSource" ref="oracleDataSource"/>  
        <property name="configLocation" value="classpath:mybatis/mybatis-config.xml"/>  
        <!-- mapper和resultmap配置路径 -->   
        <property name="mapperLocations">  
            <list>  
                <!-- 表示在com.hoo目录下的任意包下的resultmap包目录中，以-resultmap.xml或-mapper.xml结尾所有文件 -->   
                <value>classpath*:/mapper/TestMapper.xml</value>  
            </list>  
        </property>  
    </bean>  
      
    <!-- 配置SqlSessionFactoryBean -->  
    <bean id="mysqlSqlSessionFactory" class="org.mybatis.spring.SqlSessionFactoryBean">  
        <property name="dataSource" ref="mysqlDataSource"/>  
        <property name="configLocation" value="classpath:mybatis/mybatis-config.xml"/>  
        <!-- mapper和resultmap配置路径 -->    
        <property name="mapperLocations">  
            <list>  
                <!-- 表示在com.hoo目录下的任意包下的resultmap包目录中，以-resultmap.xml或-mapper.xml结尾所有文件 （oracle和mysql扫描的配置和路径不一样，如果是公共的都扫描 这里要区分下，不然就报错 找不到对应的表、视图）-->   
                <value>classpath:com/zlzkj/app/mapper/*-mapper.xml</value>  
            </list>  
        </property>  
    </bean>      
      
    <!-- 配置自定义的SqlSessionTemplate模板，注入相关配置 -->  
    <bean id="sqlSessionTemplate" class="com.zlzkj.app.support.CustomSqlSessionTemplate">  
        <constructor-arg ref="mysqlSqlSessionFactory" />  
        <property name="targetSqlSessionFactorys">  
            <map>       
                <entry value-ref="oracleSqlSessionFactory" key="oracle"/>  
                <entry value-ref="mysqlSqlSessionFactory" key="mysql"/>  
            </map>   
        </property>  
    </bean>  
      
    <!-- 通过扫描的模式，扫描目录在com/hoo/任意目录下的mapper目录下，所有的mapper都需要继承SqlMapper接口的接口 -->  
    <bean class="org.mybatis.spring.mapper.MapperScannerConfigurer">  
        <!-- 注意注入sqlSessionTemplate -->  
        <property name="sqlSessionTemplateBeanName" value="sqlSessionTemplate"/>  
        <property name="basePackage" value="com.zlzkj.app.mapper,com.zlzkj.core.mybatis,com.zlzkj.app.omapper" />  
    </bean>   
```

### Sercice测试调用
```java
CustomerContextHolder.setContextType(CustomerContextHolder.SESSION_FACTORY_ORACLE);  
try {  
    Test test = mapper.selectByPrimaryKey((short)1);  
    System.out.println(">>>>>>"+test.getName());  
} catch (Exception e) {  
    e.printStackTrace();  
} 
```

好了，如果数据能读出来，那就恭喜你，你配置多数据源成功了。


## 注解支持
使用注解方式, 动态配置数据源

### 自定义定义注解:

``` java
/**
 * 切换数据源
 * 在service impl方法进行注解
 */
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface SwitchDataSource {

    DataSoure value() default DataSoure.gt3;

}


/**
 * 数据源
 */
public enum DataSoure {

    //mysql数据源
    mysql,
    //oracle数据源
    oracle
}
```

### AOP拦截注解
使用业务前置的方式,对业务方法进行切面处理
```java
/**
 * 多数据源切面处理
 */
@Aspect
public class SwitchDataSourceAspect {

    @Before(value = "execution(* gov.etax.dzswj.nsrzx.services..service..*.*(..)) and @annotation(gov.etax.dzswj.nsrzx.services.common.datasource.annotation.SwitchDataSource))")
    public void doBefore(JoinPoint joinPoint) throws Throwable {
        Signature signature = joinPoint.getSignature();
        MethodSignature methodSignature = (MethodSignature) signature;
        Method method = methodSignature.getMethod();

        if (method != null) {
            SwitchDataSource annotation = method.getAnnotation(SwitchDataSource.class);
            //设置数据源
            CustomerContextHolder.setContextType(annotation.value().name());
            return;
        }
        CustomerContextHolder.clearContextType();
    }
}
```

### 调用示例
``` java
/**
 * 纳税人信息查询服务实现类
 * @author SIVEN
 * @version 1.0
 */
@Service
public class NsrxxServiceImpl implements INsrxxService{

    @Override
    @SwitchDataSource(DataSoure.gt3)
    public ResultDto<NsrxxDto> queryNsrxxByDjxh(QueryDto<QueryByDjxh> dto) {

        //int i = 1 /0;
        INsrxxMapper mapper = SessionTemplateUtil.getMapper(INsrxxMapper.class);
        return ResultDtoHelper.success(mapper.queryNsrxxByDjxh(dto.getQueryObj()));
    }

}
```


> 参考文章:
- [Spring3 整合MyBatis3 配置多数据源 动态选择SqlSessionFactory](http://www.cnblogs.com/hoojo/p/dynamic_switch_sqlSessionfactory_muliteSqlSessionFactory.html)
- [Spring+Mybatis多数据源配置mysql+oracle](http://blog.csdn.net/qq_28118497/article/details/52751202)

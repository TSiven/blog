---
title: Redis配置 & 常规操作类封装
date: 2017-09-10 12:21:32
tags:
 - JAVA
 - Redis
categories: 
 - JAVA
 - Redis
---


直接上代码吧!!

## 抽象基础类
``` java

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.serializer.RedisSerializer;

public abstract class AbstractBaseRedis<K, V> {

    @Autowired
    protected RedisTemplate<K, V> redisTemplate;

    @Autowired
    StringRedisTemplate stringRedisTemplate;

    /**
     * 设置redisTemplate
     * @param redisTemplate the redisTemplate to set
     */
    public void setRedisTemplate(RedisTemplate<K, V> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * 获取 String  RedisSerializer
     * <br>------------------------------<br>
     */
    protected RedisSerializer<String> getStringSerializer() {
        return redisTemplate.getStringSerializer();
    }

}
```

<!-- more -->

## JsonMapper
```java

import java.io.IOException;
import java.util.TimeZone;

import org.apache.commons.lang3.StringEscapeUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.alibaba.fastjson.JSON;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonParser.Feature;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.databind.util.JSONPObject;

public class JsonMapper extends ObjectMapper {

    private static final long serialVersionUID = 1L;

    private final static Logger LOGGER = LoggerFactory.getLogger(JsonMapper.class);

    private static JsonMapper mapper;

    public JsonMapper() {
        this(Include.NON_EMPTY);
    }

    public JsonMapper(Include include) {
        // 设置输出时包含属性的风格
        if (include != null) {
            this.setSerializationInclusion(include);
        }
        // 设置输入时忽略在JSON字符串中存在但Java对象实际没有的属性
        this.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        // 空值处理为空串
        this.getSerializerProvider().setNullValueSerializer(new JsonSerializer<Object>(){
            @Override
            public void serialize(Object value, JsonGenerator jgen,
                                  SerializerProvider provider) throws IOException,
                    JsonProcessingException {
                jgen.writeString("");
            }
        });
        // 进行HTML解码。
        this.registerModule(new SimpleModule().addSerializer(String.class, new JsonSerializer<String>(){
            @Override
            public void serialize(String value, JsonGenerator jgen,
                                  SerializerProvider provider) throws IOException,
                    JsonProcessingException {
                jgen.writeString(StringEscapeUtils.unescapeHtml4(value));
            }
        }));
        // 设置时区
        this.setTimeZone(TimeZone.getDefault());//getTimeZone("GMT+8:00")
    }

    /**
     * 创建只输出非Null且非Empty(如List.isEmpty)的属性到Json字符串的Mapper,建议在外部接口中使用.
     */
    public static JsonMapper getInstance() {
        if (mapper == null){
            mapper = new JsonMapper().enableSimple();
        }
        return mapper;
    }

    /**
     * 创建只输出初始值被改变的属性到Json字符串的Mapper, 最节约的存储方式，建议在内部接口中使用。
     */
    public static JsonMapper nonDefaultMapper() {
        if (mapper == null){
            mapper = new JsonMapper(Include.NON_DEFAULT);
        }
        return mapper;
    }

    /**
     * Object可以是POJO，也可以是Collection或数组。
     * 如果对象为Null, 返回"null".
     * 如果集合为空集合, 返回"[]".
     */
    public String toJson(Object object) {
        try {
            return this.writeValueAsString(object);
        } catch (IOException e) {
            if(LOGGER.isWarnEnabled()){
                LOGGER.warn("write to json string error:" + object, e);
            }
            return null;
        }
    }

    /**
     * 反序列化POJO或简单Collection如List<String>.
     *
     * 如果JSON字符串为Null或"null"字符串, 返回Null.
     * 如果JSON字符串为"[]", 返回空集合.
     *
     * 如需反序列化复杂Collection如List<MyBean>, 请使用fromJson(String,JavaType)
     * @see #fromJson(String, JavaType)
     */
    public <T> T fromJson(String jsonString, Class<T> clazz) {
        if (StringUtils.isEmpty(jsonString)) {
            return null;
        }
        try {
            return this.readValue(jsonString, clazz);
        } catch (IOException e) {
            if(LOGGER.isWarnEnabled()){
                LOGGER.warn("parse json string error:" + jsonString, e);
            }
            return null;
        }
    }

    /**
     * 反序列化复杂Collection如List<Bean>, 先使用函數createCollectionType构造类型,然后调用本函数.
     * @see #createCollectionType(Class, Class...)
     */
    @SuppressWarnings("unchecked")
    public <T> T fromJson(String jsonString, JavaType javaType) {
        if (StringUtils.isEmpty(jsonString)) {
            return null;
        }
        try {
            return (T) this.readValue(jsonString, javaType);
        } catch (IOException e) {
            if(LOGGER.isWarnEnabled()){
                LOGGER.warn("parse json string error:" + jsonString, e);
            }
            return null;
        }
    }

    /**
     * 構造泛型的Collection Type如:
     * ArrayList<MyBean>, 则调用constructCollectionType(ArrayList.class,MyBean.class)
     * HashMap<String,MyBean>, 则调用(HashMap.class,String.class, MyBean.class)
     */
    public JavaType createCollectionType(Class<?> collectionClass, Class<?>... elementClasses) {
        return this.getTypeFactory().constructParametricType(collectionClass, elementClasses);
    }

    /**
     * 當JSON裡只含有Bean的部分屬性時，更新一個已存在Bean，只覆蓋該部分的屬性.
     */
    @SuppressWarnings("unchecked")
    public <T> T update(String jsonString, T object) {
        try {
            return (T) this.readerForUpdating(object).readValue(jsonString);
        } catch (JsonProcessingException e) {
            if(LOGGER.isWarnEnabled()){
                LOGGER.warn("update json string:" + jsonString + " to object:" + object + " error.", e);
            }
        } catch (IOException e) {
            if(LOGGER.isWarnEnabled()){
                LOGGER.warn("update json string:" + jsonString + " to object:" + object + " error.", e);
            }
        }
        return null;
    }

    /**
     * 輸出JSONP格式數據.
     */
    public String toJsonP(String functionName, Object object) {
        return toJson(new JSONPObject(functionName, object));
    }

    /**
     * 設定是否使用Enum的toString函數來讀寫Enum,
     * 為False時時使用Enum的name()函數來讀寫Enum, 默認為False.
     * 注意本函數一定要在Mapper創建後, 所有的讀寫動作之前調用.
     */
    public JsonMapper enableEnumUseToString() {
        this.enable(SerializationFeature.WRITE_ENUMS_USING_TO_STRING);
        this.enable(DeserializationFeature.READ_ENUMS_USING_TO_STRING);
        return this;
    }

    /**
     * 允许单引号
     * 允许不带引号的字段名称
     */
    public JsonMapper enableSimple() {
        this.configure(Feature.ALLOW_SINGLE_QUOTES, true);
        this.configure(Feature.ALLOW_UNQUOTED_FIELD_NAMES, true);
        return this;
    }

    /**
     * 取出Mapper做进一步的设置或使用其他序列化API.
     */
    public ObjectMapper getMapper() {
        return this;
    }

    /**
     * 对象转换为JSON字符串
     * @param object
     * @return
     */
    public static String toJsonString(Object object){
        return JsonMapper.getInstance().toJson(object);
    }

    /**
     * JSON字符串转换为对象
     * @param jsonString
     * @param clazz
     * @return
     */
    public static <T> T fromJsonString(String jsonString, Class<T> clazz){
        return JsonMapper.getInstance().fromJson(jsonString, clazz);
    }


    /**
     * 将obj对象转换成 class类型的对象
     * @param obj
     * @param clazz
     * @return
     */
    public static <T> T parseObject(Object obj, Class<T> clazz){
        return JSON.parseObject(JSON.toJSONString(obj), clazz);
    }
}
```

## JSON序列化
```java

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.lang3.SerializationException;

import java.nio.charset.Charset;

/**
 * Created by SIVEN on 17/9/4.
 */
public class JsonRedisSeriaziler {

    public static final String EMPTY_JSON = "{}";

    public static final Charset DEFAULT_CHARSET = Charset.forName("UTF-8");

    protected ObjectMapper objectMapper = new ObjectMapper();
    public JsonRedisSeriaziler(){}

    /**
     * java-object as json-string
     * @param object
     * @return
     */
    public String seriazileAsString(Object object){
        if (object== null) {
            return EMPTY_JSON;
        }
        try {
            return this.objectMapper.writeValueAsString(object);
        } catch (Exception ex) {
            throw new SerializationException("Could not write JSON: " + ex.getMessage(), ex);
        }
    }

    /**
     * json-string to java-object
     * @param str
     * @return
     */
    public <T> T deserializeAsObject(String str,Class<T> clazz){
        if(str == null || clazz == null){
            return null;
        }
        try{
            return this.objectMapper.readValue(str, clazz);
        }catch (Exception ex) {
            throw new SerializationException("Could not write JSON: " + ex.getMessage(), ex);
        }
    }
}
```

## RedisClient
```java

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import org.apache.commons.lang3.StringUtils;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.core.BoundHashOperations;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.stereotype.Repository;
import org.springframework.util.CollectionUtils;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;


@Repository
public class RedisClient extends AbstractBaseRedis<String, Object> {

    /**
     * 删除缓存<br>
     * 根据key精确匹配删除
     * @param key
     */
    @SuppressWarnings("unchecked")
    public void del(String... key){
        if(key!=null && key.length > 0){
            if(key.length == 1){
                redisTemplate.delete(key[0]);
            }else{
                redisTemplate.delete(CollectionUtils.arrayToList(key));
            }
        }
    }

    /**
     * 批量删除<br>
     * （该操作会执行模糊查询，请尽量不要使用，以免影响性能或误删）
     * @param pattern
     */
    public void batchDel(String... pattern){
        for (String kp : pattern) {
            redisTemplate.delete(redisTemplate.keys(kp + "*"));
        }
    }

    /**
     * 取得缓存（int型）
     * @param key
     * @return
     */
    public Integer getInt(String key){
        String value = stringRedisTemplate.boundValueOps(key).get();
        if(StringUtils.isNotBlank(value)){
            return Integer.valueOf(value);
        }
        return null;
    }

    /**
     * 取得缓存（字符串类型）
     * @param key
     * @return
     */
    public String getStr(String key){
        return stringRedisTemplate.boundValueOps(key).get();
    }

    /**
     * 取得缓存（字符串类型）
     * @param key
     * @return
     */
    public String getStr(String key, boolean retain){
        String value = stringRedisTemplate.boundValueOps(key).get();
        if(!retain){
            redisTemplate.delete(key);
        }
        return value;
    }

    /**
     * 获取缓存<br>
     * 注：基本数据类型(Character除外)，请直接使用get(String key, Class<T> clazz)取值
     * @param key
     * @return
     */
    public Object getObj(String key){
        return redisTemplate.boundValueOps(key).get();
    }

    /**
     * 获取缓存<br>
     * 注：java 8种基本类型的数据请直接使用get(String key, Class<T> clazz)取值
     * @param key
     * @param retain    是否保留
     * @return
     */
    public Object getObj(String key, boolean retain){
        Object obj = redisTemplate.boundValueOps(key).get();
        if(!retain){
            redisTemplate.delete(key);
        }
        return obj;
    }

    /**
     * 获取缓存<br>
     * 注：该方法暂不支持Character数据类型
     * @param key   key
     * @param clazz 类型
     * @return
     */
    @SuppressWarnings("unchecked")
    public <T> T get(String key, Class<T> clazz) {
        return (T)redisTemplate.boundValueOps(key).get();
    }

    /**
     * 获取缓存json对象<br>
     * @param key   key
     * @param clazz 类型
     * @return
     */
    public <T> T getJson(String key, Class<T> clazz) {
        return JsonMapper.fromJsonString(stringRedisTemplate.boundValueOps(key).get(), clazz);
    }

    /**
     * 将value对象写入缓存
     * @param key
     * @param value
     * @param time 失效时间(秒)
     */
    public void set(String key,Object value,Long time){
        if(value.getClass().equals(String.class)){
            stringRedisTemplate.opsForValue().set(key, value.toString());
        }else if(value.getClass().equals(Integer.class)){
            stringRedisTemplate.opsForValue().set(key, value.toString());
        }else if(value.getClass().equals(Double.class)){
            stringRedisTemplate.opsForValue().set(key, value.toString());
        }else if(value.getClass().equals(Float.class)){
            stringRedisTemplate.opsForValue().set(key, value.toString());
        }else if(value.getClass().equals(Short.class)){
            stringRedisTemplate.opsForValue().set(key, value.toString());
        }else if(value.getClass().equals(Long.class)){
            stringRedisTemplate.opsForValue().set(key, value.toString());
        }else if(value.getClass().equals(Boolean.class)){
            stringRedisTemplate.opsForValue().set(key, value.toString());
        }else{
            redisTemplate.opsForValue().set(key, value);
        }
        if(time > 0){
            redisTemplate.expire(key, time, TimeUnit.SECONDS);
        }
    }

    /**
     * 将value对象以JSON格式写入缓存
     * @param key
     * @param value
     * @param time 失效时间(秒)
     */
    public void setJson(String key,Object value,Long time){
        stringRedisTemplate.opsForValue().set(key, JsonMapper.toJsonString(value));
        if(time > 0){
            stringRedisTemplate.expire(key, time, TimeUnit.SECONDS);
        }
    }

    /**
     * 更新key对象field的值
     * @param key   缓存key
     * @param field 缓存对象field
     * @param value 缓存对象field值
     */
    public void setJsonField(String key, String field, String value){
        JSONObject obj = JSON.parseObject(stringRedisTemplate.boundValueOps(key).get());
        obj.put(field, value);
        stringRedisTemplate.opsForValue().set(key, obj.toJSONString());
    }


    /**
     * 递减操作
     * @param key
     * @param by
     * @return
     */
    public double decr(String key, double by){
        return redisTemplate.opsForValue().increment(key, -by);
    }

    /**
     * 递增操作
     * @param key
     * @param by
     * @return
     */
    public double incr(String key, double by){
        return redisTemplate.opsForValue().increment(key, by);
    }

    /**
     * 获取double类型值
     * @param key
     * @return
     */
    public double getDouble(String key) {
        String value = stringRedisTemplate.boundValueOps(key).get();
        if(StringUtils.isNotBlank(value)){
            return Double.valueOf(value);
        }
        return 0d;
    }

    /**
     * 设置double类型值
     * @param key
     * @param value
     * @param time 失效时间(秒)
     */
    public void setDouble(String key, double value, Long time) {
        stringRedisTemplate.opsForValue().set(key, String.valueOf(value));
        if(time > 0){
            stringRedisTemplate.expire(key, time, TimeUnit.SECONDS);
        }
    }

    /**
     * 设置double类型值
     * @param key
     * @param value
     * @param time 失效时间(秒)
     */
    public void setInt(String key, int value, Long time) {
        stringRedisTemplate.opsForValue().set(key, String.valueOf(value));
        if(time > 0){
            stringRedisTemplate.expire(key, time, TimeUnit.SECONDS);
        }
    }

    /**
     * 将map写入缓存
     * @param key
     * @param map
     * @param time 失效时间(秒)
     */
    public <T> void setMap(String key, Map<String, T> map, Long time){
        redisTemplate.opsForHash().putAll(key, map);
    }

    /**
     * 将map写入缓存
     * @param key
     * @param map
     * @param time 失效时间(秒)
     */
    @SuppressWarnings("unchecked")
    public <T> void setMap(String key, T obj, Long time){
        Map<String, String> map = (Map<String, String>)JsonMapper.parseObject(obj, Map.class);
        redisTemplate.opsForHash().putAll(key, map);
    }



    /**
     * 向key对应的map中添加缓存对象
     * @param key
     * @param map
     */
    public <T> void addMap(String key, Map<String, T> map){
        redisTemplate.opsForHash().putAll(key, map);
    }

    /**
     * 向key对应的map中添加缓存对象
     * @param key   cache对象key
     * @param field map对应的key
     * @param value     值
     */
    public void addMap(String key, String field, String value){
        redisTemplate.opsForHash().put(key, field, value);
    }

    /**
     * 向key对应的map中添加缓存对象
     * @param key   cache对象key
     * @param field map对应的key
     * @param obj   对象
     */
    public <T> void addMap(String key, String field, T obj){
        redisTemplate.opsForHash().put(key, field, obj);
    }

    /**
     * 获取map缓存
     * @param key
     * @param clazz
     * @return
     */
    public <T> Map<String, T> mget(String key, Class<T> clazz){
        BoundHashOperations<String, String, T> boundHashOperations = redisTemplate.boundHashOps(key);
        return boundHashOperations.entries();
    }

    /**
     * 获取map缓存
     * @param key
     * @param clazz
     * @return
     */
    public <T> T getMap(String key, Class<T> clazz){
        BoundHashOperations<String, String, String> boundHashOperations = redisTemplate.boundHashOps(key);
        Map<String, String> map = boundHashOperations.entries();
        return JsonMapper.parseObject(map, clazz);
    }

    /**
     * 获取map缓存中的某个对象
     * @param key
     * @param field
     * @param clazz
     * @return
     */
    @SuppressWarnings("unchecked")
    public <T> T getMapField(String key, String field, Class<T> clazz){
        return (T)redisTemplate.boundHashOps(key).get(field);
    }

    /**
     * 删除map中的某个对象
     * @author lh
     * @date 2016年8月10日
     * @param key   map对应的key
     * @param field map中该对象的key
     */
    public void delMapField(String key, String... field){
        BoundHashOperations<String, String, ?> boundHashOperations = redisTemplate.boundHashOps(key);
        boundHashOperations.delete(field);
    }

    /**
     * 指定缓存的失效时间
     *
     * @author FangJun
     * @date 2016年8月14日
     * @param key 缓存KEY
     * @param time 失效时间(秒)
     */
    public void expire(String key, Long time) {
        if(time > 0){
            redisTemplate.expire(key, time, TimeUnit.SECONDS);
        }
    }

    /**
     * 添加set
     * @param key
     * @param value
     */
    public void sadd(String key, String... value) {
        redisTemplate.boundSetOps(key).add(value);
    }

    /**
     * 删除set集合中的对象
     * @param key
     * @param value
     */
    public void srem(String key, String... value) {
        redisTemplate.boundSetOps(key).remove(value);
    }

    /**
     * set重命名
     * @param oldkey
     * @param newkey
     */
    public void srename(String oldkey, String newkey){
        redisTemplate.boundSetOps(oldkey).rename(newkey);
    }

    /**
     * 短信缓存
     * @author fxl
     * @date 2016年9月11日
     * @param key
     * @param value
     * @param time
     */
    public void setIntForPhone(String key,Object value,int time){
        stringRedisTemplate.opsForValue().set(key, JsonMapper.toJsonString(value));
        if(time > 0){
            stringRedisTemplate.expire(key, time, TimeUnit.SECONDS);
        }
    }

    /**
     * 模糊查询keys
     * @param pattern
     * @return
     */
    public Set<String> keys(String pattern){
        return redisTemplate.keys(pattern);
    }

}
```

## redis xml文件配置
```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:context="http://www.springframework.org/schema/context"
       xsi:schemaLocation="
		http://www.springframework.org/schema/beans
		http://www.springframework.org/schema/beans/spring-beans-4.0.xsd
		http://www.springframework.org/schema/context
		http://www.springframework.org/schema/context/spring-context-4.0.xsd"
       default-lazy-init="false">

    <description>Jedis Config</description>

    <context:property-placeholder location="classpath:config/application-jedis.properties" ignore-unresolvable="true"/>


    <!-- 连接池配置. -->
    <bean id="jedisPoolConfig" class="redis.clients.jedis.JedisPoolConfig">
        <!-- 连接池中最大连接数。高版本：maxTotal，低版本：maxActive -->
        <property name="maxTotal" value="${redis.maxTotal}"/>
        <!-- 连接池中最大空闲的连接数. -->
        <property name="maxIdle" value="${redis.maxIdle}"/>
        <!-- 连接池中最少空闲的连接数. -->
        <property name="minIdle" value="${redis.minIdle}"/>
        <!-- 当连接池资源耗尽时，调用者最大阻塞的时间，超时将跑出异常。单位，毫秒数;默认为-1.表示永不超时。高版本：maxWaitMillis，低版本：maxWait -->
        <property name="maxWaitMillis" value="${redis.maxWaitMillis}"/>
        <!-- 连接空闲的最小时间，达到此值后空闲连接将可能会被移除。负值(-1)表示不移除. -->
        <property name="minEvictableIdleTimeMillis" value="${redis.minEvictableIdleTimeMillis}"/>
        <!-- 对于“空闲链接”检测线程而言，每次检测的链接资源的个数。默认为3 -->
        <property name="numTestsPerEvictionRun" value="${redis.numTestsPerEvictionRun}"/>
        <!-- “空闲链接”检测线程，检测的周期，毫秒数。如果为负值，表示不运行“检测线程”。默认为-1. -->
        <property name="timeBetweenEvictionRunsMillis" value="${redis.timeBetweenEvictionRunsMillis}"/>
        <!-- testOnBorrow:向调用者输出“链接”资源时，是否检测是有有效，如果无效则从连接池中移除，并尝试获取继续获取。默认为false。建议保持默认值. -->
        <property name="testOnBorrow" value="${redis.testOnBorrow}"/>
        <!-- testOnReturn:向连接池“归还”链接时，是否检测“链接”对象的有效性。默认为false。建议保持默认值.-->
        <property name="testOnReturn" value="${redis.testOnReturn}"/>
        <!-- testWhileIdle:向调用者输出“链接”对象时，是否检测它的空闲超时；默认为false。如果“链接”空闲超时，将会被移除。建议保持默认值. -->
        <!-- whenExhaustedAction:当“连接池”中active数量达到阀值时，即“链接”资源耗尽时，连接池需要采取的手段, 默认为1(0:抛出异常。1:阻塞，直到有可用链接资源。2:强制创建新的链接资源) -->
    </bean>
    <!-- Spring提供的Redis连接工厂 -->
    <bean id="jedisConnectionFactory" class="org.springframework.data.redis.connection.jedis.JedisConnectionFactory"
          destroy-method="destroy">
        <!-- 连接池配置. -->
        <property name="poolConfig" ref="jedisPoolConfig"/>
        <!-- Redis服务主机. -->
        <property name="hostName" value="${redis.hostName}"/>
        <!-- Redis服务端口号. -->
        <property name="port" value="${redis.port}"/>
        <!-- Redis服务连接密码. -->
        <property name="password" value="${redis.password}"/>
        <!-- 连超时设置. -->
        <property name="timeout" value="${redis.timeout}"/>
        <!-- 是否使用连接池. -->
        <property name="usePool" value="true"/>
    </bean>

    <!-- key序列化 -->
    <bean id="stringRedisSerializer" class="org.springframework.data.redis.serializer.StringRedisSerializer"/>
    <bean id="stringRedisTemplate" class="org.springframework.data.redis.core.StringRedisTemplate">
           <property name="connectionFactory" ref="jedisConnectionFactory"/>
    </bean>

    <!-- Spring提供的访问Redis类. -->
    <bean id="redisTemplate" class="org.springframework.data.redis.core.RedisTemplate">
        <property name="connectionFactory" ref="jedisConnectionFactory"/>
        <property name="keySerializer">
            <bean class="org.springframework.data.redis.serializer.StringRedisSerializer"/>
        </property>
        <property name="hashKeySerializer">
            <bean class="org.springframework.data.redis.serializer.StringRedisSerializer"/>
        </property>
        <property name="valueSerializer">
            <bean class="org.springframework.data.redis.serializer.JdkSerializationRedisSerializer"/>
        </property>
        <property name="hashValueSerializer">
            <bean class="org.springframework.data.redis.serializer.JdkSerializationRedisSerializer"/>
        </property>
    </bean>

    <!-- 配置缓存 -->
    <bean id="cacheManager" class="org.springframework.data.redis.cache.RedisCacheManager">
        <constructor-arg ref="redisTemplate" />
    </bean>

    <bean id="redisClient" class="cn.com.servyou.gzyjzx.frame.redis.RedisClient" />
</beans>
```
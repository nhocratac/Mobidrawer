package com.example.ie213backend.config;

import com.example.ie213backend.domain.dto.AuthDto.RegistrationRequest;
import com.example.ie213backend.domain.dto.PaymentDto.PaymentRequest;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class CacheConfig {
    @Bean
    public RedisTemplate<String, RegistrationRequest> redisTemplate(RedisConnectionFactory redisConnectionFactory) {
        RedisTemplate<String, RegistrationRequest> template = new RedisTemplate<>();
        template.setConnectionFactory(redisConnectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        return template;
    }

    @Bean
    public RedisTemplate<String, PaymentRequest> redisPaymentRequestTemplate(RedisConnectionFactory redisConnectionFactory) {
        RedisTemplate<String, PaymentRequest> template = new RedisTemplate<>();
        template.setConnectionFactory(redisConnectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        return template;
    }

    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory redisConnectionFactory) {
        return new StringRedisTemplate(redisConnectionFactory);
    }
    @Bean
    public RedisTemplate<String, UserDto> userDtoRedisTemplate(RedisConnectionFactory redisConnectionFactory) {
        RedisTemplate<String, UserDto> template = new RedisTemplate<>();
        template.setConnectionFactory(redisConnectionFactory);

        // Dùng Jackson serializer cho giá trị
        GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer();

        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(serializer);

        // Set thêm các serializer để đảm bảo consistency
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(serializer);
        template.setDefaultSerializer(serializer);

        template.afterPropertiesSet(); // ⚠️ Đừng quên dòng này
        return template;
    }
}
package com.example.ie213backend.config;

import org.bson.types.ObjectId;
import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

@Component
public class ObjectIdConverter implements Converter<String, ObjectId> {
    @Override
    public ObjectId convert(String source) {
        if (ObjectId.isValid(source)) {
            return new ObjectId(source);
        }
        throw new IllegalArgumentException("Invalid ObjectId format: " + source);
    }
}
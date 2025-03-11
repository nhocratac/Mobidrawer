package com.example.ie213backend.mapper;

import org.bson.types.ObjectId;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ObjectIdMapper {
    default String toString(ObjectId objectId) {
        return objectId != null ? objectId.toHexString() : null;
    }

    default ObjectId toObjectId(String id) {
        return (id != null && !id.isEmpty()) ? new ObjectId(id) : null;
    }
}

package com.example.ie213backend.domain.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@Document(collection = "boards")
public class Board {
    @Id
    private ObjectId id;
    private String name;

    private ObjectId owner;
    private String type;
    private String description;
    private Option option;
    private String thumbnail;

    @LastModifiedDate
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonSerialize(using = LocalDateTimeSerializer.class)
    @JsonDeserialize(using = LocalDateTimeDeserializer.class)
    private LocalDateTime updateAt;

    private List<Member> permissions;
    private List<ObjectId> canvasPaths;


    @Data
    @AllArgsConstructor
    public static class Option {
        private boolean grid;
        private String backgroundColor = "#FFFFFF";
    }

    @Data
    @AllArgsConstructor
    public static class Member {
        private String memberId;
        private ROLE role;
    }

     public static enum ROLE {
         EDITOR,VIEWER
    }
}


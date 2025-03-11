package com.example.ie213backend.domain.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "boards")
public class Board {
    @Id
    private String id;
    private String name;

    @Field(targetType = FieldType.OBJECT_ID)
    private String owner;
    private String type;
    private String description;
    private Option option;
    private String thumbnail;

    @LastModifiedDate
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonSerialize(using = LocalDateTimeSerializer.class)
    @JsonDeserialize(using = LocalDateTimeDeserializer.class)
    private LocalDateTime updateAt;

    private List<Member> members = new ArrayList<>();

    @Field(targetType = FieldType.OBJECT_ID)
    private List<String> canvasPaths = new ArrayList<>();


    @Data
    @AllArgsConstructor
    public static class Option {
        private boolean grid;
        private String backgroundColor = "#FFFFFF";
    }

    @Data
    @AllArgsConstructor
    public static class Member {
        @Field(targetType = FieldType.OBJECT_ID)
        private String memberId;
        private ROLE role;
    }

     public enum ROLE {
         EDITOR,VIEWER
    }

}


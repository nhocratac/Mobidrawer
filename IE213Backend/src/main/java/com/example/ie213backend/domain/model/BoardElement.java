package com.example.ie213backend.domain.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.LocalDateTime;

// Một đối tượng trên board: sticky | image | shape | connector
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@Document(collection = "boardElements")
@CompoundIndexes({
        @CompoundIndex(name = "board_z", def = "{'boardId': 1, 'z': 1}"),
        @CompoundIndex(name = "board_conn_from", def = "{'boardId': 1, 'connector.from.elementId': 1}"),
        @CompoundIndex(name = "board_conn_to", def = "{'boardId': 1, 'connector.to.elementId': 1}")
})
public class BoardElement {

    @Id
    private String id;

    @Field(targetType = FieldType.OBJECT_ID)
    private String boardId;

    private String type;

    private double x;
    private double y;
    private double w;
    private double h;
    private double rotation;
    private double z;

    @Field(targetType = FieldType.OBJECT_ID)
    private String owner;

    private long version;

    @LastModifiedDate
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonSerialize(using = LocalDateTimeSerializer.class)
    @JsonDeserialize(using = LocalDateTimeDeserializer.class)
    private LocalDateTime updateAt;

    private String text;
    private Style style;
    private ImageData image;
    private ShapeData shape;
    private ConnectorData connector;

    // stickyNote | Images khi được migrate từ collection cũ
    private String migratedFrom;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Style {
        private String fill;
        private String stroke;
        private Double strokeWidth;
        private Double fontSize;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ImageData {
        private String url;
        private String cloudinaryId;
        private String alt;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ShapeData {
        private String kind;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ConnectorData {
        private End from;
        private End to;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class End {
        private String elementId;
        private String anchor;
    }
}

package com.example.ie213backend.domain.dto.StickyNote;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ResizeStickyNote {
    @Id
    private String id;

    private SizeDTO size;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class SizeDTO {
        private int width;
        private int height;
    }
}

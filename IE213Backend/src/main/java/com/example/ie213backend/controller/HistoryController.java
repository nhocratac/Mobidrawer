package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.service.history.HistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Lịch sử phiên bản của board (chỉ đọc); khôi phục đi qua STOMP /el/restore
@RestController
@RequestMapping("${api.prefix}/board")
@RequiredArgsConstructor
public class HistoryController {

    private final HistoryService historyService;

    @GetMapping("/{id}/history")
    public ResponseEntity<List<HistoryService.TxView>> getHistory(
            @PathVariable String id,
            @RequestParam(required = false) Long beforeSeq,
            @RequestParam(defaultValue = "30") int limit,
            @RequestAttribute("user") UserDto userDto
    ) {
        return ResponseEntity.ok(historyService.list(id, userDto.getId(), beforeSeq, limit));
    }

    @GetMapping("/{id}/history/state")
    public ResponseEntity<HistoryService.StateView> getStateAt(
            @PathVariable String id,
            @RequestParam long seq,
            @RequestAttribute("user") UserDto userDto
    ) {
        return ResponseEntity.ok(historyService.stateAt(id, userDto.getId(), seq));
    }
}

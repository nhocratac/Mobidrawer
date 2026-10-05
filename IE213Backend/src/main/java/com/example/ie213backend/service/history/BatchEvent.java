package com.example.ie213backend.service.history;

import java.util.List;
import java.util.Map;

// Một commit của writer = một message batch; seqFrom/seqTo là dải của commit này (không phải của tx đã merge)
// ops: {op:"create",elements:[full]} | {op:"patch",patches:[{id,set,version}]} | {op:"delete",ids:[..]}
public record BatchEvent(String txId, String source, long seqFrom, long seqTo, String senderSessionId, String userId,
                         List<Map<String, Object>> ops) {
}

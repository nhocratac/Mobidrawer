package com.example.ie213backend.service.payment;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SchedulerLockTest {
    static { System.setProperty("net.bytebuddy.experimental", "true"); }
    MongoTemplate mongo = mock(MongoTemplate.class);
    SchedulerLock lock = new SchedulerLock(mongo);

    @Test
    void tryAcquire_upsertsOnExpiredOrMissingLease() {
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Map.class), eq("scheduler_locks")))
                .thenReturn(Map.of("_id", "job"));
        assertTrue(lock.tryAcquire("job", 60));
        ArgumentCaptor<Query> q = ArgumentCaptor.forClass(Query.class);
        ArgumentCaptor<FindAndModifyOptions> o = ArgumentCaptor.forClass(FindAndModifyOptions.class);
        verify(mongo).findAndModify(q.capture(), any(Update.class), o.capture(), eq(Map.class), eq("scheduler_locks"));
        String json = q.getValue().getQueryObject().toJson();
        assertTrue(json.contains("\"_id\": \"job\""), json);
        assertTrue(json.contains("leasedUntil"), json);
        assertTrue(o.getValue().isUpsert());
    }

    @Test
    void tryAcquire_duplicateKeyMeansHeldByOther() {
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Map.class), eq("scheduler_locks")))
                .thenThrow(new DuplicateKeyException("held"));
        assertFalse(lock.tryAcquire("job", 60));
    }
}

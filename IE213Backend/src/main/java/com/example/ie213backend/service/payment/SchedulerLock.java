package com.example.ie213backend.service.payment;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

import java.lang.management.ManagementFactory;
import java.util.Date;
import java.util.Map;

/** Lease lock in collection scheduler_locks so a @Scheduled job runs on one instance at a time. */
@Slf4j
@Component
public class SchedulerLock {
    static final String COLLECTION = "scheduler_locks";
    private final MongoTemplate mongo;
    private final String instanceId = ManagementFactory.getRuntimeMXBean().getName();

    public SchedulerLock(MongoTemplate mongo) { this.mongo = mongo; }

    public boolean tryAcquire(String name, int leaseSeconds) {
        Date now = new Date();
        Query q = Query.query(Criteria.where("_id").is(name)
                .orOperator(Criteria.where("leasedUntil").lt(now), Criteria.where("leasedUntil").isNull()));
        Update u = new Update().set("holder", instanceId).set("leasedUntil", new Date(now.getTime() + leaseSeconds * 1000L));
        try {
            Map<?, ?> doc = mongo.findAndModify(q, u, FindAndModifyOptions.options().upsert(true).returnNew(true), Map.class, COLLECTION);
            return doc != null;
        } catch (DuplicateKeyException heldByOther) {
            // upsert raced with a live lease: the _id exists but did not match the filter
            return false;
        }
    }
}

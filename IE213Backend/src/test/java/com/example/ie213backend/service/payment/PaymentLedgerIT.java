package com.example.ie213backend.service.payment;

import com.example.ie213backend.domain.OrderStatus;
import com.example.ie213backend.domain.Plans;
import com.example.ie213backend.domain.SettlementSource;
import com.example.ie213backend.domain.model.PaymentOrder;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.domain.model.UserPlans;
import com.example.ie213backend.repository.PaymentOrderRepository;
import com.example.ie213backend.repository.UserPlansRepository;
import com.example.ie213backend.service.EmailService;
import com.example.ie213backend.service.NotificationService;
import com.example.ie213backend.service.UserService;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.repository.support.MongoRepositoryFactory;

import java.time.Clock;
import java.util.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

// Chạy với Mongo local: MONGO_IT_URI=mongodb://localhost:27027
@EnabledIfEnvironmentVariable(named = "MONGO_IT_URI", matches = ".+")
class PaymentLedgerIT {
    static { System.setProperty("net.bytebuddy.experimental", "true"); }
    static final String USER = "650000000000000000000a01";

    MongoClient client;
    MongoTemplate mongo;
    PaymentOrderRepository orders;
    UserPlansRepository plans;
    OrderLedger ledger;
    PlanGrantService grants;
    SchedulerLock lock;

    @BeforeEach
    void setUp() {
        client = MongoClients.create(System.getenv("MONGO_IT_URI"));
        mongo = new MongoTemplate(client, "it_" + UUID.randomUUID().toString().replace("-", ""));
        // hand-built MongoTemplate does not auto-create indexes: create the two that carry the invariants
        mongo.indexOps(PaymentOrder.class).ensureIndex(new Index().on("txnRef", Sort.Direction.ASC).unique().named("order_txnref"));
        mongo.indexOps(UserPlans.class).ensureIndex(new Index().on("orderTxnRef", Sort.Direction.ASC).unique().sparse().named("userplan_order_txnref"));
        MongoRepositoryFactory f = new MongoRepositoryFactory(mongo);
        orders = f.getRepository(PaymentOrderRepository.class);
        plans = f.getRepository(UserPlansRepository.class);
        ledger = new OrderLedger(mongo, orders, 15);
        UserService users = mock(UserService.class);
        User u = new User(); u.setId(USER); u.setEmail("a@b.c"); u.setPlan(Plans.FREE);
        when(users.getUserById(USER)).thenReturn(u);
        when(users.saveUser(any())).thenAnswer(i -> i.getArgument(0));
        grants = new PlanGrantService(plans, users, mock(NotificationService.class), mock(EmailService.class), ledger, 30, Clock.system(OrderLedger.VN));
        lock = new SchedulerLock(mongo);
    }

    @AfterEach
    void tearDown() { mongo.getDb().drop(); client.close(); }

    PaymentOrder newOrder() { return ledger.create(USER, Plans.PRO, 400_000L, "Mobidrawer PRO", null, "vn", "127.0.0.1"); }
    VnpFields fields() { return new VnpFields("14000001", "NCB", "00", "20261015093512", Map.of()); }

    @Test
    void txnRef_unique_rejectsDuplicateInsert() {
        PaymentOrder o = newOrder();
        PaymentOrder dup = PaymentOrder.builder().txnRef(o.getTxnRef()).userId(USER).plan(Plans.PRO).status(OrderStatus.PENDING).build();
        assertThrows(DuplicateKeyException.class, () -> orders.insert(dup));
    }

    @Test
    void settle_concurrent_onlyOneWins() throws Exception {
        PaymentOrder o = newOrder();
        int n = 8;
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<PaymentOrder>> results = new ArrayList<>();
        for (int i = 0; i < n; i++) results.add(pool.submit(() -> { go.await(); return ledger.settle(o.getTxnRef(), OrderStatus.PAID, SettlementSource.IPN, fields()); }));
        go.countDown();
        int winners = 0;
        for (Future<PaymentOrder> r : results) if (r.get(10, TimeUnit.SECONDS) != null) winners++;
        pool.shutdown();
        assertEquals(1, winners);
        assertEquals(OrderStatus.PAID, orders.findByTxnRef(o.getTxnRef()).orElseThrow().getStatus());
        assertNull(ledger.settle(o.getTxnRef(), OrderStatus.FAILED, SettlementSource.RECONCILE, fields()), "terminal state never changes");
    }

    @Test
    void grant_twice_oneUserPlan_andOldPlanInactive() {
        UserPlans old = plans.save(UserPlans.builder().userId(USER).plan(Plans.PRO).active(true).expiresAt(OrderLedger.nowVn().plusDays(5)).build());
        PaymentOrder o = newOrder();
        PaymentOrder paid = ledger.settle(o.getTxnRef(), OrderStatus.PAID, SettlementSource.IPN, fields());
        UserPlans first = grants.grant(paid);
        UserPlans second = grants.grant(orders.findByTxnRef(o.getTxnRef()).orElseThrow());
        assertEquals(first.getId(), second.getId());
        assertEquals(1, plans.findAll().stream().filter(p -> o.getTxnRef().equals(p.getOrderTxnRef())).count());
        assertEquals(first.getId(), orders.findByTxnRef(o.getTxnRef()).orElseThrow().getGrantedUserPlanId());
        assertFalse(plans.findById(old.getId()).orElseThrow().isActive());
        assertEquals(old.getExpiresAt().plusDays(30).toLocalDate(), first.getExpiresAt().toLocalDate(), "extension stacks on the active plan");
    }

    @Test
    void grant_afterPartialFailure_converges() {
        // Simulate: UserPlans inserted, then crash before markGranted.
        PaymentOrder o = newOrder();
        PaymentOrder paid = ledger.settle(o.getTxnRef(), OrderStatus.PAID, SettlementSource.IPN, fields());
        plans.insert(UserPlans.builder().userId(USER).plan(Plans.PRO).active(true).orderTxnRef(o.getTxnRef()).orderCode(o.getTxnRef())
                .createdAt(OrderLedger.nowVn()).expiresAt(OrderLedger.nowVn().plusDays(30)).build());
        UserPlans p = grants.grant(paid);
        assertEquals(o.getTxnRef(), p.getOrderTxnRef());
        assertEquals(p.getId(), orders.findByTxnRef(o.getTxnRef()).orElseThrow().getGrantedUserPlanId());
        assertEquals(1, plans.findAll().size());
    }

    @Test
    void sweepQueries_findStaleAndUngranted() {
        PaymentOrder stale = newOrder();
        mongo.updateFirst(org.springframework.data.mongodb.core.query.Query.query(org.springframework.data.mongodb.core.query.Criteria.where("txnRef").is(stale.getTxnRef())),
                new org.springframework.data.mongodb.core.query.Update().set("createdAt", OrderLedger.nowVn().minusHours(1)), PaymentOrder.class);
        PaymentOrder fresh = newOrder();
        PaymentOrder paidUngranted = ledger.settle(newOrder().getTxnRef(), OrderStatus.PAID, SettlementSource.IPN, fields());
        List<String> staleRefs = ledger.findStalePending(OrderLedger.nowVn().minusMinutes(15), 50).stream().map(PaymentOrder::getTxnRef).toList();
        assertEquals(List.of(stale.getTxnRef()), staleRefs);
        assertFalse(staleRefs.contains(fresh.getTxnRef()));
        assertEquals(List.of(paidUngranted.getTxnRef()), ledger.findPaidUngranted(50).stream().map(PaymentOrder::getTxnRef).toList());
    }

    @Test
    void schedulerLock_secondAcquireFailsUntilLeaseExpires() throws Exception {
        assertTrue(lock.tryAcquire("job", 1));
        assertFalse(new SchedulerLock(mongo).tryAcquire("job", 1), "lease held");
        Thread.sleep(1200);
        assertTrue(new SchedulerLock(mongo).tryAcquire("job", 1), "lease expired");
    }
}

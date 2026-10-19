package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.PaymentOrder;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface PaymentOrderRepository extends MongoRepository<PaymentOrder, String> {
    Optional<PaymentOrder> findByTxnRef(String txnRef);
}

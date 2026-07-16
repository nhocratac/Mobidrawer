package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.ConfigAudit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/**
 * Append-only access to config_audit. Extends MongoRepository - the same
 * base as the frozen ConfigItemRepository - so audit writes use the
 * INHERITED insert(S) method on a freshly constructed null-id doc. This
 * interface declares ONLY read-only Pageable finders: no delete-style or
 * remove-style declaration and no delete/update query exists here or
 * anywhere else in
 * this sprint's diff (see AdminConfigService for the only write call site,
 * which is always insert() on a new doc).
 */
@Repository
public interface ConfigAuditRepository extends MongoRepository<ConfigAudit, String> {

    Page<ConfigAudit> findByKeyAndUpdatedBy(String key, String updatedBy, Pageable pageable);

    Page<ConfigAudit> findByKey(String key, Pageable pageable);

    Page<ConfigAudit> findByUpdatedBy(String updatedBy, Pageable pageable);
}

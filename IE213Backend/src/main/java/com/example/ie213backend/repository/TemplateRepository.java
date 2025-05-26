package com.example.ie213backend.repository;


import com.example.ie213backend.domain.model.Template;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TemplateRepository extends MongoRepository<Template, String> {
//    List<Template> findByOwner(String ownerId);
    Page<Template> findByIsPublicTrue(Pageable pageable);
    List<Template> findByOwnerAndIsPublicTrue(String owner);
    Page<Template> findByTitleContainingIgnoreCaseAndIsPublicTrue(String title, Pageable pageable);
}

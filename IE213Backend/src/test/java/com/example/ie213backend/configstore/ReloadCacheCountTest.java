package com.example.ie213backend.configstore;

import com.example.ie213backend.domain.model.ConfigItem;
import com.example.ie213backend.repository.ConfigItemRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.repository.query.FluentQuery;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Pure-JVM tests for {@link ConfigCache#refresh()} using a hand-rolled
 * {@link ConfigItemRepository} stub instead of Mockito — avoids exposure to
 * Mockito's inline-mock-maker / byte-buddy-experimental risk on JDK 25 with a
 * frozen pom.xml (review C-5.3).
 */
class ReloadCacheCountTest {

    private static ConfigItem item(String key, String value) {
        ConfigItem configItem = new ConfigItem();
        configItem.setKey(key);
        configItem.setValue(value);
        return configItem;
    }

    @Test
    void refreshCountsValueChange() {
        FakeConfigItemRepository repo = new FakeConfigItemRepository();
        repo.setItems(List.of(item("a", "1")));
        ConfigCache cache = new ConfigCache(repo);
        cache.refresh(); // initial load: a=1

        repo.setItems(List.of(item("a", "2")));
        assertEquals(1, cache.refresh());
        assertEquals("2", cache.get("a"));
    }

    @Test
    void refreshCountsAddedKey() {
        FakeConfigItemRepository repo = new FakeConfigItemRepository();
        repo.setItems(List.of(item("a", "1")));
        ConfigCache cache = new ConfigCache(repo);
        cache.refresh();

        repo.setItems(List.of(item("a", "1"), item("b", "2")));
        assertEquals(1, cache.refresh());
        assertEquals("2", cache.get("b"));
    }

    @Test
    void refreshCountsRemovedKey() {
        FakeConfigItemRepository repo = new FakeConfigItemRepository();
        repo.setItems(List.of(item("a", "1"), item("b", "2")));
        ConfigCache cache = new ConfigCache(repo);
        cache.refresh();

        repo.setItems(List.of(item("a", "1")));
        assertEquals(1, cache.refresh());
        assertNull(cache.get("b"));
    }

    @Test
    void refreshReturnsZeroOnNoOpReload() {
        FakeConfigItemRepository repo = new FakeConfigItemRepository();
        repo.setItems(List.of(item("a", "1"), item("b", "2")));
        ConfigCache cache = new ConfigCache(repo);
        cache.refresh();

        repo.setItems(List.of(item("a", "1"), item("b", "2")));
        assertEquals(0, cache.refresh());
    }

    /**
     * Hand-rolled fake — implements only findAll()/findByKey() with real
     * behaviour; every other MongoRepository method is unused by ConfigCache
     * and throws to make accidental use loud.
     */
    static class FakeConfigItemRepository implements ConfigItemRepository {
        private List<ConfigItem> items = new ArrayList<>();

        void setItems(List<ConfigItem> items) {
            this.items = items;
        }

        @Override
        public List<ConfigItem> findAll() {
            return items;
        }

        @Override
        public Optional<ConfigItem> findByKey(String key) {
            return items.stream().filter(i -> i.getKey().equals(key)).findFirst();
        }

        @Override
        public <S extends ConfigItem> S save(S entity) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <S extends ConfigItem> List<S> saveAll(Iterable<S> entities) {
            throw new UnsupportedOperationException();
        }

        @Override
        public Optional<ConfigItem> findById(String id) {
            throw new UnsupportedOperationException();
        }

        @Override
        public boolean existsById(String id) {
            throw new UnsupportedOperationException();
        }

        @Override
        public List<ConfigItem> findAllById(Iterable<String> ids) {
            throw new UnsupportedOperationException();
        }

        @Override
        public long count() {
            throw new UnsupportedOperationException();
        }

        @Override
        public void deleteById(String id) {
            throw new UnsupportedOperationException();
        }

        @Override
        public void delete(ConfigItem entity) {
            throw new UnsupportedOperationException();
        }

        @Override
        public void deleteAllById(Iterable<? extends String> ids) {
            throw new UnsupportedOperationException();
        }

        @Override
        public void deleteAll(Iterable<? extends ConfigItem> entities) {
            throw new UnsupportedOperationException();
        }

        @Override
        public void deleteAll() {
            throw new UnsupportedOperationException();
        }

        @Override
        public List<ConfigItem> findAll(Sort sort) {
            throw new UnsupportedOperationException();
        }

        @Override
        public Page<ConfigItem> findAll(Pageable pageable) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <S extends ConfigItem> Optional<S> findOne(Example<S> example) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <S extends ConfigItem> List<S> findAll(Example<S> example) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <S extends ConfigItem> List<S> findAll(Example<S> example, Sort sort) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <S extends ConfigItem> Page<S> findAll(Example<S> example, Pageable pageable) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <S extends ConfigItem> long count(Example<S> example) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <S extends ConfigItem> boolean exists(Example<S> example) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <S extends ConfigItem, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <S extends ConfigItem> S insert(S entity) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <S extends ConfigItem> List<S> insert(Iterable<S> entities) {
            throw new UnsupportedOperationException();
        }
    }
}

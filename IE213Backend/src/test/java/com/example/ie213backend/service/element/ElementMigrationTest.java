package com.example.ie213backend.service.element;

import com.example.ie213backend.domain.model.BoardElement;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ElementMigrationTest {
    private BoardElement migrated(String id, String from, long version) {
        BoardElement e = new BoardElement();
        e.setId(id);
        e.setMigratedFrom(from);
        e.setVersion(version);
        return e;
    }

    @Test
    void staleMigratedIdsAreUntouchedCopiesWhoseLegacyDocIsGone() {
        List<BoardElement> migrated = List.of(
                migrated("a", "stickyNote", 0),   // legacy gone, untouched → delete
                migrated("b", "stickyNote", 0),   // legacy still there → keep
                migrated("c", "Images", 3),       // edited through new API → keep
                migrated("d", "Images", 0));      // legacy gone → delete
        assertEquals(List.of("a", "d"), ElementMigration.staleMigratedIds(migrated, Set.of("b")));
    }
}

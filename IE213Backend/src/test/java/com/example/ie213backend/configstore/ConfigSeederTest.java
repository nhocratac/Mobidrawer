package com.example.ie213backend.configstore;

import com.example.ie213backend.domain.model.ConfigItem;
import com.example.ie213backend.repository.ConfigItemRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.boot.ApplicationArguments;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pure-JVM unit test for ConfigSeeder idempotency. Repository and ApplicationArguments
 * are mocked - no Spring context, no Mongo.
 */
class ConfigSeederTest {

    static {
        // Byte Buddy (Mockito's bytecode engine) does not yet officially recognize
        // Java 25 class file versions; this opts into its forward-compatible mode.
        // No pom/config changes needed - this only affects this JVM's Mockito use.
        System.setProperty("net.bytebuddy.experimental", "true");
    }

    @Test
    void run_twice_insertsOncePerMissingKey_andNeverForPresentKeys() {
        ConfigItemRepository repository = mock(ConfigItemRepository.class);
        ConfigCache cache = mock(ConfigCache.class);
        ApplicationArguments args = mock(ApplicationArguments.class);

        // Simulate: comment.subcomment.page_size already present, all other 4 keys absent.
        when(repository.findByKey(ConfigKeys.COMMENT_SUBCOMMENT_PAGE_SIZE.getKey()))
                .thenReturn(Optional.of(new ConfigItem()));
        for (ConfigKey<?> key : ConfigKeys.ALL) {
            if (!key.getKey().equals(ConfigKeys.COMMENT_SUBCOMMENT_PAGE_SIZE.getKey())) {
                when(repository.findByKey(key.getKey())).thenReturn(Optional.empty());
            }
        }

        ConfigSeeder seeder = new ConfigSeeder(repository, cache);

        // First run: 4 missing keys get inserted, the present key never does.
        seeder.run(args);

        ArgumentCaptor<ConfigItem> captor = ArgumentCaptor.forClass(ConfigItem.class);
        verify(repository, times(4)).save(captor.capture());
        verify(repository, never()).save(Mockito.argThat(item ->
                item != null && ConfigKeys.COMMENT_SUBCOMMENT_PAGE_SIZE.getKey().equals(item.getKey())));

        // After first run, simulate the 4 previously-missing keys now exist (idempotency setup).
        for (ConfigItem saved : captor.getAllValues()) {
            when(repository.findByKey(saved.getKey())).thenReturn(Optional.of(saved));
        }

        // Second run: no new inserts/saves at all.
        seeder.run(args);

        verify(repository, times(4)).save(Mockito.any(ConfigItem.class));
        assertEquals(4, captor.getAllValues().size());
    }
}

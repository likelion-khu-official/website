package likelion.khu.website.common;

import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(MdcTaskDecoratorTest.Probe.class)
class MdcTaskDecoratorTest {

    @Autowired
    Probe probe;

    @Test
    void asyncMethod_MdcSetOnCallerThread_PropagatesToAsyncThread() throws Exception {
        MDC.put("requestId", "test-request-id");
        try {
            CompletableFuture<Map<String, String>> future = probe.captureMdc();
            Map<String, String> mdcInAsyncThread = future.get(5, TimeUnit.SECONDS);

            assertThat(mdcInAsyncThread).containsEntry("requestId", "test-request-id");
        } finally {
            MDC.clear();
        }
    }

    @Component
    static class Probe {
        @Async
        CompletableFuture<Map<String, String>> captureMdc() {
            return CompletableFuture.completedFuture(MDC.getCopyOfContextMap());
        }
    }
}

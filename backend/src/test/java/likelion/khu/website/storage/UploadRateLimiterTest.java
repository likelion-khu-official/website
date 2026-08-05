package likelion.khu.website.storage;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UploadRateLimiterTest {

    @Test
    void tryAcquire_UnderLimit_Allows() {
        UploadRateLimiter limiter = new UploadRateLimiter();
        for (int i = 0; i < UploadRateLimiter.MAX_UPLOADS_PER_MINUTE; i++) {
            assertThat(limiter.tryAcquire(1L)).isTrue();
        }
    }

    @Test
    void tryAcquire_OverLimit_Blocks() {
        UploadRateLimiter limiter = new UploadRateLimiter();
        for (int i = 0; i < UploadRateLimiter.MAX_UPLOADS_PER_MINUTE; i++) {
            limiter.tryAcquire(1L);
        }
        assertThat(limiter.tryAcquire(1L)).isFalse();
    }

    @Test
    void tryAcquire_DifferentUsers_IndependentLimits() {
        UploadRateLimiter limiter = new UploadRateLimiter();
        for (int i = 0; i < UploadRateLimiter.MAX_UPLOADS_PER_MINUTE; i++) {
            limiter.tryAcquire(1L);
        }
        // 사용자 2는 사용자 1의 한도와 무관하게 허용돼야 한다
        assertThat(limiter.tryAcquire(2L)).isTrue();
    }
}

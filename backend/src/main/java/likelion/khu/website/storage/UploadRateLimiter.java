package likelion.khu.website.storage;

import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

/**
 * 사용자 ID별 인메모리 슬라이딩 윈도 rate limiter — 분당 업로드 횟수를 제한한다.
 * 서버 재시작 시 초기화된다(재시작 직후 직전 창의 요청이 면제되는 짧은 무방비 구간 발생).
 * 소규모 서비스에서 악의적 반복 요청을 막기 위한 1차 방어선이다.
 */
@Component
public class UploadRateLimiter {

    static final int MAX_UPLOADS_PER_MINUTE = 20;
    private static final long WINDOW_MS = 60_000L;

    // principalId → 최근 1분 이내 업로드 타임스탬프 목록
    private final ConcurrentHashMap<Long, ArrayDeque<Long>> windows = new ConcurrentHashMap<>();

    /**
     * 업로드 시도를 기록하고 허용 여부를 반환한다.
     * ConcurrentHashMap.compute()가 키 단위로 원자적이라 ArrayDeque 접근은 안전하다.
     */
    public boolean tryAcquire(Long principalId) {
        long now = System.currentTimeMillis();
        long windowStart = now - WINDOW_MS;
        AtomicReference<Boolean> acquired = new AtomicReference<>(false);
        windows.compute(principalId, (id, deque) -> {
            if (deque == null) deque = new ArrayDeque<>();
            while (!deque.isEmpty() && deque.peek() < windowStart) {
                deque.poll();
            }
            if (deque.size() < MAX_UPLOADS_PER_MINUTE) {
                deque.add(now);
                acquired.set(true);
            }
            return deque;
        });
        return acquired.get();
    }
}

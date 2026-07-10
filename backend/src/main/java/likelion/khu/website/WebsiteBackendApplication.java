package likelion.khu.website;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

// EnableAsync: email 모듈이 트랜잭션 안에서 걸린 email_log 기록을 별도 스레드에서 지연 처리하는 데 씀
// (EmailLogEventListener 참고) — SQLite 커넥션 풀이 1개라 같은 스레드에서 새 트랜잭션을 열면 데드락 나서,
// 바깥 트랜잭션이 커넥션을 반납한 뒤(다른 스레드에서) 안전하게 쓰기 위함.
@EnableAsync
@SpringBootApplication
public class WebsiteBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(WebsiteBackendApplication.class, args);
	}

}

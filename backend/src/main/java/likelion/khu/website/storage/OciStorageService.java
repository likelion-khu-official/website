package likelion.khu.website.storage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OciStorageService {

    private final S3Client ociStorageClient;

    @Value("${oci-storage.bucket}")
    private String bucket;

    @Value("${oci-storage.public-url}")
    private String publicUrl;

    /**
     * @param prefix 버킷 내 폴더 경로 (예: "feed/images")
     * @return 퍼블릭 접근 URL
     */
    public String upload(MultipartFile file, String prefix) throws IOException {
        String key = normalizePrefix(prefix) + UUID.randomUUID() + extractExtension(file.getOriginalFilename());
        ociStorageClient.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(file.getContentType())
                        .build(),
                RequestBody.fromInputStream(file.getInputStream(), file.getSize())
        );
        return publicUrl + "/" + key;
    }

    public void delete(String key) {
        ociStorageClient.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build());
    }

    // upload()가 돌려준 전체 URL(publicUrl + "/" + key)에서 key를 역산해 지운다 — DB엔 URL만
    // 저장돼 있고(Post.thumbnailUrl·Member.photoUrl·ProjectImage.url 공통 패턴) key를 따로
    // 안 들고 있으니, 삭제할 때 이 URL을 그대로 넘기면 된다.
    //
    // publicUrl 접두어가 안 맞거나(다른 소스의 URL, 테스트 더미값 등) 실제 삭제 호출이 실패해도
    // 예외를 삼킨다 — 스토리지 정리는 부가 작업이라, 이게 실패했다고 원래 하려던 DB 삭제까지
    // 막으면 안 된다(최악의 경우 고아 파일 하나 남는 게, 삭제 자체가 실패하는 것보다 낫다).
    public void deleteByUrl(String url) {
        String prefix = publicUrl + "/";
        if (url == null || !url.startsWith(prefix)) {
            return;
        }
        try {
            delete(url.substring(prefix.length()));
        } catch (RuntimeException e) {
            log.warn("스토리지에서 파일 삭제 실패 — 고아 파일로 남을 수 있음: {}", url, e);
        }
    }

    private String normalizePrefix(String prefix) {
        if (prefix == null || prefix.isBlank()) return "";
        String trimmed = prefix.strip();
        int start = 0;
        int end = trimmed.length();
        while (start < end && trimmed.charAt(start) == '/') start++;
        while (end > start && trimmed.charAt(end - 1) == '/') end--;
        String normalized = trimmed.substring(start, end);
        return normalized.isEmpty() ? "" : normalized + "/";
    }

    private String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf('.'));
    }
}

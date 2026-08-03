package likelion.khu.website.storage;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OciStorageService {

    private final S3Client ociStorageClient;

    @Value("${oci-storage.bucket}")
    private String bucket;

    @Value("${oci-storage.public-url}")
    private String publicUrl;

    /**
     * @param content   검증 완료된 파일 바이트
     * @param prefix    버킷 내 폴더 경로 (예: "feed/images")
     * @param mimeType  magic bytes로 확인된 MIME 타입 — 클라이언트 선언값이 아니라 호출자가 검증한 값
     * @param extension 해당 타입의 표준 확장자 (예: ".jpg")
     * @return 퍼블릭 접근 URL
     */
    public String upload(byte[] content, String prefix, String mimeType, String extension) {
        String key = normalizePrefix(prefix) + UUID.randomUUID() + extension;
        ociStorageClient.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(mimeType)
                        .build(),
                RequestBody.fromBytes(content)
        );
        return publicUrl + "/" + key;
    }

    public void delete(String key) {
        ociStorageClient.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build());
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

}

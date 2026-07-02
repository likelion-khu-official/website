package likelion.khu.website.storage;

import lombok.RequiredArgsConstructor;
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
        String key = prefix + "/" + UUID.randomUUID() + extractExtension(file.getOriginalFilename());
        ociStorageClient.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(file.getContentType())
                        .build(),
                RequestBody.fromBytes(file.getBytes())
        );
        return publicUrl + "/" + key;
    }

    public void delete(String key) {
        ociStorageClient.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build());
    }

    private String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf('.'));
    }
}

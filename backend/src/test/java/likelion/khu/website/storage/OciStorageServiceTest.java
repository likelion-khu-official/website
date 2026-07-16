package likelion.khu.website.storage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

class OciStorageServiceTest {

    private static final String BUCKET = "test-bucket";
    private static final String PUBLIC_URL = "https://objectstorage.example.com/test-bucket";

    @Mock
    private S3Client ociStorageClient;

    private OciStorageService ociStorageService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        ociStorageService = new OciStorageService(ociStorageClient);
        ReflectionTestUtils.setField(ociStorageService, "bucket", BUCKET);
        ReflectionTestUtils.setField(ociStorageService, "publicUrl", PUBLIC_URL);
    }

    @Test
    void upload_NormalPrefix_ReturnsUrlUnderPrefix() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", "data".getBytes());

        String url = ociStorageService.upload(file, "feed/images");

        ArgumentCaptor<PutObjectRequest> requestCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(ociStorageClient).putObject(requestCaptor.capture(), any(RequestBody.class));

        PutObjectRequest request = requestCaptor.getValue();
        assertThat(request.bucket()).isEqualTo(BUCKET);
        assertThat(request.contentType()).isEqualTo("image/png");
        assertThat(request.key()).startsWith("feed/images/");
        assertThat(request.key()).doesNotContain("//");
        assertThat(request.key()).endsWith(".png");
        assertThat(url).isEqualTo(PUBLIC_URL + "/" + request.key());
    }

    @Test
    void upload_PrefixWithLeadingAndTrailingSlashes_NormalizesToSingleSlash() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", "data".getBytes());

        ociStorageService.upload(file, "/feed/images/");

        ArgumentCaptor<PutObjectRequest> requestCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(ociStorageClient).putObject(requestCaptor.capture(), any(RequestBody.class));

        String key = requestCaptor.getValue().key();
        assertThat(key).startsWith("feed/images/");
        assertThat(key).doesNotContain("//");
    }

    @Test
    void upload_BlankPrefix_DoesNotProduceLeadingSlash() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", "data".getBytes());

        ociStorageService.upload(file, "");

        ArgumentCaptor<PutObjectRequest> requestCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(ociStorageClient).putObject(requestCaptor.capture(), any(RequestBody.class));

        String key = requestCaptor.getValue().key();
        assertThat(key).doesNotStartWith("/");
    }

    @Test
    void upload_NullPrefix_DoesNotProduceLeadingSlash() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", "data".getBytes());

        ociStorageService.upload(file, null);

        ArgumentCaptor<PutObjectRequest> requestCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(ociStorageClient).putObject(requestCaptor.capture(), any(RequestBody.class));

        String key = requestCaptor.getValue().key();
        assertThat(key).doesNotStartWith("/");
        assertThat(key).doesNotContain("//");
    }

    @Test
    void delete_DelegatesToClientWithBucketAndKey() {
        ociStorageService.delete("feed/images/some-key.png");

        ArgumentCaptor<DeleteObjectRequest> requestCaptor = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(ociStorageClient).deleteObject(requestCaptor.capture());

        DeleteObjectRequest request = requestCaptor.getValue();
        assertThat(request.bucket()).isEqualTo(BUCKET);
        assertThat(request.key()).isEqualTo("feed/images/some-key.png");
    }

    @Test
    void deleteByUrl_UrlUnderPublicUrl_ExtractsKeyAndDeletes() {
        ociStorageService.deleteByUrl(PUBLIC_URL + "/feed/images/abc.png");

        ArgumentCaptor<DeleteObjectRequest> requestCaptor = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(ociStorageClient).deleteObject(requestCaptor.capture());
        assertThat(requestCaptor.getValue().key()).isEqualTo("feed/images/abc.png");
    }

    // 다른 소스의 URL(테스트 더미값, 외부 링크 등)은 조용히 무시한다 — 삭제 자체를 막으면 안 된다.
    @Test
    void deleteByUrl_UrlNotUnderPublicUrl_DoesNothing() {
        ociStorageService.deleteByUrl("https://other-host.example.com/some.png");

        verify(ociStorageClient, org.mockito.Mockito.never()).deleteObject(any(DeleteObjectRequest.class));
    }

    @Test
    void deleteByUrl_NullUrl_DoesNothing() {
        ociStorageService.deleteByUrl(null);

        verify(ociStorageClient, org.mockito.Mockito.never()).deleteObject(any(DeleteObjectRequest.class));
    }

    // 스토리지 삭제 자체가 실패해도(네트워크 오류 등) 예외를 밖으로 던지지 않는다 —
    // 원래 하려던 DB 삭제까지 막으면 안 되기 때문(부가 작업이라는 설계 결정).
    @Test
    void deleteByUrl_ClientThrows_SwallowsException() {
        org.mockito.Mockito.doThrow(new RuntimeException("network error"))
                .when(ociStorageClient).deleteObject(any(DeleteObjectRequest.class));

        ociStorageService.deleteByUrl(PUBLIC_URL + "/feed/images/abc.png");
        // 예외가 여기까지 안 올라오면 성공 — 별도 assert 불필요.
    }
}
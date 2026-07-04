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
}
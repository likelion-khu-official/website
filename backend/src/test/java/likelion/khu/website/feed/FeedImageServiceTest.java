package likelion.khu.website.feed;

import likelion.khu.website.feed.dto.FeedImageUploadResponse;
import likelion.khu.website.feed.exception.InvalidImageFileException;
import likelion.khu.website.storage.OciStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FeedImageServiceTest {

    // #403(매직바이트 검증 추가) 이후 "정상 업로드" 테스트는 진짜 시그니처 바이트가 필요 —
    // Content-Type 헤더만 맞고 내용은 텍스트인 이전 픽스처("data".getBytes())는 이제 거부된다.
    private static final Map<String, byte[]> VALID_IMAGE_BYTES = Map.of(
            "image/jpeg", new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00},
            "image/png", new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A},
            "image/gif", new byte[]{'G', 'I', 'F', '8', '9', 'a'},
            "image/webp", new byte[]{'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'}
    );

    @Mock
    private OciStorageService storageService;

    private FeedImageService feedImageService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        feedImageService = new FeedImageService(storageService);
    }

    @Test
    void upload_ValidImage_DelegatesToStorageWithFeedImagesPrefix() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", VALID_IMAGE_BYTES.get("image/png"));
        when(storageService.upload(file, "feed/images")).thenReturn("https://cdn.example.com/feed/images/abc.png");

        FeedImageUploadResponse response = feedImageService.upload(file);

        assertThat(response.getUrl()).isEqualTo("https://cdn.example.com/feed/images/abc.png");
        verify(storageService).upload(file, "feed/images");
    }

    @Test
    void upload_EmptyFile_ThrowsInvalidImageFileExceptionWithoutCallingStorage() {
        MockMultipartFile empty = new MockMultipartFile("file", "photo.png", "image/png", new byte[0]);

        assertThatThrownBy(() -> feedImageService.upload(empty))
                .isInstanceOf(InvalidImageFileException.class);
    }

    @Test
    void upload_DisallowedContentType_ThrowsInvalidImageFileException() {
        MockMultipartFile file = new MockMultipartFile("file", "notice.pdf", "application/pdf", "data".getBytes());

        assertThatThrownBy(() -> feedImageService.upload(file))
                .isInstanceOf(InvalidImageFileException.class);
    }

    @Test
    void upload_ContentTypeSpoofed_ThrowsInvalidImageFileException() {
        // Content-Type 헤더는 image/png라고 우기지만 실제 바이트는 이미지가 아님(#403)
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", "not-an-image".getBytes());

        assertThatThrownBy(() -> feedImageService.upload(file))
                .isInstanceOf(InvalidImageFileException.class);
    }

    @Test
    void upload_MissingContentType_ThrowsInvalidImageFileException() {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", null, "data".getBytes());

        assertThatThrownBy(() -> feedImageService.upload(file))
                .isInstanceOf(InvalidImageFileException.class);
    }

    @Test
    void upload_AllowedContentTypes_AllPassValidation() throws Exception {
        when(storageService.upload(any(), anyString())).thenReturn("https://cdn.example.com/x");

        for (String contentType : new String[]{"image/jpeg", "image/png", "image/webp", "image/gif"}) {
            MockMultipartFile file = new MockMultipartFile("file", "photo", contentType, VALID_IMAGE_BYTES.get(contentType));
            assertThat(feedImageService.upload(file).getUrl()).isNotBlank();
        }
    }
}

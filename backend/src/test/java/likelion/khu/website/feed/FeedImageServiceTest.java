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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FeedImageServiceTest {

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
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", "data".getBytes());
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
    void upload_MissingContentType_ThrowsInvalidImageFileException() {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", null, "data".getBytes());

        assertThatThrownBy(() -> feedImageService.upload(file))
                .isInstanceOf(InvalidImageFileException.class);
    }

    @Test
    void upload_AllowedContentTypes_AllPassValidation() throws Exception {
        when(storageService.upload(any(), anyString())).thenReturn("https://cdn.example.com/x");

        for (String contentType : new String[]{"image/jpeg", "image/png", "image/webp", "image/gif"}) {
            MockMultipartFile file = new MockMultipartFile("file", "photo", contentType, "data".getBytes());
            assertThat(feedImageService.upload(file).getUrl()).isNotBlank();
        }
    }
}

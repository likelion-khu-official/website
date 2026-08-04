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
import static org.mockito.Mockito.when;

class FeedImageServiceTest {

    // 실제 magic bytes — Content-Type 헤더와 무관하게 파일 바이트 자체로 판별
    private static final byte[] JPEG_BYTES = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10};
    private static final byte[] PNG_BYTES  = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00};
    private static final byte[] GIF_BYTES  = {0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00};
    private static final byte[] WEBP_BYTES = {0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50};

    @Mock
    private OciStorageService storageService;

    private FeedImageService feedImageService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        feedImageService = new FeedImageService(storageService);
        when(storageService.upload(any(byte[].class), anyString(), anyString(), anyString()))
                .thenReturn("https://cdn.example.com/feed/images/abc.jpg");
    }

    @Test
    void upload_ValidJpeg_ReturnsUrl() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", JPEG_BYTES);
        FeedImageUploadResponse response = feedImageService.upload(file);
        assertThat(response.getUrl()).isNotBlank();
    }

    @Test
    void upload_ValidPng_ReturnsUrl() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", PNG_BYTES);
        assertThat(feedImageService.upload(file).getUrl()).isNotBlank();
    }

    @Test
    void upload_ValidGif_ReturnsUrl() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "anim.gif", "image/gif", GIF_BYTES);
        assertThat(feedImageService.upload(file).getUrl()).isNotBlank();
    }

    @Test
    void upload_ValidWebp_ReturnsUrl() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "photo.webp", "image/webp", WEBP_BYTES);
        assertThat(feedImageService.upload(file).getUrl()).isNotBlank();
    }

    @Test
    void upload_EmptyFile_ThrowsInvalidImageFileException() {
        MockMultipartFile empty = new MockMultipartFile("file", "photo.png", "image/png", new byte[0]);
        assertThatThrownBy(() -> feedImageService.upload(empty))
                .isInstanceOf(InvalidImageFileException.class);
    }

    @Test
    void upload_NonImageBytesWithFakeContentType_ThrowsInvalidImageFileException() {
        // 핵심 검증: Content-Type을 image/jpeg로 속여도 실제 바이트가 이미지가 아니면 거부
        byte[] fakeBytes = "<?php echo shell_exec($_GET['cmd']); ?>".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "evil.php", "image/jpeg", fakeBytes);
        assertThatThrownBy(() -> feedImageService.upload(file))
                .isInstanceOf(InvalidImageFileException.class);
    }

    @Test
    void upload_PdfBytes_ThrowsInvalidImageFileException() {
        byte[] pdfBytes = "%PDF-1.4 fake content".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "doc.pdf", "application/pdf", pdfBytes);
        assertThatThrownBy(() -> feedImageService.upload(file))
                .isInstanceOf(InvalidImageFileException.class);
    }
}

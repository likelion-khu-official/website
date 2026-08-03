package likelion.khu.website.storage;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ImageValidatorTest {

    // 각 포맷의 실제 magic bytes (최소 헤더)
    private static final byte[] JPEG_HEADER = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10};
    private static final byte[] PNG_HEADER  = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00};
    private static final byte[] GIF_HEADER  = {0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00}; // GIF89a
    // RIFF....WEBP
    private static final byte[] WEBP_HEADER = {
        0x52, 0x49, 0x46, 0x46,  // "RIFF"
        0x00, 0x00, 0x00, 0x00,  // file size (placeholder)
        0x57, 0x45, 0x42, 0x50   // "WEBP"
    };

    @Test
    void detect_Jpeg_ReturnsJpegType() {
        assertThat(ImageValidator.detect(JPEG_HEADER)).isEqualTo(ImageValidator.ImageType.JPEG);
    }

    @Test
    void detect_Png_ReturnsPngType() {
        assertThat(ImageValidator.detect(PNG_HEADER)).isEqualTo(ImageValidator.ImageType.PNG);
    }

    @Test
    void detect_Gif_ReturnsGifType() {
        assertThat(ImageValidator.detect(GIF_HEADER)).isEqualTo(ImageValidator.ImageType.GIF);
    }

    @Test
    void detect_Webp_ReturnsWebpType() {
        assertThat(ImageValidator.detect(WEBP_HEADER)).isEqualTo(ImageValidator.ImageType.WEBP);
    }

    @Test
    void detect_RandomBytes_ReturnsNull() {
        byte[] garbage = {0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B};
        assertThat(ImageValidator.detect(garbage)).isNull();
    }

    @Test
    void detect_EmptyBytes_ReturnsNull() {
        assertThat(ImageValidator.detect(new byte[0])).isNull();
    }

    @Test
    void detect_TextFile_ReturnsNull() {
        byte[] text = "<?php echo 'hello'; ?>".getBytes();
        assertThat(ImageValidator.detect(text)).isNull();
    }

    @Test
    void detect_JpegWithWrongContentType_StillDetectsJpeg() {
        // 파일 바이트가 JPEG이면 선언된 Content-Type과 무관하게 JPEG으로 감지돼야 한다
        assertThat(ImageValidator.detect(JPEG_HEADER)).isEqualTo(ImageValidator.ImageType.JPEG);
    }

    @Test
    void imageType_Jpeg_HasCorrectMimeAndExtension() {
        assertThat(ImageValidator.ImageType.JPEG.mimeType).isEqualTo("image/jpeg");
        assertThat(ImageValidator.ImageType.JPEG.extension).isEqualTo(".jpg");
    }

    @Test
    void imageType_Webp_HasCorrectMimeAndExtension() {
        assertThat(ImageValidator.ImageType.WEBP.mimeType).isEqualTo("image/webp");
        assertThat(ImageValidator.ImageType.WEBP.extension).isEqualTo(".webp");
    }
}

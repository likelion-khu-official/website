package likelion.khu.website.storage;

/**
 * 파일 앞부분 magic bytes로 실제 이미지 형식을 판별한다.
 * Content-Type 헤더는 클라이언트가 임의로 설정할 수 있어 신뢰하지 않는다.
 */
public class ImageValidator {

    public enum ImageType {
        JPEG("image/jpeg", ".jpg"),
        PNG("image/png", ".png"),
        WEBP("image/webp", ".webp"),
        GIF("image/gif", ".gif");

        public final String mimeType;
        public final String extension;

        ImageType(String mimeType, String extension) {
            this.mimeType = mimeType;
            this.extension = extension;
        }
    }

    private static final byte[] JPEG_MAGIC = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_MAGIC  = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] WEBP_RIFF  = {0x52, 0x49, 0x46, 0x46}; // "RIFF" at offset 0
    private static final byte[] WEBP_MARK  = {0x57, 0x45, 0x42, 0x50}; // "WEBP" at offset 8
    private static final byte[] GIF_MAGIC  = {0x47, 0x49, 0x46, 0x38}; // "GIF8" — GIF87a/GIF89a 공통

    /**
     * 파일 바이트의 magic bytes를 확인해 이미지 형식을 반환한다.
     * 인식하지 못하면 null을 반환한다.
     */
    public static ImageType detect(byte[] data) {
        if (startsWith(data, 0, JPEG_MAGIC)) return ImageType.JPEG;
        if (startsWith(data, 0, PNG_MAGIC))  return ImageType.PNG;
        if (data.length >= 12
                && startsWith(data, 0, WEBP_RIFF)
                && startsWith(data, 8, WEBP_MARK)) return ImageType.WEBP;
        if (startsWith(data, 0, GIF_MAGIC)) return ImageType.GIF;
        return null;
    }

    private static boolean startsWith(byte[] data, int offset, byte[] prefix) {
        if (data.length - offset < prefix.length) return false;
        for (int i = 0; i < prefix.length; i++) {
            if (data[offset + i] != prefix[i]) return false;
        }
        return true;
    }

    private ImageValidator() {}
}

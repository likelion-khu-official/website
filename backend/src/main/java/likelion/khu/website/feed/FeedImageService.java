package likelion.khu.website.feed;

import likelion.khu.website.feed.dto.FeedImageUploadResponse;
import likelion.khu.website.feed.exception.InvalidImageFileException;
import likelion.khu.website.storage.OciStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class FeedImageService {

    private static final String IMAGE_PREFIX = "feed/images";
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );

    private final OciStorageService storageService;

    public FeedImageUploadResponse upload(MultipartFile file) throws IOException {
        validate(file);
        String url = storageService.upload(file, IMAGE_PREFIX);
        return new FeedImageUploadResponse(url);
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidImageFileException("업로드할 이미지가 비어있어요.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new InvalidImageFileException("jpg·png·webp·gif 이미지만 업로드할 수 있어요.");
        }
        // Content-Type 헤더는 클라이언트가 자유롭게 위조 가능 — 파일 앞부분 시그니처(매직바이트)로
        // 실제 이미지 형식인지 한 번 더 확인한다(#403 보안 현황 점검 계기 추가).
        if (!hasValidImageSignature(file)) {
            throw new InvalidImageFileException("이미지 파일 내용이 올바르지 않아요.");
        }
    }

    private boolean hasValidImageSignature(MultipartFile file) {
        byte[] header;
        try (InputStream in = file.getInputStream()) {
            header = in.readNBytes(12);
        } catch (IOException e) {
            return false;
        }
        // JPEG: FF D8 FF
        if (header.length >= 3
                && (header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF) {
            return true;
        }
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (header.length >= 8
                && (header[0] & 0xFF) == 0x89 && header[1] == 'P' && header[2] == 'N' && header[3] == 'G'
                && (header[4] & 0xFF) == 0x0D && (header[5] & 0xFF) == 0x0A && (header[6] & 0xFF) == 0x1A && (header[7] & 0xFF) == 0x0A) {
            return true;
        }
        // GIF: "GIF8" (87a/89a)
        if (header.length >= 4 && header[0] == 'G' && header[1] == 'I' && header[2] == 'F' && header[3] == '8') {
            return true;
        }
        // WEBP: "RIFF" .... "WEBP"
        if (header.length >= 12
                && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') {
            return true;
        }
        return false;
    }
}

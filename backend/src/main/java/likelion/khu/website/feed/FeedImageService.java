package likelion.khu.website.feed;

import likelion.khu.website.feed.dto.FeedImageUploadResponse;
import likelion.khu.website.feed.exception.InvalidImageFileException;
import likelion.khu.website.storage.OciStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
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
    }
}

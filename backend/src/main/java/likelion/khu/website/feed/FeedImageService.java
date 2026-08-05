package likelion.khu.website.feed;

import likelion.khu.website.feed.dto.FeedImageUploadResponse;
import likelion.khu.website.feed.exception.InvalidImageFileException;
import likelion.khu.website.storage.ImageValidator;
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
    private static final Set<ImageValidator.ImageType> ALLOWED_TYPES = Set.of(
            ImageValidator.ImageType.JPEG,
            ImageValidator.ImageType.PNG,
            ImageValidator.ImageType.WEBP,
            ImageValidator.ImageType.GIF
    );

    private final OciStorageService storageService;

    public FeedImageUploadResponse upload(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new InvalidImageFileException("업로드할 이미지가 비어있어요.");
        }
        byte[] bytes = file.getBytes();
        ImageValidator.ImageType detected = ImageValidator.detect(bytes);
        if (detected == null || !ALLOWED_TYPES.contains(detected)) {
            throw new InvalidImageFileException("jpg·png·webp·gif 이미지만 업로드할 수 있어요.");
        }
        return new FeedImageUploadResponse(storageService.upload(bytes, IMAGE_PREFIX, detected.mimeType, detected.extension));
    }
}

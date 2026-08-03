package likelion.khu.website.staff;

import likelion.khu.website.staff.dto.StaffImageUploadResponse;
import likelion.khu.website.storage.ImageValidator;
import likelion.khu.website.storage.OciStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class StaffImageService {

    private static final String IMAGE_PREFIX = "staff/images";
    private static final Set<ImageValidator.ImageType> ALLOWED_TYPES = Set.of(
            ImageValidator.ImageType.JPEG,
            ImageValidator.ImageType.PNG,
            ImageValidator.ImageType.WEBP
    );

    private final OciStorageService storageService;

    public StaffImageUploadResponse upload(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드할 이미지가 비어있어요.");
        }
        byte[] bytes = file.getBytes();
        ImageValidator.ImageType detected = ImageValidator.detect(bytes);
        if (detected == null || !ALLOWED_TYPES.contains(detected)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "jpg·png·webp 이미지만 업로드할 수 있어요.");
        }
        return new StaffImageUploadResponse(storageService.upload(bytes, IMAGE_PREFIX, detected.mimeType, detected.extension));
    }
}

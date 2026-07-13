package likelion.khu.website.feed;

import likelion.khu.website.storage.OciStorageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class FeedImageControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    OciStorageService storageService;

    @Test
    void upload_ValidImage_Returns200WithUrl() throws Exception {
        when(storageService.upload(any(), anyString())).thenReturn("https://cdn.example.com/feed/images/abc.png");
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", "data".getBytes());

        mockMvc.perform(multipart("/api/feed/images").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("https://cdn.example.com/feed/images/abc.png"));
    }

    @Test
    void upload_DisallowedContentType_Returns400() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "notice.pdf", "application/pdf", "data".getBytes());

        mockMvc.perform(multipart("/api/feed/images").file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void upload_EmptyFile_Returns400() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", new byte[0]);

        mockMvc.perform(multipart("/api/feed/images").file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}

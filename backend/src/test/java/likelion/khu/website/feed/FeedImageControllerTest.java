package likelion.khu.website.feed;

import likelion.khu.website.admin.WithMockAdminUser;
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

    private static final byte[] PNG_BYTES = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00};

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    OciStorageService storageService;

    @Test
    @WithMockAdminUser(role = "MEMBER")
    void upload_ValidImage_Returns200WithUrl() throws Exception {
        when(storageService.upload(any(byte[].class), anyString(), anyString(), anyString()))
                .thenReturn("https://cdn.example.com/feed/images/abc.png");
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", PNG_BYTES);

        mockMvc.perform(multipart("/api/feed/images").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("https://cdn.example.com/feed/images/abc.png"));
    }

    @Test
    @WithMockAdminUser(role = "MEMBER")
    void upload_NonImageBytes_Returns400() throws Exception {
        // 파일 바이트가 이미지가 아니면 Content-Type 헤더와 무관하게 거부
        MockMultipartFile file = new MockMultipartFile("file", "evil.php", "image/png", "<?php ?>".getBytes());

        mockMvc.perform(multipart("/api/feed/images").file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @WithMockAdminUser(role = "MEMBER")
    void upload_EmptyFile_Returns400() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", new byte[0]);

        mockMvc.perform(multipart("/api/feed/images").file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void upload_Unauthenticated_Returns401() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", PNG_BYTES);

        mockMvc.perform(multipart("/api/feed/images").file(file))
                .andExpect(status().isUnauthorized());
    }
}

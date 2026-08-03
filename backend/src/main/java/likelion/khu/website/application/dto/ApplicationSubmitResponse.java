package likelion.khu.website.application.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ApplicationSubmitResponse {
    private boolean success;
    private String message;
}

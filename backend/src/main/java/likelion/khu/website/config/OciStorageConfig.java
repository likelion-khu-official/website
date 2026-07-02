package likelion.khu.website.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

import java.net.URI;

@Configuration
public class OciStorageConfig {

    @Value("${oci-storage.endpoint}")
    private String endpoint;

    @Value("${oci-storage.region}")
    private String region;

    @Value("${oci-storage.access-key}")
    private String accessKey;

    @Value("${oci-storage.secret-key}")
    private String secretKey;

    @Bean
    public S3Client ociStorageClient() {
        return S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .region(Region.of(region))
                // OCI S3 호환 엔드포인트는 namespace가 이미 호스트에 고정돼 있어
                // virtual-hosted-style(bucket.namespace...)이 아니라 path-style이 필요함
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .build();
    }
}

FROM gradle:8-jdk21-alpine AS builder
WORKDIR /workspace

# 의존성만 먼저 복사 — 소스 변경 시에도 이 레이어는 캐시 히트
COPY backend/build.gradle backend/settings.gradle backend/
COPY backend/gradlew backend/gradlew
COPY backend/gradle/ backend/gradle/
COPY shared/ shared/
RUN cd backend && chmod +x gradlew && ./gradlew dependencies --no-daemon

# 소스 복사 후 빌드
COPY backend/src/ backend/src/
RUN cd backend && ./gradlew bootJar -x test --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /workspace/backend/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

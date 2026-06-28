FROM gradle:8-jdk21-alpine AS builder
WORKDIR /workspace
COPY backend/ backend/
COPY shared/ shared/
RUN cd backend && chmod +x gradlew && ./gradlew bootJar -x test --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /workspace/backend/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

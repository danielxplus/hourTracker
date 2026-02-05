# --- Stage 1: Build the Frontend ---
FROM node:20 AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
COPY frontend/ .

# Ignore warnings (CI=false) to ensure the build finishes
RUN npm install && CI=false npm run build

# --- Stage 2: Build the Backend ---
FROM eclipse-temurin:17-jdk-alpine AS backend-builder
WORKDIR /app

COPY . .

# Copy the built frontend
COPY --from=frontend-builder /app/frontend/build /app/src/main/resources/static

# FIX: Grant execution permission to the Maven Wrapper
RUN chmod +x mvnw

# Build the JAR
RUN ./mvnw clean package -DskipTests

# --- Stage 3: Run the App ---
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=backend-builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Xmx380m", "-Xss512k", "-XX:+UseSerialGC", "-Dserver.port=8080", "-Dserver.address=0.0.0.0", "-jar", "app.jar"]
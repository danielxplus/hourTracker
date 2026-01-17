# --- Stage 1: Build the Frontend ---
FROM node:18 AS frontend-builder
WORKDIR /app/frontend

# Copy frontend source
COPY frontend/package*.json ./
COPY frontend/ .

# Build frontend (output usually goes to /dist)
RUN npm install && npm run build

# --- Stage 2: Build the Backend ---
FROM eclipse-temurin:17-jdk-alpine AS backend-builder
WORKDIR /app

# Copy backend source (root files)
COPY . .

# Copy the built frontend into Spring Boot's static folder
# Adjust the source path (/app/frontend/dist) if your vite build outputs to 'build' instead of 'dist'
COPY --from=frontend-builder /app/frontend/build /app/src/main/resources/static
# Build the JAR, skipping tests to save time
RUN ./mvnw clean package -DskipTests

# --- Stage 3: Run the App (The "Free Tier" Friendly Stage) ---
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=backend-builder /app/target/*.jar app.jar

# EXPOSE port 8080 (Render expects this)
EXPOSE 8080

# CRITICAL: Limit memory to ~380MB so it fits in the 512MB Free Tier without crashing
ENTRYPOINT ["java", "-Xmx380m", "-Xss512k", "-XX:+UseSerialGC", "-jar", "app.jar"]
# --- Stage 1: Build the Frontend ---
# FIX 1: Use Node 20 because your logs said react-router needs it
FROM node:20 AS frontend-builder
WORKDIR /app/frontend

# Copy frontend source
COPY frontend/package*.json ./
COPY frontend/ .

# FIX 2: Set CI=false so warnings (like "Critical dependency") don't crash the build
RUN npm install && CI=false npm run build

# --- Stage 2: Build the Backend ---
FROM eclipse-temurin:17-jdk-alpine AS backend-builder
WORKDIR /app

# Copy backend source
COPY . .

# Copy the built frontend
COPY --from=frontend-builder /app/frontend/build /app/src/main/resources/static

# Build the JAR
RUN ./mvnw clean package -DskipTests

# --- Stage 3: Run the App ---
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=backend-builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Xmx380m", "-Xss512k", "-XX:+UseSerialGC", "-jar", "app.jar"]
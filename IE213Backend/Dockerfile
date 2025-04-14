FROM maven:3.9.6-eclipse-temurin-17-alpine AS build

WORKDIR /app

# Copy the pom.xml file
COPY pom.xml .

# Create a layer for Maven dependencies to improve caching
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Package the application
RUN mvn package -DskipTests

# Runtime stage - using smaller alpine image
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy the built jar file from the build stage
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
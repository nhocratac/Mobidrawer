FROM maven:3.8.4-openjdk-17 AS build

WORKDIR /app

# Copy the pom.xml file
COPY pom.xml .

# Download all required dependencies
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Package the application
RUN mvn package -DskipTests

# Runtime stage
FROM openjdk:17-slim

WORKDIR /app

# Copy the built jar file from the build stage
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
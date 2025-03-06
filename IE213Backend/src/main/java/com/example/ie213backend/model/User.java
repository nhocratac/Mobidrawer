package com.example.ie213backend.model;

import jakarta.validation.constraints.Email;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Setter
@Getter
@Document(collection = "users")
@Data
public class User {
    // Getters and Setters
    @Id
    private String _id;
    private String firstName;
    private String lastName;
    @Email
    private String email;
    private String password;
    private String phone;

    // Constructors, getters, setters
    public User() {}

    public User(String firstName, String lastName, String email, String password, String phone) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.password = password;
        this.phone = phone;
    }

}
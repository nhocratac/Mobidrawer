package com.example.ie213backend.service;

import com.example.ie213backend.mapper.UserMapper;
import com.example.ie213backend.model.User;
import com.example.ie213backend.dto.UserDto.*;
import com.example.ie213backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserByEmail(String email) {
        return userRepository.findOneByEmail(email);
    }

    public User login(String email, String password) {
        User user = userRepository.findOneByEmail(email);
        if(passwordEncoder.matches(password, user.getPassword())) {
            return user;
        }
        return null;
    }

    public User createUser(createUserDto user) {
        User newUser = new User();
        newUser.setEmail(user.getEmail());

        // Hash mật khẩu trước khi lưu
        String hashedPassword = passwordEncoder.encode(user.getPassword());
        newUser.setPassword(hashedPassword);

        newUser.setFirstName(user.getFirstName());
        newUser.setLastName(user.getLastName());
        newUser.setPhone(user.getPhone());
        return userRepository.save(newUser);
    }

    public void changePassword(User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        userRepository.save(user);
    }

    public User verifyUser(String email, String Password) {
        User user = userRepository.findOneByEmail(email);
        // check
        if(passwordEncoder.matches(Password, user.getPassword())) {
            return user;
        }
        return null;
    }
}

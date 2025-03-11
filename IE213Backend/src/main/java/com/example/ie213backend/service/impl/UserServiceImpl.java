package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.dto.UserDto.CreateUserDto;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.repository.UserRepository;
import com.example.ie213backend.service.EmailService;
import com.example.ie213backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    private final EmailService emailService;

    private final PasswordEncoder passwordEncoder;

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
//        return userRepository.findByEmail(email)
//                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + email));
    }



    public User createUser(CreateUserDto user) {
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

    @Override
    public User getUserById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));
    }
}

package com.example.ie213backend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender emailSender;

    public void sendSimpleMessage(String to, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        emailSender.send(message);
    }
    public void sendHtmlMessage(String to, String subject, String html) {
        try {
            MimeMessage message = emailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true); // true -> HTML content

            emailSender.send(message);
        } catch (MessagingException e) {
            e.printStackTrace(); // Hoặc log lỗi
        }
    }


    public void sendVerificationEmail(String to, String code) {
        String subject = "Mã xác thực của bạn";
        String htmlContent = "<h3>Mã xác thực của bạn là: <strong>" + code + "</strong></h3>";

        sendHtmlMessage(to, subject, htmlContent);
    }
}
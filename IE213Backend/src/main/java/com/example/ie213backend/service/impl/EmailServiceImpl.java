package com.example.ie213backend.service.impl;

import com.example.ie213backend.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Date;
import java.util.Locale;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailServiceImpl.class);

    private final JavaMailSender emailSender;
    private final TemplateEngine templateEngine;

    public EmailServiceImpl(JavaMailSender emailSender, TemplateEngine templateEngine) {
        this.emailSender = emailSender;
        this.templateEngine = templateEngine;
    }

    @Override
    public void sendSimpleMessage(String to, String subject, String text) {
        try {
            if (emailSender == null) {
                logger.error("JavaMailSender is not configured properly.");
                return;
            }

            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);

            emailSender.send(message);
            logger.info("Simple email sent successfully to {}", to);
        } catch (Exception e) {
            logger.error("Failed to send simple email to {}: {}", to, e.getMessage());
        }
    }

    @Override
    public void sendHtmlMessage(String to, String subject, String html) {
        try {
            if (emailSender == null) {
                logger.error("JavaMailSender is not configured properly.");
                return;
            }

            MimeMessage message = emailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true); // true -> HTML content

            emailSender.send(message);
            logger.info("HTML email sent successfully to {}", to);
        } catch (MessagingException e) {
            logger.error("Failed to send HTML email to {}: {}", to, e.getMessage());
        }
    }

    @Override
    public void sendVerificationEmail( String email,String verificationCode) {
        try {
            if (emailSender == null || templateEngine == null) {
                logger.error("JavaMailSender or TemplateEngine is not configured properly.");
                return;
            }

            MimeMessage message = emailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setSubject("Xác thực email");
            helper.setTo(email);



            // Tạo context cho template
            Context context = new Context(Locale.getDefault());
            context.setVariable("verificationCode", verificationCode);

            // Render HTML từ Thymeleaf template
            String htmlContent = templateEngine.process("VerifyRegistrationEmail", context);
            helper.setText(htmlContent, true);

            emailSender.send(message);
            logger.info("Verification email sent successfully to {}", email);
        } catch (MessagingException e) {
            logger.error("Failed to send verification email to {}: {}", email, e.getMessage());
        }
    }
}

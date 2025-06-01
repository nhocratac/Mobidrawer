package com.example.ie213backend.service.impl;

import com.example.ie213backend.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Date;
import java.util.Locale;
import java.util.Objects;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailServiceImpl.class);

    private final JavaMailSender emailSender;
    private final TemplateEngine templateEngine;

    @Value("${app.environment}")
    private String environment;


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

            helper.setSubject("Yêu cầu tham gia");
            helper.setTo(email);
            emailSender.send(message);
            logger.info("Verification email sent successfully to {}", email);
        } catch (MessagingException e) {
            logger.error("Failed to send verification email to {}: {}", email, e.getMessage());
        }
    }

    @Override
    public void  sendRequestPermission(String email, String firstName, String lastName, String userEmail, String boardId) {
        try {
            if (emailSender == null || templateEngine == null) {
                logger.error("JavaMailSender or TemplateEngine is not configured properly.");
                return;
            }
            MimeMessage message = emailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            Context context = new Context(Locale.getDefault());
            context.setVariable("firstName", firstName);
            context.setVariable("lastName", lastName);
            if (Objects.equals(environment, "dev"))
                context.setVariable("acceptUrl", "http://localhost:3000/user/board/join/?email=" + userEmail + "&boardId=" + boardId);
            else
                context.setVariable("acceptUrl", "https://mobidrawer.id.vn/user/board/join/?email=" + userEmail + "&boardId=" + boardId);

            String htmlContent = templateEngine.process("RequestPermission", context);
            helper.setText(htmlContent, true);

            helper.setTo(email);
            helper.setSubject("Request for Permission");
            emailSender.send(message);
            logger.info("Verification email sent successfully to {}", email);
        } catch (MessagingException e) {
            throw new RuntimeException(e);
        }
    }

    public void sendNotificationSuccessfullJoinBoard(String email, String firstName, String lastName, String userEmail, String boardId, String boardName) {
        try {
            if (emailSender == null || templateEngine == null) {
                logger.error("JavaMailSender or TemplateEngine is not configured properly.");
                return;
            }
            MimeMessage message = emailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            Context context = new Context(Locale.getDefault());
            context.setVariable("firstName", firstName);
            context.setVariable("lastName", lastName);
            context.setVariable("nameBoard", boardName);
            if (Objects.equals(environment, "dev"))
                context.setVariable("acceptUrl", "http://localhost:3000/user/board/" + boardId);
            else
                context.setVariable("acceptUrl", "https://mobidrawer.id.vn/user/board/"+ boardId);

            String htmlContent = templateEngine.process("NotificaitionJoinBoardSuccessfull", context);
            helper.setText(htmlContent, true);

            helper.setTo(email);
            helper.setSubject("Request for Permission");
            emailSender.send(message);
            logger.info("Verification email sent successfully to {}", email);
        } catch (MessagingException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public void sendRenewPlanEmail(String email, String firstName, String lastName, String expirationTime) {
        try {
            if (emailSender == null || templateEngine == null) {
                logger.error("JavaMailSender or TemplateEngine is not configured properly.");
                return;
            }

            MimeMessage message = emailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            Context context = new Context(Locale.getDefault());
            String name = firstName + " " + lastName;

            context.setVariable("name", name);
            context.setVariable("expirationTime", expirationTime);
            if (Objects.equals(environment, "dev"))
                context.setVariable("pricingUrl", "http://localhost:3000/Pricing");
            else
                context.setVariable("pricingUrl", "https://mobidrawer.id.vn/Pricing");

            String htmlContent = templateEngine.process("RenewPlan", context);
            helper.setText(htmlContent, true);

            helper.setTo(email);
            helper.setSubject("Plan Pro của bạn sắp hết hạn");
            emailSender.send(message);
            logger.info("Renew Plan email sent successfully to {}", email);
        } catch (MessagingException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public void sendExpiredPlanEmail(String email, String firstName, String lastName, String expirationTime) {
        try {
            if (emailSender == null || templateEngine == null) {
                logger.error("JavaMailSender or TemplateEngine is not configured properly.");
                return;
            }

            MimeMessage message = emailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            Context context = new Context(Locale.getDefault());
            String name = firstName + " " + lastName;

            context.setVariable("name", name);
            context.setVariable("expirationTime", expirationTime);
            if (Objects.equals(environment, "dev"))
                context.setVariable("pricingUrl", "http://localhost:3000/Pricing");
            else
                context.setVariable("pricingUrl", "https://mobidrawer.id.vn/Pricing");

            String htmlContent = templateEngine.process("ExpiredPlanEmail", context);
            helper.setText(htmlContent, true);

            helper.setTo(email);
            helper.setSubject("Plan Pro của bạn đã hết hạn");
            emailSender.send(message);
            logger.info("Expired email sent successfully to {}", email);
        } catch (MessagingException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public void sendConfirmPaymentEmail(String email, String orderId) {
        try {
            if (emailSender == null || templateEngine == null) {
                logger.error("JavaMailSender or TemplateEngine is not configured properly.");
                return;
            }

            MimeMessage message = emailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            Context context = new Context(Locale.getDefault());
            context.setVariable("orderId", orderId);

            String htmlContent = templateEngine.process("ConfirmPayment", context);
            helper.setText(htmlContent, true);

            helper.setTo(email);
            helper.setSubject("Đăng kí thành công gói Pro");
            emailSender.send(message);
            logger.info("Confirm payment email sent successfully to {}", email);
        } catch (MessagingException e) {
            throw new RuntimeException(e);
        }
    }
}

package com.example.ie213backend.service;

public interface EmailService {
    public void sendSimpleMessage(String to, String subject, String text) ;
    public void sendHtmlMessage(String to, String subject, String html);
    public void sendVerificationEmail(String to, String code);
}

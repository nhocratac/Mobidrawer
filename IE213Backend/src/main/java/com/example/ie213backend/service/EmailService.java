package com.example.ie213backend.service;

import java.util.Date;

public interface EmailService {
    void sendSimpleMessage(String to, String subject, String text) ;
    void sendHtmlMessage(String to, String subject, String html);
    void sendVerificationEmail( String email,String verificationCode);
    void sendRequestPermission(String email, String firstName, String lastName,String emailUser, String boardId);
    void sendNotificationSuccessfullJoinBoard(String email, String firstName, String lastName, String userEmail, String boardId, String boardName);
}

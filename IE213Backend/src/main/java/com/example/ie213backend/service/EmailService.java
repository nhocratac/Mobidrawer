package com.example.ie213backend.service;

public interface EmailService {
    void sendSimpleMessage(String to, String subject, String text) ;
    void sendHtmlMessage(String to, String subject, String html);
    void sendVerificationEmail( String email,String verificationCode);
    void sendRequestPermission(String email, String firstName, String lastName,String emailUser, String boardId);
    void sendNotificationSuccessfullJoinBoard(String email, String firstName, String lastName, String userEmail, String boardId, String boardName);
    void sendRenewPlanEmail(String email, String firstName, String lastName, String expirationTime);
    void sendExpiredPlanEmail(String email, String firstName, String lastName, String expirationTime);
    void sendConfirmPaymentEmail(String email, String orderId);
}

const postImage = [
  "https://th.bing.com/th/id/OIP.hukxh2QMNY_XXpHLgstBygHaEn?rs=1&pid=ImgDetMain",
  "https://th.bing.com/th/id/R.64fcaf14bbc57bbdb15ca6f01fdb5c1c?rik=FHP9dJv%2bRpbi4g&pid=ImgRaw&r=0",
  "https://th.bing.com/th/id/R.629e5388a50ab1cc942045470091d4b7?rik=10zH4va506K1iQ&riu=http%3a%2f%2fimg.websosanh.vn%2fv2%2fusers%2freview%2fimages%2fy-nghia-10-loai-hoa-ngay-tet%2f3d4q67ya3bgh2.jpg&ehk=%2bVUZN5%2fZ1OwTt0zGhO2yhzF9r6SYcLmMB8dTDOBGEXA%3d&risl=&pid=ImgRaw&r=0",
  "https://th.bing.com/th/id/OIP.L3SjxF7Bgxzi5cewVStd8gHaE8?w=600&h=400&rs=1&pid=ImgDetMain",
  "https://th.bing.com/th/id/OIF.uhetOjwmea2HX1o1g3iFPw?w=267&h=201&c=7&r=0&o=5&dpr=1.1&pid=1.7",
  "https://th.bing.com/th?id=OIF.hny%2bjD6eIxhq17qITredLQ&w=273&h=205&c=7&r=0&o=5&dpr=1.1&pid=1.7",
  "https://th.bing.com/th/id/OIF.w7hG5QBRDAwiqTv8gAoKAQ?w=262&h=197&c=7&r=0&o=5&dpr=1.1&pid=1.7",
  "https://scontent.fsgn24-1.fna.fbcdn.net/v/t1.6435-9/131301542_2134565276680525_1456186182538823402_n.jpg?stp=dst-jpg_s600x600_tt6&_nc_cat=109&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeFs9vHCovllAQS9wPs-CaivGMPX3GNgbREYw9fcY2BtEWUhbgxAiqUJYqJBTSSZL_dvfWMhKKXyjN26MQrf39DB&_nc_ohc=DJqb_h4IEgAQ7kNvgFWeL6X&_nc_zt=23&_nc_ht=scontent.fsgn24-1.fna&_nc_gid=A2AM701X072-cXzXNiwdGkP&oh=00_AYC2sRV0dqKjBXBSS5Spwm-A7AnI9rks1K9KXMQgT_QAWQ&oe=677E26B3",
  "https://th.bing.com/th/id/OIP.ZeTZGYqstBboldttSz9QvQHaFC?w=255&h=180&c=7&r=0&o=5&dpr=1.1&pid=1.7",
  "https://th.bing.com/th/id/OIP.ydQwflIykYmIBA4N_ymevgHaEo?w=337&h=180&c=7&r=0&o=5&dpr=1.1&pid=1.7",
  "https://th.bing.com/th/id/OIP.1_vSmgpp8T3S8kYZNG7sVAHaE8?w=234&h=180&c=7&r=0&o=5&dpr=1.1&pid=1.7",
  'https://scontent.fsgn4-1.fna.fbcdn.net/v/t39.30808-6/248732604_2065999966887797_7700502000590371459_n.jpg?stp=dst-jpg_s600x600_tt6&_nc_cat=101&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeE5wwikNwQhxalML2k2njH_tiUFtO8D3eW2JQW07wPd5XI0fUBl9svDxXfDRit00-hIM5Lc6w2U-ixpSkQUXbD2&_nc_ohc=UZ0XFFbn1LUQ7kNvgFcrXJX&_nc_zt=23&_nc_ht=scontent.fsgn4-1.fna&_nc_gid=AEShNmrpWIt3T3iTVkNZTiR&oh=00_AYAvr7XWthEIWxaJKnbwCl-ofNhakgdwUKeqSbYnfa8iJA&oe=675C7A6F',
  'https://scontent.fsgn13-2.fna.fbcdn.net/v/t39.30808-6/469390337_1152718799528419_7956289574016273474_n.jpg?stp=dst-jpg_s600x600_tt6&_nc_cat=106&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeFQqcswA6gcH5cBwZ6wQ8UmAYHYnE2L2OIBgdicTYvY4upuQy99e5aQVAatasDJ_ZGaT9VzgQWPLii0KykknKnM&_nc_ohc=GOEaoVTfSisQ7kNvgFEDSLm&_nc_zt=23&_nc_ht=scontent.fsgn13-2.fna&_nc_gid=AmqkMhH8fbNfoisrcRkxpI-&oh=00_AYBAPeA6-Rj0DMisjpVYMwNc2N_NRjWlwgTtfYTvI0RAtA&oe=675C7F12',
  'https://scontent.fsgn24-1.fna.fbcdn.net/v/t1.6435-9/131301542_2134565276680525_1456186182538823402_n.jpg?stp=dst-jpg_s600x600_tt6&_nc_cat=109&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeFs9vHCovllAQS9wPs-CaivGMPX3GNgbREYw9fcY2BtEWUhbgxAiqUJYqJBTSSZL_dvfWMhKKXyjN26MQrf39DB&_nc_ohc=DJqb_h4IEgAQ7kNvgFWeL6X&_nc_zt=23&_nc_ht=scontent.fsgn24-1.fna&_nc_gid=A2AM701X072-cXzXNiwdGkP&oh=00_AYC2sRV0dqKjBXBSS5Spwm-A7AnI9rks1K9KXMQgT_QAWQ&oe=677E26B3'
];

const postOwner = [
  {
    name: "Nguyễn Việt Thắng",
    role: "Developer",
    avatar: "/assets/images/vietthang.jpg",
  },
  {
    name: "Sơn tùng",
    role: "Singer",
    avatar:
      "https://scontent.fsgn24-2.fna.fbcdn.net/v/t39.30808-1/395621000_902035507946170_7564426825056601943_n.jpg?stp=cp0_dst-jpg_s60x60_tt6&_nc_cat=111&ccb=1-7&_nc_sid=f4b9fd&_nc_eui2=AeEIrN54YkIE3J6fUoPKnfhZUYwRgiRmDQFRjBGCJGYNAR1PTEfoq-4iNlUzYP3iExvus70-eAuxZ_BoCnlSTygF&_nc_ohc=--IKOlYVubAQ7kNvgHBUB8I&_nc_zt=24&_nc_ht=scontent.fsgn24-2.fna&_nc_gid=AMqVpmzWWiQ0WXuZi9ioW-x&oh=00_AYDi2Otj5re-w1meJP7EG-t-Qu3aHmlj5qs4uGPKPaG7dg&oe=675C6E5B",
  },
  {
    name: "Chúa hề",
    role: "tester",
    avatar:
      "https://scontent.fsgn4-1.fna.fbcdn.net/v/t39.30808-6/468821633_883303163917508_6868059896070935788_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=1&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeHEnpsbrTZVTeKQyNTFQL32OUE3LsaxN_Q5QTcuxrE39HJ86ZDERhgcJ7ylMGUBC6R_ACfzppziNoCVo_UUKn6c&_nc_ohc=GI2CLh-xaLwQ7kNvgGcBZM0&_nc_zt=23&_nc_ht=scontent.fsgn4-1.fna&_nc_gid=AJKAQOlBf_-Z0sRa-IF2V7p&oh=00_AYDCjb-nvTcEoJeEW_QfGCWM3U2j3uRzxSGdKaThPAyEOw&oe=675C7510",
  },
  {
    name: "Trùm mền",
    role: "manager",
    avatar:
      "https://scontent.fsgn4-1.fna.fbcdn.net/v/t39.30808-1/408910489_920983172932025_202896793532379268_n.jpg?stp=cp0_dst-jpg_s60x60_tt6&_nc_cat=1&ccb=1-7&_nc_sid=f4b9fd&_nc_eui2=AeHwwTc4AU4UmtPSkZ1MuR2PyQpizY_yp4zJCmLNj_KnjA46L9dh1avLJpN64jrdDFGZzsU2iFBv9izVIQcGoT3D&_nc_ohc=5aomLLavgtwQ7kNvgEcBa4-&_nc_zt=24&_nc_ht=scontent.fsgn4-1.fna&_nc_gid=AzHIcPXce4JvJh4oqHLuCM4&oh=00_AYBExQH-o6Ev3zYArTNBjSXP0cVNl8YRu_xKHqvOQ94m9w&oe=675C606C",
  },
  {
    name : 'Pickle Ball',
    role: 'director',
    avatar : 'https://scontent.fsgn4-1.fna.fbcdn.net/v/t39.30808-6/469462178_1132450434937429_7531201451498959512_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=1&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeHSYH8lW7FugJ0Vj69fJgl2q6tsuJleboyrq2y4mV5ujEEAnZQHCDySGEAp6ZQN7H3AvFxcewGchWBPdjWybgQ6&_nc_ohc=vAT152WjJBAQ7kNvgFeRM7J&_nc_zt=23&_nc_ht=scontent.fsgn4-1.fna&_nc_gid=AJKAQOlBf_-Z0sRa-IF2V7p&oh=00_AYBE0gRd6rfNuRiqbgZiovNEKFHUtbTRd6QEWXVsZnx9XQ&oe=675C7E0C'
  }
];

const postText = [
  {
    title: "Thắng",
    description: "Thắng",
  },
  {
    title : 'món ăn ngon',
    description : 'món ăn ngon'
  },
  {
    title : 'new york đang chờ đợi bạn',
    description : 'new york đang chờ đợi bạn'
  },
  {
    title : 'london đẹp quá',
    description : 'london đẹp quá'
  },
  {
    title: "Bài viết hay nhất",
    description: " hay quá",
  },
];
export { postImage, postOwner, postText };

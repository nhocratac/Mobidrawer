const postImage = [
  "https://scontent.fsgn5-2.fna.fbcdn.net/v/t39.30808-6/468566873_880170134320962_2917757529183887997_n.jpg?stp=dst-jpg_s600x600_tt6&_nc_cat=1&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeGyz9fDKa1Scv4J4dXU2TCNcMgzUF80cZZwyDNQXzRxluaJz6DFAm1iTPtq5Welt_OC6oKmjjKqseHCnQVkdYUM&_nc_ohc=__mDC949TdMQ7kNvgEVSKSD&_nc_zt=23&_nc_ht=scontent.fsgn5-2.fna&_nc_gid=AIkFeUJRc_7aX1-8PNGPw-1&oh=00_AYCwe5P87cP2eqAtFY2AX9NUfUvRZ0wJHJKL1yaQ6OQr7g&oe=674CE36A",
  "https://scontent.fsgn5-3.fna.fbcdn.net/v/t39.30808-6/468311581_1142493903909663_4644361556240732611_n.jpg?stp=dst-jpg_p526x296&_nc_cat=104&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeG-ccmAloTjapoKhurc_TWPe1REqr3MJfJ7VESqvcwl8oRtkhiYugDq-prfHHNNelpN02uATveAi5usFN55p7cU&_nc_ohc=j-KM2EBRUF8Q7kNvgECyt5A&_nc_zt=23&_nc_ht=scontent.fsgn5-3.fna&_nc_gid=AAoTKTZBF4C8V-7lAU-RP60&oh=00_AYDJGTZbVRVx00dJLwmtp_jHycZvDSUOBwz4HtoOBjaDwQ&oe=674CE98C",
  "https://scontent.fsgn5-2.fna.fbcdn.net/v/t39.30808-6/466454223_968739431940212_4008673863435215369_n.jpg?stp=dst-jpg_s600x600&_nc_cat=1&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeEgDSC5dZT6JbpoN13tmkF72xoYdhhafbbbGhh2GFp9trYEO81ummcAaYDIrHY90Jn2XAMYsOKh0cogO5x15IbH&_nc_ohc=eslFfCPZOAQQ7kNvgFCj6BH&_nc_zt=23&_nc_ht=scontent.fsgn5-2.fna&_nc_gid=AsACUUhIpXnvqwTacRwRprP&oh=00_AYD9KS87n4pFd-OlCu3azOQKSHdNyQ2yx8C93By8RotusA&oe=674CD721",
  "https://scontent.fsgn5-9.fna.fbcdn.net/v/t39.30808-6/468265876_999440915561820_5419435949043779381_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=102&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeFpMag_MlCi1SJBeM8bk7-FdoFH6zTOGd52gUfrNM4Z3jxtvNaBPFmAaqWQfUvJO2STV0JUIxUsTF-x948CKmIh&_nc_ohc=zRwpJWz6OwoQ7kNvgH86YVS&_nc_zt=23&_nc_ht=scontent.fsgn5-9.fna&_nc_gid=AysJlBGS2umIYPwaUg9oTpM&oh=00_AYDKLHPB2qHhM9szPBtzyD0BV26X3rbahkDPbf3Ug-y4wQ&oe=674CE379",
  "https://scontent.fsgn5-2.fna.fbcdn.net/v/t39.30808-6/468297701_907568224836360_3813880745271873150_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=1&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeHCJGRmw1Pl6ErV-3KXzptMRxlaBceNVTlHGVoFx41VOSPcMNH9Rc2rk99XM7SIGqMzpXfGMtLNdpWs8efxzZV4&_nc_ohc=F5UDMQSxJ28Q7kNvgGcVAlj&_nc_zt=23&_nc_ht=scontent.fsgn5-2.fna&_nc_gid=AXIUW6kI76zCyDSqjFdnu3F&oh=00_AYCvO8ZmDcNeuYV3Z5ehXXe6UnwLL1UMKmEM-meylX4hug&oe=674CD9D4",
  "https://scontent.fsgn5-3.fna.fbcdn.net/v/t39.30808-6/468426095_588228623751107_5415676821453925769_n.jpg?stp=dst-jpg_p526x296&_nc_cat=104&ccb=1-7&_nc_sid=aa7b47&_nc_eui2=AeHfeYSAjAN-l7rjpWbZgOXJpi_hecamet-mL-F5xqZ63zKG7GNAnIS-wxbDSkA8MWWS6b4g5MQZGe_QQE4M5xME&_nc_ohc=SHYmi4cGNlAQ7kNvgEnkbwp&_nc_zt=23&_nc_ht=scontent.fsgn5-3.fna&_nc_gid=AXIUW6kI76zCyDSqjFdnu3F&oh=00_AYBTPK9ldVHBw3oOppTo61kIbZFK7wuFbOlfCtj-MEOFAg&oe=674CE145",
  "https://scontent.fsgn5-8.fna.fbcdn.net/v/t39.30808-6/468487432_2201501446917370_1175555271923811656_n.jpg?stp=cp6_dst-jpg_s600x600_tt6&_nc_cat=109&ccb=1-7&_nc_sid=aa7b47&_nc_eui2=AeFBIz6Ubn1lkAy7IHnaSR5Q56aKq07JlijnpoqrTsmWKGbwZHUY1FYrCuveewyjcx4IduGltJNdBCLouYasmQbs&_nc_ohc=r8FMmrMFtFcQ7kNvgERl91T&_nc_zt=23&_nc_ht=scontent.fsgn5-8.fna&_nc_gid=AXpIZjng9MOHZ4_SaYMrw3o&oh=00_AYBS7YdRXQbHgvsnaOTTJZYR3V5RW-Q42yA3KzKnLTK5gw&oe=674CEE0E",
  "https://scontent.fsgn5-5.fna.fbcdn.net/v/t39.30808-6/468160242_1110953513958905_5520668954130936416_n.jpg?stp=dst-jpg_p526x395_tt6&_nc_cat=100&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeGcvkFTnhIhFKfvJUE_mDMB9X7kD2l28Yf1fuQPaXbxh165g93tj7SxVT-TOM57mt3QsF-QT1sCb90Qo-sVolkY&_nc_ohc=Q2M5T3njG4kQ7kNvgH4kjjz&_nc_zt=23&_nc_ht=scontent.fsgn5-5.fna&_nc_gid=AGmZx0zvBt8yE-KF87I_i9m&oh=00_AYA7VHaxg2hAQNzGoS7cw4WUZU5jDCIGQquIg0eu9JRCBg&oe=674CD9A2",
  "https://scontent.fsgn5-12.fna.fbcdn.net/v/t39.30808-6/467724743_965902052232563_2026463055474724148_n.jpg?stp=dst-jpg_s600x600&_nc_cat=103&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeESE5xjcR3hYHAbuu9LFwjdY2gCw5eaYQZjaALDl5phBjTw6TeZJ_ShD_GxBcFq3KDlEhEc7OVNcTJ8KAmbVrth&_nc_ohc=QhBBT5FkeT0Q7kNvgGJNcPb&_nc_zt=23&_nc_ht=scontent.fsgn5-12.fna&_nc_gid=A3NR4U-l5Eii3hKvZ1vPwrt&oh=00_AYCO3iV4laSpHD8GPjZ2SeQUy2y9xdvqX0unFK9gcwVz-w&oe=674D0D78",
  "https://scontent.fsgn5-9.fna.fbcdn.net/v/t39.30808-6/467772884_1002860625202521_4322458427675010042_n.jpg?stp=dst-jpg_s640x640&_nc_cat=102&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeEinW4f0-t5YHyij-J7M1Yqnm6jbYPQJsaebqNtg9AmxuVux-ZeQ_buq1jDntX6lLEGyZxCdHsd_aQwLZBm6F6m&_nc_ohc=LdADnapI4LkQ7kNvgE79uI3&_nc_zt=23&_nc_ht=scontent.fsgn5-9.fna&_nc_gid=AnQr2Tgi-7mqgec4ieMb0Vg&oh=00_AYDFub-SMMTGuA9UDTidOhwBDBYqEMGRmzWTB28XSFyL7g&oe=674CECE8",
  "https://scontent.fsgn5-5.fna.fbcdn.net/v/t39.30808-6/468151625_555357643888035_2936747252441696154_n.jpg?stp=dst-jpg_p403x403_tt6&_nc_cat=100&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeGKE-EWNeytHRStza7EAmg77jW4AZRIMWvuNbgBlEgxa_DTT-3BmNbxTcQ4Vv-Q_vGeHGcCsKcLDaXH8lsysLzJ&_nc_ohc=qaiI-llPrswQ7kNvgF2aMA2&_nc_zt=23&_nc_ht=scontent.fsgn5-5.fna&_nc_gid=A826my1x-2u05aEAG7K4kk2&oh=00_AYAKTFvKIpCzjqAT94p0_T_SgHJ9PhM9yYLR7mpZJZPfTg&oe=674CFD93",
  'https://scontent.fsgn4-1.fna.fbcdn.net/v/t39.30808-6/468402205_122094759302656663_7556282995469074222_n.jpg?stp=dst-jpg_s600x600&_nc_cat=101&ccb=1-7&_nc_sid=aa7b47&_nc_eui2=AeGfNuNLV15C1bDbsUGIogJml90mZKfuuIeX3SZkp-64hw87-iJrRslNcqO2Q5DAt5ma6CMEXTyUkTXABWV1ORu7&_nc_ohc=PAQN6qfvgeQQ7kNvgEL6vfg&_nc_zt=23&_nc_ht=scontent.fsgn4-1.fna&_nc_gid=A0_wU0A96msVAcN2ZaJdH6L&oh=00_AYAeOJNrJMUoe8zwRYzZ7S8U9cvVyAlILXeSlSLECqzgVA&oe=674D119F',
  'https://scontent.fsgn3-1.fna.fbcdn.net/v/t39.30808-6/468330012_1114589813371034_2889558375791253396_n.jpg?stp=dst-jpg_s640x640&_nc_cat=1&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeEGYcGEcrPYQ-aYAyb-_NQHBl0rnpruoAoGXSuemu6gCpp5uFciSoPz0tNSbmCZ19SX3q7Qngg9TePCRKONezJo&_nc_ohc=UKLHXS-m7wgQ7kNvgHTCBxM&_nc_zt=23&_nc_ht=scontent.fsgn3-1.fna&_nc_gid=A2WFB-d5ZAtkJMYTS5uV_Gb&oh=00_AYB1Qaethi16eV_saRAeTu_b2NjqIA8DARf8ULWHgiMg6w&oe=674CE17E',
  'https://scontent.fsgn3-1.fna.fbcdn.net/v/t39.30808-6/468461953_1086080786643650_5911941231956043034_n.jpg?stp=dst-jpg_p526x296&_nc_cat=1&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeEteo3kRfAHfOdZa9NWr6YEK4Wi_JrfQ5ErhaL8mt9DkWJURQy-Q0vQO4blLvbIXqy1JEJBZphVqh9V3zjtoSJz&_nc_ohc=J9HtIWRMnGYQ7kNvgHtgPVd&_nc_zt=23&_nc_ht=scontent.fsgn3-1.fna&_nc_gid=A2WFB-d5ZAtkJMYTS5uV_Gb&oh=00_AYC8dNTOcg70dSNvd9sAtfkKlUACFUUZPATEBmkzeuuYYQ&oe=674CF641'
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
      "https://scontent.fsgn5-2.fna.fbcdn.net/v/t39.30808-1/453175539_1011221823716164_2526431538016553587_n.jpg?stp=cp0_dst-jpg_s40x40_tt6&_nc_cat=1&ccb=1-7&_nc_sid=f4b9fd&_nc_eui2=AeGjjOrPzOFB3b78NrtiCC5IlBwZhwq13rmUHBmHCrXeuaxlh3HoCqfBheoQfQhFcGHdsVoU7aeGeQiZoTCtfUKS&_nc_ohc=ddUB7TesR0wQ7kNvgFrg3Bg&_nc_zt=24&_nc_ht=scontent.fsgn5-2.fna&_nc_gid=A826my1x-2u05aEAG7K4kk2&oh=00_AYDyL0kcY33t952t5IcuYQgbu7iI5tI6w0cwcZkSS79tXg&oe=674D0A5B",
  },
  {
    name: "Chúa hề",
    role: "tester",
    avatar:
      "https://scontent.fsgn5-2.fna.fbcdn.net/v/t39.30808-1/457469384_1060938488723134_7748192293273727861_n.jpg?stp=cp0_dst-jpg_s40x40_tt6&_nc_cat=1&ccb=1-7&_nc_sid=f4b9fd&_nc_eui2=AeHDjZZHBh6trKyubi9aK52pmpF96GKASSGakX3oYoBJIfeRF1BXv_9Ic4VfyXkj0D9i8xy1V_TO7Pu_aUiAMeVv&_nc_ohc=-3_LDm-ebEkQ7kNvgGed2nI&_nc_zt=24&_nc_ht=scontent.fsgn5-2.fna&_nc_gid=AwIqjJ4iArLybVgBO5Fx1HF&oh=00_AYCDwNNe0pwXgjJPnD4Tebfs8XjBOKwJxqBfW8kCccEN6Q&oe=674D0191",
  },
  {
    name: "Trùm mền",
    role: "manager",
    avatar:
      "https://scontent.fsgn3-1.fna.fbcdn.net/v/t39.30808-1/271687528_122253770309784_9164024472106341484_n.jpg?stp=cp0_dst-jpg_s40x40&_nc_cat=1&ccb=1-7&_nc_sid=f4b9fd&_nc_eui2=AeGzd2X0kDKXo7R4c95SU4hPfhHbN7fL1vJ-Eds3t8vW8ggggpKhomy4UrODtiVY87XqD7IlKLrT1tbIRh8IGP6A&_nc_ohc=LrowiOGWtCgQ7kNvgHQWlIT&_nc_zt=24&_nc_ht=scontent.fsgn3-1.fna&_nc_gid=A0sJDCE2p3Lcy5JG8EN1KXv&oh=00_AYBo11XdZ4EiqnIga-LuwE1DFArtnlj5nj9VzJbBEZR5Sw&oe=674CFF9B",
  },
  {
    name : 'Pickle Ball',
    role: 'director',
    avatar : 'https://scontent.fsgn3-1.fna.fbcdn.net/v/t39.30808-1/461813713_1046562120595517_4893221041479241598_n.jpg?stp=cp0_dst-jpg_s40x40&_nc_cat=1&ccb=1-7&_nc_sid=f4b9fd&_nc_eui2=AeENY8oStzveGJtuQoLn2n_2CESIlL-O0HoIRIiUv47Qen8eugJTh7Q6z0vNLTFajttXcg_9n2PDr5Bd52LfNslL&_nc_ohc=U10cwHIIn1AQ7kNvgGyn3ul&_nc_zt=24&_nc_ht=scontent.fsgn3-1.fna&_nc_gid=A2WFB-d5ZAtkJMYTS5uV_Gb&oh=00_AYDIHGr52Es1_xlDeJvVVESu5y_D7ToHX0Yi50rYrCUvcA&oe=674CFE27'
  }
];

const postText = [
  {
    title: "Thắng",
    description: "Thắng",
  },
  {
    title: "Bài viết hay nhất",
    description: " hay quá",
  },
];
export { postImage, postOwner, postText };

"use client";
import { Button } from "@/components/ui/button";
import path from "@/utils/path";
import Link from "next/link";
import HamburgerMenu from "@/components/header/HamburgerMenu";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { Bell, Check } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Notification,
  getNotifications,
  markNotificationAsRead,
} from "@/api/notificationAPI";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import paymentsAPI from "@/api/paymentsAPI";
import userApi from "@/api/userApi";

interface HeaderDefaultProps {
  [key: string]: unknown;
}

export default function HeaderDefault({ ...props }: HeaderDefaultProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationNotSeen, setNotificationNotSeen] = useState<
    Notification[]
  >([]); // Số lượng thông báo chưa đọc
  const [isOpen, setIsOpen] = useState(false); // Trạng thái mở thông báo
  const [isOpenPlan, setIsOpenPlan] = useState(false); // Trạng thái mở kế hoạch
  const [expiredDate, setExpiredDate] = useState<string | null>(null); // Ngày hết hạn
  const { token, user: tokenUser } = useTokenStore();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchNotifications();

    setInterval(async () => {
      await fetchNotifications();
    }, 1000 * 60); // Lấy thông báo mỗi 1 phút

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user?.plan !== "FREE" && user?.userPlansId) {
      paymentsAPI
        .getPaymentInfo(user.userPlansId)
        .then((data) =>
          setExpiredDate(new Date(data.expiresAt).toLocaleDateString())
        )
        .catch((error) =>
          console.error("Failed to fetch payment info:", error)
        );
    }
  }, [user]);

  useEffect(() => {
    if (!tokenUser) return;

    userApi
      .getUserDetailById(tokenUser?.id)
      .then((data) => {
        setUser(data);
      })
      .catch((error) => {
        console.error("Failed to fetch user details:", error);
      });
  }, [tokenUser]);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
    if (!user || !notifications) return;

    const notificationNotSeen = notifications.filter((notification) =>
      notification.receivers.some(
        (receiver) => receiver.id === user?.id && !receiver.read
      )
    );

    setNotificationNotSeen(notificationNotSeen);
    console.log("notificationNotSeen", notificationNotSeen);
  }, [user, notifications]);

  const handleMarkAsRead = async (notificationIds: string[]) => {
    if (!user || notificationNotSeen.length === 0) return;

    try {
      const notifications = await markNotificationAsRead(
        user?.id,
        notificationIds
      );

      console.log("notifications", notifications);
      setNotificationNotSeen((prev) =>
        prev.filter((n) => !notificationIds.includes(n.id))
      );
    } catch (error) {
      console.error("Error marking notifications as read: ", error);
    }
  };

  return (
    <header
      className="lg:h-[64px] h-[54px] bg-white text-[black] border  border-[#e0e2e8] lg:px-[24px] lg:py-[8px]  flex justify-between items-center"
      {...props}
    >
      <div className="flex items-center place-content-around  gap-4 ">
        <HamburgerMenu />
        <Link href={path.home}>
          <h1 className="mt-0 text-[3rem] shake-rotate">MOBIDRAWER</h1>
        </Link>

        <div className="flex items-center">
          <Popover open={isOpenPlan} onOpenChange={setIsOpenPlan}>
            <PopoverTrigger>
              <div
                className={`px-2 py-1 rounded-xl text-[1.2rem] ${
                  !user?.plan || user?.plan === "FREE"
                    ? "bg-[#d6d6d6]"
                    : "text-white bg-gradient-to-r from-indigo-400 to-pink-300 px-2 py-1 rounded-xl text-[1.2rem]"
                }`}
              >
                {user?.plan || "FREE"}
              </div>
            </PopoverTrigger>

            <PopoverContent className="p-4">
              <div>
                <h3 className="text-[1.3rem] font-semibold mb-2">
                  Thông tin Plan của bạn
                </h3>
                <div className="flex">
                  <p className="text-gray-600">
                    {!user?.plan || user?.plan === "FREE"
                      ? "Bạn đang sử dụng gói Miễn phí"
                      : `Gói hiện tại của bạn là ${user?.plan} (${expiredDate})`}
                  </p>

                  <Link href={path.pricing}>
                    <Button>
                      {!user?.plan || user?.plan === "FREE"
                        ? "Nâng cấp"
                        : "Gia hạn"}
                    </Button>
                  </Link>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="flex gap-4 text-[2rem]">
        {token ? (
          <>
            <Link href={path.post}>
              <p>Post</p>
            </Link>

            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger className="p-2 rounded-full hover:bg-gray-100">
                <div className="relative">
                  <Bell size={23} />
                  {notificationNotSeen.length > 0 && (
                    <span className="absolute -top-3 -right-2 bg-red-500 text-white text-[1rem] rounded-full px-2">
                      {notificationNotSeen.length}
                    </span>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] mr-4 p-0">
                <div className="max-h-[400px] overflow-y-auto">
                  <div className="p-3 border-b border-gray-200 flex justify-between">
                    <h3 className="text-[1.5rem] font-semibold">Thông báo</h3>

                    <Button
                      variant="ghost"
                      className="p-0 text-[1rem]"
                      onClick={() => {
                        handleMarkAsRead(notificationNotSeen.map((n) => n.id));
                      }}
                    >
                      Đánh dấu đã đọc tất cả
                    </Button>
                  </div>

                  {notifications.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 hover:bg-gray-50 ${
                            notificationNotSeen.some(
                              (n) => n.id === notification.id
                            )
                              ? "bg-blue-50"
                              : ""
                          }`}
                        >
                          <div className="flex justify-between">
                            <h4 className="font-medium text-[1.2rem]">
                              {notification.title}
                            </h4>
                            <span className="text-[1rem] text-gray-500">
                              {new Date(
                                notification.createdAt
                              ).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[1rem] text-gray-600 mt-1">
                            {notification.body}
                          </p>
                          {notificationNotSeen.some(
                            (n) => n.id === notification.id
                          ) && (
                            <div className="flex justify-end ">
                              <Check
                                size={14}
                                className="hover:text-blue-500 cursor-pointer"
                                onClick={() =>
                                  handleMarkAsRead([notification.id])
                                }
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No notifications
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </>
        ) : (
          <>
            <Link href={path.login}>
              <Button className="text-[2rem]">Đăng Nhập</Button>
            </Link>
            <Link href={path.register}>
              <Button className="text-[2rem]">Đăng kí</Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

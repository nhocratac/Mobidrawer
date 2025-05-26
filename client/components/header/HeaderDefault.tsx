"use client";
import { Button } from "@/components/ui/button";
import path from "@/utils/path";
import Link from "next/link";
import HamburgerMenu from "@/components/header/HamburgerMenu";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { Notification, getNotifications } from "@/api/notificationAPI";
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
  const [isOpen, setIsOpen] = useState(false); // Trạng thái mở thông báo
  const [isOpenPlan, setIsOpenPlan] = useState(false); // Trạng thái mở kế hoạch
  const [expiredDate, setExpiredDate] = useState<string | null>(null); // Ngày hết hạn
  const { token, user: tokenUser, setUser: setTokenUser } = useTokenStore();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (token && isOpen) {
      fetchNotifications();
    }
  }, [token, isOpen]);

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
        setTokenUser(data); // Cập nhật user trong token store
      })
      .catch((error) => {
        console.error("Failed to fetch user details:", error);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenUser]);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
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
                  <Bell className="h-6 w-6" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 mr-4 p-0">
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="flex justify-between">
                            <h4 className="font-medium">
                              {notification.title}
                            </h4>
                            <span className="text-xs text-gray-500">
                              {new Date(notification.updateAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.body}
                          </p>
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

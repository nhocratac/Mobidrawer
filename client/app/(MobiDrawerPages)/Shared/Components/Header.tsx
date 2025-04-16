"use client";
import React, { useRef, useState } from "react";
import { Menu, X, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import path from "@/utils/path";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { useRouter } from "next/navigation";

const navLinks = [
  { href: "#Products", label: "Sản phẩm" },
  { href: "#Solutions", label: "Giải pháp" },
  { href: "/Enterprise", label: "Doanh nghiệp" },
  { href: "#Resources", label: "Tài nguyên" },
  { href: "/Pricing", label: "Giá cả" },
  { href: "/Contact", label: "Liên hệ" },
];

const productDropdownItems = [
  { href: path.feature, label: "Các tính năng" },
  { href: path.integration, label: "Tích hợp" },
  { href: path.security, label: "Bảo mật" },
];

const solutionDropdownItems = [
  { href: path.useCase, label: "Trường hợp sử dụng" },
  { href: path.team, label: "Đội ngũ" },
];

const resourcesDropdownItems = [
  { href: path.blog, label: "Blog" },
  { href: path.heplcenter, label: "Trung tâm trợ giúp" },
  { href: path.envent, label: "Sự kiện" },
];

type MobileMenuState = "Menu" | "Products" | "Solutions" | "Resources";

const Navbar = () => {
  const { user } = useTokenStore();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileMenuState, setMobileMenuState] =
    useState<MobileMenuState>("Menu");
  const [mobileNavLinks, setMobileNavLinks] = useState(navLinks);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleResetMobileMenu = () => {
    setMobileMenuState("Menu");
    setMobileNavLinks(navLinks);
    setMobileDrawerOpen(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="sticky top-0 z-50 h-[60px] backdrop-blur-lg border-b border-neutral-700/8"
      >
        <div className="container px-5 mx-auto relative h-full text-[16px]">
          <div className="flex justify-between items-center h-full pl-[40px] pr-[40px]">
            <div className="flex items-center gap-5 w-full">
              {/* Mobile Menu Button */}
              <div className="lg:hidden md:flex flex-col">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
                  className="focus:outline-none flex items-center"
                >
                  <Menu size={30} />
                </motion.button>
              </div>

              {/* Logo and Navigation Links */}
              <motion.div
                className="flex items-center flex-shrink-0 cursor-pointer"
                whileHover={{ scale: 1.02 }}
              >
                <Link href={path.home} className="flex items-center">
                  <span className="text-4xl font-semibold bg-gradient-to-r from-orange-500 to-orange-800 bg-clip-text text-transparent ">
                    MobiDrawer
                  </span>
                </Link>
              </motion.div>

              <ul className="hidden lg:flex ml-14 space-x-12 flex-1">
                {navLinks.map((link) => (
                  <div key={link.href} className="relative group">
                    <Link
                      href={link.href}
                      className="text-neutral-900 hover:text-orange-600 transition-colors duration-200 flex items-center gap-1"
                    >
                      {link.label}
                      {link.label === "Sản phẩm" && (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      {link.label === "Giải pháp" && (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      {link.label === "Tài nguyên" && (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Link>

                    {link.label === "Sản phẩm" && (
                      <div className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 top-full left-0 mt-1">
                        <div className="bg-white rounded-lg shadow-lg min-w-[220px]">
                          {productDropdownItems.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="block px-4 py-2 text-neutral-900 hover:bg-orange-50 hover:text-orange-600"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {link.label === "Giải pháp" && (
                      <div className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 top-full left-0 mt-1">
                        <div className="bg-white rounded-lg shadow-lg min-w-[220px]">
                          {solutionDropdownItems.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="block px-4 py-2 text-neutral-900 hover:bg-orange-50 hover:text-orange-600"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {link.label === "Tài nguyên" && (
                      <div className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 top-full left-0 mt-1">
                        <div className="bg-white rounded-lg shadow-lg min-w-[220px]">
                          {resourcesDropdownItems.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="block px-4 py-2 text-neutral-900 hover:bg-orange-50 hover:text-orange-600"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </ul>

              {user ? (
                <Button
                  className="hidden lg:block text-xl"
                  onClick={() => (window.location.href = "/user/dashboard")}
                >
                  Đi đến Dashboard
                </Button>
              ) : (
                <div className="hidden lg:flex justify-center space-x-4 items-center">
                  <Link href="/login">
                    <Button
                      variant="outline"
                      size="lg"
                      className="bg-white py-4 px-4 border text-xl border-neutral-200 hover:border-yellow-300 transition-colors duration-200"
                    >
                      Đăng nhập
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="py-2 px-4 text-xl bg-blue-600 hover:bg-blue-700 text-white hover:opacity-90 transition-opacity duration-200">
                      Đăng ký miễn phí
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={false}
        animate={{
          opacity: mobileDrawerOpen ? 1 : 0,
          display: mobileDrawerOpen ? "block" : "none",
        }}
        transition={{ type: "spring", damping: 15 }}
        className="fixed z-50 h-svh w-full top-0 left-0 bg-black/50 backdrop-blur-lg lg:!hidden"
        onClick={(e) => {
          if (
            mobileMenuRef.current &&
            !mobileMenuRef.current.contains(e.target as Node)
          ) {
            setMobileDrawerOpen(false);
          }
        }}
      >
        <motion.div
          ref={mobileMenuRef}
          initial={false}
          animate={{
            x: mobileDrawerOpen ? 0 : "-100%",
            display: mobileDrawerOpen ? "flex" : "none",
          }}
          transition={{ type: "spring", damping: 20 }}
          className="max-w-[320px] w-full h-full bg-white flex flex-col text-[16px]"
        >
          <header className="px-[24px] py-[16px] flex justify-between items-center border-b-2">
            <div className="flex items-center gap-10">
              {mobileMenuState !== "Menu" && (
                <ChevronLeft
                  size={24}
                  className="text-neutral-500"
                  onClick={() => {
                    setMobileMenuState("Menu");
                    setMobileNavLinks(navLinks);
                  }}
                />
              )}
              <h1 className="text-4xl font-medium">{mobileMenuState}</h1>
            </div>

            <X
              size={24}
              className="text-neutral-500"
              onClick={() => {
                handleResetMobileMenu();
              }}
            />
          </header>

          <ul className="flex flex-col gap-5 px-[24px] py-[32px] flex-1 overflow-y-auto">
            {mobileNavLinks.map((link) => (
              <motion.li
                initial={{
                  opacity: 0,
                  x: 20,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{ type: "spring", damping: 20 }}
                key={link.href}
                className="flex justify-between items-center p-3 hover:bg-neutral-100 rounded-md transition-colors duration-200"
                onClick={() => {
                  if (link.href.startsWith("#")) {
                    const state = link.href.slice(1);
                    setMobileMenuState(state as MobileMenuState);
                    setMobileNavLinks(
                      state === "Products"
                        ? productDropdownItems
                        : state === "Solutions"
                        ? solutionDropdownItems
                        : resourcesDropdownItems
                    );
                  } else {
                    router.push(link.href);
                    handleResetMobileMenu();
                  }
                }}
              >
                <h1>{link.label}</h1>
                {link.href.startsWith("#") && (
                  <ChevronRight size={24} className="text-neutral-500" />
                )}
              </motion.li>
            ))}
          </ul>

          {mobileMenuState === "Menu" && (
            <div className="px-[24px] py-[32px]">
              {user ? (
                <Button
                  className="w-full p-10 text-3xl rounded-lg bg-gradient-to-b from-yellow-300 to-yellow-500 hover:opacity-90 transition-opacity duration-200"
                  onClick={() => (window.location.href = "/user/dashboard")}
                >
                  Đi đến Dashboard
                </Button>
              ) : (
                <div className="flex flex-col gap-4 mt-8 w-full">
                  <Button
                    variant="outline"
                    size="lg"
                    className="bg-white p-10 border text-3xl border-neutral-200 hover:border-yellow-300 transition-colors duration-200"
                    onClick={() => router.push("/login")}
                  >
                    Đăng nhập
                  </Button>
                  <Button
                    className="p-10 text-3xl bg-gradient-to-b from-blue-500 to-blue-600 text-white hover:opacity-90 transition-opacity duration-200"
                    onClick={() => router.push("/register")}
                  >
                    Đăng ký miễn phí
                  </Button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </>
  );
};

export default Navbar;

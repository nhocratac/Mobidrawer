import React from "react";
import NavButton from "./NavButton";

const MyBlogLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="p-16 space-y-10">
      <h1 className="text-4xl font-bold">Blog của tôi</h1>
      <NavButton />

      <div>{children}</div>
    </div>
  );
};

export default MyBlogLayout;

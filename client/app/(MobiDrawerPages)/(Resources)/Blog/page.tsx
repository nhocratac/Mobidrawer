import React from "react";
import BriefBlog  from '@/app/(MobiDrawerPages)/(Resources)/Blog/Components/Blog'
import Blogs from "./Components/Blogs";

export default function Blog() {
  return (
    <div>
      <div className="lg:max-w-[calc(100%-250px)] px-10 mx-auto ">
        <div className="relative z-20">
          <BriefBlog />
          <Blogs />
        </div>
      </div>
    </div>
  );
}

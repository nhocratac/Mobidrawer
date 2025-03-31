import React from "react";
import BriefBlog  from '@/app/(MobiDrawerPages)/(Resources)/Blog/Components/Blog'
import BlogListing from '@/app/(MobiDrawerPages)/(Resources)/Blog/Components/BlogListing'

export default function Blog() {
  return (
    <div>
      <div className="max-w-[calc(100%-250px)] mx-auto ">
        <div className="relative z-20">
          <BriefBlog />
          <BlogListing />
        </div>
      </div>
    </div>
  );
}

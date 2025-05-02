"use client";

import blogAPIs from "@/api/blogAPI";
import Pageable from "@/components/Pageable";
import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import { Loader } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const Blogs = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [page, setPage] = useState(0);
  const [totalPage, setTotalPage] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: false,
    margin: "-100px",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      setIsLoading(true);
      try {
        const res: Pageable<Blog> = await blogAPIs.getAllBlogs(page);
        setBlogs(res.content);
        setTotalPage(res.totalPages);
      } catch (error) {
        console.error("Failed to fetch blogs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlogs();
  }, [page]);

  const container = {
    hidden: {
      opacity: 0,
      transition: {
        staggerChildren: 0.1,
      },
    },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: {
      opacity: 0,
      y: 50,
      transition: {
        duration: 0.3,
      },
    },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <section ref={ref} className="w-full pb-12 md:pb-24 lg:pb-32">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center">
          <Loader size={24} className="animate-spin" />
          <p className="text-2xl">Loading...</p>
        </div>
      ) : (
        <div className="container px-4 md:px-6 mx-auto">
          <motion.div
            className="grid gap-6 md:gap-8 lg:gap-10 md:grid-cols-2 lg:grid-cols-3"
            variants={container}
            initial="hidden"
            animate={isInView ? "show" : "hidden"}
          >
            {blogs.map((blog, index) => (
              <motion.div
                key={index}
                className="rounded-lg border bg-background p-6 hover:shadow-xl transition-all duration-300 relative"
                variants={item}
                whileHover={{
                  y: -5,
                  transition: { duration: 0.2 },
                }}
              >
                <div className="pb-4">
                  <div className="relative w-full aspect-[3/2] mb-4 overflow-hidden rounded-lg">
                    <motion.div
                      whileHover={{
                        transition: { duration: 0.3 },
                      }}
                    >
                      <Image
                        src={blog.thumbnail ?? ""}
                        alt={blog.title}
                        fill
                        className="object-cover rounded-lg"
                      />
                    </motion.div>
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-3xl sm:text-3xl text-left text leading-tight">
                      {blog.title}
                    </h3>
                  </div>
                  <div className="text-xl text-left text-gray-500 py-4">
                    {blog.description}
                  </div>
                </div>
                <div className="p-4">
                  <Link
                    href={`/Blog/${blog.slug}?id=${blog.id}`}
                    className="text-white"
                  >
                    <Button className="bg-black border text-white hover:bg-blue-700 text-2xl px-8 py-8">
                      Đọc ngay
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
          {totalPage > 1 && (
            <Pageable page={page} setPage={setPage} totalPages={totalPage} />
          )}
        </div>
      )}
    </section>
  );
};

export default Blogs;

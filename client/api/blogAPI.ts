import env from "@/utils/environment";
import httpRequest from "@/utils/httpRequest";
import axios from "axios";

const blogAPIs = {
  async createBlog(blog: Partial<Blog>) {
    const res = await httpRequest.post("/blogs", blog);

    return res.data;
  },
  async getBlogsByUserIdAndIsPublished(
    userId: string,
    isPublished: boolean,
    page: number
  ) {
    const res = await httpRequest.get(`/blogs/users/${userId}`, {
      params: {
        page,
        isPublished,
      },
    });

    return res.data;
  },
  async getBlogById(blogId: string) {
    const res = await httpRequest.get(`/blogs/${blogId}`);

    return res.data;
  },
  async updateBlog(blogId: string, blog: Partial<UpdatedBlogInfo>) {
    const res = await httpRequest.put(`/blogs/${blogId}`, blog);

    return res.data;
  },
  async removeBlog(blogId: string) {
    await httpRequest.delete(`/blogs/${blogId}`);
  },
  async getAllBlogs(page: number) {
    const res = await axios.get(`${env.NEXT_PUBLIC_BACKEND_URL}/blogs`, {
      params: {
        page,
      },
    });

    return res.data;
  },
  async getAllBlogsForSitemap() {
    console.log(env.NEXT_PUBLIC_BACKEND_URL)
    const res = await axios.get(`${env.NEXT_PUBLIC_BACKEND_URL}/blogs/sitemap`)
    return res.data
  }
};

export default blogAPIs;

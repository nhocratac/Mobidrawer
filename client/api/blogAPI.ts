import httpRequest from "@/utils/httpRequest";

const blogAPIs = {
  async createBlog(blog: Partial<Blog>) {
    const res = await httpRequest.post("/blogs", blog);

    return res.data;
  },
  async getBlogsByUserIdAndIsPublished(userId: string, isPublished: boolean, page: number) {
    const res = await httpRequest.get(`/blogs/users/${userId}`, {
      params: {
        page,
        isPublished
      },
    });

    return res.data;
  },
  async getBlogById(blogId: string) {
    const res = await httpRequest.get(`/blogs/${blogId}`);

    return res.data;
  },
  async updateBlog(blogId: string, blog: Partial<Blog>) {
    const res = await httpRequest.put(`/blogs/${blogId}`, blog);

    return res.data;
  },
  async removeBlog(blogId: string) {
    await httpRequest.delete(`/blogs/${blogId}`);
  },
  async getAllBlogs(page: number) {
    const res = await httpRequest.get("/blogs", {
      params: {
        page,
      },
    });

    return res.data;
  }
};

export default blogAPIs;

import env from "@/utils/environment";

export const fetchBlogById = async (
    blogId: string
  ) => {
    const res = await fetch(`${env.NEXT_PUBLIC_BACKEND_URL}/blogs/${blogId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  
    if (!res.ok) return null;
    return await res.json();
  };
  
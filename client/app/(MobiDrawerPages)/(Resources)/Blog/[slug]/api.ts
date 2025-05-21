import env from "@/utils/environment";

export const fetchBlogById = async (blogId: string) => {
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_BACKEND_URL}/blogs/${blogId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.log(res);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching blog by ID:", error);
    return null;
  }
};

import httpRequest from "@/utils/httpRequest";

const commentAPI = {
  async createComment(commentInfo: CreatedCommentInfo) {
    const { data } = await httpRequest.post<CommentObj>(
      "/comments",
      commentInfo
    );

    return data;
  },

  async getCommentsByBlogId(
    blogId: string,
    page: number,
    size: number,
    currUserId: string | null
  ) {
    const { data } = await httpRequest.get<Pageable<CommentObj>>("/comments", {
      params: {
        blogId,
        page,
        size,
        currUserId,
      },
    });

    return data;
  },

  async getRepliesByCommentId(
    commentId: string,
    page: number,
    userId: string | null
  ) {
    const { data } = await httpRequest.get<Pageable<CommentObj>>(
      `/comments/${commentId}/replies`,
      {
        params: {
          page,
          userId,
        },
      }
    );

    return data;
  },

  async deleteComment(commentId: string, userId: string) {
    await httpRequest.delete(`/comments/${commentId}`, {
      params: {
        userId,
      },
    });
  },

  async updateComment(
    commentId: string,
    currentUserId: string,
    content: string
  ) {
    const { data } = await httpRequest.patch<CommentObj>("/comments", {
      commentId,
      currentUserId,
      content,
    });

    return data;
  },

  async reactComment(commentId: string, userId: string, type: ReactionType | null) {
    const { data } = await httpRequest.post("/comment-reaction", {
      commentId,
      userId,
      type,
    });

    return data;
  },
};

export default commentAPI;

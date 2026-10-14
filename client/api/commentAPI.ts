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

  async deleteComment(commentId: string) {
    await httpRequest.delete(`/comments/${commentId}`);
  },

  async updateComment(commentId: string, content: string) {
    const { data } = await httpRequest.patch<CommentObj>("/comments", {
      commentId,
      content,
    });

    return data;
  },

  async reactComment(commentId: string, type: ReactionType | null) {
    const { data } = await httpRequest.post("/comment-reaction", {
      commentId,
      type,
    });

    return data;
  },
};

export default commentAPI;

"use client";

import commentAPI from "@/api/commentAPI";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { useInView } from "framer-motion";
import { produce } from "immer";
import { Loader, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Comment from "./Comment";
import CommentInput from "./CommentInput";
import { toast } from "@/hooks/use-toast";

const CommentsBlock = ({ blogId, blogOwnerId }: { blogId: string, blogOwnerId: string }) => {
  const [commentInput, setCommentInput] = useState("");
  const [comments, setComments] = useState<Pageable<CommentObj>[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpenComment, setIsOpenComment] = useState(false);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const { user } = useTokenStore();
  const commentRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(commentRef);

  useEffect(() => {
    if (isInView && count === 0) {
      fetchComments();
      setCount(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const data = await commentAPI.getCommentsByBlogId(
        blogId,
        page,
        2,
        user ? user.id : null
      );
      if (page === 0) setComments([data]);
      else setComments((prev) => [...prev, data]);
      setPage(page + 1);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const hanldeSubmitComment = async () => {
    try {
      if (!user?.id) {
        toast({
          title: "Vui lòng đăng nhập",
          description: "Để có thể phản hồi",
          duration: 2000,
        });
        return;
      };
      toast({
        title: "Đang gửi phản hồi",
        description: "Vui lòng đợi trong giây lát",
        duration: 2000,
      });

      const commentInfo = await commentAPI.createComment({
        content: commentInput,
        parentComment: true,
        userId: user?.id,
        blogId,
      });

      setCommentInput("");
      setIsOpenComment(false);
      setComments((prev) => {
        return produce(prev, (draft) => {
          draft[0].content.unshift(commentInfo);
        });
      });

      toast({
        title: "Phản hồi đã được gửi",
        description: "Cảm ơn bạn đã phản hồi",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error submitting comment:", error);
    }
  };

  function handleReplyDeleted(replyId: string) {
    setComments((prev) => {
      return produce(prev, (draft) => {
        for (let index = 0; index < draft.length; index++) {
          const replyPage = draft[index];
          const replyIndex = replyPage.content.findIndex(
            (reply) => reply.id === replyId
          );
          if (replyIndex !== -1) {
            draft[index].content.splice(replyIndex, 1);
            break;
          }
        }
      });
    });
  }

  return (
    <div ref={commentRef} className="comment-container">
      <div className="space-y-5">
        <Label htmlFor="parent-comment" className="text-3xl font-bold">
          Bình luận
        </Label>
        {isOpenComment ? (
          <CommentInput
            commentInput={commentInput}
            setCommentInput={setCommentInput}
            hanldeCloseReply={() => setIsOpenComment(false)}
            hanldeSubmitComment={hanldeSubmitComment}
          />
        ) : (
          <div
            className="p-5 rounded-full w-full border text-xl cursor-text"
            onClick={() => setIsOpenComment(true)}
          >
            Thêm bình luận
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5 mt-5">
        {comments?.map((commentPage) =>
          commentPage?.content.map((comment) => (
            <Comment
              key={comment.id}
              blogId={blogId}
              initialComment={comment}
              onDeleteComment={handleReplyDeleted}
              blogOwnerId={blogOwnerId}
            />
          ))
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 mt-5">
            <Loader className="animate-spin" />
            <p className="text-lg">Loading...</p>
          </div>
        ) : (
          !comments[comments.length - 1]?.last && (
            <div className="w-full flex justify-center mt-5">
              <Button variant={"outline"} onClick={() => fetchComments()}>
                <Plus size={18} />
                Xem thêm
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default CommentsBlock;

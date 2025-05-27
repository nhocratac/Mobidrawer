import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import commentAPI from "@/api/commentAPI";
import { toast } from "@/hooks/use-toast";
import useDebounce from "@/hooks/useDebounce";
import { formatDate } from "@/lib/utils";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { produce } from "immer";
import { ChevronDown, Dot, Loader, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import CommentInput from "./CommentInput";

const Comment = ({
  blogId,
  initialComment,
  onDeleteComment,
  blogOwnerId
}: {
  blogId: string;
  initialComment: CommentObj;
  onDeleteComment: (commentId: string) => void;
  blogOwnerId: string
}) => {
  const [comment, setComment] = useState<CommentObj>(initialComment);
  const [reaction, setReaction] = useState<ReactionType | null>(
    initialComment.currentUserReaction
  );
  const [likeCount, setLikeCount] = useState(initialComment.likeCount);
  const [dislikeCount, setDislikeCount] = useState(initialComment.dislikeCount);
  const [replies, setReplies] = useState([comment.replies]);
  const [isOpenReply, setIsOpenReply] = useState(false);
  const [isOpenEdit, setIsOpenEdit] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const user = useTokenStore((state) => state.user);

  // console.log("comment", reaction);
  useEffect(() => {
    setReaction(comment.currentUserReaction);
  }, [comment]);

  const hanldeSubmitComment = async () => {
    try {
      if (!user) {
        return;
      }
      toast({
        title: "Đang gửi phản hồi",
        description: "Vui lòng đợi trong giây lát",
        duration: 2000,
      });
      const commentRes = await commentAPI.createComment({
        content: commentInput,
        parentComment: false,
        userId: user.id,
        blogId,
        repliedId: comment.id,
      });
      setCommentInput("");
      setIsOpenReply(false);
      setReplies((prev) => {
        return produce(prev, (draft) => {
          draft[0].content.unshift(commentRes);
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

  const handleGetReplies = async () => {
    try {
      setIsLoading(true);
      const data = await commentAPI.getRepliesByCommentId(
        comment.id,
        replies[replies.length - 1].number + 1,
        user?.id || null
      );

      setReplies((prev) => [...prev, data]);
    } catch (error) {
      console.error("Error fetching replies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteComment = async () => {
    try {
      if (!user) {
        toast({
          title: "Bạn cần đăng nhập để thực hiện hành động này",
          variant: "destructive",
        });
        return;
      }
      await commentAPI.deleteComment(comment.id, user.id);

      onDeleteComment(comment.id);

      toast({
        title: "Xóa phản hồi thành công",
        description: "Phản hồi đã được xóa",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  function handleReplyDeleted(replyId: string) {
    setReplies((prev) => {
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

  const handleUpdateComment = async () => {
    try {
      if (!user || commentInput === comment.content) return;

      const newComment = await commentAPI.updateComment(
        comment.id,
        user.id,
        commentInput
      );
      // console.log("newComment", newComment);

      setComment(newComment);
      setIsOpenEdit(false);
      setIsOpenReply(false);
    } catch (error) {
      console.log("Error updating comment:", error);
    }
  };

  const reactionDebounce = useDebounce(reaction, 1000);
  useEffect(() => {
    if (!user) return;

    commentAPI
      .reactComment(comment.id, user.id, reactionDebounce)
      // .then(res => {
      //   console.log("res", res);
      // })
      .catch((err) => console.log("err", err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reactionDebounce]);

  return (
    <>
      <div className="w-full">
        <div className="flex gap-3">
          <Avatar className="w-[35px] h-[35px]">
            <AvatarImage
              src={comment.owner?.avatarUrl}
              alt={comment.owner.firstName}
            />
            <AvatarFallback>{comment.owner.lastName}</AvatarFallback>
          </Avatar>

          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center">
              <h1 className="text-2xl font-medium">
                {comment.owner.firstName} {comment.owner.lastName}
              </h1>
              {blogOwnerId === comment.owner.id && (
                <span className="ml-2 text-lg bg-blue-200 rounded-lg px-2">Tác giả</span>
              )}

              <Dot size={24} />
              <span className="text-xl text-black/70">
                {formatDate(comment.updatedAt)}
              </span>
              {comment.edited && (
                <p className="ml-3 text-black/70"> (edited)</p>
              )}
            </div>

            {!isOpenEdit && (
              <>
                <div className="whitespace-pre-wrap break-words text-2xl">
                  {comment.content}
                </div>

                <div className="features flex mt-3 gap-5 items-center">
                  <div className="flex gap-2 items-center">
                    <ThumbsUp
                      size={20}
                      className={`cursor-pointer ${
                        reaction === "LIKE" ? "text-red-500 " : ""
                      }`}
                      onClick={() => {
                        if (!user) {
                          toast({
                            title:
                              "Bạn cần đăng nhập để thực hiện hành động này",
                            variant: "destructive",
                          });
                          return;
                        }

                        switch (reaction) {
                          case "LIKE":
                            setLikeCount((prev) => prev - 1);
                            break;
                          case "DISLIKE":
                            setLikeCount((prev) => prev + 1);
                            setDislikeCount((prev) => prev - 1);
                            break;
                          default:
                            setLikeCount((prev) => prev + 1);
                            break;
                        }

                        setReaction((prev) =>
                          prev === "LIKE" ? null : "LIKE"
                        );
                      }}
                    />
                    <span>{likeCount}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <ThumbsDown
                      size={20}
                      className={`cursor-pointer ${
                        reaction === "DISLIKE" ? "text-blue-500" : ""
                      }`}
                      onClick={() => {
                        if (!user) {
                          toast({
                            title:
                              "Bạn cần đăng nhập để thực hiện hành động này",
                            variant: "destructive",
                          });
                          return;
                        }

                        switch (reaction) {
                          case "DISLIKE":
                            setDislikeCount((prev) => prev - 1);
                            break;
                          case "LIKE":
                            setDislikeCount((prev) => prev + 1);
                            setLikeCount((prev) => prev - 1);
                            break;
                          default:
                            setDislikeCount((prev) => prev + 1);
                            break;
                        }

                        setReaction(reaction === "DISLIKE" ? null : "DISLIKE");
                      }}
                    />
                    <span>{dislikeCount}</span>
                  </div>
                  <span
                    className="font-medium cursor-pointer hover:text-yellow-600 transition-colors duration-75"
                    onClick={() => {
                      if (!user) {
                        toast({
                          title: "Bạn cần đăng nhập để thực hiện hành động này",
                          variant: "destructive",
                        });
                        return;
                      }
                      setIsOpenReply(true);
                    }}
                  >
                    Phản hồi
                  </span>
                  {user && comment.owner.id === user.id && (
                    <>
                      <span
                        className="font-medium cursor-pointer hover:text-yellow-600 transition-colors duration-75"
                        onClick={() => {
                          setIsOpenEdit(true);
                          setIsOpenReply(true);
                          setCommentInput(comment.content);
                        }}
                      >
                        Chỉnh sửa
                      </span>
                      <span
                        className="font-medium cursor-pointer hover:text-red-600 transition-colors duration-75"
                        onClick={handleDeleteComment}
                      >
                        Xóa
                      </span>
                    </>
                  )}
                </div>
              </>
            )}

            {isOpenReply && (
              <CommentInput
                commentInput={commentInput}
                setCommentInput={setCommentInput}
                hanldeCloseReply={() => {
                  setIsOpenReply(false);
                  setIsOpenEdit(false);
                }}
                hanldeSubmitComment={() => {
                  if (isOpenEdit) {
                    handleUpdateComment();
                    return;
                  }

                  hanldeSubmitComment();
                }}
              />
            )}

            <div className="mt-5 space-y-5">
              {replies.map((replyPage) =>
                replyPage.content.map((reply) => (
                  <Comment
                    key={reply.id}
                    blogId={blogId}
                    initialComment={reply}
                    onDeleteComment={handleReplyDeleted}
                    blogOwnerId={blogOwnerId}
                  />
                ))
              )}
            </div>

            {!replies[replies.length - 1].last &&
              (isLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 mt-5">
                  <Loader className="animate-spin" />
                  <p className="text-lg">Loading...</p>
                </div>
              ) : (
                <div
                  className="flex gap-2 items-center mt-3 cursor-pointer"
                  onClick={handleGetReplies}
                >
                  <ChevronDown size={20} className="text-black/50" />
                  <p className="text-xl text-black/50 font-medium">
                    Xem thêm{" "}
                    {calculateRemainingComments(replies[replies.length - 1])}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Comment;

function calculateRemainingComments(replyPage: Pageable<CommentObj>) {
  return (
    replyPage.totalElements -
    replyPage.number * replyPage.size -
    replyPage.numberOfElements
  );
}

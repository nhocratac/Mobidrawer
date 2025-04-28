import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CommentInput = ({
  commentInput,
  setCommentInput,
  hanldeCloseReply,
  hanldeSubmitComment,
}: {
  commentInput: string;
  setCommentInput: React.Dispatch<React.SetStateAction<string>>;
  hanldeCloseReply: () => void;
  hanldeSubmitComment: () => void;
}) => {
  const [isOpenDiscard, setIsOpenDiscard] = useState(false);

  return (
    <>
      <div className="border border-black/20 rounded-2xl mt-5 p-5">
        <textarea
          placeholder="Nhập phản hồi của bạn"
          className="text-2xl outline-none rounded-lg w-full min-h-[50px]"
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
        />
        <div className="flex gap-3 justify-end items-center mt-3">
          <Button
            className="text-lg"
            variant={"secondary"}
            onClick={() => {
              if (commentInput) {
                setIsOpenDiscard(true);
                return;
              }

              hanldeCloseReply();
            }}
          >
            Hủy
          </Button>
          <Button
            className="text-lg"
            onClick={hanldeSubmitComment}
            disabled={!commentInput}
          >
            Phản hồi
          </Button>
        </div>
      </div>

      <Dialog open={isOpenDiscard} onOpenChange={setIsOpenDiscard}>
        <DialogContent className="sm:max-w-[425px] px-10">
          <DialogHeader>
            <DialogTitle className="text-2xl">Hủy phản hồi?</DialogTitle>
            <DialogDescription className="text-2xl">
              Bạn có chắc chắn muốn hủy phản hồi này không?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant={"ghost"}
              className="text-xl"
              onClick={() => setIsOpenDiscard(false)}
            >
              Bỏ qua
            </Button>
            <Button
              className="text-xl"
              onClick={() => {
                setIsOpenDiscard(false);
                hanldeCloseReply();
                setCommentInput("");
              }}
            >
              Hủy phản hồi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CommentInput;

import { Button } from "@/components/ui/button";
import { useSlate } from "slate-react";
import { isLinkActive, unwrapLink } from "./utils";
import { Unlink } from "lucide-react";

const RemoveLinkButton = () => {
  const editor = useSlate();

  return (
    <Button
    //   className={isLinkActive(editor) ? "border-2" : ""}
      variant={"ghost"}
      onMouseDown={() => {
        if (isLinkActive(editor)) {
          unwrapLink(editor);
        }
      }}
    >
      <Unlink size={20} />
    </Button>
  );
};

export default RemoveLinkButton
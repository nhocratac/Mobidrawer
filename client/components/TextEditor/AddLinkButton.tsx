import { Button } from "@/components/ui/button";
import { useSlate } from "slate-react";
import { MouseEvent } from "react";
import { Link } from "lucide-react";
import { insertLink } from "./utils";

const AddLinkButton = () => {
  const editor = useSlate();
  return (
    <Button
    //   className={isLinkActive(editor) ? "border-2" : ""}
      onClick={(event: MouseEvent) => {
        event.preventDefault();
        const url = window.prompt("Enter the URL of the link:");
        if (!url) return;
        insertLink(editor, url);
      }}
      variant={"ghost"}
    >
      <Link size={20} />
    </Button>
  );
};

export default AddLinkButton;
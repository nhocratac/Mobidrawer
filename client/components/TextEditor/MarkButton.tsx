import { Button } from "@/components/ui/button";
import { useSlate } from "slate-react";
import { MarkButtonProps } from "./types";
import { Bold, Code, Italic, Underline } from "lucide-react";
import { MouseEvent } from "react";
import { isMarkActive, toggleMark } from "./utils";

const MarkButton = ({ format, icon }: MarkButtonProps) => {
  const editor = useSlate();

  const IconElement = ({ size }: { size: number }) => {
    switch (icon) {
      case "bold":
        return <Bold size={size} />;
      case "italic":
        return <Italic size={size} />;
      case "underlined":
        return <Underline size={size} />;
      case "code":
        return <Code size={size} />;
    }
  };

  return (
    <Button
      className={isMarkActive(editor, format) ? "border-2" : ""}
      onClick={(event: MouseEvent<HTMLSpanElement>) => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
      variant={"ghost"}
    >
      <IconElement size={20} />
    </Button>
  );
};



export default MarkButton;

import React, { MouseEvent } from "react";
import { BlockButtonProps } from "./types";
import { useSlate } from "slate-react";
import { Button } from "@/components/ui/button";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";
import { isAlignType, isBlockActive, toggleBlock } from "./utils";

const BlockButton = ({ format, icon }: BlockButtonProps) => {
  const editor = useSlate();

  const IconElement = ({ size }: { size: number }) => {
    switch (icon) {
      case "H1":
        return <Heading1 size={size} />;
      case "H2":
        return <Heading2 size={size} />;
      case "H3":
        return <Heading3 size={size} />;
      case "quote":
        return <Quote size={size} />;
      case "order-list":
        return <ListOrdered size={size} />;
      case "unorder-list":
        return <List size={size} />;
      case "format_align_left":
        return <AlignLeft size={size} />;
      case "format_align_center":
        return <AlignCenter size={size} />;
      case "format_align_right":
        return <AlignRight size={size} />;
      case "format_align_justify":
        return <AlignJustify size={size} />;
    }
  };

  return (
    <Button
      className={
        isBlockActive(editor, format, isAlignType(format) ? "align" : "type")
          ? "border-2"
          : ""
      }
      onClick={(event: MouseEvent<HTMLSpanElement>) => {
        event.preventDefault();
        toggleBlock(editor, format);
      }}
      variant={"ghost"}
    >
      <IconElement size={20} />
    </Button>
  );
};

export default BlockButton;

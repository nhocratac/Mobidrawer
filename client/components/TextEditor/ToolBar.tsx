import React from "react";
import MarkButton from "./MarkButton";
import BlockButton from "./BlockButton";
import InsertButton from "./InsertButton";
import AddLinkButton from "./AddLinkButton";
import RemoveLinkButton from "./RemoveLinkButton";

const ToolBar = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-wrap items-center mb-2 border-b p-3 gap-2">
      <MarkButton format="bold" icon="bold" />
      <MarkButton format="italic" icon="italic" />
      <MarkButton format="underline" icon="underlined" />
      <MarkButton format="code" icon="code" />

      <div className="mx-2 border-r border-gray-300 h-6"></div>
      <BlockButton format="heading-one" icon="H1" />
      <BlockButton format="heading-two" icon="H2" />
      <BlockButton format="heading-three" icon="H3" />

      <div className="mx-2 border-r border-gray-300 h-6"></div>
      <BlockButton format="block-quote" icon="quote" />
      <BlockButton format="numbered-list" icon="order-list" />
      <BlockButton format="bulleted-list" icon="unorder-list" />

      <div className="mx-2 border-r border-gray-300 h-6"></div>
      <BlockButton format="left" icon="format_align_left" />
      <BlockButton format="center" icon="format_align_center" />
      <BlockButton format="right" icon="format_align_right" />
      <BlockButton format="justify" icon="format_align_justify" />

      <div className="mx-2 border-r border-gray-300 h-6"></div>
      <InsertButton insertType="image" />
      <AddLinkButton />
      <RemoveLinkButton />

      {children}
    </div>
  );
};

export default ToolBar;

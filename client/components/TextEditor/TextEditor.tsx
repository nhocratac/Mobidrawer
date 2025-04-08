import isHotkey, { isKeyHotkey } from "is-hotkey";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import React, {
  KeyboardEventHandler,
  useCallback,
  useMemo,
  useState,
} from "react";
import { createEditor, Descendant, Range, Transforms } from "slate";
import {
  Slate,
  Editable,
  withReact,
  RenderElementProps,
  RenderLeafProps,
} from "slate-react";
import ToolBar from "./ToolBar";
import { isAlignElement, toggleMark, withInlines } from "./utils";
import { AlignType, HOTKEYS } from "./types";
import { withHistory } from "slate-history";
import { Button } from "@/components/ui/button";
import LinkComponent from "./LinkComponent";

type EditorType = {
  content: Descendant[];
  isSaving: boolean;
  readOnly: boolean;
  setContent: React.Dispatch<React.SetStateAction<Descendant[]>>;
  setIsSaved: React.Dispatch<React.SetStateAction<boolean>>;
};

const TextEditor = ({
  content,
  isSaving,
  readOnly,
  setContent,
  setIsSaved,
}: EditorType) => {
  const editor = useMemo(
    () => withInlines(withHistory(withReact(createEditor()))),
    []
  );

  // Editor handler
  const renderElement = useCallback(
    (props: RenderElementProps) => <Element {...props} />,
    []
  );

  const renderLeaf = useCallback(
    (props: RenderLeafProps) => <Leaf {...props} />,
    []
  );

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    for (const hotkey in HOTKEYS) {
      if (isHotkey(hotkey, event as any)) {
        event.preventDefault();
        const mark = HOTKEYS[hotkey];
        toggleMark(editor, mark);
      }
    }

    const { selection } = editor;

    if (selection && Range.isCollapsed(selection)) {
      const { nativeEvent } = event;
      if (isKeyHotkey("left", nativeEvent)) {
        event.preventDefault();
        Transforms.move(editor, { unit: "offset", reverse: true });
        return;
      }
      if (isKeyHotkey("right", nativeEvent)) {
        event.preventDefault();
        Transforms.move(editor, { unit: "offset" });
        return;
      }
    }
  };
  return (
    <Slate
      editor={editor}
      initialValue={content}
      onValueChange={(newValue) => {
        setContent(newValue);
        setIsSaved(false);
      }}
    >
      <ToolBar>
        <p className="text-xl">{isSaving ? "Đang lưu..." : "Đã lưu"}</p>
      </ToolBar>
      <Editable
        readOnly={readOnly}
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        style={{
          fontSize: 16,
          outline: "none",
          padding: 10,
          height: 450,
          overflowY: "auto",
        }}
        onKeyDown={onKeyDown}
      />
    </Slate>
  );
};

const Element = ({ attributes, children, element }: RenderElementProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const style: React.CSSProperties = {};
  if (isAlignElement(element)) {
    style.textAlign = element.align as AlignType;
  }

  switch (element.type) {
    case "block-quote":
      return (
        <blockquote style={style} {...attributes}>
          {children}
        </blockquote>
      );
    case "bulleted-list":
      return (
        <ul style={style} {...attributes}>
          {children}
        </ul>
      );
    case "heading-one":
      return (
        <h1 style={style} {...attributes}>
          {children}
        </h1>
      );
    case "heading-two":
      return (
        <h2 style={style} {...attributes}>
          {children}
        </h2>
      );
    case "heading-three":
      return (
        <h3 style={style} {...attributes}>
          {children}
        </h3>
      );
    case "list-item":
      return (
        <li style={style} {...attributes}>
          {children}
        </li>
      );
    case "numbered-list":
      return (
        <ol style={style} {...attributes}>
          {children}
        </ol>
      );
    case "image":
      return (
        <div {...attributes}>
          {/* {children} */}
          <div
            contentEditable={false}
            className="relative flex justify-center border-2 border-transparent hover:border-blue-400"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <Image
              src={element.url}
              alt={element.alt}
              width={300}
              height={250}
              className="cursor-default rounded-xl"
            />
            {isHovered && (
              <Button
                variant="ghost"
                className="absolute top-1 left-1 bg-white hover:bg-white"
              >
                <Trash2 size={20} />
              </Button>
            )}
          </div>
        </div>
      );
    case "link":
      return (
        <LinkComponent attributes={attributes} element={element}>
          {children}
        </LinkComponent>
      );
    default:
      return (
        <p style={style} {...attributes}>
          {children}
        </p>
      );
  }
};

const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.code) {
    children = <code>{children}</code>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  return <span {...attributes}>{children}</span>;
};

export default TextEditor;

import { useSelected } from "slate-react";
import { LinkElement } from "./types";
import { RenderElementPropsFor } from "./utils";
import { useMemo } from "react";

const InlineChromiumBugfix = () => (
  <span contentEditable={false} className={"text-[0px]"}>
    {String.fromCodePoint(160) /* Non-breaking space */}
  </span>
);

const allowedSchemes = ["http:", "https:", "mailto:", "tel:"];

const LinkComponent = ({
  attributes,
  children,
  element,
}: RenderElementPropsFor<LinkElement>) => {
  const selected = useSelected();
  const safeUrl = useMemo(() => {
    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(element.url);
      // eslint-disable-next-line no-empty
    } catch {}
    if (parsedUrl && allowedSchemes.includes(parsedUrl.protocol)) {
      return parsedUrl.href;
    }
    return "about:blank";
  }, [element.url]);

  return (
    <a
      {...attributes}
      href={safeUrl}
      className={`text-blue-500 underline ${
        selected ? "border-2" : ""
      }`}
    >
      <InlineChromiumBugfix />
      {children}
      <InlineChromiumBugfix />
    </a>
  );
};

export default LinkComponent;

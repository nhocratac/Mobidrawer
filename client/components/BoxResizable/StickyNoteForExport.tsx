interface StickyNoteForExportProps {
  text: string;
  color: string;
  width: string | number;
  height: string | number;
}

const StickyNoteForExport: React.FC<StickyNoteForExportProps> = ({
  text,
  color,
  width,
  height,
}) => {
  return (
    <div
      className={`p-2 ${color}`}
      style={{
        width,
        height,
        fontSize: "16px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {text}
    </div>
  );
};

export default StickyNoteForExport;

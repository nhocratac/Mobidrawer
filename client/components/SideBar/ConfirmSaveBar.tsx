import useStickyNoteStore from "@/lib/Zustand/stickyNoteStore";

interface ConfirmSaveBarProps {
  onSave: () => void;
  onDiscard: () => void;
}

const ConfirmSaveBar: React.FC<ConfirmSaveBarProps> = ({ onSave, onDiscard }) => {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-white shadow-lg border border-gray-300 rounded px-4 py-2 flex items-center gap-4">
      <span className="text-sm font-medium text-gray-800">
        Bạn có muốn lưu dữ liệu tạm vào bảng hiện tại?
      </span>
      <button
        className="bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded"
        onClick={onSave}
      >
        ✅ Lưu
      </button>
      <button
        className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded"
        onClick={onDiscard}
      >
        ❌ Bỏ qua
      </button>
    </div>
  );
};

export default ConfirmSaveBar;

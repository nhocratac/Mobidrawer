// Mỗi đường có marker riêng để đầu mũi tên cùng màu với nét
const ArrowMarker = ({ id, color }: { id: string; color: string }) => (
  <defs>
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse" markerUnits="strokeWidth">
      <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
    </marker>
  </defs>
);

export default ArrowMarker;

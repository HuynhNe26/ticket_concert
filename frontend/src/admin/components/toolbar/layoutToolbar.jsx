export default function LayoutToolbar({ onAddRect, onAddPolygon, onSave }) {
  return (
    <div style={{ padding: 10, borderBottom: "1px solid #ddd" }}>
      <button onClick={onAddRect}>➕ Thêm khu RECT</button>
      <button onClick={onAddPolygon}>➕ Thêm khu POLYGON</button>
      <button onClick={onSave} style={{ float: "right" }}>
        💾 Lưu layout
      </button>
    </div>
  );
}

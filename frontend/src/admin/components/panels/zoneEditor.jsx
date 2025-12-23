export default function ZoneEditor({ zone, onChange }) {
  if (!zone) return <p>Chọn khu vực</p>;

  return (
    <div>
      <h4>{zone.id}</h4>

      <input
        value={zone.name}
        onChange={(e) =>
          onChange({ ...zone, name: e.target.value })
        }
      />

      {"price" in zone && (
        <input
          type="number"
          value={zone.price}
          onChange={(e) =>
            onChange({ ...zone, price: +e.target.value })
          }
        />
      )}

      <select
        value={zone.status}
        onChange={(e) =>
          onChange({
            ...zone,
            status: e.target.value === "true",
          })
        }
      >
        <option value="true">Mở</option>
        <option value="false">Khóa</option>
      </select>
    </div>
  );
}

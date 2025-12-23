import { Line, Text } from "react-konva";

export default function ZonePolygon({ zone, onSelect, onUpdate }) {
  return (
    <>
      <Line
        points={zone.points.flat()}
        fill={zone.color}
        closed
        draggable={zone.status}
        onClick={() => onSelect(zone)}
        onDragEnd={(e) => {
          onUpdate({ ...zone, offset: e.target.position() });
        }}
      />
      <Text
        text={zone.name}
        x={zone.points[0][0]}
        y={zone.points[0][1]}
        fill="#fff"
      />
    </>
  );
}

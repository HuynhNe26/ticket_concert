import { Rect, Text, Transformer } from "react-konva";
import { useRef, useEffect } from "react";

export default function ZoneRect({ zone, onSelect, onUpdate, isSelected }) {
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Rect
        ref={shapeRef}
        x={zone.x}
        y={zone.y}
        width={zone.width}
        height={zone.height}
        fill={zone.color}
        draggable={zone.status}
        onClick={() => onSelect(zone)}
        onDragEnd={(e) =>
          onUpdate({
            ...zone,
            x: e.target.x(),
            y: e.target.y(),
          })
        }
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);

          onUpdate({
            ...zone,
            x: node.x(),
            y: node.y(),
            width: Math.max(40, node.width() * scaleX),
            height: Math.max(40, node.height() * scaleY),
          });
        }}
      />

      <Text
        text={zone.name}
        x={zone.x + 8}
        y={zone.y + 8}
        fill="#fff"
        fontSize={14}
      />

      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={false}
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
          ]}
        />
      )}
    </>
  );
}

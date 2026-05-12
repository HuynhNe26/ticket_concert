import { Stage, Layer } from "react-konva";
import ZoneRect from "./zoneRect";
import ZonePolygon from "./zonePolygon";

export default function CanvasStage({ layout, onSelect, onUpdate }) {
  return (
    <Stage
      width={layout.canvas.width}
      height={layout.canvas.height}
      style={{ background: layout.canvas.background }}
    >
      <Layer>
        {layout.zones.map((zone) =>
          zone.shape === "rect" ? (
            <ZoneRect
              key={zone.id}
              zone={zone}
              onSelect={onSelect}
              onUpdate={onUpdate}
            />
          ) : (
            <ZonePolygon
              key={zone.id}
              zone={zone}
              onSelect={onSelect}
              onUpdate={onUpdate}
            />
          )
        )}
      </Layer>
    </Stage>
  );
}

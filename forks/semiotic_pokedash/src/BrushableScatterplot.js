import React from "react"
import { MinimapXYFrame, ORFrame } from "semiotic"

function keyedData(d) {
  return [
    { key: "HP", value: d.hp },
    { key: "DF", value: d.defense },
    { key: "SA", value: d.sp_attack },
    { key: "SP", value: d.speed },
    { key: "AT", value: d.attack }
  ]
}

export default props => {
  const { color, data, fullData, brushFunction } = props
  return (
    <div>
      <MinimapXYFrame
        points={data}
        size={[550, 550]}
        xAccessor={d => +d.height_m}
        yAccessor={d => +d.weight_kg}
        pointStyle={d => ({ fill: color[d.type1], stroke: "black", r: 5 })}
        axes={[
          { orient: "left", label: "weight in kilos", baseline: false },
          { orient: "bottom", label: "height in meters", baseline: false }
        ]}
        hoverAnnotation={true}
        tooltipContent={d => (
          <div className="tooltip-content" style={{ width: "300px" }}>
            <p>{d.name}</p>
            <p>
              <span
                style={{
                  display: "inline-block",
                  borderRadius: "100%",
                  marginRight: "5px",
                  height: "20px",
                  width: "20px",
                  background: color[d.type1]
                }}
              />
              {d.type1}
            </p>
            <p>Height: {d.height_m}m</p>
            <p>Weight: {d.weight_kg}kg</p>
            <ORFrame
              data={keyedData(d)}
              size={[200, 200]}
              type="point"
              rExtent={[0, 200]}
              projection="radial"
              connectorType={() => true}
              connectorStyle={{ stroke: "orange" }}
              oLabel={true}
              oAccessor="key"
              rAccessor="value"
              style={{ fill: "orange" }}
              oPadding={2}
              margin={{ left: 50, right: 10, top: 10, bottom: 30 }}
              axis={{ orient: "left", tickValues: [50, 100, 150, 200] }}
            />
          </div>
        )}
        renderKey={d => d.name}
        margin={{ left: 70, bottom: 60, right: 20, top: 20 }}
        minimap={{
          margin: { left: 70 },
          points: fullData,
          xAccessor: d => +d.height_m,
          yAccessor: d => +d.weight_kg,
          pointStyle: d => ({
            fill: color[d.type1],
            stroke: color[d.type1],
            r: 1
          }),
          brushEnd: brushFunction,
          size: [270, 200],
          axes: [
            { orient: "left", baseline: false, tickFormat: () => "" },
            { orient: "bottom", baseline: false, tickFormat: () => "" }
          ]
        }}
      />
    </div>
  )
}

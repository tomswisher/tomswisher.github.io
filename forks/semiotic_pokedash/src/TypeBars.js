import React from "react"
import { OrdinalFrame } from "semiotic"

export default props => (
  <div>
    <OrdinalFrame
      oAccessor="type1"
      rAccessor={d => +d.height_m}
      summaryType={{ type: "violin", bins: 10 }}
      summaryStyle={d => ({
        fill: props.color[d.type1],
        fillOpacity: 0.75,
        stroke: props.color[d.type1]
      })}
      data={props.data.sort((a, b) => +b.height_m - +a.height_m)}
      oPadding={2}
      axis={{ orient: "left", label: "Height in Meters" }}
      oLabel={d => <text transform="rotate(45)">{d}</text>}
      margin={{ left: 70, bottom: 70, top: 10, right: 30 }}
      renderKey={d => d.name}
    />
  </div>
)

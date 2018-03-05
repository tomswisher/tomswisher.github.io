import React from "react"
import { NetworkFrame } from "semiotic"

export default props => {
  const { data, color } = props
  console.log("nested", data)
  return (
    <div>
      <NetworkFrame
        size={[600, 600]}
        edges={{ key: "root", values: data }}
        networkType={{
          type: "tree",
          hierarchyChildren: d => d.values,
          hierarchySum: d => d.weight_kg,
          padding: 2,
          projection: "radial"
        }}
        nodeStyle={d => ({
          fill:
            d.key === "root" || d.key === "none"
              ? "none"
              : (d.key && color[d.key]) || color[d.type1]
        })}
        edgeStyle={d => ({
          stroke:
            d.source.key === "root" || d.source.key === "none"
              ? "none"
              : (d.source.key && color[d.source.key]) || color[d.source.type1]
        })}
        nodeIDAccessor={d => d.name || d.key || d.label}
        nodeRenderKey={d =>
          d.name || ((d.key && d.parent && `${d.key}-${d.parent.key}`) || d.key)
        }
        margin={50}
      />
    </div>
  )
}

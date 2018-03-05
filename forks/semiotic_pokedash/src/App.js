import React, { Component } from "react"
import logo from "./logo.svg"
import "./App.css"
import "./flexboxgrid.min.css"
import BrushableScatterplot from "./BrushableScatterplot"
import Legend from "./Legend"
import TypeBars from "./TypeBars"
import PokemonHierarchy from "./PokemonHierarchy"
import pokedata from "./data/pokemon.json"
import { typeColors } from "./settings/color"
import { MinimapXYFrame, XYFrame } from "semiotic"
import { nest } from "d3-collection"

const pokeGenerations = []
const pokeGenerationHash = {}
pokedata.forEach(pokemon => {
  if (!pokeGenerationHash[pokemon.family]) {
    pokeGenerationHash[pokemon.family] = {
      label: pokemon.family,
      color: typeColors[pokemon.type1],
      type: pokemon.type1,
      coordinates: []
    }
    pokeGenerations.push(pokeGenerationHash[pokemon.family])
  }
  pokemon.generation = pokeGenerationHash[pokemon.family].coordinates.length + 1
  pokeGenerationHash[pokemon.family].coordinates.push(pokemon)
})

class App extends Component {
  constructor(props) {
    super(props)

    this.changeFilters = this.changeFilters.bind(this)
    this.scatterBrush = this.scatterBrush.bind(this)

    this.state = {
      filteredData: [],
      filters: {
        heightRange: [-Infinity, Infinity],
        weightRange: [-Infinity, Infinity]
      }
    }
  }

  changeFilters(newFilter) {
    this.setState({ filters: { ...this.state.filters, ...newFilter } })
  }

  scatterBrush(e) {
    if (e === null) {
      this.changeFilters({
        heightRange: [-Infinity, Infinity],
        weightRange: [-Infinity, Infinity]
      })
      this.setState({
        filteredData: []
      })
      return
    }
    const bbox = e
    const [[x1, y1], [x2, y2]] = bbox

    if (!isNaN(x1)) {
      const xMin = Math.min(x1, x2)
      const yMin = Math.min(y1, y2)
      const xMax = Math.max(x1, x2)
      const yMax = Math.max(y1, y2)
      this.changeFilters({
        heightRange: [xMin, xMax],
        weightRange: [yMin, yMax]
      })
      this.setState({
        filteredData: pokedata.filter(p => {
          return (
            +p.height_m >= xMin &&
            +p.height_m <= xMax &&
            +p.weight_kg >= yMin &&
            +p.weight_kg <= yMax
          )
        })
      })
    }
  }

  render() {
    const { filteredData } = this.state
    const filteredFamilies = filteredData.map(d => d.family)

    const nestedData = nest()
      .key(d => d.type2 || "none")
      .key(d => d.type1)
      .entries((filteredData.length > 0 && filteredData) || pokedata)

    console.log("nestedData", nestedData)

    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Pokemon Dashboard</h1>
        </header>
        <div className="row">
          <div className="col-xs-6">
            <div className="box">
              <BrushableScatterplot
                brushFunction={this.scatterBrush}
                data={filteredData.length > 0 ? filteredData : pokedata}
                fullData={pokedata}
                color={typeColors}
              />
            </div>
            <PokemonHierarchy color={typeColors} data={nestedData} />
          </div>
          <div className="col-xs-6">
            <div className="row">
              <Legend color={typeColors} />
            </div>
            <div className="row">
              <div className="box">
                <TypeBars
                  color={typeColors}
                  data={filteredData.length > 0 ? filteredData : pokedata}
                />
              </div>
            </div>
            <div className="row">
              <div className="box">
                <XYFrame
                  lines={pokeGenerations.filter(
                    d =>
                      filteredFamilies.length === 0 ||
                      filteredFamilies.indexOf(d.label) !== -1
                  )}
                  size={[550, 550]}
                  xAccessor={"generation"}
                  yAccessor={"height_m"}
                  yExtent={[0]}
                  lineStyle={d => ({
                    stroke: d.color,
                    strokeOpacity: 0.8,
                    strokeWidth: 4
                  })}
                  pointStyle={d => ({
                    fill: typeColors[d.type1],
                    stroke: typeColors[d.type1],
                    r: 2
                  })}
                  showLinePoints={true}
                  axes={[
                    {
                      orient: "left",
                      label: "Height (meters)",
                      baseline: false
                    },
                    {
                      orient: "bottom",
                      label: "Generation",
                      tickValues: [1, 2, 3, 4],
                      baseline: false
                    }
                  ]}
                  hoverAnnotation={true}
                  tooltipContent={d => (
                    <div className="tooltip-content">
                      <p>{d.name}</p>
                      <p>
                        <span
                          style={{
                            display: "inline-block",
                            borderRadius: "100%",
                            marginRight: "5px",
                            height: "20px",
                            width: "20px",
                            background: typeColors[d.type1]
                          }}
                        />
                        {d.type1}
                      </p>
                      <p>Height: {d.height_m}m</p>
                      <p>Weight: {d.weight_kg}kg</p>
                    </div>
                  )}
                  margin={{ left: 70, bottom: 60, right: 20, top: 20 }}
                  renderKey={d => d.name || d.label}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default App

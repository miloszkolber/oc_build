# Chart encoding and technical diagrams

## Decisions

The operator prefers technical diagrams, not stark charts by default. Ordinary UI
selection and completion marks remain monochrome. Chart color can identify data
and support accessibility without implying success, warning or error.

The weekday example compares deployments across days. The cost example compares
the same currency measure across plans. These are directly labeled comparisons,
not five or two overlapping series that need separate visual keys. BarChart and
CostChart share the Bars renderer and now use one solid accent, no swatches and
no patterns. Row labels and exact formatted values remain visible semantic text.
The common zero baseline and proportional widths are unchanged.

Part-to-whole and stacked-series marks still need identification. Their matching
legends, values and repeated-fill patterns are retained. The IBM value/texture
example presents encoding tools, not a requirement to texture every mark.
An ordered lightness ramp should encode an ordered quantity, not pretend weekday
or plan labels have a numerical hierarchy. The single-measure change removes that
mistake from these comparison components.

Mermaid structural diagrams use neutral frames/surfaces, restrained strokes and
host typography. Flowcharts retain the library's orthogonal routing. Sequence actor, message and
note text use 13px. Authored shapes and connection topology remain intact.
Decorative branch normalization is scoped to mindmaps, not all diagram edges,
so authored thick/dashed flowchart relations retain their visual meaning.
Mermaid pies use separate quiet accent/neutral fills instead of inheriting the
structural node palette. Pie text, separators and legends remain in place.

## Reference analysis

| Reference | Observed guidance | Application |
| --- | --- | --- |
| [IBM charts](https://www.ibm.com/design/language/data-visualization/charts/) | Comparison, trend, part-to-whole, correlation and relationship goals differ | Classify the data before selecting encodings |
| [IBM design basics](https://www.ibm.com/design/language/data-visualization/design/basics/) | Every color needs a reason. Direct labels can replace long legends. Textures/markers can reinforce or substitute color | Remove unnecessary keys from comparison rows, retain identification where needed |
| [Carbon simple charts](https://www.carbondesignsystem.com/building-blocks/data-visualization/simple-charts) | Simple bars compare individual values. Stacked bars show series contributions | Do not assign a series identity to every simple bar |
| [Carbon palettes](https://www.carbondesignsystem.com/building-blocks/data-visualization/color-palettes) | Categorical palettes distinguish discrete categories. Sequential palettes encode ordered relationships | Do not use ordinal shading for same-measure rows |
| [Carbon axes](https://www.carbondesignsystem.com/building-blocks/data-visualization/axes-and-labels) | Comparison/part-to-whole axes start at zero. Do not interpolate missing data | Preserve the comparison baseline and geometry |
| [Uber charts](https://base.uber.com/6d2425e9f/p/61b6c1-charts) | Select by user concept, variable count and time relevance. Avoid overlapping labels. Legends may be unnecessary | Review the intended reading task, not just the mark appearance |
| [Uber chart colors](https://base.uber.com/6d2425e9f/p/61b6c1-charts/b/34f629) | Numerical data uses one color or related scales. Brand/status colors can create unintended meanings | Same-measure bars share a color. Chart and UI palettes have separate roles |
| [Data Viz Project](https://datavizproject.com/) | Indexes chart types by input, function and shape | A chart-selection reference, not an accessibility specification |

The supplied Salesforce image explicitly recommends one color for values compared
against the same measure. The linked Salesforce page returned a service-error
screen in MCP Chromium. Its full contents were not reviewed.

## Accessibility bounds

Visible label/value text is the primary accessible representation of the simple
comparison rows. Their decorative bar tracks are hidden from assistive technology.
Color is not required to identify a row or obtain its value. Exact data, legibility,
meaningful boundaries, keyboard access where interactive, and contrast are still
required. Neither a palette nor a pattern alone establishes accessibility.

Check foreground text and essential chart marks against their surfaces in both
host themes. Inspect label association and geometry. This does not certify a
screen reader, physical-device behavior or every arbitrary host theme. Existing
multi-series/diagram accessibility beyond this bounded pass remains a distinct
review concern, not a reason to texture unrelated numerical comparisons.

// Mermaid base-theme variables derived from OpenChamber host tokens.
//
// `base` is the only Mermaid theme that can be customised, and a diagram only
// adopts the host look when every variable family it reads is supplied.
// Mermaid 12 derives most colours from primaryColor/background, but gantt,
// pie, gitGraph, quadrant, state, class, venn, requirement and architecture
// read their own variables and fall back to light-assuming defaults without
// them. This map covers those families so a diagram matches the host in both
// light and dark mode.
//
// `diagramThemeVariables` and `normalizeColor` are DOM-free so they can be
// unit-tested. `resolve(name, fallback)` turns a CSS custom property (which may
// itself be a color-mix() expression) into a concrete colour string; `dark`
// selects dark-mode derivation. `createColorResolver` is the DOM-backed
// resolver the panel and the verification harness both use.

function readToken(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  // A host that omits a token can leave the literal string "undefined" in place.
  return !value || value === 'undefined' || value === 'null' ? fallback : value;
}

// Chromium serialises a color-mix() result as `color(srgb r g b [/ a])`, which
// Mermaid's colour parser rejects. Pass anything else (rgb, rgba, hex) through,
// and fall back when the value is empty or fully transparent. Opaque colours
// become hex, not rgb(): Mermaid splits xyChart.plotColorPalette on commas, so
// a palette entry must not contain any.
const SRGB = /^color\(\s*srgb\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s*(?:\/\s*([\d.eE+-]+)\s*)?\)$/;
const RGB = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)\s*(?:[,/]\s*([\d.]+)\s*)?\)$/;
export function normalizeColor(value, fallback) {
  const rgb = typeof value === 'string' ? value.match(RGB) : null;
  if (rgb) {
    const alpha = rgb[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(rgb[4])));
    if (alpha === 0) return fallback;
    const channels = rgb.slice(1, 4).map(part => Math.max(0, Math.min(255, Math.round(Number(part)))));
    return alpha < 1 ? `rgba(${channels.join(', ')}, ${alpha})` : `#${channels.map(part => part.toString(16).padStart(2, '0')).join('')}`;
  }
  const match = typeof value === 'string' ? value.match(SRGB) : null;
  if (match) {
    const channel = part => Math.max(0, Math.min(255, Math.round(Number(part) * 255)));
    const [red, green, blue] = [channel(match[1]), channel(match[2]), channel(match[3])];
    const alpha = match[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(match[4])));
    if (alpha === 0) return fallback;
    const hex = part => part.toString(16).padStart(2, '0');
    return alpha < 1 ? `rgba(${red}, ${green}, ${blue}, ${alpha})` : `#${hex(red)}${hex(green)}${hex(blue)}`;
  }
  return value && value !== 'rgba(0, 0, 0, 0)' ? value : fallback;
}

export function createColorResolver() {
  if (typeof document === 'undefined') return (name, fallback) => fallback;
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'display:none';
  document.body.appendChild(probe);
  const resolve = (name, fallback) => {
    const raw = readToken(name, fallback);
    // Font families are not colors. Assigning one to style.color silently
    // returned inherited foreground and fed Mermaid an invalid font family.
    if (name === '--font' || name === '--oc-font') return raw;
    probe.style.color = '';
    probe.style.color = raw;
    return normalizeColor(getComputedStyle(probe).color, raw);
  };
  resolve.dispose = () => probe.remove();
  return resolve;
}

export function diagramThemeVariables(resolve, dark) {
  const bg = resolve('--oc-bg', dark ? '#151719' : '#ffffff');
  const fg = resolve('--oc-fg', dark ? '#e3e5ea' : '#1f2430');
  const elevated = resolve('--oc-elevated', dark ? '#1d2023' : '#ffffff');
  const muted = resolve('--oc-muted', dark ? '#949aa6' : '#6b7280');
  const border = resolve('--diagram-border', resolve('--oc-border', dark ? '#2f3238' : '#d9dde5'));
  const raised = resolve('--diagram-raised', elevated);
  const recessed = resolve('--diagram-recessed', bg);
  const palette = Array.from({ length: 12 }, (_, index) => resolve(`--diagram-${index + 1}`, muted));
  const at = index => palette[index % palette.length];
  // Chart marks and branch lines need more contrast than pastel node surfaces.
  const graphPalette = Array.from({ length: 5 }, (_, index) => resolve(index === 0 ? '--primary-text' : `--series-${index + 1}`, muted));
  const graphAt = index => graphPalette[index % graphPalette.length];

  return {
    darkMode: dark,
    fontFamily: resolve('--font', 'sans-serif'),
    fontSize: '13px',
    background: bg,
    primaryColor: elevated,
    primaryTextColor: fg,
    primaryBorderColor: border,
    secondaryColor: raised,
    secondaryTextColor: fg,
    secondaryBorderColor: border,
    tertiaryColor: recessed,
    tertiaryTextColor: fg,
    tertiaryBorderColor: border,
    lineColor: muted,
    arrowheadColor: muted,
    textColor: fg,
    mainBkg: elevated,
    nodeBkg: elevated,
    nodeBorder: border,
    nodeTextColor: fg,
    clusterBkg: recessed,
    clusterBorder: border,
    defaultLinkColor: muted,
    titleColor: fg,
    edgeLabelBackground: elevated,
    flowContainerStroke: border,
    border2: border,

    noteBkgColor: resolve('--diagram-note', raised),
    noteTextColor: fg,
    noteBorderColor: border,
    errorBkgColor: raised,
    errorTextColor: fg,

    actorBkg: elevated,
    actorBorder: border,
    actorTextColor: fg,
    actorLineColor: muted,
    signalColor: fg,
    signalTextColor: fg,
    labelBoxBkgColor: raised,
    labelBoxBorderColor: border,
    labelTextColor: fg,
    loopTextColor: fg,
    activationBorderColor: border,
    activationBkgColor: raised,
    sequenceNumberColor: bg,

    sectionBkgColor: raised,
    sectionBkgColor2: recessed,
    altSectionBkgColor: recessed,
    excludeBkgColor: recessed,
    taskBkgColor: at(0),
    taskBorderColor: border,
    taskTextColor: fg,
    taskTextOutsideColor: fg,
    taskTextLightColor: fg,
    taskTextDarkColor: bg,
    taskTextClickableColor: at(0),
    activeTaskBkgColor: at(1),
    activeTaskBorderColor: border,
    doneTaskBkgColor: recessed,
    doneTaskBorderColor: border,
    critBkgColor: at(2),
    critBorderColor: border,
    todayLineColor: at(2),
    vertLineColor: muted,
    gridColor: border,
    rectBkgColor: raised,

    stateBkg: elevated,
    stateLabelColor: fg,
    labelBackgroundColor: elevated,
    compositeBackground: recessed,
    altBackground: recessed,
    compositeTitleBackground: raised,
    compositeBorder: border,
    innerEndBackground: fg,
    specialStateColor: border,
    transitionColor: muted,
    transitionLabelColor: fg,

    classText: fg,
    scaleLabelColor: fg,
    fillType0: at(0),
    fillType1: at(1),
    fillType2: at(2),
    fillType3: at(3),
    fillType4: at(4),
    fillType5: at(5),
    fillType6: at(6),
    fillType7: at(7),
    cScale0: at(0),
    cScale1: at(1),
    cScale2: at(2),
    cScale3: at(3),
    cScale4: at(4),
    cScale5: at(5),
    cScale6: at(6),
    cScale7: at(7),
    cScale8: at(8),
    cScale9: at(9),
    cScale10: at(10),
    cScale11: at(11),
    ...Object.fromEntries(Array.from({ length: 12 }, (_, index) => [
      [`cScaleLabel${index}`, fg], [`cScaleInv${index}`, border],
      [`lineColor${index}`, muted],
    ]).flat()),

    pie1: at(0),
    pie2: at(1),
    pie3: at(2),
    pie4: at(3),
    pie5: at(4),
    pie6: at(5),
    pie7: at(6),
    pie8: at(7),
    pie9: at(8),
    pie10: at(9),
    pie11: at(10),
    pie12: at(11),
    pieTitleTextColor: fg,
    pieTitleTextSize: '16px',
    pieSectionTextSize: '13px',
    pieLegendTextSize: '13px',
    pieStrokeWidth: '1px',
    pieOuterStrokeWidth: '1px',
    pieSectionTextColor: fg,
    pieLegendTextColor: fg,
    pieStrokeColor: border,
    pieOuterStrokeColor: border,
    pieOpacity: '1',

    git0: graphAt(0),
    git1: graphAt(1),
    git2: graphAt(2),
    git3: graphAt(3),
    git4: graphAt(4),
    git5: graphAt(5),
    git6: graphAt(6),
    git7: graphAt(7),
    gitInv0: bg,
    gitInv1: bg,
    gitInv2: bg,
    gitInv3: bg,
    gitInv4: bg,
    gitInv5: bg,
    gitInv6: bg,
    gitInv7: bg,
    branchLabelColor: fg,
    gitBranchLabel0: bg,
    gitBranchLabel1: bg,
    gitBranchLabel2: bg,
    gitBranchLabel3: bg,
    gitBranchLabel4: bg,
    gitBranchLabel5: bg,
    gitBranchLabel6: bg,
    gitBranchLabel7: bg,
    tagLabelColor: fg,
    tagLabelBackground: at(0),
    tagLabelBorder: border,
    commitLabelColor: fg,
    commitLabelBackground: raised,

    quadrant1Fill: at(0),
    quadrant2Fill: at(1),
    quadrant3Fill: at(2),
    quadrant4Fill: at(3),
    quadrant1TextFill: fg,
    quadrant2TextFill: fg,
    quadrant3TextFill: fg,
    quadrant4TextFill: fg,
    quadrantPointFill: graphAt(0),
    quadrantPointTextFill: fg,
    quadrantXAxisTextFill: fg,
    quadrantYAxisTextFill: fg,
    quadrantInternalBorderStrokeFill: border,
    quadrantExternalBorderStrokeFill: border,
    quadrantTitleFill: fg,

    venn1: at(0),
    venn2: at(1),
    venn3: at(2),
    venn4: at(3),
    venn5: at(4),
    venn6: at(5),
    venn7: at(6),
    venn8: at(7),
    vennTitleTextColor: fg,
    vennSetTextColor: fg,

    // These families read object-shaped variables, not colours. Without the
    // object, Mermaid falls back to hardcoded light defaults (a #DEDEDE radar
    // graticule, a cream xyChart palette, light cynefin/wardley backgrounds).
    radar: {
      axisColor: muted,
      axisStrokeWidth: 1,
      axisLabelFontSize: 12,
      curveOpacity: 0.35,
      curveStrokeWidth: 2,
      graticuleColor: border,
      graticuleStrokeWidth: 1,
      graticuleOpacity: 0.35,
    },
    xyChart: {
      backgroundColor: elevated,
      titleColor: fg,
      dataLabelColor: fg,
      legendTextColor: fg,
      xAxisTitleColor: fg,
      xAxisLabelColor: fg,
      xAxisTickColor: muted,
      xAxisLineColor: border,
      yAxisTitleColor: fg,
      yAxisLabelColor: fg,
      yAxisTickColor: muted,
      yAxisLineColor: border,
      plotColorPalette: graphPalette.join(','),
    },
    cynefin: {
      boundaryColor: border,
      arrowColor: muted,
      cliffColor: at(2),
      complexBg: at(1),
      complicatedBg: at(0),
      chaoticBg: at(2),
      clearBg: at(3),
      confusionBg: at(4),
      textColor: fg,
      labelColor: fg,
    },
    wardley: {
      backgroundColor: bg,
      axisColor: muted,
      axisTextColor: fg,
      gridColor: border,
      componentFill: elevated,
      componentStroke: muted,
      componentLabelColor: fg,
      linkStroke: muted,
      evolutionStroke: at(2),
      annotationStroke: border,
      annotationTextColor: fg,
      annotationFill: raised,
    },

    requirementBackground: elevated,
    requirementBorderColor: border,
    requirementTextColor: fg,
    relationColor: muted,
    relationLabelBackground: elevated,
    relationLabelColor: fg,

    archEdgeColor: muted,
    archEdgeArrowColor: muted,
    archGroupBorderColor: border,

    personBkg: at(0),
    personBorder: border,
    rowOdd: raised,
    rowEven: recessed,
    attributeBackgroundColorOdd: raised,
    attributeBackgroundColorEven: recessed,
  };
}

// Coordinates and camera centers are fractions of the entire official field map.
const WIDTH = 1600, HEIGHT = 900, MAX_MARKS = 80;
const colors = { yellow: '#ffdf50', red: '#ff6469', blue: '#6dcfff', white: '#ffffff' };
const pinStyles = { briefing: ['B', '#ffc675'], camo: ['C', '#b9df82'], solid: ['S', '#a8ceff'] };
const drawingTools = ['mark', 'circle', 'x', 'arrow'];
const CIRCLE_RADIUS = 36, X_HALF_SIZE = 18;
const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
const rounded = n => Math.round(n * 100000) / 100000;
const unit = n => rounded(clamp(n, 0, 1));
const validUnit = n => Number.isFinite(n) && n >= 0 && n <= 1;
const validPoint = p => p && validUnit(p.x) && validUnit(p.y);

function camera(zoom = 1, x = .5, y = .5) {
  const z = rounded(clamp(Number.isFinite(zoom) ? zoom : 1, 1, 4));
  const edge = .5 / z;
  return { zoom: z, x: rounded(clamp(Number.isFinite(x) ? x : .5, edge, 1 - edge)),
    y: rounded(clamp(Number.isFinite(y) ? y : .5, edge, 1 - edge)) };
}

function readMap(map) {
  const marks = [];
  for (const m of Array.isArray(map?.marks) ? map.marks.slice(0, MAX_MARKS) : []) {
    if (!validPoint(m) || !drawingTools.includes(m.type) || !Object.hasOwn(colors, m.color)) continue;
    const item = { type: m.type, x: m.x, y: m.y, color: m.color };
    // Older circles carry an edge point and retain their authored radius.
    if (m.type === 'arrow' || (m.type === 'circle' && (m.x2 !== undefined || m.y2 !== undefined))) {
      if (!validUnit(m.x2) || !validUnit(m.y2)) continue;
      item.x2 = m.x2;
      item.y2 = m.y2;
    }
    marks.push(item);
  }
  return { marks, view: camera(map?.view?.zoom, map?.view?.x, map?.view?.y) };
}

const iconPaths = {
  mark: '<circle cx="12" cy="12" r="6"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
  x: '<path d="m5 5 14 14m0-14L5 19"/>',
  arrow: '<path d="M4 19 20 5m-9 0h9v9"/>',
  pan: '<path d="M12 2v20M2 12h20m-14-6 4-4 4 4m-8 12 4 4 4-4M6 8l-4 4 4 4m12-8 4 4-4 4"/>',
  undo: '<path d="m9 5-6 6 6 6m-5-6h10a5 5 0 0 1 5 5v3"/>',
  minus: '<path d="M5 12h14"/>', plus: '<path d="M5 12h14m-7-7v14"/>',
  fit: '<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>',
};
const icon = name => '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + iconPaths[name] + '</svg>';
const button = (action, label, glyph, visible = true) => '<button type="button" data-rbm="' + action + '" aria-label="' + label + '" title="' + label + '">' + icon(glyph) + (visible ? label : '') + '</button>';
const CSS = `
.rbm{width:100%;min-width:0;box-sizing:border-box;font:inherit}
.rbm *{box-sizing:border-box}
.rbm-tools{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem .75rem;padding:.55rem;background:#132537;color:#f5f8fb;border-radius:.7rem .7rem 0 0}
.rbm-group{display:flex;align-items:center;flex-wrap:wrap;gap:.2rem}
.rbm-tools button{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:.32rem;margin:0;padding:.4rem .55rem;min-width:2.75rem;min-height:2.75rem;border:1px solid #536678;border-radius:.4rem;background:#223649;color:#f5f8fb;font:600 .9rem/1.2 system-ui,sans-serif;cursor:pointer}
.rbm-tools button>svg{flex:none}
.rbm-tools button:hover:enabled{background:#32495d}
.rbm-tools button[aria-pressed="true"]{color:#122234;border-color:#ffdf50;background:#ffdf50}
.rbm-tools button:disabled{opacity:.5;cursor:default}
.rbm-tools .rbm-swatch{min-width:2.75rem;padding:.3rem;background:transparent;border-color:transparent}
.rbm-tools .rbm-swatch[aria-pressed="true"]{background:#2c4155;border-color:#f5f8fb}
.rbm-swatch span{width:1.08rem;height:1.08rem;border-radius:50%;box-shadow:0 0 0 1px #0b1722}
.rbm-swatch[aria-pressed="true"] span:after{content:"";display:block;width:.47rem;height:.27rem;border:solid #172129;border-width:0 0 2px 2px;transform:translate(.27rem,.3rem) rotate(-45deg)}
.rbm-tools button:focus-visible,.rbm-stage:focus-visible{outline:3px solid #fff;outline-offset:-4px;box-shadow:0 0 0 2px #176abc}
.rbm-zoom{font:600 .85rem system-ui,sans-serif;font-variant-numeric:tabular-nums;min-width:3.2em;text-align:center}
.rbm-stage{display:block;width:100%;height:auto;aspect-ratio:16 / 9;overflow:hidden;background:#172738;user-select:none;-webkit-user-select:none}
.rbm-edit .rbm-stage{touch-action:none;cursor:crosshair}
.rbm-edit .rbm-stage[data-pan="true"]{cursor:grab}
.rbm-stage text{font-family:system-ui,sans-serif}
.rbm-hint{display:block;margin:0;padding:.55rem .7rem;font:500 .86rem/1.5 system-ui,sans-serif;background:#132537;color:#eff5fa;border-radius:0 0 .7rem .7rem}
.rbm-aim{visibility:hidden}.rbm-stage:focus-visible .rbm-aim{visibility:visible}
@media(max-width:500px){.rbm-tools{gap:.25rem .4rem;padding:.4rem}.rbm-tools button{padding-inline:.4rem}.rbm-tools .rbm-swatch{min-width:2.75rem}}
`;

function controls() {
  const toolButtons = [...drawingTools, 'pan'].map(tool => button(tool,
    tool.charAt(0).toUpperCase() + tool.slice(1), tool)).join('');
  const swatches = Object.entries(colors).map(([name, hex]) =>
    '<button type="button" data-rbm-color="' + name + '" aria-label="' + name + ' ink" title="' + name +
    ' ink" class="rbm-swatch"><span style="background:' + hex + '"></span></button>').join('');
  return '<div class="rbm-tools"><div class="rbm-group" role="group" aria-label="Drawing tools">' + toolButtons +
    button('undo', 'Undo', 'undo') + '</div><div class="rbm-group" role="group" aria-label="Ink colors">' + swatches +
    '</div><div class="rbm-group" role="group" aria-label="Map zoom">' + button('out', 'Zoom out', 'minus', false) +
    '<span class="rbm-zoom"></span>' + button('in', 'Zoom in', 'plus', false) + button('fit', 'Fit', 'fit') + '</div></div>';
}

const NS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function drawSymbol(layer, mark, zoom) {
  const x = mark.x * WIDTH, y = mark.y * HEIGHT;
  let tag = 'path', attrs;
  if (mark.type === 'mark') {
    const r = 14 / zoom, w = 7 / zoom;
    attrs = { d: `M${x-r},${y}a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 ${-2*r} 0 M${x},${y-r-w}v${w} M${x},${y+r}v${w} M${x-r-w},${y}h${w} M${x+r},${y}h${w}` };
  } else if (mark.type === 'circle') {
    tag = 'circle';
    const radius = mark.x2 === undefined ? CIRCLE_RADIUS / zoom :
      Math.hypot(mark.x2 * WIDTH - x, mark.y2 * HEIGHT - y);
    attrs = { cx: x, cy: y, r: radius };
  } else if (mark.type === 'x') {
    const r = X_HALF_SIZE / zoom;
    attrs = { d: `M${x-r} ${y-r}L${x+r} ${y+r}M${x+r} ${y-r}L${x-r} ${y+r}` };
  } else {
    const x2 = mark.x2 * WIDTH, y2 = mark.y2 * HEIGHT;
    const dx = x2 - x, dy = y2 - y, distance = Math.hypot(dx, dy);
    if (!distance) return;
    const head = Math.min(26 / zoom, distance * .45), ux = dx / distance, uy = dy / distance;
    const bx = x2 - head * ux, by = y2 - head * uy;
    attrs = { d: `M${x} ${y}L${x2} ${y2}M${bx-head*.54*uy} ${by+head*.54*ux}L${x2} ${y2}L${bx+head*.54*uy} ${by-head*.54*ux}` };
  }
  // Contrast on both dark buildings and bright open ground.
  for (const [stroke, width] of [['#142031', 10], [colors[mark.color], 5.5]]) {
    layer.append(svg(tag, { ...attrs, fill: 'none', stroke, 'stroke-width': width / zoom,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  }
}

function drawPins(layer, pins, zoom) {
  for (const [key, [label, fill]] of Object.entries(pinStyles)) {
    const p = pins?.[key];
    if (!validPoint(p)) continue;
    const g = svg('g', { transform: `translate(${p.x * WIDTH} ${p.y * HEIGHT}) scale(${1/zoom})` });
    g.append(svg('circle', { r: 17, fill, stroke: '#152331', 'stroke-width': 4 }));
    const text = svg('text', { y: 7, fill: '#152331', 'text-anchor': 'middle', 'font-size': 21, 'font-weight': 800 });
    text.textContent = label;
    g.append(text); layer.append(g);
  }
}

const hints = {
  mark: 'Tap the map to place a mark.',
  circle: 'Tap the center of the area to place a circle.',
  x: 'Tap the map to place an X.',
  arrow: 'Drag from the start to the tip, or tap those two points.',
  pan: 'Zoom in, then drag to move the view. Pinch with two fingers to zoom.',
};
let hintSerial = 0;

export function mountBriefingMap(container, { imageUrl, map, pins, editable = false, onChange }) {
  let state = readMap(map);
  let tool = 'mark', color = 'yellow', anchor = null, cursor = { x: state.view.x, y: state.view.y };
  const pointers = new Map();
  let gesture = null, preview = null, drawnMarks, drawnZoom, drawnPins;
  const outer = document.createElement('div');
  outer.className = editable ? 'rbm rbm-edit' : 'rbm';
  outer.innerHTML = '<style>' + CSS + '</style>' + (editable ? controls() : '') +
    '<svg class="rbm-stage" viewBox="0 0 1600 900" role="img" aria-label="Official field map"><image x="0" y="0" width="1600" height="900" preserveAspectRatio="none"/><g data-layer="pins"/><g data-layer="drawings"/><g data-layer="gesture"/></svg>' +
    (editable ? '<p class="rbm-hint" role="status"></p>' : '');
  container.append(outer);
  const stage = outer.querySelector('.rbm-stage'), image = stage.querySelector('image');
  const pinLayer = stage.querySelector('[data-layer="pins"]'), ink = stage.querySelector('[data-layer="drawings"]');
  const gestureLayer = stage.querySelector('[data-layer="gesture"]'), hint = outer.querySelector('.rbm-hint');
  image.setAttribute('href', imageUrl);
  if (editable) {
    stage.setAttribute('tabindex', '0');
    hint.id = 'rbm-help-' + ++hintSerial;
    stage.setAttribute('aria-describedby', hint.id);
  }
  function instructions(message) {
    if (hint) hint.textContent = message || hints[tool];
  }
  function commit() {
    onChange?.(readMap(state));
  }
  function paintGesture() {
    gestureLayer.replaceChildren();
    if (!editable) return;
    if (preview) drawSymbol(gestureLayer, preview, state.view.zoom);
    if (anchor) gestureLayer.append(svg('circle', { cx: anchor.x * WIDTH, cy: anchor.y * HEIGHT,
      r: 6 / state.view.zoom, fill: colors[color], stroke: '#152331', 'stroke-width': 3 / state.view.zoom }));
    const r = 19 / state.view.zoom, x = cursor.x * WIDTH, y = cursor.y * HEIGHT;
    gestureLayer.append(svg('circle', { class: 'rbm-aim', cx: x, cy: y, r, fill:'none', stroke:'#fff',
      'stroke-width':3/state.view.zoom,'stroke-dasharray':6/state.view.zoom }));
  }
  function paint() {
    const { view } = state, vw = WIDTH / view.zoom, vh = HEIGHT / view.zoom;
    stage.setAttribute('viewBox', [view.x * WIDTH - vw / 2, view.y * HEIGHT - vh / 2, vw, vh].join(' '));
    if (pins !== drawnPins || view.zoom !== drawnZoom) {
      pinLayer.replaceChildren();
      drawPins(pinLayer, pins, view.zoom);
    }
    // A pan moves the SVG viewBox; the line geometry itself stays in place.
    if (state.marks !== drawnMarks || view.zoom !== drawnZoom) {
      ink.replaceChildren();
      state.marks.forEach(m => drawSymbol(ink, m, view.zoom));
    }
    drawnMarks = state.marks; drawnZoom = view.zoom; drawnPins = pins;
    paintGesture();
    if (!editable) return;
    stage.dataset.pan = String(tool === 'pan');
    outer.querySelectorAll('[data-rbm]').forEach(el => {
      const action = el.dataset.rbm;
      if (Object.hasOwn(hints, action)) el.setAttribute('aria-pressed', String(action === tool));
      el.disabled = (action === 'undo' && !state.marks.length && !anchor) ||
        (action === 'in' && view.zoom >= 4) || ((action === 'out' || action === 'fit') && view.zoom <= 1);
    });
    outer.querySelectorAll('[data-rbm-color]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.rbmColor === color)));
    outer.querySelector('.rbm-zoom').textContent = Math.round(view.zoom * 100) + '%';
  }
  function applyView(next, save) {
    const v = state.view;
    if (v.x === next.x && v.y === next.y && v.zoom === next.zoom) return;
    state = { ...state, view: next };
    paint();
    if (save) commit();
  }
  function stopDrawing() {
    anchor = null; preview = null;
  }
  function click(event) {
    const btn = event.target.closest('button');
    if (!btn || btn.disabled) return;
    const action = btn.dataset.rbm;
    if (btn.dataset.rbmColor) color = btn.dataset.rbmColor;
    if (Object.hasOwn(hints, action)) {
      tool = action; stopDrawing(); instructions();
    } else if (action === 'undo') {
      if (anchor) stopDrawing();
      else if (state.marks.length) { state = { ...state, marks: state.marks.slice(0, -1) }; commit(); }
      instructions();
    } else if (['in', 'out', 'fit'].includes(action)) {
      stopDrawing();
      const { view } = state;
      const next = action === 'fit' ? camera() : camera(view.zoom + (action === 'in' ? .5 : -.5), view.x, view.y);
      applyView(next, true);
      cursor = { x: next.x, y: next.y };
    }
    paint();
  }
  function position(event) {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    // Match SVG's xMidYMid meet even if a host page constrains the stage height.
    const width = Math.min(rect.width, rect.height * WIDTH / HEIGHT), height = width * HEIGHT / WIDTH;
    return { x: (event.clientX - rect.left - (rect.width - width) / 2) / width,
      y: (event.clientY - rect.top - (rect.height - height) / 2) / height };
  }
  function toMap(p, v = state.view) {
    return { x: unit(v.x + (p.x - .5) / v.zoom), y: unit(v.y + (p.y - .5) / v.zoom) };
  }
  function complete(p) {
    if (state.marks.length >= MAX_MARKS) { stopDrawing(); instructions('Map is full. Undo a drawing to make room.'); paint(); return; }
    if (tool === 'arrow' && !anchor) {
      anchor = p; instructions('Choose the arrow’s tip.');
      paint(); return;
    }
    const start = anchor || p;
    if (tool === 'arrow' && Math.hypot((p.x-start.x)*WIDTH,(p.y-start.y)*HEIGHT) < 3/state.view.zoom) { paint(); return; }
    const shape = { type: tool, color, x: start.x, y: start.y };
    if (tool === 'arrow') { shape.x2 = p.x; shape.y2 = p.y; }
    state = { ...state, marks: [...state.marks, shape] };
    stopDrawing(); instructions(); paint(); commit();
  }
  function pinchPoints() {
    const [a,b] = [...pointers.values()];
    return { midpoint: { x:(a.x+b.x)/2, y:(a.y+b.y)/2 }, span: Math.hypot((a.x-b.x)*WIDTH,(a.y-b.y)*HEIGHT) };
  }
  function down(event) {
    if (event.button !== 0 || pointers.size >= 2) return;
    const pos = position(event);
    if (!pos || pos.x < 0 || pos.x > 1 || pos.y < 0 || pos.y > 1) return;
    pointers.set(event.pointerId, pos);
    stage.setPointerCapture?.(event.pointerId);
    if (pointers.size === 2) {
      const { midpoint, span } = pinchPoints();
      const saved = gesture?.initialView || state.view;
      stopDrawing(); gesture = { kind:'pinch', view:state.view, initialView:saved, fixed:toMap(midpoint), span };
      paintGesture(); return;
    }
    const world = toMap(pos);
    cursor = world;
    gesture = { kind:tool, start:pos, world, view:state.view, initialView:state.view, hadAnchor:!!anchor, dragged:false };
    paintGesture();
  }
  function motion(event) {
    if (!pointers.has(event.pointerId) || !gesture) return;
    const p = position(event); if (!p) return;
    pointers.set(event.pointerId, p);
    if (gesture.kind === 'pinch' && pointers.size === 2) {
      const { midpoint, span } = pinchPoints();
      const z = clamp(gesture.view.zoom * span / Math.max(gesture.span, 1), 1, 4);
      applyView(camera(z, gesture.fixed.x - (midpoint.x - .5) / z, gesture.fixed.y - (midpoint.y - .5) / z), false);
      return;
    }
    const { start, view } = gesture;
    const rect = stage.getBoundingClientRect();
    if (Math.hypot((p.x-start.x)*rect.width,(p.y-start.y)*rect.height) > 4) gesture.dragged = true;
    if (gesture.kind === 'pan') {
      applyView(camera(view.zoom, view.x + (start.x-p.x)/view.zoom, view.y + (start.y-p.y)/view.zoom), false); return;
    }
    cursor = toMap(p);
    if (gesture.dragged && tool === 'arrow') {
      const from = anchor || gesture.world;
      preview = { type:tool,color,x:from.x,y:from.y,x2:cursor.x,y2:cursor.y };
    }
    paintGesture();
  }
  function changedView(v) {
    return v.zoom !== state.view.zoom || v.x !== state.view.x || v.y !== state.view.y;
  }
  function up(event) {
    if (!pointers.has(event.pointerId)) return;
    motion(event);
    const current = gesture;
    pointers.delete(event.pointerId);
    if (!current) return;
    gesture = null; preview = null;
    if (current.kind === 'pinch' || current.kind === 'pan') {
      if (changedView(current.initialView)) commit();
    } else {
      const p = position(event);
      if (p) {
        cursor = tool === 'circle' || tool === 'x' ? current.world : toMap(p);
        if (current.dragged && !current.hadAnchor && tool === 'arrow') anchor = current.world;
        complete(cursor);
      }
    }
    paintGesture();
  }
  function cancel(event) {
    if (!pointers.has(event.pointerId)) return;
    const original = gesture?.initialView;
    pointers.clear(); gesture = null; preview = null;
    if (original) applyView(original, false);
    paintGesture();
  }
  function keyboard(event) {
    const directions = { ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1] };
    const d = Object.hasOwn(directions,event.key) && directions[event.key];
    if (d) {
      event.preventDefault();
      const v = state.view, step = (event.shiftKey ? .08 : .015) / v.zoom;
      if (tool === 'pan') applyView(camera(v.zoom,v.x+d[0]*step,v.y+d[1]*step),true);
      else {
        cursor = { x:unit(clamp(cursor.x+d[0]*step,v.x-.5/v.zoom,v.x+.5/v.zoom)),
          y:unit(clamp(cursor.y+d[1]*step,v.y-.5/v.zoom,v.y+.5/v.zoom)) };
        if (anchor) preview = { type:tool,color,x:anchor.x,y:anchor.y,x2:cursor.x,y2:cursor.y };
        paintGesture();
        instructions('Cursor ' + Math.round(cursor.x*100) + '% across, ' + Math.round(cursor.y*100) + '% down. Press Enter to place.');
      }
    } else if ((event.key === 'Enter' || event.key === ' ') && tool !== 'pan') {
      event.preventDefault(); if (!event.repeat) complete(cursor);
    } else if (event.key === 'Escape') {
      stopDrawing(); instructions(); paint();
    }
  }
  if (editable) {
    outer.addEventListener('click', click);
    stage.addEventListener('pointerdown',down);
    stage.addEventListener('pointermove',motion);
    stage.addEventListener('pointerup',up);
    stage.addEventListener('pointercancel',cancel);
    stage.addEventListener('lostpointercapture',cancel);
    stage.addEventListener('keydown',keyboard);
    stage.addEventListener('focus', () => {
      if (stage.matches(':focus-visible')) instructions('Use arrow keys to move and Enter to place. Escape cancels a shape.');
    });
  }
  instructions(); paint();
  return {
    setMap(next, nextPins) {
      const normalized = readMap(next);
      if (nextPins !== undefined) pins = nextPins;
      if (JSON.stringify(normalized) !== JSON.stringify(state)) {
        pointers.clear(); gesture = null; stopDrawing(); state = normalized;
        cursor = { x:state.view.x,y:state.view.y }; instructions();
      }
      paint();
    },
    destroy() { pointers.clear(); gesture = null; outer.remove(); },
  };
}

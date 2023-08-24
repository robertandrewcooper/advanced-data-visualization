// d3.tip
// Copyright (c) 2013 Justin Palmer
//
// Tooltips for d3.js SVG visualizations

// Public - constructs a new tooltip
//
// Returns a tip
d3.tip = function () {
  var direction = d3_tip_direction,
    offset = d3_tip_offset,
    html = d3_tip_html,
    node = initNode(),
    svg = null,
    point = null,
    target = null

  function tip(vis) {
    svg = getSVGNode(vis)
    point = svg.createSVGPoint()
    document.body.appendChild(node)
  }

  // Public - show the tooltip on the screen
  //
  // Returns a tip
  tip.show = function () {
    var args = Array.prototype.slice.call(arguments)
    if (args[args.length - 1] instanceof SVGElement) target = args.pop()

    var content = html.apply(this, args),
      p_offset = offset.apply(this, args),
      dir = direction.apply(this, args),
      selected_node = d3.select(node), i = 0,
      coords

    selected_node.html(content)
      .style({ opacity: 1, 'pointer-events': 'all' })

    while (i--) selected_node.classed(directions[i], false)
    coords = direction_callbacks.get(dir).apply(this)
    selected_node.classed(dir, true).style({
      top: (coords.top + p_offset[0]) + 'px',
      left: (coords.left + p_offset[1]) + 'px'
    })

    return tip
  }

  // Public - hide the tooltip
  //
  // Returns a tip
  tip.hide = function () {
    selected_node = d3.select(node)
    selected_node.style({ opacity: 0, 'pointer-events': 'none' })
    return tip
  }

  // Public: Proxy attr calls to the d3 tip container.  Sets or gets attribute value.
  //
  // n - name of the attribute
  // v - value of the attribute
  //
  // Returns tip or attribute value
  tip.attr = function (n, v) {
    if (arguments.length < 2 && typeof n === 'string') {
      return d3.select(node).attr(n)
    } else {
      var args = Array.prototype.slice.call(arguments)
      d3.selection.prototype.attr.apply(d3.select(node), args)
    }

    return tip
  }

  // Public: Proxy style calls to the d3 tip container.  Sets or gets a style value.
  //
  // n - name of the property
  // v - value of the property
  //
  // Returns tip or style property value
  tip.style = function (n, v) {
    if (arguments.length < 2 && typeof n === 'string') {
      return d3.select(node).style(n)
    } else {
      var args = Array.prototype.slice.call(arguments)
      d3.selection.prototype.style.apply(d3.select(node), args)
    }

    return tip
  }

  // Public: Set or get the direction of the tooltip
  //
  // v - One of n(north), s(south), e(east), or w(west), nw(northwest),
  //     sw(southwest), ne(northeast) or se(southeast)
  //
  // Returns tip or direction
  tip.direction = function (v) {
    if (!arguments.length) return direction
    direction = v == null ? v : d3.functor(v)

    return tip
  }

  // Public: Sets or gets the offset of the tip
  //
  // v - Array of [x, y] offset
  //
  // Returns offset or
  tip.offset = function (v) {
    if (!arguments.length) return offset
    offset = v == null ? v : d3.functor(v)

    return tip
  }

  // Public: sets or gets the html value of the tooltip
  //
  // v - String value of the tip
  //
  // Returns html value or tip
  tip.html = function (v) {
    if (!arguments.length) return html
    html = v == null ? v : d3.functor(v)

    return tip
  }

  function d3_tip_direction() { return 'n' }
  function d3_tip_offset() { return [0, 0] }
  function d3_tip_html() { return ' ' }

  var direction_callbacks = d3.map({
    n: direction_n,
    s: direction_s,
    e: direction_e,
    w: direction_w,
    nw: direction_nw,
    ne: direction_ne,
    sw: direction_sw,
    se: direction_se
  }),

    directions = direction_callbacks.keys()

  function direction_n() {
    var bBox = getScreenBBox()
    return {
      top: bBox.n.y - node.offsetHeight,
      left: bBox.n.x - node.offsetWidth / 2
    }
  }

  function direction_s() {
    var bBox = getScreenBBox()
    return {
      top: bBox.s.y,
      left: bBox.s.x - node.offsetWidth / 2
    }
  }

  function direction_e() {
    var bBox = getScreenBBox()
    return {
      top: bBox.e.y - node.offsetHeight / 2,
      left: bBox.e.x
    }
  }

  function direction_w() {
    var bBox = getScreenBBox()
    return {
      top: bBox.w.y - node.offsetHeight / 2,
      left: bBox.w.x - node.offsetWidth
    }
  }

  function direction_nw() {
    var bBox = getScreenBBox()
    return {
      top: bBox.nw.y - node.offsetHeight,
      left: bBox.nw.x - node.offsetWidth
    }
  }

  function direction_ne() {
    var bBox = getScreenBBox()
    return {
      top: bBox.ne.y - node.offsetHeight,
      left: bBox.ne.x
    }
  }

  function direction_sw() {
    var bBox = getScreenBBox()
    return {
      top: bBox.sw.y,
      left: bBox.sw.x - node.offsetWidth
    }
  }

  function direction_se() {
    var bBox = getScreenBBox()
    return {
      top: bBox.se.y,
      left: bBox.e.x
    }
  }

  function initNode() {
    var node = d3.select(document.createElement('div'))
    node.style({
      position: 'absolute',
      opacity: 0,
      pointerEvents: 'none',
      boxSizing: 'border-box'
    })

    return node.node()
  }

  function getSVGNode(el) {
    el = el.node()
    if (el.tagName.toLowerCase() == 'svg')
      return el

    return el.ownerSVGElement
  }

  // Private - gets the screen coordinates of a shape
  //
  // Given a shape on the screen, will return an SVGPoint for the directions
  // n(north), s(south), e(east), w(west), ne(northeast), se(southeast), nw(northwest),
  // sw(southwest).
  //
  //    +-+-+
  //    |   |
  //    +   +
  //    |   |
  //    +-+-+
  //
  // Returns an Object {n, s, e, w, nw, sw, ne, se}
  function getScreenBBox() {
    var target_el = target || d3.event.target,
      bBox = {},
      matrix = target_el.getScreenCTM(),
      tBBox = target_el.getBBox(),
      width = tBBox.width,
      height = tBBox.height,
      x = tBBox.x,
      y = tBBox.y,
      scrollTop = document.documentElement.scrollTop || document.body.scrollTop,
      scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft


    point.x = x + scrollLeft
    point.y = y + scrollTop
    bBox.nw = point.matrixTransform(matrix)
    point.x += width
    bBox.ne = point.matrixTransform(matrix)
    point.y += height
    bBox.se = point.matrixTransform(matrix)
    point.x -= width
    bBox.sw = point.matrixTransform(matrix)
    point.y -= height / 2
    bBox.w = point.matrixTransform(matrix)
    point.x += width
    bBox.e = point.matrixTransform(matrix)
    point.x -= width / 2
    point.y -= height / 2
    bBox.n = point.matrixTransform(matrix)
    point.y += height
    bBox.s = point.matrixTransform(matrix)

    return bBox
  }

  return tip
};
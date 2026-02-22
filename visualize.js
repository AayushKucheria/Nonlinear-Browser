window.tabWidth = 200;
const tabHeight = 80;
const duration = 750;
var innerWidth = window.innerWidth;
var innerHeight = window.innerHeight;
window.fontSize = 16;
window.currentRoot;
var iconWidth = tabWidth / 4;
var iconHeight = tabHeight / 3;
var currentTransform = d3.zoomIdentity;

treeLayout = d3.tree()
  .nodeSize([tabWidth, tabHeight])
  .separation(function(a, b) { return 1.5; }); // 1.5× node width between siblings

var baseDiv = d3.select('body').append('div')
  .classed('svg-container', true);

var baseSvg = baseDiv.append('svg')
  .attr('width', '100%')
  .attr('height', '100%');

var g = baseSvg.append('g')
  .attr('id', 'treeContainer');

// ── Zoom / Pan ────────────────────────────────────────────────────────────────

var zoomer = d3.zoom()
  .scaleExtent([0.1, 3])
  .on('zoom', function(event) {
    currentTransform = event.transform;
    g.attr('transform', event.transform);
  });

baseSvg.call(zoomer).on('dblclick.zoom', null);

function centerNode(source) {
  baseSvg.transition().duration(750).call(
    zoomer.transform,
    d3.zoomIdentity.translate(
      innerWidth / 2 - source.x0,
      innerHeight / 4 - source.y0
    )
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

function initializeTree(localRoot) {
  root = d3.hierarchy(localRoot);
  root.x0 = innerWidth / 2;
  root.y0 = innerHeight / 2;
  window.currentRoot = root;
  drawTree(root);
}

function updateTree(localRoot) {
  window.currentRoot = d3.hierarchy(localRoot);
  window.currentRoot.x0 = localRoot.x0;
  window.currentRoot.y0 = localRoot.y0;
  drawTree(window.currentRoot);
}

// ── Draw ──────────────────────────────────────────────────────────────────────

function drawTree(source) {
  traverse(window.currentRoot,
    function(d) {
      if (d && !(d._children) && d.data.toggle && d.children) {
        d._children = d.children;
        d.children = null;
      }
    },
    function(d) {
      if (d.data.toggle) return null;
      else return d.children;
    });

  const tree = treeLayout(window.currentRoot);
  const links = tree.links();
  const descendants = tree.descendants();

  const linkPathGenerator = d3.linkVertical()
    .x(d => d.x + tabWidth / 2)
    .y(d => d.parent ? d.depth * 180 : d.depth * 180 + tabHeight); // 180px per depth level

  descendants.forEach(d => d.y = d.depth * 180); // vertical position = depth × row height

  var menu = [
    {
      title: 'Rename Tab',
      action: function(event, d, elem) {
        var result = prompt('Enter new name: ');
        if (result) {
          if (!data[elem.data.id]) return; // tab was closed while dialog was open
          elem.data.title = result;
          elem.data.lines = wrapText(result);
          drawTree(window.currentRoot);
          document.title = window.localRoot.title;
          localStore();
        }
      }
    },
    {
      title: 'Copy URL',
      action: function(event, d, elem) {
        navigator.clipboard.writeText(elem.data.url);
      }
    },
    {
      title: 'Save Tree',
      action: function(event, d, elem) {
        saveTree();
      }
    },
    {
      title: 'Toggle read state',
      action: function(nodeEvent, choiceEvent, elem) {
        elem.data.read = !elem.data.read;
        updateStuff();
        localStore();
      }
    }
  ];

  // ── Data join ──────────────────────────────────────────────────────────────

  var node = g.selectAll('g.node')
    .data(descendants, function(d) { return d.data.id; });

  var link = g.selectAll('path.link')
    .data(links, function(d) { return d.target.data.id; });

  var nodeEnter, linkEnter, nodeUpdate, linkUpdate;

  // ── Enter ──────────────────────────────────────────────────────────────────

  function enterStuff() {
    nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr('id', function(d) { return d.data.id; })
      .attr('cursor', 'pointer')
      .attr('transform', d => `translate(${source.x0},${source.y0})`)
      .on('contextmenu', function(event, d) {
        window.contextMenu(event, d, menu);
      });

    // Background rect
    nodeEnter.append('rect')
      .attr('class', 'node')
      .attr('width', tabWidth)
      .attr('height', tabHeight)
      .attr('rx', 10).attr('ry', 10)
      .on('click', function(event, d) { openTab(d); })
      .on('dblclick', function(event, d) { openTab(d); });

    // Favicon
    nodeEnter.append('image')
      .attr('class', 'favicon')
      .attr('href', d => d.data.favIconUrl || 'res/rabbit.svg')
      .attr('x', 4).attr('y', 4)
      .attr('width', tabWidth / 5)
      .attr('height', tabHeight / 3);

    // Title lines
    nodeEnter.append('text').attr('id', 'line1').attr('class', 'nodeText')
      .attr('dx', '2.5em').attr('dy', '1em')
      .text(d => d.data.lines[0]).attr('fill-opacity', 1);

    nodeEnter.append('text').attr('id', 'line2').attr('class', 'nodeText')
      .attr('dx', '2.5em').attr('dy', '2em')
      .text(d => d.data.lines[1]).attr('fill-opacity', 1);

    nodeEnter.append('text').attr('id', 'line3').attr('class', 'nodeText')
      .attr('dx', '0.5em').attr('dy', '3em')
      .text(d => d.data.lines[2]);

    nodeEnter.append('text').attr('id', 'line4').attr('class', 'nodeText')
      .attr('dx', '0.5em').attr('dy', '4em')
      .text(d => d.data.lines[3]);

    // Collapse / expand toggle icon
    nodeEnter.append('image')
      .attr('id', 'toggle')
      .attr('class', 'toggle')
      .attr('href', function(d) {
        if (d.children) return 'res/arrow-up-circle.svg';
        if (d._children) return 'res/arrow-down-circle.svg';
      })
      .attr('x', tabWidth / 2 - 20)
      .attr('y', tabHeight)
      .attr('width', iconWidth)
      .attr('height', iconHeight)
      .on('click', function(event, d) {
        event.stopPropagation();
        toggleChildren(d);
        localStore(window.data);
      });

    // Delete icon (not shown for root)
    nodeEnter.append('image')
      .attr('id', 'delete')
      .attr('class', 'icon')
      .attr('href', function(d) {
        if (d.data.id !== 'Root') return 'res/black-bin.svg';
      })
      .attr('x', tabWidth - iconWidth + 10)
      .attr('y', 0)
      .attr('width', iconWidth)
      .attr('height', iconHeight)
      .attr('opacity', 0)
      .on('click', function(event, d) {
        event.stopPropagation();
        BrowserApi.removeTab(d.data.id);
        var kids = d.data.children || d.data._children || null;
        if (kids) BrowserApi.removeTab(kids.map(c => c.id));
        removeSubtree(d.data.id);
      });

    // Show delete icon on hover
    nodeEnter
      .on('mouseenter', function() {
        d3.select(this).select('#delete').attr('opacity', 1);
      })
      .on('mouseleave', function() {
        d3.select(this).select('#delete').attr('opacity', 0);
      });

    linkEnter = link.enter().append('path').attr('class', 'link');
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  function updateStuff() {
    nodeUpdate = nodeEnter.merge(node)
      .interrupt()
      .transition()
      .duration(duration)
      .ease(d3.easeBackOut)
      .style('fill', function(d) {
        if (d.data.read) return '#646b6d';
        if (d.data.deleted) return '#ff0000';
        return '#21b3dc';
      })
      .attr('transform', d => `translate(${d.x},${d.y})`);

    nodeUpdate.select('#line1').text(d => d.data.lines[0]).attr('fill-opacity', 1);
    nodeUpdate.select('#line2').text(d => d.data.lines[1]).attr('fill-opacity', 1);
    nodeUpdate.select('#line3').text(d => d.data.lines[2]).attr('fill-opacity', 1);
    nodeUpdate.select('#line4').text(d => d.data.lines[3]).attr('fill-opacity', 1);

    nodeUpdate.select('.favicon')
      .attr('href', d => d.data.favIconUrl || 'res/rabbit.svg');

    nodeUpdate.select('#toggle')
      .attr('opacity', function(d) {
        return (d.children || d._children) ? 1 : 0;
      })
      .attr('href', function(d) {
        if (d.children) return 'res/arrow-up-circle.svg';
        if (d._children) return 'res/arrow-down-circle.svg';
      });

    linkUpdate = linkEnter.merge(link).interrupt().transition()
      .duration(duration)
      .attr('d', function(d) { return linkPathGenerator(d); });
  }

  // ── Exit ───────────────────────────────────────────────────────────────────

  function exitStuff() {
    node.exit().remove();
    link.exit().remove();
  }

  enterStuff();
  updateStuff();
  exitStuff();

  descendants.forEach(d => {
    d.x0 = d.x;
    d.y0 = d.y;
    d.data.x0 = d.x;
    d.data.y0 = d.y;
  });
}

// ── Toggle collapse ───────────────────────────────────────────────────────────

function toggleChildren(d) {
  if (d.children) {
    d.data.toggle = true;
    d._children = d.children;
    d.children = null;
  } else if (d._children) {
    d.data.toggle = false;
    d.children = d._children;
    d._children = null;
  }
  drawTree(d);
}

// ── Navigate to tab in browser ────────────────────────────────────────────────

function openTab(tab) {
  BrowserApi.queryTabs(tab.data.url, function(tabs) {
    if (tabs.length > 0) {
      BrowserApi.focusTab(tabs[0].id, tabs[0].windowId);
    } else {
      BrowserApi.createTab(tab.data.url);
    }
  });
}

// ── Control buttons ───────────────────────────────────────────────────────────

document.querySelector('#centerTree').onclick = function() {
  centerNode(window.currentRoot);
};
document.querySelector('#zoomIn').onclick = function() {
  baseSvg.transition().duration(400).call(zoomer.scaleBy, 1.5);
};
document.querySelector('#zoomOut').onclick = function() {
  baseSvg.transition().duration(400).call(zoomer.scaleBy, 0.67);
};

// ── Saved Trees dropdown ──────────────────────────────────────────────────────

document.querySelectorAll('.drop').forEach(item => {
  item.onmouseover = function() {
    this.querySelectorAll('.dropdown').forEach(elem => elem.style.display = 'block');
  };
  item.onmouseleave = function() {
    this.querySelectorAll('.dropdown').forEach(elem => elem.style.display = 'none');
  };
});

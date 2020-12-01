
const svg = d3.select('svg');
const width = 1000;
const height = 1000;

const margin = { top: 0, right: 50, bottom: 0, left: 75};
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

const treeLayout = d3.tree().size([innerHeight, innerWidth]);

const zoomG = svg
    .attr('width', width)
    .attr('height', height)
  .append('g');

const g = zoomG.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

svg.call(d3.zoom().on('zoom', () => {
  console.log("Trying to zoom")
  zoomG.attr('transform', d3.event.transform);
}));

d3.json('data.json')
  .then(data => {
    const root = d3.hierarchy(data);
    const links = treeLayout(root).links();
    const linkPathGenerator = d3.linkHorizontal()
      .x(d => d.y)
      .y(d => d.x);

    g.selectAll('path').data(links)
      .enter().append('path')
        .attr('d', linkPathGenerator);

    g.selectAll('text').data(root.descendants())
      .enter().append('text')
        .attr('x', d => d.y)
        .attr('y', d => d.x)
        .attr('dy', '0.32em')
        .attr('text-anchor', d => d.children ? 'middle' : 'start')
        .attr('font-size', d => 3.25 - d.depth + 'em')
        .text(d => d.data.data.id);
  });






// // const d3 = window.d3;
//
// // import { localRoot } from '/tabs_api.js'
//
//
// // const gNode = svg.append("g")
// // .attr("r", 25)
// // .attr("stroke-width", 50)
// // .attr("transform", "translate(20, 20)")
// // .style("stroke", "#818181")
//
// function ayy(i=1) {
//   if(i === 0) {
//     console.log(i)
//     const svg1 = d3.select("#svgcontainer")
//     // .append("svg")
//     //   .attr("width", 1000)
//     //   .attr("height", 1000)
//
//     svg1.append("line")
//     .attr("x1", "200")
//     .attr("y1", 200)
//     .attr("x2", 100)
//     .attr("y2", 100)
//     .style("stroke", "rgb(255,0,0)")
//     .style("stroke-width", 2)
//     // gNode.attr("fill", "#999")
//   } else {
//     // console.log("Ilu")
//     const svg = d3.select("#svgcontainer")
//     .append("svg")
//       .attr("width", 1000)
//       .attr("height", 1000)
//
//
//     svg.append("line")
//       .attr("x1", "100")
//       .attr("y1", 100)
//       .attr("x2", 200)
//       .attr("y2", 200)
//       .style("stroke", "rgb(255,0,0)")
//       .style("stroke-width", 2);
//
//     svg.append("p")
//       .text("Fuck me")
//     // return svg.style("stroke", "blue")
//     // gNode.attr("fill", "#555")
//   }
// }
// tree = d3.tree().nodeSize([100, 159])
// function start(i=1) {
//   console.log(localRoot)
//     const root = d3.hierarchy(localRoot[0]);
//
//     root.x0 = dy / 2;
//     root.y0 = 0;
//     root.descendants().forEach((d, i) => {
//       d.id = i;
//       d._children = d.children;
//     });
//
//     const svg = d3.create("svg")
//         .attr("viewBox", [-margin.left, -margin.top, width, dx])
//         .style("font", "10px sans-serif")
//         .style("user-select", "none");
//
//     const gLink = svg.append("g")
//         .attr("fill", "none")
//         .attr("stroke", "#555")
//         .attr("stroke-opacity", 0.4)
//         .attr("stroke-width", 1.5);
//
//     const gNode = svg.append("g")
//         .attr("cursor", "pointer")
//         .attr("pointer-events", "all");
//
//     function update(source) {
//       const duration = d3.event && d3.event.altKey ? 2500 : 250;
//       const nodes = root.descendants().reverse();
//       const links = root.links();
//
//       // Compute the new tree layout.
//       tree(root);
//
//       let left = root;
//       let right = root;
//       root.eachBefore(node => {
//         if (node.x < left.x) left = node;
//         if (node.x > right.x) right = node;
//       });
//
//       const height = right.x - left.x + margin.top + margin.bottom;
//
//       const transition = svg.transition()
//           .duration(duration)
//           .attr("viewBox", [-margin.left, left.x - margin.top, width, height])
//           .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));
//
//       // Update the nodes…
//       const node = gNode.selectAll("g")
//         .data(nodes, d => d.id);
//
//       // Enter any new nodes at the parent's previous position.
//       const nodeEnter = node.enter().append("g")
//           .attr("transform", d => `translate(${source.y0},${source.x0})`)
//           .attr("fill-opacity", 0)
//           .attr("stroke-opacity", 0)
//           .on("click", (event, d) => {
//             d.children = d.children ? null : d._children;
//             update(d);
//           });
//
//       nodeEnter.append("circle")
//           .attr("r", 2.5)
//           .attr("fill", d => d._children ? "#555" : "#999")
//           .attr("stroke-width", 10);
//
//       nodeEnter.append("text")
//           .attr("dy", "0.31em")
//           .attr("x", d => d._children ? -6 : 6)
//           .attr("text-anchor", d => d._children ? "end" : "start")
//           .text(d => d.data.id)
//         .clone(true).lower()
//           .attr("stroke-linejoin", "round")
//           .attr("stroke-width", 3)
//           .attr("stroke", "white");
//
//       // Transition nodes to their new position.
//       const nodeUpdate = node.merge(nodeEnter).transition(transition)
//           .attr("transform", d => `translate(${d.y},${d.x})`)
//           .attr("fill-opacity", 1)
//           .attr("stroke-opacity", 1);
//
//       // Transition exiting nodes to the parent's new position.
//       const nodeExit = node.exit().transition(transition).remove()
//           .attr("transform", d => `translate(${source.y},${source.x})`)
//           .attr("fill-opacity", 0)
//           .attr("stroke-opacity", 0);
//
//       // Update the links…
//       const link = gLink.selectAll("path")
//         .data(links, d => d.target.id);
//
//       // Enter any new links at the parent's previous position.
//       const linkEnter = link.enter().append("path")
//           .attr("d", d => {
//             const o = {x: source.x0, y: source.y0};
//             return diagonal({source: o, target: o});
//           });
//
//       // Transition links to their new position.
//       link.merge(linkEnter).transition(transition)
//           .attr("d", diagonal);
//
//       // Transition exiting nodes to the parent's new position.
//       link.exit().transition(transition).remove()
//           .attr("d", d => {
//             const o = {x: source.x, y: source.y};
//             return diagonal({source: o, target: o});
//           });
//
//       // Stash the old positions for transition.
//       root.eachBefore(d => {
//         d.x0 = d.x;
//         d.y0 = d.y;
//       });
//     }
//
//     update(root);
//
//     return svg.node();
// }
//
//
// function hello(i=0) {
//   var canvas= d3.select("#svgcontainer").append("svg").attr("width",500).attr("height",500);
//   var data = {
//   source: {
//     x: 20,
//     y: 10
//   },
//   target: {
//     x: 280,
//     y: 100
//   }
// };
//
//   var diagonal=d3.linkHorizontal().x(function(d) { return d.y; })
//     .y(function(d) { return d.x; });
//
// canvas.append("path").attr("fill","none").attr("stroke","black");
// }

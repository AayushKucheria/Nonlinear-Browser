// const d3 = window.d3;

// import { localRoot } from '/tabs_api.js'


// TODO we've multiple trees/roots
// tree = {
//   const root = 1; //d3.hierarchy(data);
//
//   return d3.tree().nodeSize([root.dx, root.dy])(root);
// }

let width = 954;
let dx = 100;
let dy = width / 6;
let margin = ({top: 10, right: 120, bottom: 10, left: 40})
let diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x)
let tree = d3.tree().nodeSize([dx, dy])
let count = 0;
// d3.select(".myclass").append("span");
d3.select("#svgcontainer").append("svg").data(chart);
// console.log("Example.json");
// let treeJSON = d3.json("example.json", function(data) {
//   // console.log("Example = ");
//   count += 1;
// });
// console.log("Example.json Done", count);
let thisRoot = window.localRoot;

// console.log(window.localRoot);
const chart = {
  root = d3.hierarchy({
            name: "rootNode",
            children: [
                {
                    name: "child1"
                },
                {
                    name: "child2",
                    children: [
                        { name: "grandChild1" },
                    ]
                }
            ]
        });
// // console.log(window.d3tree);
//
console.log(root);
root.dx = 10;
root.dy = width / (root.height + 1);
let x0 = Infinity;
let x1 = -x0;
//
  // root.each(d => {
  //   if(d.x > x1) x1 = d.x;
  //   if(d.x < x0) x0 = d.x;
  // });
//
  root.descendants().forEach((d, i) => {
    d.id = i;
    d._children = d.children;
  });

  const svg = d3.create("svg")
      .attr("viewBox", [-margin.left, -margin.top, width, dx])
      .style("font", "10px sans-serif")
      .style("user-select", "none");

  const gLink = svg.append("g")
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5);

  const gNode = svg.append("g")
      .attr("cursor", "pointer")
      .attr("pointer-events", "all");

      function update(source) {
        const duration = d3.event && d3.event.altKey ? 2500 : 250;
        const nodes = root.descendants().reverse();
        const links = root.links();

        // Compute the new tree layout.
        tree(root);

        let left = root;
        let right = root;
        root.eachBefore(node => {
          if (node.x < left.x) left = node;
          if (node.x > right.x) right = node;
        });

        const height = right.x - left.x + margin.top + margin.bottom;

        const transition = svg.transition()
            .duration(duration)
            .attr("viewBox", [-margin.left, left.x - margin.top, width, height])
            .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));

        // Update the nodes…
        const node = gNode.selectAll("g")
          .data(nodes, d => d.id);

        // Enter any new nodes at the parent's previous position.
        const nodeEnter = node.enter().append("g")
            .attr("transform", d => `translate(${source.y0},${source.x0})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0)
            .on("click", (event, d) => {
              d.children = d.children ? null : d._children;
              update(d);
            });

        nodeEnter.append("circle")
            .attr("r", 2.5)
            .attr("fill", d => d._children ? "#555" : "#999")
            .attr("stroke-width", 10);

        nodeEnter.append("text")
            .attr("dy", "0.31em")
            .attr("x", d => d._children ? -6 : 6)
            .attr("text-anchor", d => d._children ? "end" : "start")
            .text(d => d.data.id)
          .clone(true).lower()
            .attr("stroke-linejoin", "round")
            .attr("stroke-width", 3)
            .attr("stroke", "white");

        // Transition nodes to their new position.
        const nodeUpdate = node.merge(nodeEnter).transition(transition)
            .attr("transform", d => `translate(${d.y},${d.x})`)
            .attr("fill-opacity", 1)
            .attr("stroke-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        const nodeExit = node.exit().transition(transition).remove()
            .attr("transform", d => `translate(${source.y},${source.x})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0);

        // Update the links…
        const link = gLink.selectAll("path")
          .data(links, d => d.target.id);

        // Enter any new links at the parent's previous position.
        const linkEnter = link.enter().append("path")
            .attr("d", d => {
              const o = {x: source.x0, y: source.y0};
              return diagonal({source: o, target: o});
            });

        // Transition links to their new position.
        link.merge(linkEnter).transition(transition)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition(transition).remove()
            .attr("d", d => {
              const o = {x: source.x, y: source.y};
              return diagonal({source: o, target: o});
            });

        // Stash the old positions for transition.
        root.eachBefore(d => {
          d.x0 = d.x;
          d.y0 = d.y;
        });
      }

  // const svg = d3.create("svg")
  //   .attr("viewBox", [0, 0, width, x1 - x0 + root.dx * 2]);
  //
  // const g = svg.append("g")
  //   .attr("font-family", "sans-serif")
  //   .attr("font-size", 10)
  //   .attr("transform", `translate(${root.dy / 3}, ${root.dx - x0})`);
  //
  // const link = g.append("g")
  //   .attr("fill", "none")
  //   .attr("stroke", "#555")
  //   .attr("stroke-opacity", 0.4)
  //   .attr("stroke-width", 1.5)
  // .selectAll("path")
  //   .data(root.links())
  //   .join("path")
  //     .attr("d", d3.linkHorizontal()
  //       .x(d => d.y)
  //       .y(d => d.x));
  //
  // const node = g.append("g")
  //   .attr("stroke-linejoin", "round")
  //   .attr("stroke-width", 3)
  // .selectAll("g")
  // .data(root.descendants())
  // .join("g")
  //   .attr("transform", d => `translate(${d.y}, ${d.x})`);
  //
  // // A dark cirlce if the node contains children,
  // // else a light circle
  // node.append("circle")
  //   .attr("fill", d => d.children ? "#555" : "#999")
  //   .attr("r", 2.5);
  //
  // // Write text left of circle if it has children
  // // Else on the right of circle
  // node.append("text")
  //   .attr("dy", "0.31em")
  //   .attr("x" d => d.children? -6 : 6)
  //   .attr("text-anchor", d => d.children? "end" : "start")
  //   .text(d => d.data.name) // TODO change to tab name
  // .clone(true).lower()
  //   .attr("stroke", "white")
  // update(root);
  return svg.node();
}

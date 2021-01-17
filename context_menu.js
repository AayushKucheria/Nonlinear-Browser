/**
@event: MouseClick on node
@param d = Node

*/
window.contextMenu = function(event, d, menu, openCallback) {
  //console.log("Starting custom menu function");
  // Create div element that'll hold the context menu
  d3.selectAll('contextMenu').data([1])
    .enter()
    .append('div')
      .attr('class', 'contextMenu')

  // Close Menu
  d3.select('body').on('click.contextMenu', function() {
    d3.select('.contextMenu').style('display', 'none');
  });

  d3.selectAll('.contextMenu').html('');
  var list = d3.selectAll('.contextMenu').append('ul');

  list.selectAll('li').data(menu).enter()
    .append('li')
    .html(function(choice) {
      return choice.title;
    })
    /**
    @param clickEvent = MouseClick on choice
    @param choice = {title: , action: } */
    .on('click', function(clickEvent, choice) {
    //  console.log("Event = ", event, " and d = ", d);
      //console.log("ClickEvent = ", clickEvent, " and choice = ", choice)
      choice.action(event, clickEvent, d);
      d3.select('.contextMenu').style('display', 'none');
    });

  // openCallback allows an action to fire before the menu is displayed
  // Eg: Closing a tooltip
  if(openCallback) openCallback(data, index);

  d3.select('.contextMenu')
    .style('left', (event.pageX - 2) + 'px')
    .style('top', (event.pageY - 2) + 'px')
    .style('display', 'block');

  event.preventDefault();
  event.stopPropogation;
};

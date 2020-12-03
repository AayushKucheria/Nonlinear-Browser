// SVG = Scalable Vector Graphics - they don't become blurred when we zoom in
// bundle.js is automatically created from the other js file

// Data Join --> Enter to add new elements, Update, and Exit (need to selecAll even if empty set)
// import { select } from 'd3';
// import { fruitBowl } from './fruitBowl';

const svg = d3.select('svg'); // To select all or 1 svg element

// Or you could even skip + or parseFloat (they're the same) - js can dynamically handle types
const height = +svg.attr('height');
const width = parseFloat(svg.attr('width'));

const render = () => {
  fruitBowl(svg, {fruits, height})
};

const makeFruit = type => ({ type });

let fruits = d3.range(5).map(() => makeFruit('apple'));

render();

setTimeout(() => {
  // Eat an apple
  fruits.pop()
  render()
}, 1000);

setTimeout(() => {
  // Replace apple with lemom
  fruits[2].type = 'lemon';
  render()
}, 2000);

setTimeout(() => {
  // Eat an apple
  fruits = fruits.filter((a, i) => i != 1);
  render()
}, 3000);

import '../styles/index.scss';
import * as d3 from "d3";
import * as Papa from 'papaparse';
import {edgeFile, nodeFile} from './fileThing'
const csv = require('csv-parser');  

let test = Papa.parse(edgeFile, {header:true});

console.log('test', test)

let wrap = d3.select('#wrapper');
wrap.append('text').text('is this on');





import '../styles/index.scss';
import {formatAttributeData} from './dataFormat';
import {renderAttributes,  drawContAtt, drawDiscreteAtt, renderPaths, drawPathsAndAttributes} from './rendering';
import {renderDistibutions} from './distributionView';
import * as d3 from "d3";

export function toolbarControl(toolbar, normedPaths, main, calculatedScales, moveMetric, pathView){

    let viewButton = toolbar.append('button').attr('id', 'view-toggle').attr('attr' , 'button').attr('class', 'btn btn-outline-secondary') ;

    if(pathView === 'paths'){
        viewButton.text('View Summary');
    }else if(pathView === 'summary'){
        viewButton.text('View Paths');
    }else{
        console.error('pathView parameter not found');
    }
    
    let filterButton = toolbar.append('button').attr('id', 'view-filter');
    filterButton.attr('class', 'btn btn-outline-secondary').text('Show Filters');
    filterButton.on('click', ()=> toggleFilters(filterButton, normedPaths, main, moveMetric, calculatedScales));

    let lengthButton = toolbar.append('button').attr('id', 'change-length').attr('class', 'btn btn-outline-secondary');
    if(moveMetric === 'move'){
        lengthButton.text('Show Edge Length');
    }else if(moveMetric === 'edgeLength'){
        lengthButton.text('Normalize Edge Length');
    }

    lengthButton.on('click', ()=> {
        if(lengthButton.text() === 'Show Edge Length'){
            lengthButton.text('Normalize Edge Length');
            main.selectAll('*').remove();//.selectAll('*').remove();
            if(viewButton.text() === 'View Summary'){
                drawPathsAndAttributes(normedPaths, main, calculatedScales, 'edgeLength');
            }else{
                renderDistibutions(normedPaths, main, calculatedScales, 'edgeLength');
            }
        }else{
            lengthButton.text('Show Edge Length');
            main.selectAll('*').remove();//.selectAll('*').remove();
            if(viewButton.text() === 'View Summary'){
                drawPathsAndAttributes(normedPaths, main, calculatedScales, moveMetric);
            }else{
                renderDistibutions(normedPaths, main, calculatedScales, moveMetric);
            }
        }
    });

    let scrunchButton = toolbar.append('button').attr('id', 'scrunch');
    scrunchButton.attr('class', 'btn btn-outline-secondary').text('Collapse Attributes');
    scrunchButton.on('click', ()=> toggleScrunch(scrunchButton, normedPaths, main, calculatedScales));

    let form = toolbar.append('form').classed('form-inline', true);
    let input = form.append('input').classed('form-control mr-sm-2', true)
    input.attr('type', 'search').attr('placeholder', 'Search').attr('aria-label', 'Search');
    let searchButton = form.append('button').classed('btn btn-outline-success my-2 my-sm-0', true).attr('type', 'submit').append('i').classed("fas fa-search", true)

    viewButton.on('click', ()=> togglePathView(viewButton, normedPaths, main, calculatedScales));
}

function toggleFilters(filterButton, normedPaths, main, moveMetric, scales){
    let filterDiv = d3.select('#filter-tab');
   
    if(filterDiv.classed('hidden')){
        filterButton.text('Hide Filters');
        filterDiv.classed('hidden', false);
        main.style('padding-top', '200px');
        renderAttToggles(filterDiv, normedPaths, scales, 'edgeLength');

        let keys = Object.keys(normedPaths[0][0].attributes);
        let selectWrapper = filterDiv.append('div').classed('select-wrapper', true);
        selectWrapper.append('h4').text('State Transition:');
        let attButton = stateChange(selectWrapper, keys, 'attr-select', 'Trait:');

        let attProps = selectWrapper.append('div').classed('attribute-properties', true);

        attButton.on("change", function(d) {
            var selectedOption = d3.select(this).property("value");

            let options = scales.filter(f=> f.field === selectedOption)[0];
            
            attProps.selectAll('*').remove();

            if(options.type === "discrete"){
                let optionArray = ['Any'];
                let optKeys = options.scales.map(s=> s.scaleName);
                optionArray = optionArray.concat(optKeys);
                let button1 = stateChange(attProps, optionArray, 'predicted-state', 'From');
                let button2 = stateChange(attProps, optionArray, 'observed-state', 'To');
                let submit = attProps.append('button').classed('btn btn-outline-success', true);
                submit.text('Filter');

                submit.on('click', ()=> {
                   
                    let fromState = button1.node().classList[0];
                    let toState = button2.node().classList[0];
                      ////GOING TO ADD FILTERING HERE//// NEED TO BREAK INTO ITS OWN THING/////
                
                    let test = normedPaths.filter(path=> {
                     
                        let filterPred = path.filter(f=> f.leaf != true).map(node=> {
                            let states = node.attributes[selectedOption].states;
                            if(fromState === 'Any'){
                                return true;
                            }else{
                                return states.filter(st=> st.state === fromState)[0].realVal > 0.75;
                            }
                            
                        });
                        let filterObs = path.filter(f=> f.leaf === true).map(node=> {
                          //console.log(node.attributes[selectedOption]);
                          let win = node.attributes[selectedOption].winState;
                          if(toState === 'Any'){
                              return true;
                          }else{
                              return win === toState;
                          }
                        });
                       

                        return filterPred.indexOf(true) > -1 && filterObs.indexOf(true) > -1
                    });

                    console.log(test);
                    ////DRAW THE PATHS
                    drawPathsAndAttributes(test, main, scales, moveMetric);

                    /////ADD THE FILTER TO THE TOOLBAR/////
                    let filterToolbar = d3.select("#toolbar");

                    let filterButton = filterToolbar.append('button').classed('btn btn-info', true);
                    let span = filterButton.append('span').classed('badge', true);
                    span.text(test.length);
                   // filterButton.append('h5').text(selectedOption + "  ");
                    filterButton.append('h6').text(fromState)
                    filterButton.append('i').classed('fas fa-arrow-right', true);
                    filterButton.append('h6').text(toState + '  ');
                   
                    let xSpan = filterButton.append('i').classed('close fas fa-times', true);
                    xSpan.on('click', ()=> {
                        drawPathsAndAttributes(normedPaths, main, scales, moveMetric);
                        filterButton.remove();
                    })

                })
            }else{
                
                let yScale = d3.scaleLinear().domain([options.min, options.max]).range([60, 0]);
               
                let continRanges = attProps.append('svg');
                continRanges.attr('wdith', 200).attr('height', 60);
                let data = [{'label':'From', 'type': 'predicted'}, {'label':'To', 'type': 'observed'}]
                let ranges = continRanges.selectAll('.range').data(data).join('g').classed('range', true)

                let brushBars = ranges.append('g');
                ranges.attr('transform', (d, i)=> 'translate('+((i*100)+ (25)+',10)'));
                let labels = brushBars.append('text').text((d)=> d.label+ ': ');
                labels.attr('x', -25).attr('y', 20)
                let wrapperRect = brushBars.append('rect').attr('width', 20).attr('height', 50);
                wrapperRect.attr('x', 10);

                ranges.append("g")
                .attr("class", "axis axis--y")
                .attr("transform", "translate(30,0)")
                .call(d3.axisRight(yScale).ticks(3));
                
                let brushMoved = function(){
                    var s = d3.event.selection;
                    if (s == null) {
                      handle.attr("display", "none");
                    
                    } else {
                      var sx = s.map(yScale.invert);
                    }
                }
                let xBrush = d3.brushY().extent([[10,0], [30, 50]]).on("end", brushMoved);
                let brushGroup = ranges.append('g').call(xBrush);
                brushGroup.call(xBrush.move, [0, 50]);

                let submit = attProps.append('button').classed('btn btn-outline-success', true);
                submit.text('Filter');

                submit.on('click', ()=> {
                    let selections = brushGroup._groups[0].map(m=> m.__brush.selection.map(s=> s[1]));
                    
                    let predictedFilter = selections[0].map(yScale.invert).sort();
                    let observedFilter = selections[1].map(yScale.invert).sort();

                    ////GOING TO ADD FILTERING HERE//// NEED TO BREAK INTO ITS OWN THING/////

                    let test = normedPaths.filter(path=> {
                        let filterArray = path.map(node=> {
                            let numb = node.attributes[selectedOption].realVal;
                            if(node.leaf == true){
                                return numb > observedFilter[0] && numb < observedFilter[1];
                            }else{
                                return numb > predictedFilter[0] && numb < predictedFilter[1];
                            }
                        });
                        return filterArray.indexOf(false) === -1
                    })

                    ////DRAW THE PATHS
                    drawPathsAndAttributes(test, main, scales, moveMetric);

                    /////ADD THE FILTER TO THE TOOLBAR/////
                    let filterToolbar = d3.select("#toolbar");

                    let formater = d3.format(".2s");

                    let filterButton = filterToolbar.append('button').classed('btn btn-info', true);
                    let span = filterButton.append('span').classed('badge', true);
                    span.text(test.length);
                    let label = filterButton.append('h6').text(selectedOption + "  Predicted: "+ formater(predictedFilter[0]) + "-" + formater(predictedFilter[1]) + " Observed: " + formater(observedFilter[0]) + "-" + formater(observedFilter[1]));
                    let xSpan = label.append('i').classed('close fas fa-times', true);
                    xSpan.on('click', ()=> {
                        drawPathsAndAttributes(normedPaths, main, scales, moveMetric);
                        filterButton.remove();
                    })
                })
            }
         })

    }else{
        filterButton.text('Show Filters');
        filterDiv.selectAll('*').remove();
        filterDiv.classed('hidden', true);
        main.style('padding-top', '0px');
    }
}

function toggleScrunch(button, normedPaths, main, calculatedScales){
    if(button.text() === 'Collapse Attributes'){
        button.text('Expand Attributes');
        main.selectAll('*').remove();//.selectAll('*').remove();
        drawPathsAndAttributes(normedPaths, main, calculatedScales, 'move', true);
    }else{
        button.text('Collapse Attributes');
        main.selectAll('*').remove();//.selectAll('*').remove();
        drawPathsAndAttributes(normedPaths, main, calculatedScales, 'move', false);
    }
}

/**
 * 
 * @param {*} viewButton button that changes the actual view the text of the button determines what the view should change to 
 * @param {*} normedPaths 
 * @param {*} main 
 * @param {*} calculatedScales 
 */
function togglePathView(viewButton, normedPaths, main, calculatedScales){
   
    if(viewButton.text() === 'View Paths'){
        viewButton.text('View Summary');
        main.selectAll('*').remove();//.selectAll('*').remove();
        drawPathsAndAttributes(normedPaths, main, calculatedScales, 'move');
    }else{
        viewButton.text('View Paths');
        main.selectAll('*').remove();
        renderDistibutions(normedPaths, main, calculatedScales, 'move');
    }
}

export function renderAttToggles(filterDiv, normedPaths, scales, moveMetric){

    ////NEED TO GET RID OF TOGGLE SVG
    let keys = Object.keys(normedPaths[0][0].attributes);
   
    let svg = filterDiv.append('svg').classed('attr-toggle-svg', true)

   let title = svg.append('text').text('Attributes: ')
    title.attr('x', 20).attr('y', 10);
    
    let labelWrap = svg.append('g').attr('transform', 'translate(20, 25)');
    let labelGroups = labelWrap.selectAll('g').data(keys).join('g'); 
    
    labelGroups.attr('transform', (d, i)=> 'translate(0,'+(i* 25)+')');

    let toggle = labelGroups.append('circle').attr('cx', 0).attr('cy', 0);
    toggle.classed('toggle shown', true);
    toggle.style('fill', (d, i)=>{
        return scales.filter(f=> f.field === d)[0].catColor;
    });

    toggle.on('click', function(d, i){
        let togg = d3.select(this);
        toggleCircle(togg, scales);
        let newKeys = d3.selectAll('.shown');
        let attributeWrapper = d3.selectAll('.attribute-wrapper');
        attributeWrapper.selectAll('g').remove();
        let attributeHeight = 45;
      
          /// LOWER ATTRIBUTE VISUALIZATION ///
      
        let attData =  formatAttributeData(normedPaths, scales, newKeys.data());
        let predictedAttrGrps = renderAttributes(attributeWrapper, attData, scales, null);

        d3.select('#main-path-view').style('height', ((normedPaths.length + predictedAttrGrps.data().map(m=> m[0]).length)* 30) + 'px');
        d3.selectAll('.paths').attr('transform', (d, i)=> 'translate(10,'+ (i * ((attributeHeight + 5)* (newKeys.data().length + 1))) +')');
        
        drawContAtt(predictedAttrGrps, moveMetric);
        drawDiscreteAtt(predictedAttrGrps, scales, moveMetric);

    });
    let labelText = labelGroups.append('text').text(d=> d).style('font-size', 10);
    labelText.attr('transform', 'translate(10, 4)')
   
    
}

function toggleCircle(circle, scales){
    if(circle.classed('shown')){
        circle.classed('shown', false);
        circle.style('fill', '#fff');
    }else{
        circle.classed('shown', true);
        circle.style('fill', (d, i)=> scales.filter(f=> f.field === d)[0].catColor);
    }
}

export function stateChange(selectorDiv, keys, selectId, label){

    let dropDownWrapper = selectorDiv.append('div').classed('selector', true);
    let header = dropDownWrapper.append('h6').text(label);
    	// create the drop down menu of cities
	let selectOp = dropDownWrapper
    .append("select")
    .attr("id", selectId).attr('class', 'Any');
    
    let options = selectOp.selectAll("option")
    .data(keys).join("option");

    options.text(d=> d).attr("value", d=> d);

    d3.select("#"+selectId).on("change", function(d) {
       var selectedOption = d3.select(this).property("value");
       d3.select(this).attr('class', selectedOption);
    })

    return d3.select('#'+ selectId);
}
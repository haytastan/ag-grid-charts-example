import { PolarChart } from "ag-grid-enterprise/src/charts/chart/polarChart";
import { PieSeries } from "ag-grid-enterprise/src/charts/chart/series/pieSeries";
import { DropShadow } from "ag-grid-enterprise/src/charts/scene/dropShadow";
import { Offset } from "ag-grid-enterprise/src/charts/scene/offset";
import { Chart, LegendPosition } from "ag-grid-enterprise/src/charts/chart/chart";
import { Padding } from "ag-grid-enterprise/src/charts/util/padding";

import './app.css';

type Datum = {
    label: string,
    value: number,
    other: number
};

const data: Datum[] = [
    { label: 'Android', value: 56.9, other: 7 },
    { label: 'iOS', value: 22.5, other: 8 },
    { label: 'BlackBerry', value: 6.8, other: 9 },
    { label: 'Symbian', value: 8.5, other: 10 },
    { label: 'Bada', value: 2.6, other: 11 },
    { label: 'Windows', value: 1.9, other: 12 }
];

const data2: Datum[] = [
    { label: 'Nigel', value: 7, other: 8 },
    { label: 'Lucy', value: 6, other: 9 },
    { label: 'Rick', value: 4, other: 10 },
    { label: 'Barbara', value: 3, other: 8 },
    { label: 'John', value: 3, other: 7 },
    { label: 'Ben', value: 5, other: 12 },
    { label: 'Maria', value: 3, other: 10 },
    { label: 'Vicky', value: 8, other: 11 }
];

function createButton(text: string, action: EventListenerOrEventListenerObject): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = text;
    document.body.appendChild(button);
    button.addEventListener('click', action);
    return button;
}

function createSlider<D>(text: string, values: D[], action: (value: D) => void): HTMLInputElement {
    const n = values.length;
    const id = String(Date.now());
    const sliderId = 'slider-' + id;
    const datalistId = 'slider-list-' + id;
    const wrapper = document.createElement('div');
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.width = '300px';
    wrapper.style.padding = '5px';
    wrapper.style.margin = '5px';
    wrapper.style.border = '1px solid lightgray';
    wrapper.style.borderRadius = '5px';
    wrapper.style.backgroundColor = 'white';

    const slider = document.createElement('input');
    slider.setAttribute('id', sliderId);
    slider.setAttribute('list', datalistId);
    slider.style.height = '1.8em';
    slider.style.flex = '1';

    const label = document.createElement('label');
    label.setAttribute('for', sliderId);
    label.innerHTML = text;
    label.style.font = '12px sans-serif';
    label.style.marginRight = '5px';

    // Currently, no browser fully supports these features.
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/range
    const datalist = document.createElement('datalist');
    datalist.setAttribute('id', datalistId);

    values.forEach((value, index) => {
        const option = document.createElement('option');
        option.setAttribute('value', String(index));
        option.setAttribute('label', String(value));
        datalist.appendChild(option);
    });

    slider.type = 'range';
    slider.min = '0';
    slider.max = String(n - 1);
    slider.step = '1';
    slider.value = '0';
    slider.style.width = '200px';

    wrapper.appendChild(label);
    wrapper.appendChild(slider);
    wrapper.appendChild(datalist);
    document.body.appendChild(wrapper);

    slider.addEventListener('input', (e) => {
        const index = +(e.target as HTMLInputElement).value;
        action(values[index]);
    });
    return slider;
}

function makeChartResizeable(chart: Chart) {
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let chartSize: [number, number];
    const scene = chart.scene;

    scene.hdpiCanvas.canvas.addEventListener('mousedown', (e: MouseEvent) => {
        startX = e.offsetX;
        startY = e.offsetY;
        chartSize = chart.size;
        isDragging = true;
    });
    scene.hdpiCanvas.canvas.addEventListener('mousemove', (e: MouseEvent) => {
        if (isDragging) {
            const dx = e.offsetX - startX;
            const dy = e.offsetY - startY;
            chart.size = [chartSize[0] + dx, chartSize[1] + dy];
        }
    });
    scene.hdpiCanvas.canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const chart = new PolarChart();
    chart.width = 800;
    chart.height = 400;
    chart.scene.hdpiCanvas.canvas.style.border = '1px solid black';

    makeChartResizeable(chart);

    let backgroundColor = 'white';
    const shadow = new DropShadow('rgba(0,0,0,0.2)', new Offset(0, 0), 15);

    const pieSeries = new PieSeries<Datum>();
    pieSeries.innerRadiusOffset = -40;
    chart.addSeries(pieSeries);
    pieSeries.data = data;
    pieSeries.angleField = 'value';
    pieSeries.labelField = 'label';
    pieSeries.label = true;
    pieSeries.title = 'Mobile OSes';
    pieSeries.shadow = shadow;
    pieSeries.lineWidth = 1;
    pieSeries.calloutWidth = 1;

    const pieSeries2 = new PieSeries<Datum>();
    pieSeries2.outerRadiusOffset = -80;
    pieSeries2.innerRadiusOffset = -120;
    chart.addSeries(pieSeries2);
    pieSeries2.data = data2;
    pieSeries2.title = 'Users';
    pieSeries2.angleField = 'value';
    pieSeries2.labelField = 'label';
    pieSeries2.label = true;

    document.body.appendChild(document.createElement('br'));

    createButton('Save Chart Image', () => {
        chart.scene.download({ fileName: 'pie-chart', background: backgroundColor });
    });
    createButton('Show tooltips', () => {
        pieSeries.tooltip = true;
        pieSeries2.tooltip = true;
    });
    createButton('Hide tooltips', () => {
        pieSeries.tooltip = false;
        pieSeries2.tooltip = false;
    });
    createButton('Use tooltip renderer', () => {
        pieSeries.tooltipRenderer = params => {
            return `<em>Value</em>: <span style="color: red;">${params.datum[params.angleField]}</span>`;
        };

        pieSeries2.tooltipRenderer = params => {
            const radiusValue = params.radiusField ? `<br>Radius: ${params.datum[params.radiusField]}` : '';
            return `Angle: ${params.datum[params.angleField]}${radiusValue}`;
        };
    });
    createButton('Remove tooltip renderer', () => {
        pieSeries.tooltipRenderer = undefined;
        pieSeries2.tooltipRenderer = undefined;
    });
    createButton('Show labels', () => {
        pieSeries.label = true;
        pieSeries2.label = true;
    });
    createButton('Hide labels', () => {
        pieSeries.label = false;
        pieSeries2.label = false;
    });
    createButton('Set series name', () => {
        pieSeries.title = 'Super series';
        pieSeries2.title = 'Duper series';
    });
    createButton('Remove series name', () => {
        pieSeries.title = '';
        pieSeries2.title = '';
    });
    createButton('Remove inner series', () => {
        chart.removeSeries(pieSeries2);
    });
    createButton('Add inner series', () => {
        chart.addSeries(pieSeries2);
    });

    createButton('Use radius field', () => {
        pieSeries2.data = data2;
        pieSeries2.angleField = 'value';
        pieSeries2.labelField = 'label';
        pieSeries2.radiusField = 'other';
    });
    createButton('Remove radius field', () => {
        pieSeries2.radiusField = undefined;
    });
    createButton('Run other tests', () => {
        setTimeout(() => {
            chart.padding = new Padding(70, 100, 70, 100);
            chart.size = [640, 300];
        }, 2000);

        setTimeout(() => {
            pieSeries.labelField = undefined;
        }, 4000);

        setTimeout(() => {
            pieSeries.data = data2;
            pieSeries.angleField = 'value';
            pieSeries.labelField = 'label';
        }, 6000);

        setTimeout(() => {
            pieSeries.data = data;
        }, 8000);

        setTimeout(() => {
            pieSeries2.angleField = 'other';
        }, 10000);

        setTimeout(() => {
            pieSeries2.radiusField = 'other';
            pieSeries2.strokeStyle = 'white';
            pieSeries2.calloutColor = 'black';
            pieSeries2.lineWidth = 3;
            pieSeries2.calloutWidth = 1;
        }, 12000);
    });

    document.body.appendChild(document.createElement('br'));

    createButton('Light theme', () => {
        const labelColor = 'black';
        chart.legend.labelColor = labelColor;
        pieSeries.labelColor = labelColor;
        pieSeries2.labelColor = labelColor;
        document.body.style.backgroundColor = backgroundColor = 'white';
    });
    createButton('Dark theme', () => {
        const labelColor = 'rgb(221, 221, 221)';
        chart.legend.labelColor = labelColor;
        pieSeries.labelColor = labelColor;
        pieSeries2.labelColor = labelColor;
        document.body.style.backgroundColor = backgroundColor = '#1e1e1e';
    });

    document.body.appendChild(document.createElement('br'));

    createSlider('innerRadiusOffset', [-120, 0], v => {
        pieSeries2.innerRadiusOffset = v;
    });
    createSlider('calloutColor', [null, 'red', 'green', 'blue', 'rgba(0,0,0,0)'], v => {
        pieSeries2.calloutColor = v;
    });
    createSlider('calloutWidth', [2, 3, 4, 5, 6], v => {
        pieSeries2.calloutWidth = v;
    });

    let rotationIncrement = 0;
    createSlider('rotation', [0, 0.2, 0.4, 0.6], v => {
        rotationIncrement = v;
        (function step() {
            pieSeries.rotation -= rotationIncrement;
            pieSeries2.rotation += rotationIncrement;
            chart.onLayoutDone = rotationIncrement ? step : undefined;
        })();
    });

    createSlider('calloutLength', [10, 20, 30], v => {
        pieSeries.calloutLength = v;
    });

    createSlider('calloutPadding', [3, 6, 9, 12], v => {
        pieSeries2.calloutPadding = v;
    });

    createSlider('labelFont', ['12px sans-serif', 'bold 14px sans-serif', '16px Papyrus'], v => {
        pieSeries.labelFont = v;
    });

    createSlider('titleFont', ['bold 12px sans-serif', 'italic 14px sans-serif', '20px Papyrus'], v => {
        pieSeries.titleFont = v;
    });

    createSlider('labelColor', ['black', 'red', 'gold', 'rgb(221, 221, 221)'], v => {
        pieSeries.labelColor = v;
    });

    createSlider('labelMinAngle', [20, 40, 60], v => {
        pieSeries2.labelMinAngle = v;
    });

    createSlider('legendPosition', [LegendPosition.Right, LegendPosition.Bottom, LegendPosition.Left, LegendPosition.Top], v => {
        chart.legendPosition = v;
    });
    createSlider('legendMarkerLineWidth', [1, 2, 3, 4, 5, 6], v => {
        chart.legend.markerLineWidth = v;
    });
    createSlider('legendMarkerSize', [4, 6, 10, 14, 18, 22, 26, 30], v => {
        chart.legend.markerSize = v;
    });
    createSlider('legendItemPaddingX', [4, 6, 8, 10, 12, 16], v => {
        chart.legend.itemPaddingX = v;
    });
    createSlider('legendItemPaddingY', [4, 6, 8, 10, 12, 16], v => {
        chart.legend.itemPaddingY = v;
    });
    createSlider('legendLabelFont', ['12px sans-serif', '18px sans-serif', '24px sans-serif', '30px sans-serif', '36px sans-serif'], v => {
        chart.legend.labelFont = v;
    });
    createSlider('legendLabelColor', ['black', 'red', 'gold', 'green'], v => {
        chart.legend.labelColor = v;
    });
    createSlider('legendMarkerPadding', [8, 12, 16, 20, 24], v => {
        chart.legend.markerPadding = v;
    });
});

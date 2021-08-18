import { BandScale, Group, Line, LinearScale, Path } from '../../charts/main';
import { Selection } from '../../charts/scene/selection'
import { Observable, reactive } from '../../charts/util/observable';
import { MiniChart, SeriesNodeDatum } from './miniChart';
import { Marker } from './marker';
import { toTooltipHtml } from './miniChartTooltip';
import { getMarkerShape } from './util';

interface AreaNodeDatum extends SeriesNodeDatum { }
interface AreaPathDatum extends SeriesNodeDatum { }
interface MarkerFormat {
    enabled?: boolean;
    shape?: string;
    size?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
}
interface MarkerFormatterParams {
    datum: any;
    xValue: any;
    yValue: any;
    fill?: string;
    stroke?: string;
    strokeWidth: number;
    size: number;
    highlighted: boolean;
}
class MiniChartMarker extends Observable {
    @reactive() enabled: boolean = true;
    @reactive() shape: string = 'circle';
    @reactive('update') size: number = 0;
    @reactive('update') fill?: string = 'rgb(124, 181, 236)';
    @reactive('update') stroke?: string = 'rgb(124, 181, 236)';
    @reactive('update') strokeWidth: number = 1;
    @reactive('update') formatter?: (params: MarkerFormatterParams) => MarkerFormat;
}
class MiniChartLine extends Observable {
    @reactive('update') stroke: string = 'rgb(124, 181, 236)';
    @reactive('update') strokeWidth: number = 1;
}
export class MiniAreaChart extends MiniChart {
    
    static className = 'MiniAreaChart';

    @reactive('update') fill: string = 'rgba(124, 181, 236, 0.25)';

    private miniAreaChartGroup: Group = new Group();
    protected strokePath: Path = new Path();
    protected fillPath: Path = new Path();
    private areaPathData: AreaPathDatum[];
    private xAxisLine: Line = new Line();
    protected yScale: LinearScale = new LinearScale();
    protected xScale: BandScale<number> = new BandScale<number>();
    private markers: Group = new Group();
    private markerSelection: Selection<Marker, Group, AreaNodeDatum, any> = Selection.select(this.markers).selectAll<Marker>();
    private markerSelectionData: AreaNodeDatum[] = [];

    readonly marker = new MiniChartMarker();
    readonly line = new MiniChartLine();

    constructor() {
        super();

        this.addEventListener('update', this.scheduleLayout, this);
        this.rootGroup.append(this.miniAreaChartGroup);
        this.miniAreaChartGroup.append([this.fillPath, this.xAxisLine, this.strokePath, this.markers]);

        this.marker.addEventListener('update', this.updateMarkers, this);
        this.marker.addPropertyListener('enabled', this.updateMarkers, this);
        this.marker.addPropertyListener('shape', this.onMarkerShapeChange, this);
        this.line.addEventListener('update', this.scheduleLayout, this);
    }

    protected getNodeData(): AreaNodeDatum[] {
        return this.markerSelectionData;
    }

    private onMarkerShapeChange() {
        this.markerSelection = this.markerSelection.setData([]);
        this.markerSelection.exit.remove();
        this.scheduleLayout();
    }

    protected update(): void {
        const { seriesRect } = this;
        this.rootGroup.translationX = seriesRect.x;
        this.rootGroup.translationY = seriesRect.y;

        this.updateXScale();
        this.updateYScaleRange();
        this.updateYScaleDomain();

        this.updateXAxisLine();

        const data = this.generateNodeData();
        if (!data) {
            return;
        }

        const { nodeData, areaData } = data;

        this.markerSelectionData = nodeData;
        this.areaPathData = areaData;

        this.updateMarkerSelection(nodeData);
        this.updateMarkers();

        this.updateStroke(nodeData);
        this.updateFill(areaData);
    }

    protected updateYScaleRange(): void {
        const { yScale, seriesRect } = this;
        yScale.range = [seriesRect.height, 0];
    }

    protected updateYScaleDomain(): void {
        const { yData, yScale } = this;
        let [minY, maxY] = this.findMinAndMax(yData);

        if (yData.length > 1) {
            // if minY is positive, set minY to 0.
            minY = minY < 0 ? minY : 0;

            // if minY and maxY are equal and negative, maxY should be set to 0?
            if (minY === maxY) {
                const padding = Math.abs(minY * 0.01);
                maxY = 0 + padding;
                minY -= padding;
            }
        }

        yScale.domain = [minY, maxY];
    }

    protected updateXScale(): void {
        const { xScale, seriesRect, xData } = this;
        xScale.range = [0, seriesRect.width];
        xScale.domain = xData;
    }

    protected generateNodeData(): { nodeData: AreaNodeDatum[], areaData: AreaPathDatum[] } | undefined {
        const { yData, xData, data, xScale, yScale } = this;

        if (!data) {
            return;
        }

        const offsetX = xScale.bandwidth / 2;
        const n = yData.length;

        const nodeData: AreaNodeDatum[] = [];
        const areaData: AreaPathDatum[] = [];

        for (let i = 0; i < n; i++) {
            let yDatum = yData[i];
            let xDatum = xData[i];

            let invalidDatum = yDatum === undefined;
            
            if (invalidDatum) {
                yDatum = 0;
            }

            const x = xScale.convert(xDatum) + offsetX;
            const y = yScale.convert(yDatum);

            nodeData.push({
                seriesDatum: { x: xDatum, y: invalidDatum ? undefined : yDatum },
                point: { x, y }
            });

            areaData.push({
                seriesDatum: { x: xDatum, y: invalidDatum ? undefined : yDatum },
                point: { x, y }
            });
        }

        // Phantom points for creating closed area
        const yZero = yScale.convert(0);
        const firstX = xScale.convert(xData[0]) + offsetX;
        const lastX = xScale.convert(xData[n-1]) + offsetX;

        areaData.push(
            { seriesDatum: undefined, point: { x: lastX, y: yZero} },
            { seriesDatum: undefined, point: { x: firstX, y: yZero} }
        );

        return { nodeData, areaData };
    }

    private updateXAxisLine() {
        const { xScale, yScale, axis, xAxisLine } = this;

        xAxisLine.x1 = xScale.range[0];
        xAxisLine.x2 = xScale.range[1];
        xAxisLine.y1 = xAxisLine.y2 = 0;
        xAxisLine.stroke = axis.stroke;
        xAxisLine.strokeWidth = axis.strokeWidth;

        const yZero: number = yScale.convert(0);
        xAxisLine.translationY = yZero;
    }

    private updateMarkerSelection(selectionData: AreaNodeDatum[]): void {
        const { marker } = this;

        const shape = getMarkerShape(marker.shape);

        let updateMarkerSelection = this.markerSelection.setData(selectionData);
        let enterMarkerSelection = updateMarkerSelection.enter.append(shape);

        updateMarkerSelection.exit.remove();

        this.markerSelection = updateMarkerSelection.merge(enterMarkerSelection);
    }

    private updateMarkers(): void {
        const { highlightedDatum, highlightStyle,  marker } = this;
        const { size: highlightSize, fill: highlightFill, stroke: highlightStroke, strokeWidth: highlightStrokeWidth } = highlightStyle;
        const markerFormatter = marker.formatter;

        this.markerSelection.each((node, datum) => {
            const { point, seriesDatum } = datum;

            const highlighted = point.x === highlightedDatum?.point.x && point.y === highlightedDatum?.point.y;
            const markerFill = highlighted && highlightFill !== undefined ? highlightFill : marker.fill;
            const markerStroke = highlighted && highlightStroke !== undefined ? highlightStroke : marker.stroke;
            const markerStrokeWidth = highlighted && highlightStrokeWidth !== undefined ? highlightStrokeWidth : marker.strokeWidth;
            const markerSize = highlighted && highlightSize !== undefined ? highlightSize : marker.size;
            
            let markerFormat: MarkerFormat | undefined = undefined;

            if (markerFormatter) {
                markerFormat = markerFormatter({
                    datum, 
                    xValue: seriesDatum.x, 
                    yValue: seriesDatum.y,
                    fill: markerFill,
                    stroke: markerStroke,
                    strokeWidth: markerStrokeWidth,
                    size: markerSize,
                    highlighted
                });
            }

            node.size = markerFormat?.size || markerSize;
            node.fill = markerFormat?.fill || markerFill;
            node.stroke = markerFormat?.stroke || markerStroke;
            node.strokeWidth = markerFormat?.strokeWidth || markerStrokeWidth;

            node.translationX = point.x;
            node.translationY = point.y;
            node.visible = markerFormat?.enabled || marker.enabled && node.size > 0;
        });
    }

    updateStroke(nodeData: SeriesNodeDatum[]) {
        const { strokePath, yData, line } = this;

        const path = strokePath.path;
        const n = yData.length;
        
        path.clear();

        if (yData.length < 2) {
            return;
        }

        for (let i = 0; i < n; i++) {
            let x = nodeData[i].point.x;
            let y = nodeData[i].point.y;

            if (i > 0) {
                path.lineTo(x, y);
            } else {
                path.moveTo(x, y);
            }
        }

        strokePath.lineJoin = strokePath.lineCap = 'round';
        strokePath.fill = undefined;
        strokePath.stroke = line.stroke;
        strokePath.strokeWidth = line.strokeWidth;
    }

    updateFill(areaData: SeriesNodeDatum[]) {
        const { fillPath, yData, fill } = this;

        const path = fillPath.path;
        const n = areaData.length;

        path.clear();

        if (yData.length < 2) {
            return;
        }

        for (let i = 0; i < n; i++) {
            const x = areaData[i].point.x;
            const y = areaData[i].point.y;
            if (i > 0) {
                path.lineTo(x, y);
            } else {
                path.moveTo(x, y);
            }
        }

        path.closePath();

        fillPath.lineJoin = 'round';
        fillPath.stroke = undefined;
        fillPath.fill = fill;
    }

    private highlightedDatum?: SeriesNodeDatum;
    protected highlightDatum(closestDatum: SeriesNodeDatum): void {
        this.highlightedDatum = closestDatum;
        this.updateMarkers();
    }

    protected dehighlightDatum(): void {
        this.highlightedDatum = undefined;
        this.updateMarkers();
    }

    getTooltipHtml(datum: SeriesNodeDatum): string | undefined {
        const { title, marker } = this;
        const seriesDatum = datum.seriesDatum;
        const yValue = datum.seriesDatum.y;
        const xValue = datum.seriesDatum.x;
        const backgroundColor = marker.fill;
        const content = typeof xValue !== 'number' ? `${this.formatDatum(seriesDatum.x)}: ${this.formatDatum(seriesDatum.y)}` : `${this.formatDatum(seriesDatum.y)}`;

        const defaults = {
            backgroundColor,
            title,
            content
        }

        if (this.tooltip.renderer) {
            return toTooltipHtml(this.tooltip.renderer({
                datum: seriesDatum,
                title,
                backgroundColor,
                yValue,
                xValue,
            }), defaults);
        }

        return toTooltipHtml(defaults);
    }
}
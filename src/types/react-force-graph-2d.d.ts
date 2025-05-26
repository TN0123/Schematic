declare module 'react-force-graph-2d' {
  import { Component } from 'react';
  interface ForceGraphProps {
    graphData: any;
    nodeLabel?: string | ((node: any) => string);
    nodeCanvasObject?: (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => void;
    linkColor?: string | ((link: any) => string);
    linkWidth?: number | ((link: any) => number);
    linkDirectionalParticles?: number;
    linkDirectionalParticleSpeed?: number;
    onNodeClick?: (node: any) => void;
    onNodeRightClick?: (node: any) => void;
    cooldownTicks?: number;
    onEngineStop?: () => void;
  }
  export default class ForceGraph2D extends Component<ForceGraphProps> {
    zoom: (value: number) => void;
    centerAt: (x: number, y: number) => void;
    zoomToFit: (duration?: number) => void;
  }
} 
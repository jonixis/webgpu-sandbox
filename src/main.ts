import { Renderer } from './Renderer';

const canvas: HTMLCanvasElement = <HTMLCanvasElement> document.getElementById('webgpu-canvas');
const renderer = new Renderer(canvas);

renderer.initialize();

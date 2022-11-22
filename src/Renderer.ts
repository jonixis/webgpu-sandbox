import { Mesh } from './Mesh';
import shader from './shaders/mesh.wgsl';
import { mat4 } from 'gl-matrix';
import { Material } from './Material';
import textureImage from '../assets/tex.jpg';

export class Renderer {
  private canvas: HTMLCanvasElement;

  private adapter: GPUAdapter;
  private device: GPUDevice;
  private context: GPUCanvasContext;
  private format: GPUTextureFormat;

  private uniformBuffer: GPUBuffer;
  private bindGroup: GPUBindGroup;
  private pipeline: GPURenderPipeline;

  private triangleMesh: Mesh;
  private material: Material;
  private t: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.t = 0.0;
  }

  async initialize() {
    await this.setupDevice();
    await this.createAssets();
    await this.createPipeline();
    this.render();
  }

  private async setupDevice() {
    const gpu = navigator.gpu;

    // Check for WebGPU support
    const webGpuCheckElement: HTMLElement = <HTMLElement> document.getElementById('webgpu-check');
    if (!gpu) {
      webGpuCheckElement.innerText = 'not supported'; 
    }

    this.adapter = <GPUAdapter> await gpu?.requestAdapter();
    this.device = <GPUDevice> await this.adapter?.requestDevice();
    this.context = <GPUCanvasContext> <unknown> this.canvas.getContext('webgpu');
    this.format = 'bgra8unorm';
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'opaque'
    });
  }

  private async createAssets() {
    const triangleVertices = new Float32Array(
      [
        0.0, 0.5, 0.0, 0.5, 0.0,
        -0.5, -0.5, 0.0, 0.0, 1.0,
        0.5, -0.5, 0.0, 1.0, 1.0
      ]
    );
    this.triangleMesh = new Mesh(this.device, triangleVertices);
    this.material = new Material();
    await this.material.initialize(this.device, textureImage);
  }
  
  private async createPipeline() {

    this.uniformBuffer = this.device.createBuffer({
      size: 64 * 3,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {}
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {}
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {}
        }
      ]
    });

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.uniformBuffer
          }
        },
        {
          binding: 1,
          resource: this.material.view
        },
        {
          binding: 2,
          resource: this.material.sampler
        }
      ]
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    });

    this.pipeline = this.device.createRenderPipeline({
      vertex: {
        module: this.device.createShaderModule({
          code: shader
        }),
        entryPoint: 'vs_main',
        buffers: [this.triangleMesh.bufferLayout]
      },

      fragment: {
        module: this.device.createShaderModule({
          code: shader
        }),
        entryPoint: 'fs_main',
        targets: [{
          format: this.format
        }]
      },

      primitive: {
        topology: 'triangle-list'
      },

      layout: pipelineLayout
    });
  }

  private render = () => {

    this.t += 0.008;

    if (this.t > 2.0 * Math.PI) {
      this.t -= 2.0 * Math.PI;
    }

    const projection = mat4.create();
    mat4.perspective(projection, Math.PI / 4, 800/600, 0.1, 10);

    const view = mat4.create();
    mat4.lookAt(view, [0, -0.5, 2], [0, 0, 0], [0, 1, 0]);

    const model = mat4.create();
    mat4.rotate(model, model, this.t, [0, 1, 0]);

    this.device.queue.writeBuffer(this.uniformBuffer, 0, <ArrayBuffer>model);
    this.device.queue.writeBuffer(this.uniformBuffer, 64, <ArrayBuffer>view);
    this.device.queue.writeBuffer(this.uniformBuffer, 128, <ArrayBuffer>projection);

    const commandEncoder: GPUCommandEncoder = this.device.createCommandEncoder();
    const textureView: GPUTextureView = this.context.getCurrentTexture().createView();
    const renderPass: GPURenderPassEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0},
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });
    renderPass.setPipeline(this.pipeline);
    renderPass.setBindGroup(0, this.bindGroup);
    renderPass.setVertexBuffer(0, this.triangleMesh.buffer);
    renderPass.draw(3, 1, 0, 0);
    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(this.render);
  };
}

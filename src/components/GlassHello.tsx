import { useEffect, useRef } from "react";
import "./GlassHello.css";

const vertex = `
attribute vec2 aPosition;
varying vec2 vUv;
void main(){ vUv=aPosition*.5+.5; gl_Position=vec4(aPosition,0.,1.); }
`;
const fragment = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uText;
uniform vec2 uPointer;
uniform vec2 uResolution;
uniform float uTime;
float alphaAt(vec2 p){ return texture2D(uText, clamp(p,0.001,0.999)).a; }
void main(){
  vec2 uv=vUv;
  vec2 px=1.0/uResolution;
  float a=alphaAt(uv);
  float gx=alphaAt(uv+vec2(px.x,0.))-alphaAt(uv-vec2(px.x,0.));
  float gy=alphaAt(uv+vec2(0.,px.y))-alphaAt(uv-vec2(0.,px.y));
  vec2 normal=normalize(vec2(gx,gy)+vec2(.00001));
  float edge=clamp(length(vec2(gx,gy))*2.7,0.,1.);
  vec2 refractUv=uv+normal*px*5.0;
  float red=alphaAt(refractUv+normal*px*1.8);
  float green=alphaAt(refractUv);
  float blue=alphaAt(refractUv-normal*px*1.8);
  float dispersion=max(max(red,green),blue)-min(min(red,green),blue);
  float fresnel=pow(1.0-abs(dot(normal,vec2(0.,0.85))),3.0);
  float pointerDistance=length((uv-uPointer)*vec2(uResolution.x/uResolution.y,1.));
  float edgeFollower=edge*exp(-pointerDistance*18.0);
  float glint=edge*pow(max(0.,dot(normal,normalize(vec2(-.55,.82)))),5.0);
  float body=a*.13;
  vec3 paper=vec3(.957,.945,.91);
  vec3 glass=vec3(.70,.78,.78)+vec3(red,green,blue)*.17;
  vec3 spectral=vec3(.94,.42,.32)*red+vec3(.36,.65,.91)*blue;
  vec3 colour=mix(paper,glass,clamp(body+fresnel*.42,0.,1.));
  colour+=spectral*dispersion*.65;
  colour+=vec3(.96,.98,1.)*(glint*.75+edgeFollower*.95);
  colour+=vec3(.95,.55,.39)*edgeFollower*.22;
  float outAlpha=clamp(a*.52+edge*.35+glint*.18+edgeFollower*.25,0.,1.);
  if(outAlpha<.012) discard;
  gl_FragColor=vec4(colour,outAlpha);
}
`;

function shader(gl: WebGLRenderingContext, type: number, source: string) {
  const value=gl.createShader(type);
  if(!value) return null;
  gl.shaderSource(value,source); gl.compileShader(value);
  if(!gl.getShaderParameter(value,gl.COMPILE_STATUS)){ gl.deleteShader(value); return null; }
  return value;
}
export default function GlassHello({ label="hello" }: { label?: string }) {
  const canvas=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const element=canvas.current; if(!element) return;
    const gl=element.getContext("webgl",{alpha:true,antialias:true,powerPreference:"low-power"});
    if(!gl){ element.dataset.fallback="true"; return; }
    const vs=shader(gl,gl.VERTEX_SHADER,vertex), fs=shader(gl,gl.FRAGMENT_SHADER,fragment);
    if(!vs||!fs){element.dataset.fallback="true";return;}
    const program=gl.createProgram(); if(!program)return;
    gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){element.dataset.fallback="true";return;}
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    gl.useProgram(program);
    const position=gl.getAttribLocation(program,"aPosition");gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const source=document.createElement("canvas");source.width=1400;source.height=420;
    const ctx=source.getContext("2d");if(!ctx)return;
    ctx.clearRect(0,0,1400,420);ctx.fillStyle="#fff";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.font='italic 300 310px "Instrument Serif", Georgia, serif';ctx.fillText(label,700,216,1360);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    gl.uniform1i(gl.getUniformLocation(program,"uText"),0);
    const pointer={x:.72,y:.42};let frame=0;let running=true;const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const move=(event:PointerEvent)=>{const rect=element.getBoundingClientRect();pointer.x=(event.clientX-rect.left)/rect.width;pointer.y=1-(event.clientY-rect.top)/rect.height;};
    element.addEventListener("pointermove",move);
    const render=(time:number)=>{if(!running)return;const rect=element.getBoundingClientRect();const ratio=Math.min(window.devicePixelRatio||1,1.7);const w=Math.max(1,Math.floor(rect.width*ratio)),h=Math.max(1,Math.floor(rect.height*ratio));if(element.width!==w||element.height!==h){element.width=w;element.height=h;gl.viewport(0,0,w,h);}
      gl.uniform2f(gl.getUniformLocation(program,"uPointer"),pointer.x,pointer.y);gl.uniform2f(gl.getUniformLocation(program,"uResolution"),w,h);gl.uniform1f(gl.getUniformLocation(program,"uTime"),time*.001);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);if(!reduced)frame=requestAnimationFrame(render);
    };
    frame=requestAnimationFrame(render);
    if(reduced)render(0);
    const observer=new ResizeObserver(()=>{if(!reduced){cancelAnimationFrame(frame);frame=requestAnimationFrame(render);}});
    observer.observe(element);
    return()=>{running=false;cancelAnimationFrame(frame);observer.disconnect();element.removeEventListener("pointermove",move);gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);};
  },[label]);
  return <div className="glass-hello-wrap" aria-label={label}><canvas ref={canvas} className="glass-hello-canvas" aria-hidden="true"/><span className="glass-hello-fallback">{label}</span><span className="glass-flare" aria-hidden="true"/></div>;
}

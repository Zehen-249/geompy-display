/**
 * navcube — interactive browser demo
 *
 * Layout matches the real Osdag viewport:
 *  • OCC-style gray background
 *  • 3D structural portal frame model
 *  • NaviCubeOverlay in top-right corner — pixel-faithful to Python:
 *      arrows at widget edges, roll arcs in top corners,
 *      DotBackside circle (top-right), ViewMenu cube icon (bottom-right)
 *  • Shared camera — drag viewport OR use NaviCube controls
 */
(function () {
  'use strict';

  // ── Math (same as Python) ─────────────────────────────────────────────────

  function norm(v) {
    const n=Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]);
    return n>1e-10?[v[0]/n,v[1]/n,v[2]/n]:v.slice();
  }
  function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
  function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
  function add(a,b){return[a[0]+b[0],a[1]+b[1],a[2]+b[2]];}
  function sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
  function scl(v,s){return[v[0]*s,v[1]*s,v[2]*s];}

  function rodrigues(v,axis,angle){
    const a=norm(axis),c=Math.cos(angle),s=Math.sin(angle),d=dot(a,v),cx=cross(a,v);
    return[v[0]*c+cx[0]*s+a[0]*d*(1-c),v[1]*c+cx[1]*s+a[1]*d*(1-c),v[2]*c+cx[2]*s+a[2]*d*(1-c)];
  }
  function vslerp(v0,v1,t){
    v0=norm(v0);v1=norm(v1);
    let d=Math.max(-1,Math.min(1,dot(v0,v1)));
    if(d>0.9999)return norm(add(v0,scl(sub(v1,v0),t)));
    if(d<-0.9999){const mid=norm(cross(v0,Math.abs(v0[0])<0.9?[1,0,0]:[0,1,0]));return t<0.5?vslerp(v0,mid,t*2):vslerp(mid,v1,(t-0.5)*2);}
    const om=Math.acos(d),so=Math.sin(om);
    return[(Math.sin((1-t)*om)/so)*v0[0]+(Math.sin(t*om)/so)*v1[0],
           (Math.sin((1-t)*om)/so)*v0[1]+(Math.sin(t*om)/so)*v1[1],
           (Math.sin((1-t)*om)/so)*v0[2]+(Math.sin(t*om)/so)*v1[2]];
  }
  function smoothstep(t){t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);}
  function cameraBasis(d,u){
    d=norm(d);u=norm(u);
    let r=cross(d,u);
    if(r[0]*r[0]+r[1]*r[1]+r[2]*r[2]<1e-12)r=cross(d,Math.abs(d[0])<0.9?[1,0,0]:[0,1,0]);
    r=norm(r);u=norm(cross(r,d));return{r,u};
  }

  // ── NaviCube face geometry (exact Python port, CHAMFER=0.12) ──────────────

  function buildNaviFaces(){
    const faces={},C=0.12;
    function af(name,xv,zv,type,label){
      const yv=cross(xv,scl(zv,-1));
      let pts,labelPts=null;
      if(type==='corner'){
        const xc=scl(xv,C),yc=scl(yv,C),zc=scl(zv,1-2*C);
        pts=[sub(zc,scl(xv,2*C)),sub(sub(zc,xc),yc),sub(add(zc,xc),yc),
             add(zc,scl(xv,2*C)),add(add(zc,xc),yc),add(sub(zc,xc),yc)];
      }else if(type==='edge'){
        const x4=scl(xv,1-C*4),ye=scl(yv,C),ze=scl(zv,1-C);
        pts=[sub(sub(ze,x4),ye),sub(add(ze,x4),ye),add(add(ze,x4),ye),add(sub(ze,x4),ye)];
      }else{
        const x2=scl(xv,1-C*2),y2=scl(yv,1-C*2),x4=scl(xv,1-C*4),y4=scl(yv,1-C*4);
        pts=[sub(sub(zv,x2),y4),sub(sub(zv,x4),y2),sub(add(zv,x4),y2),sub(add(zv,x2),y4),
             add(add(zv,x2),y4),add(add(zv,x4),y2),add(sub(zv,x4),y2),add(sub(zv,x2),y4)];
        labelPts=[sub(sub(zv,x2),y2),sub(add(zv,x2),y2),add(add(zv,x2),y2),add(sub(zv,x2),y2)];
      }
      const ctr=scl(pts.reduce((a,p)=>add(a,p),[0,0,0]),1/pts.length);
      faces[name]={pts,normal:norm(ctr),ctr,label:label||null,type,labelPts};
    }
    af('TOP',   [1,0,0],[0,0,1], 'main','TOP');
    af('FRONT', [1,0,0],[0,-1,0],'main','FRONT');
    af('LEFT',  [0,-1,0],[-1,0,0],'main','LEFT');
    af('BACK',  [-1,0,0],[0,1,0],'main','BACK');
    af('RIGHT', [0,1,0],[1,0,0], 'main','RIGHT');
    af('BOTTOM',[1,0,0],[0,0,-1],'main','BOTTOM');
    af('FTR',[-1,-1,0],[1,-1,1],'corner');af('FTL',[-1,1,0],[-1,-1,1],'corner');
    af('FBR',[1,1,0],[1,-1,-1],'corner'); af('FBL',[1,-1,0],[-1,-1,-1],'corner');
    af('RTR',[1,-1,0],[1,1,1],'corner');  af('RTL',[1,1,0],[-1,1,1],'corner');
    af('RBR',[-1,1,0],[1,1,-1],'corner'); af('RBL',[-1,-1,0],[-1,1,-1],'corner');
    af('FRONT_TOP',[1,0,0],[0,-1,1],'edge');    af('FRONT_BOTTOM',[1,0,0],[0,-1,-1],'edge');
    af('REAR_BOTTOM',[1,0,0],[0,1,-1],'edge');  af('REAR_TOP',[1,0,0],[0,1,1],'edge');
    af('REAR_RIGHT',[0,0,1],[1,1,0],'edge');    af('FRONT_RIGHT',[0,0,1],[1,-1,0],'edge');
    af('FRONT_LEFT',[0,0,1],[-1,-1,0],'edge');  af('REAR_LEFT',[0,0,1],[-1,1,0],'edge');
    af('TOP_LEFT',[0,1,0],[0,1,1],'edge');      af('TOP_RIGHT',[0,1,0],[1,0,1],'edge');
    af('BOTTOM_RIGHT',[0,1,0],[1,0,-1],'edge'); af('BOTTOM_LEFT',[0,1,0],[-1,0,-1],'edge');
    return faces;
  }

  const SNAP={
    TOP:{d:[0,0,-1],u:[0,-1,0]},BOTTOM:{d:[0,0,1],u:[0,1,0]},
    FRONT:{d:[0,1,0],u:[0,0,1]},BACK:{d:[0,-1,0],u:[0,0,1]},
    LEFT:{d:[1,0,0],u:[0,0,1]},RIGHT:{d:[-1,0,0],u:[0,0,1]},
  };

  // ── Button layout — ported from Python's _add_button_shape ───────────────
  // Python coordinates: point_data * 0.005 + off, mapped onto SIZE×SIZE
  // We use S = naviSIZE and build all shapes in that space.

  function buildNaviButtons(S) {
    // Cardinal orbit arrows: simple triangle, tip at edge, base inward
    // Python: [100,0, 80,-18, 80,18] scaled by 0.005 + 0.5
    const btns = {};
    function tri(pts, act) { return {type:'poly', pts, act}; }
    function circ(cx,cy,r,act) { return {type:'circ', cx:cx*S, cy:cy*S, r:r*S, act}; }

    btns.ArrowEast  = tri([{x:S,y:.5*S},{x:.9*S,y:.41*S},{x:.9*S,y:.59*S}],           'orbit_r');
    btns.ArrowWest  = tri([{x:0,y:.5*S},{x:.1*S,y:.41*S},{x:.1*S,y:.59*S}],            'orbit_l');
    btns.ArrowNorth = tri([{x:.5*S,y:0},{x:.41*S,y:.1*S},{x:.59*S,y:.1*S}],            'orbit_u');
    btns.ArrowSouth = tri([{x:.5*S,y:S},{x:.41*S,y:.9*S},{x:.59*S,y:.9*S}],            'orbit_d');

    // Roll arcs — Python's curved polygon (top-right and top-left quadrants)
    const rollRaw=[66.6,-66.6,58.3,-74,49.2,-80.3,39.4,-85.5,
                   29,-89.5,25.3,-78.1,34.3,-74.3,42.8,-69.9,
                   50.8,-64.4,58.1,-58.1,53.8,-53.8,74.7,-46.8,70.7,-70.4];
    const rollR=[], rollL=[];
    for(let i=0;i<rollRaw.length/2;i++){
      const rx=(rollRaw[i*2]*0.005+0.5)*S, ry=(rollRaw[i*2+1]*0.005+0.5)*S;
      rollR.push({x:rx,y:ry});
      rollL.push({x:S-rx,y:ry});  // mirror horizontally for left roll
    }
    btns.ArrowRight = tri(rollR,'roll_cw');
    btns.ArrowLeft  = tri(rollL,'roll_ccw');

    // DotBackside: circle at (0.935, 0.065)*S, radius ≈ 0.05*S
    btns.DotBackside = circ(0.935, 0.065, 0.055, 'backside');

    // ViewMenu (Home): small isometric cube icon at (0.84, 0.84)*S
    // Python draws 3 faces of a cube. We replicate the poly shape.
    const menuRaw=[0,0, 15,-6, 0,-12, -15,-6, 0,0,
                   -15,-6, -15,12, 0,18, 0,0,
                   0,18, 15,12, 15,-6];
    const menuPts=menuRaw.reduce((arr,_,i,a)=>{
      if(i%2===0) arr.push({x:(a[i]*0.005+0.84)*S, y:(a[i+1]*0.005+0.84)*S});
      return arr;
    },[]);
    btns.ViewMenu = {type:'poly', pts:menuPts, act:'home',
                     // also store circular hit area for easy testing
                     hitCirc:{cx:0.84*S, cy:0.84*S, r:0.1*S}};

    return btns;
  }

  // ── Affine quad-to-quad (= Qt's QTransform::quadToQuad) ──────────────────
  function quadToAffine(src,dst){
    const[s0,s1,s2]=[src[0],src[1],src[2]],[d0,d1,d2]=[dst[0],dst[1],dst[2]];
    const sx=s1.x-s0.x,sy=s2.x-s0.x,tx=s1.y-s0.y,ty=s2.y-s0.y;
    const det=sx*ty-sy*tx; if(Math.abs(det)<1e-10)return null;
    const idx=ty/det,idy=-sy/det,itx=-tx/det,ity=sx/det;
    const dx=d1.x-d0.x,dy=d2.x-d0.x,ex=d1.y-d0.y,ey=d2.y-d0.y;
    const a=dx*idx+dy*itx,c=dx*idy+dy*ity,b=ex*idx+ey*itx,dd=ex*idy+ey*ity;
    return{a,b,c,d:dd,e:d0.x-a*s0.x-c*s0.y,f:d0.y-b*s0.x-dd*s0.y};
  }

  function shadeHex(hex,s){
    const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    return`rgb(${Math.round(r*s)},${Math.round(g*s)},${Math.round(b*s)})`;
  }

  // ── 3D scene model: portal frame ─────────────────────────────────────────
  function boxMesh(ox,oy,oz,hw,hd,hh){
    const v=[[ox-hw,oy-hd,oz-hh],[ox+hw,oy-hd,oz-hh],[ox+hw,oy+hd,oz-hh],[ox-hw,oy+hd,oz-hh],
             [ox-hw,oy-hd,oz+hh],[ox+hw,oy-hd,oz+hh],[ox+hw,oy+hd,oz+hh],[ox-hw,oy+hd,oz+hh]];
    return{verts:v,faces:[
      {vi:[4,5,6,7],n:[0,0,1]},{vi:[0,3,2,1],n:[0,0,-1]},
      {vi:[0,1,5,4],n:[0,-1,0]},{vi:[2,3,7,6],n:[0,1,0]},
      {vi:[1,2,6,5],n:[1,0,0]},{vi:[3,0,4,7],n:[-1,0,0]},
    ]};
  }
  const FRAME=[
    boxMesh(-0.50,0,0,  0.09,0.09,0.85),  // left column
    boxMesh( 0.50,0,0,  0.09,0.09,0.85),  // right column
    boxMesh( 0.00,0,0.94, 0.59,0.09,0.09),// top beam
  ];

  // ── Main Demo class ───────────────────────────────────────────────────────

  class Demo {
    constructor(canvas){
      this.canvas=canvas; this.ctx=canvas.getContext('2d');
      this.naviFaces=buildNaviFaces();
      this.LIGHT=norm([-0.8,-1,-1.8]);

      // Shared camera
      this.dir=norm([-1,1,-1]); this.up=[0,0,1];

      // Snap anim
      this.anim=false;this.animStart=0;this.animDur=240;
      this.animD0=this.dir.slice();this.animU0=this.up.slice();
      this.animD1=null;this.animU1=null;

      this.hovNavi=null; this.hovBtn=null;
      this.dragging=false; this.lastMouse=null;
      this.idleSince=performance.now(); this.autoRot=true;
      this.dpr=1;

      this._bindEvents();
      this.resize();
      requestAnimationFrame(t=>this._frame(t));
    }

    resize(){
      this.dpr=window.devicePixelRatio||1;
      const rect=this.canvas.getBoundingClientRect();
      this.W=Math.round(rect.width*this.dpr);
      this.H=Math.round(rect.height*this.dpr);
      this.canvas.width=this.W; this.canvas.height=this.H;

      // Scene
      this.sCx=this.W*0.45; this.sCy=this.H*0.52;
      this.sS=this.H*0.27;

      // NaviCube widget: same SIZE×SIZE box as Python
      // All buttons live INSIDE this box (edges + corners)
      this.nS=Math.min(this.H*0.22, this.W*0.18, 140*this.dpr);
      // Widget top-left corner (top-right of canvas)
      this.nL=this.W-this.nS-10*this.dpr;
      this.nT=10*this.dpr;
      // Cube center (middle of widget)
      this.nCx=this.nL+this.nS*0.5;
      this.nCy=this.nT+this.nS*0.5;
      // Cube projection scale: same ratio as Python (27/120 ≈ 0.225)
      this.nScale=this.nS*0.225;

      this.naviBtns=buildNaviButtons(this.nS);
    }

    // ── Projection ───────────────────────────────────────────────────────────
    _pS(pt,b){return{x:this.sCx+dot(pt,b.r)*this.sS, y:this.sCy-dot(pt,b.u)*this.sS};}
    _pN(pt,b){return{x:this.nCx+dot(pt,b.r)*this.nScale, y:this.nCy-dot(pt,b.u)*this.nScale};}

    // ── Draw ─────────────────────────────────────────────────────────────────
    _draw(){
      const ctx=this.ctx,W=this.W,H=this.H,dpr=this.dpr;
      ctx.clearRect(0,0,W,H);
      const basis=cameraBasis(this.dir,this.up);

      // ── OCC-style gray viewport ──
      ctx.fillStyle='#b8b8b8'; ctx.fillRect(0,0,W,H);

      // Ground grid (Z=0 XY plane) — same look as OCC
      ctx.strokeStyle='rgba(0,0,0,0.10)'; ctx.lineWidth=1;
      for(let i=-3;i<=3.01;i+=0.5){
        const p1=this._pS([i,-3,0],basis),p2=this._pS([i,3,0],basis);
        ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();
        const p3=this._pS([-3,i,0],basis),p4=this._pS([3,i,0],basis);
        ctx.beginPath();ctx.moveTo(p3.x,p3.y);ctx.lineTo(p4.x,p4.y);ctx.stroke();
      }

      // ── 3D portal frame ──
      this._drawFrame(ctx,basis,dpr);

      // ── XYZ gizmo (bottom-left, same position as Osdag) ──
      this._drawGizmo(ctx,basis,dpr);

      // ── NaviCube overlay ──
      this._drawNaviWidget(ctx,basis,dpr);

      // ── Hint ──
      ctx.fillStyle='rgba(0,0,0,0.32)';
      ctx.font=`${11*dpr}px -apple-system,Arial,sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillText('Drag to orbit · Click a NaviCube face to snap to view', W/2, H-8*dpr);
    }

    _drawFrame(ctx,basis,dpr){
      const all=[];
      for(const mesh of FRAME){
        for(const face of mesh.faces){
          if(-dot(face.n,this.dir)<=0) continue;
          const pts2d=face.vi.map(i=>this._pS(mesh.verts[i],basis));
          const depth=face.vi.reduce((s,i)=>s+dot(mesh.verts[i],this.dir),0)/face.vi.length;
          const shade=0.4+0.6*Math.max(0,-dot(face.n,this.LIGHT));
          all.push({pts2d,depth,shade});
        }
      }
      all.sort((a,b)=>b.depth-a.depth);
      for(const{pts2d,shade}of all){
        const r=Math.round(155*shade),g=Math.round(168*shade),b=Math.round(182*shade);
        this._poly(ctx,pts2d);
        ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fill();
        ctx.strokeStyle='rgba(30,40,60,0.5)'; ctx.lineWidth=1.2*dpr; ctx.stroke();
      }
    }

    _drawGizmo(ctx,basis,dpr){
      const gx=32*dpr,gy=this.H-32*dpr,gl=22*dpr;
      for(const[dir,col,lbl]of[[[1,0,0],'#d42b2b','X'],[[0,1,0],'#1fa01f','Y'],[[0,0,1],'#2470d4','Z']]){
        const ex=gx+dot(dir,basis.r)*gl,ey=gy-dot(dir,basis.u)*gl;
        ctx.strokeStyle=col;ctx.lineWidth=2.2*dpr;
        ctx.beginPath();ctx.moveTo(gx,gy);ctx.lineTo(ex,ey);ctx.stroke();
        ctx.fillStyle=col;
        ctx.font=`bold ${9*dpr}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(lbl,ex+(ex-gx)*0.3,ey+(ey-gy)*0.3);
      }
    }

    _drawNaviWidget(ctx,basis,dpr){
      const S=this.nS, L=this.nL, T=this.nT;

      // Very subtle panel background (same as a transparent Qt window on OCC)
      ctx.fillStyle='rgba(255,255,255,0.08)';
      this._rRect(ctx,L,T,S,S,6*dpr);
      ctx.fill();

      // ── NaviCube faces — light palette (Python NaviCubeStyle light defaults) ──
      const pal={
        fMain:'#f8f8fc',fEdge:'#d2d2d7',fCorn:'#b9b9be',
        text:'#121212',border:'rgba(28,28,32,1)',borderS:'rgba(50,50,55,1)',
        hover:'rgba(0,148,255,0.92)',hoverTx:'#ffffff',shadow:'rgba(0,0,0,0.16)',
      };
      const vis=[];
      for(const[name,f]of Object.entries(this.naviFaces)){
        if(-dot(f.normal,this.dir)<=0.10) continue;
        vis.push({name,face:f,pts2d:f.pts.map(p=>this._pN(p,basis)),depth:dot(f.ctr,this.dir)});
      }
      vis.sort((a,b)=>b.depth-a.depth);
      for(const{name,face,pts2d}of vis){
        const hov=name===this.hovNavi, s=0.55+0.45*Math.max(0,-dot(face.normal,this.LIGHT));
        // Shadow
        this._poly(ctx,pts2d.map(p=>({x:p.x+1.4*dpr,y:p.y+1.8*dpr})));
        ctx.fillStyle=pal.shadow;ctx.fill();
        // Face
        this._poly(ctx,pts2d);
        ctx.fillStyle=hov?pal.hover:shadeHex(face.type==='main'?pal.fMain:face.type==='edge'?pal.fEdge:pal.fCorn,s);
        ctx.fill();
        ctx.strokeStyle=face.type==='main'?pal.border:pal.borderS;
        ctx.lineWidth=face.type==='main'?2*dpr:1.2*dpr;ctx.stroke();
        if(face.label) this._drawLabel(ctx,face,basis,hov?pal.hoverTx:pal.text);
      }

      // ── Control buttons (same shapes as Python) ──
      this._drawNaviBtns(ctx,dpr,pal);
    }

    _drawNaviBtns(ctx,dpr,pal){
      const L=this.nL,T=this.nT,S=this.nS;
      ctx.save();
      ctx.translate(L,T);  // now draw in widget-local coords (0..S)

      for(const[bname,btn]of Object.entries(this.naviBtns)){
        const hov=this.hovBtn===bname;
        const fill=hov?'rgba(0,148,255,0.85)':'rgba(60,60,60,0.35)';
        const stroke='rgba(0,0,0,0.25)';

        if(btn.type==='circ'){
          ctx.beginPath(); ctx.arc(btn.cx,btn.cy,btn.r,0,Math.PI*2);
          ctx.fillStyle=fill; ctx.fill();
          ctx.strokeStyle=stroke; ctx.lineWidth=dpr; ctx.stroke();
        } else if(bname==='ViewMenu'){
          // Draw the 3 faces of the isometric cube icon (Python's point_data shape)
          const raw=[0,0,15,-6,0,-12,-15,-6,  -15,-6,-15,12,0,18,  0,18,15,12,15,-6];
          const ox=0.84*S,oy=0.84*S,sc=0.005*S;
          const faces3=[
            {vi:[0,1,2,3],fill:'#d2d2d7'},{vi:[3,4,5,6,0],fill:'#b9b9be'},{vi:[0,6,7,8],fill:'#f0f0f4'}
          ];
          const verts3=[];
          for(let i=0;i<raw.length/2;i++) verts3.push({x:ox+raw[i*2]*sc, y:oy+raw[i*2+1]*sc});
          // top face
          ctx.beginPath(); ctx.moveTo(verts3[0].x,verts3[0].y);
          ctx.lineTo(verts3[1].x,verts3[1].y); ctx.lineTo(verts3[2].x,verts3[2].y);
          ctx.lineTo(verts3[3].x,verts3[3].y); ctx.closePath();
          ctx.fillStyle=hov?'rgba(0,148,255,0.5)':'#d8d8dc'; ctx.fill();
          // left face
          ctx.beginPath(); ctx.moveTo(verts3[3].x,verts3[3].y);
          ctx.lineTo(verts3[4].x,verts3[4].y); ctx.lineTo(verts3[5].x,verts3[5].y);
          ctx.lineTo(verts3[6].x,verts3[6].y); ctx.closePath();
          ctx.fillStyle=hov?'rgba(0,100,200,0.5)':'#b0b0b6'; ctx.fill();
          // right face
          ctx.beginPath(); ctx.moveTo(verts3[0].x,verts3[0].y);
          ctx.lineTo(verts3[6].x,verts3[6].y); ctx.lineTo(verts3[7].x,verts3[7].y);
          ctx.lineTo(verts3[8].x,verts3[8].y); ctx.closePath();
          ctx.fillStyle=hov?'rgba(0,120,240,0.5)':'#c8c8cc'; ctx.fill();
          // Outline
          ctx.strokeStyle=hov?'rgba(0,148,255,0.9)':stroke;
          ctx.lineWidth=dpr*0.8;
          ctx.beginPath();
          [verts3[0],verts3[1],verts3[2],verts3[3]].forEach((p,i)=>{i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});
          ctx.closePath(); ctx.stroke();
        } else {
          // Polygon (arrows)
          ctx.beginPath(); ctx.moveTo(btn.pts[0].x,btn.pts[0].y);
          for(let i=1;i<btn.pts.length;i++) ctx.lineTo(btn.pts[i].x,btn.pts[i].y);
          ctx.closePath();
          ctx.fillStyle=fill; ctx.fill();
          ctx.strokeStyle=stroke; ctx.lineWidth=dpr*0.8; ctx.stroke();
        }
      }
      ctx.restore();
    }

    _drawLabel(ctx,face,basis,col){
      if(!face.labelPts) return;
      const lp=face.labelPts.map(p=>this._pN(p,basis));
      const dst=[lp[3],lp[2],lp[1],lp[0]];
      const tf=quadToAffine([{x:0,y:0},{x:200,y:0},{x:200,y:200}],[dst[0],dst[1],dst[2]]);
      if(!tf) return;
      const fs=Math.round(54*this.dpr);
      ctx.save();
      ctx.transform(tf.a,tf.b,tf.c,tf.d,tf.e,tf.f);
      ctx.fillStyle=col;
      ctx.font=`bold ${fs}px Arial,Helvetica,sans-serif`;
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(face.label,100,100);
      ctx.restore();
    }

    // ── Hit test ─────────────────────────────────────────────────────────────
    _hitNavi(x,y){
      const basis=cameraBasis(this.dir,this.up),vis=[];
      for(const[name,f]of Object.entries(this.naviFaces)){
        if(-dot(f.normal,this.dir)<=0.10) continue;
        vis.push({name,pts2d:f.pts.map(p=>this._pN(p,basis)),depth:dot(f.ctr,this.dir)});
      }
      vis.sort((a,b)=>b.depth-a.depth);
      for(let i=vis.length-1;i>=0;i--)
        if(this._pip(x,y,vis[i].pts2d)) return vis[i].name;
      return null;
    }

    _hitBtn(x,y){
      const lx=x-this.nL, ly=y-this.nT; // widget-local
      for(const[bname,btn]of Object.entries(this.naviBtns)){
        if(btn.type==='circ'){
          const dx=lx-btn.cx,dy=ly-btn.cy;
          if(dx*dx+dy*dy<=btn.r*btn.r*1.5) return bname;
        } else if(bname==='ViewMenu'){
          const hc=btn.hitCirc,dx=lx-hc.cx,dy=ly-hc.cy;
          if(dx*dx+dy*dy<=hc.r*hc.r*2) return bname;
        } else {
          if(this._pip(lx,ly,btn.pts)) return bname;
        }
      }
      return null;
    }

    _inWidget(x,y){
      return x>=this.nL&&x<=this.nL+this.nS&&y>=this.nT&&y<=this.nT+this.nS;
    }

    _pip(x,y,pts){
      let inside=false;
      for(let i=0,j=pts.length-1;i<pts.length;j=i++){
        const xi=pts[i].x,yi=pts[i].y,xj=pts[j].x,yj=pts[j].y;
        if(((yi>y)!==(yj>y))&&x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
      }
      return inside;
    }

    // ── Camera control ───────────────────────────────────────────────────────
    _snap(d,u){
      this.animD0=this.dir.slice();this.animU0=this.up.slice();
      this.animD1=norm(d);this.animU1=norm(u);
      this.animStart=performance.now();this.anim=true;
    }

    snapTo(id){
      const t=SNAP[id];
      if(t){this._snap(t.d,t.u);}
      else{const f=this.naviFaces[id];if(!f)return;this._snap(scl(f.normal,-1),Math.abs(dot(f.normal,[0,0,1]))>0.9?[0,-1,0]:[0,0,1]);}
    }

    orbit(dx,dy){
      const b=cameraBasis(this.dir,this.up);
      this.dir=norm(rodrigues(this.dir,b.u,dx));this.dir=norm(rodrigues(this.dir,b.r,dy));
      this.up =norm(rodrigues(this.up, b.u,dx));this.up =norm(rodrigues(this.up, b.r,dy));
    }

    execBtn(bname){
      const act=this.naviBtns[bname]?.act; if(!act) return;
      const step=Math.PI/12;
      const b=cameraBasis(this.dir,this.up);
      if(act==='home'){this._snap(norm([-1,1,-1]),[0,0,1]);}
      else if(act==='orbit_r'){const d=rodrigues(this.dir,b.u,-step);this._snap(d,rodrigues(this.up,b.u,-step));}
      else if(act==='orbit_l'){const d=rodrigues(this.dir,b.u, step);this._snap(d,rodrigues(this.up,b.u, step));}
      else if(act==='orbit_u'){const d=rodrigues(this.dir,b.r,-step);this._snap(d,rodrigues(this.up,b.r,-step));}
      else if(act==='orbit_d'){const d=rodrigues(this.dir,b.r, step);this._snap(d,rodrigues(this.up,b.r, step));}
      else if(act==='roll_cw') {const d=rodrigues(this.dir,this.dir,step); this._snap(this.dir,rodrigues(this.up,this.dir,step));}
      else if(act==='roll_ccw'){const d=rodrigues(this.dir,this.dir,-step);this._snap(this.dir,rodrigues(this.up,this.dir,-step));}
      else if(act==='backside'){this._snap(scl(this.dir,-1),this.up);}
    }

    // ── Utilities ─────────────────────────────────────────────────────────────
    _poly(ctx,pts){ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath();}
    _rRect(ctx,x,y,w,h,r){
      ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
      ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
      ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
      ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
    }

    // ── Events ────────────────────────────────────────────────────────────────
    _xy(e){const r=this.canvas.getBoundingClientRect(),dpr=this.dpr;return{x:(e.clientX-r.left)*dpr,y:(e.clientY-r.top)*dpr};}

    _bindEvents(){
      const c=this.canvas;
      c.addEventListener('mousemove',e=>{
        const p=this._xy(e);
        if(this.dragging&&this.lastMouse&&!this._inWidget(p.x,p.y)){
          this.orbit((p.x-this.lastMouse.x)/this.dpr*0.008,(p.y-this.lastMouse.y)/this.dpr*0.008);
          this.autoRot=false;this.idleSince=performance.now();
        }else if(!this.dragging){
          if(this._inWidget(p.x,p.y)){
            this.hovNavi=this._hitNavi(p.x,p.y);
            this.hovBtn =this._hitBtn(p.x,p.y);
            c.style.cursor=(this.hovNavi||this.hovBtn)?'pointer':'default';
          }else{this.hovNavi=null;this.hovBtn=null;c.style.cursor='grab';}
        }
        this.lastMouse=p;
      });
      c.addEventListener('mousedown',e=>{
        const p=this._xy(e);
        if(!this._inWidget(p.x,p.y)){this.dragging=true;this.lastMouse=p;this.autoRot=false;c.style.cursor='grabbing';}
        e.preventDefault();
      });
      c.addEventListener('mouseup',()=>{this.dragging=false;c.style.cursor='grab';this.idleSince=performance.now();});
      c.addEventListener('mouseleave',()=>{this.dragging=false;this.hovNavi=null;this.hovBtn=null;c.style.cursor='grab';this.idleSince=performance.now();});
      c.addEventListener('click',e=>{
        const p=this._xy(e);
        if(this._inWidget(p.x,p.y)){
          const bn=this._hitBtn(p.x,p.y);
          if(bn){this.execBtn(bn);this.autoRot=false;return;}
          const fn=this._hitNavi(p.x,p.y);
          if(fn){this.snapTo(fn);this.autoRot=false;}
        }
      });
      let tmov=false;
      c.addEventListener('touchstart',e=>{this.dragging=true;tmov=false;this.lastMouse=this._xy(e.touches[0]);this.autoRot=false;},{passive:true});
      c.addEventListener('touchmove',e=>{
        e.preventDefault();tmov=true;const p=this._xy(e.touches[0]);
        if(this.lastMouse&&!this._inWidget(p.x,p.y))this.orbit((p.x-this.lastMouse.x)/this.dpr*0.008,(p.y-this.lastMouse.y)/this.dpr*0.008);
        this.lastMouse=p;
      },{passive:false});
      c.addEventListener('touchend',e=>{
        this.dragging=false;
        if(!tmov&&e.changedTouches.length){const p=this._xy(e.changedTouches[0]);if(this._inWidget(p.x,p.y)){const fn=this._hitNavi(p.x,p.y);if(fn){this.snapTo(fn);this.autoRot=false;}}}
        this.idleSince=performance.now();
      });
      window.addEventListener('resize',()=>this.resize());
    }

    _frame(now){
      if(this.anim){
        const t=Math.min(1,(now-this.animStart)/this.animDur),st=smoothstep(t);
        this.dir=vslerp(this.animD0,this.animD1,st);this.up=vslerp(this.animU0,this.animU1,st);
        if(t>=1){this.anim=false;this.dir=this.animD1.slice();this.up=this.animU1.slice();}
      }
      if(!this.dragging&&!this.anim){
        if(now-this.idleSince>4000)this.autoRot=true;
        if(this.autoRot)this.orbit(0.003,0.0003);
      }
      this._draw();
      requestAnimationFrame(t=>this._frame(t));
    }
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  function init(){
    const div=document.getElementById('demo-canvas');if(!div)return;
    const canvas=document.createElement('canvas');
    canvas.style.cssText='width:100%;height:100%;display:block;cursor:grab;touch-action:none;';
    div.innerHTML='';div.appendChild(canvas);
    new Demo(canvas);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();

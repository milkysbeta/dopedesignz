/* Shaders extracted verbatim from art/liquid-chrome.html — the source artwork.
   Do not hand-edit: regenerate from the art piece if the shader changes. */
(function(global){
/* ─── VERTEX ───────────────────────────────────────── */
const VERT=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;

/* ─── FRAGMENT ─────────────────────────────────────── */
const FRAG=`
precision highp float;
#define NW 8

uniform float uTime;
uniform vec2  uRes;
uniform vec2  uMouse;

/* surface */
uniform float uAmbient;
uniform float uReflect;
uniform float uFresnel;

/* colour */
uniform float uIriMode;
uniform float uIriAmt;
uniform float uIriBands;
uniform float uHueShift;
uniform float uIriSat;
uniform float uPrism;
uniform float uFlare;

/* glass */
uniform float uOpacity;
uniform float uEffBlend;
uniform float uRefr;

/* camera */
uniform float uPitch;
uniform float uAzimuth;

/* background A */
uniform sampler2D uBgA;
uniform float uHasBgA;
uniform float uBlendA;
uniform float uMirrorA;
uniform float uSatA;
uniform float uSharpA;

/* background B */
uniform sampler2D uBgB;
uniform float uHasBgB;
uniform float uBlendB;
uniform float uMirrorB;
uniform float uSatB;

/* mic */
uniform float uMicVol;
uniform float uMicBass;

/* grain */
uniform float uGrainStr;
uniform float uGrainSize;

/* waves */
uniform vec2  uWP[NW];
uniform float uWB[NW];
uniform float uWS[NW];
uniform vec2  uWV[NW];
uniform float uWK[NW];
uniform float uWSpd;
uniform float uWSize;
uniform float uWSoft;
uniform float uSplash;

/* momentum */
uniform vec2  uMomP;
uniform float uMomS;

varying vec2 vUv;

/* ── Simplex noise 3D ─────────────────────────────── */
vec4 p4(vec4 x){return mod(((x*34.)+1.)*x,289.);}
vec4 ti(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float sn(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy)),x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz),l=1.-g;
  vec3 i1=min(g.xyz,l.zxy),i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx,x2=x0-i2+C.yyy,x3=x0-D.yyy;
  i=mod(i,289.);
  vec4 pp=p4(p4(p4(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=1./7.;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=pp-49.*floor(pp*ns.z*ns.z);
  vec4 x_=floor(j*ns.z),y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy,y=y_*ns.x+ns.yyyy,h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy),b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.,s1=floor(b1)*2.+1.,sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy,a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 q0=vec3(a0.xy,h.x),q1=vec3(a0.zw,h.y),q2=vec3(a1.xy,h.z),q3=vec3(a1.zw,h.w);
  vec4 nm=ti(vec4(dot(q0,q0),dot(q1,q1),dot(q2,q2),dot(q3,q3)));
  q0*=nm.x;q1*=nm.y;q2*=nm.z;q3*=nm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(q0,x0),dot(q1,x1),dot(q2,x2),dot(q3,x3)));
}

/* ── Wave event ────────────────────────────────────── */
float waveAt(vec2 p,vec2 wp,float age,float str,vec2 wv,float seed){
  if(age>55.||str<.001)return 0.;
  vec2 d=p-wp;
  float dist=length(d)+.0001;
  float ang=atan(d.y,d.x);
  float wobble=1.+sin(ang*3.+seed)*.04+sin(ang*7.+seed*2.1)*.02;
  float od=dist*wobble;
  float radius=age*.55*uWSpd;
  float sd=od/max(uWSize,.1);
  float df=sd-radius;
  float se=.9/max(uWSoft,.1);
  float wf=2.8/max(uWSize,.1);
  float ring=cos(df*wf)*exp(-df*df*se);
  float rH=ring*smoothstep(6.,2.,radius);
  float cap=sin(od*2.-age*1.6)*exp(-od*.85)*.16*smoothstep(0.,1.2,age);
  return(rH+cap)*str*exp(-age*.048)*.11*uSplash;
}

/* ── Height field ──────────────────────────────────── */
float H(vec2 p,float t){
  /* Ambient drift — zero when uAmbient=0 */
  vec2 adv=vec2(cos(t*.018)*.06,sin(t*.024)*.05)*uAmbient;
  vec3 q=vec3((p+adv)*.55,t*.010);
  float h=(sn(q)*.65+sn(q*2.2+1.93)*.35)*uAmbient*.50;

  /* Wave events */
  for(int i=0;i<NW;i++){
    float age=t-uWB[i];
    if(age>=0.&&age<55.)h+=waveAt(p,uWP[i],age,uWS[i],uWV[i],uWK[i]);
  }

  /* Momentum ghost */
  if(uMomS>.01){
    float r=length(p-uMomP);
    h+=sin(r*2.2-t*2.0)*exp(-r*.8)*uMomS*.04;
  }

  /* Mic */
  float cr=length(p)*5.5;
  h+=sin(cr-t*7.)*exp(-cr*.42)*uMicBass*uSplash*.32;
  h+=sin(cr*1.7-t*12.)*exp(-cr*.70)*uMicVol*uSplash*.16;
  return h;
}

vec3 surfN(vec2 p,float h0,float t){
  float e=.006;
  return normalize(vec3(-(H(p+vec2(e,0.),t)-h0)/e,10.,-(H(p+vec2(0.,e),t)-h0)/e));
}

/* ── Studio lights ─────────────────────────────────── */
float studio(vec3 d){
  float c=0.;
  c+=pow(max(0.,dot(d,normalize(vec3(1.,2.2,.6)))),110.)*3.8+pow(max(0.,dot(d,normalize(vec3(1.,2.2,.6)))),7.)*.05;
  c+=pow(max(0.,dot(d,normalize(vec3(-1.4,1.8,-.4)))),75.)*2.2+pow(max(0.,dot(d,normalize(vec3(-1.4,1.8,-.4)))),5.)*.03;
  c+=pow(max(0.,dot(d,normalize(vec3(.2,3.,1.3)))),55.)*1.5;
  c+=max(0.,d.y)*.055;
  return c;
}

/* ── Thin-film iridescence ─────────────────────────── */
vec3 thinFilm(float d,float cosA){
  float opd=2.*1.43*d*max(.12,cosA);
  vec3 c=vec3(.5+.5*cos(opd*9.666),.5+.5*cos(opd*11.636),.5+.5*cos(opd*14.286));
  return c*c*(3.-2.*c);
}

vec3 hueRot(vec3 col,float sh){
  float s=sin(sh*6.2832),cc=cos(sh*6.2832);
  return clamp(mat3(.299+.701*cc+.168*s,.299-.299*cc-.328*s,.299-.299*cc+1.25*s,
                    .587-.587*cc+.330*s,.587+.413*cc+.035*s,.587-.587*cc-.807*s,
                    .114-.114*cc-.497*s,.114-.114*cc+.292*s,.114+.886*cc-.443*s)*col,0.,1.);
}

vec3 iriColor(float h,float NoV,float waveE){
  float d=(h*.5+.5)*uIriBands*4.+uIriBands*2.2;
  vec3 col;
  if(uIriMode<.5)      col=thinFilm(d,NoV);
  else if(uIriMode<1.5)col=hueRot(thinFilm(d,NoV),d*.5+uHueShift);
  else if(uIriMode<2.5){vec3 b=thinFilm(d,NoV);float l=dot(b,vec3(.299,.587,.114));col=mix(vec3(l),b,pow(1.-NoV,2.5)*.6);}
  else if(uIriMode<3.5){float ph=fract(d*3.+uHueShift)*6.2832;float bw=smoothstep(0.,.15,fract(d*3.+uHueShift))*smoothstep(.30,.15,fract(d*3.+uHueShift));col=vec3(.5+.5*cos(ph),.5+.5*cos(ph+2.094),.5+.5*cos(ph+4.189))*bw*1.8;}
  else{col=thinFilm(d,NoV);float l=dot(col,vec3(.299,.587,.114));col=l+(col-l)*2.5;col=clamp(col,0.,1.);}
  col=hueRot(col,uHueShift);
  float l2=dot(col,vec3(.299,.587,.114));
  col=mix(vec3(l2),col,uIriSat);
  return col*(1.+waveE*.55);
}

/* ── Lens flare ────────────────────────────────────── */
vec3 lensFlare(vec3 r){
  if(uFlare<.01)return vec3(0.);
  vec3 f=vec3(0.);
  vec3 L1=normalize(vec3(1.,2.2,.6)),L2=normalize(vec3(-1.4,1.8,-.4));
  for(int i=0;i<2;i++){
    vec3 L=i==0?L1:L2;float dp=max(0.,dot(r,L)),di=1.-dp;
    float g=smoothstep(.45,.80,dp);
    f+=vec3(pow(dp,200.)*6.);
    vec3 rc=vec3(sin(di*58.)*exp(-di*9.)*.7+sin(di*38.)*exp(-di*5.)*.3,
                 sin(di*96.)*exp(-di*16.)*.6+sin(di*58.)*exp(-di*9.)*.2,
                 sin(di*96.)*exp(-di*16.)*.8+sin(di*38.)*exp(-di*5.)*.2)*g*.55;
    f+=max(vec3(0.),rc);
  }
  return f*uFlare*uReflect;
}

/* ── Crystal prism edges ───────────────────────────── */
vec3 prism(vec3 rd,vec3 N,float NoV){
  float g=pow(1.-NoV,4.)*uPrism*.005;
  if(g<.0003)return vec3(0.);
  vec3 t=normalize(cross(N,rd));
  float eR=studio(reflect(normalize(rd+t*g*1.),N));
  float eOY=studio(reflect(normalize(rd+t*g*.38),N));
  float eG=studio(reflect(rd,N));
  float eCB=studio(reflect(normalize(rd-t*g*.46),N));
  float eV=studio(reflect(normalize(rd-t*g*1.08),N));
  return vec3(eR*.68+eOY*.32,eG*.62+eOY*.22+eCB*.16,eCB*.38+eV*.62)-vec3(eG);
}

/* ── Background ────────────────────────────────────── */
vec3 bgSample(vec2 uv){
  vec3 col=vec3(.005);
  /* Layer A */
  if(uHasBgA>.5){
    vec2 a=uv;if(uMirrorA>.5)a.x=1.-a.x;a=clamp(a,.001,.999);
    vec2 tx=1.5/uRes;
    vec3 c=texture2D(uBgA,a).rgb;
    vec3 bl=(texture2D(uBgA,clamp(a+tx*vec2(1.,1.),.001,.999)).rgb
            +texture2D(uBgA,clamp(a+tx*vec2(-1.,1.),.001,.999)).rgb
            +texture2D(uBgA,clamp(a+tx*vec2(1.,-1.),.001,.999)).rgb
            +texture2D(uBgA,clamp(a+tx*vec2(-1.,-1.),.001,.999)).rgb)*.25;
    c=c+(c-bl)*(uSharpA-1.)*1.8;
    float la=dot(c,vec3(.299,.587,.114));
    col=mix(col,clamp(mix(vec3(la),c,uSatA),0.,1.),uBlendA);
  }
  /* Layer B */
  if(uHasBgB>.5){
    vec2 b=uv;if(uMirrorB>.5)b.x=1.-b.x;b=clamp(b,.001,.999);
    vec3 c2=texture2D(uBgB,b).rgb;
    float lb=dot(c2,vec3(.299,.587,.114));
    col=mix(col,clamp(mix(vec3(lb),c2,uSatB),0.,1.),uBlendB);
  }
  return col;
}

/* ── Grain ─────────────────────────────────────────── */
float grain(vec2 uv,float t){
  vec2 px=floor(uv*uRes);
  float fr=fract(floor(t*24.)*0.6180339887)*9999.;
  vec3 q=vec3(px.x,px.y,px.x+px.y+fr);
  q=fract(q*vec3(443.8975,397.2973,491.1871));
  q+=dot(q,q.zxy+31.3179);
  float g=(fract(q.x*q.y)+fract(q.y*q.z)+fract(q.z*q.x))*.333-.5;
  return g/max(uGrainSize,.5);
}

/* ── Main ──────────────────────────────────────────── */
void main(){
  float asp=uRes.x/uRes.y;
  vec2 sc=(vUv-.5)*vec2(asp,1.);
  float az=uAzimuth*6.2832;
  sc=vec2(sc.x*cos(az)-sc.y*sin(az),sc.x*sin(az)+sc.y*cos(az));
  sc.y*=1.+sin(uPitch*.9)*1.6;
  vec2 p=sc*(1.4+uPitch*1.8)+(uMouse-.5)*.35;

  float h0=H(p,uTime);
  vec3 N=surfN(p,h0,uTime);
  vec3 rd=normalize(vec3(sc*.20,1.));
  float NoV=max(0.,dot(N,-rd));
  float fres=pow(1.-NoV,uFresnel);
  vec3 refl=reflect(rd,N);
  float chRaw=studio(refl)*uReflect;

  /* Wave energy at this pixel */
  float wE=0.;
  for(int i=0;i<NW;i++){
    float age=uTime-uWB[i];
    if(age>=0.&&age<55.)wE+=exp(-length(p-uWP[i])*1.5)*exp(-age*.08)*uWS[i];
  }
  wE=clamp(wE,0.,1.5);

  /* Background with chromatic refraction */
  float ca=uPrism*.0028;
  vec2 w=N.xz*uRefr*.12;
  vec3 bgCol;
  if(uHasBgA>.5||uHasBgB>.5){
    vec2 wR=clamp(vUv+w*(1.+ca),.001,.999);
    vec2 wG=clamp(vUv+w,.001,.999);
    vec2 wB=clamp(vUv+w*(1.-ca),.001,.999);
    /* R channel from wR, G from wG, B from wB — per-channel chromatic refraction */
    vec3 bA_R=bgSample(wR);
    vec3 bA_G=bgSample(wG);
    vec3 bA_B=bgSample(wB);
    bgCol=vec3(bA_R.r,bA_G.g,bA_B.b);
  } else {
    bgCol=vec3(.005);
  }

  /* Iridescence */
  vec2 fAdv=vec2(sin(uTime*.016),cos(uTime*.020))*.09;
  float bigP=sn(vec3((p+fAdv)*.17,uTime*.003));
  float medP=sn(vec3((p+fAdv*.4)*.48,uTime*.008))*.65;
  float filmH=h0*.55+bigP*.14+medP*.04;

  vec3 iriCol=iriColor(filmH,NoV,wE);

  float iriNull=abs(sin(filmH*uIriBands*14.));
  float avgCov=smoothstep(.05,.35,iriNull);
  float waveGate=clamp(wE*1.8,0.,1.);
  float edgeGlow=pow(fres,2.8)*.18;
  float iriStr=uIriAmt*(waveGate*avgCov*.92+edgeGlow);
  iriStr=clamp(iriStr,0.,.97);

  vec3 iriSurf=iriCol*(.45+chRaw*.55);
  vec3 surf=mix(vec3(chRaw)*.5,iriSurf,iriStr);
  surf+=prism(rd,N,NoV)*(1.-iriStr*.6);
  surf+=lensFlare(refl);

  surf=surf/(surf+1.);
  surf=pow(max(surf,0.),vec3(1./2.2));
  float bl=dot(surf,vec3(.299,.587,.114));
  surf+=vec3(pow(max(bl-.62,0.)*2.6,2.2))*.14;

  float alpha=mix(uOpacity,1.,fres*.97)*uEffBlend;
  vec3 col=mix(bgCol,surf,alpha);

  col=clamp(col+grain(vUv,uTime)*uGrainStr,0.,1.);
  col*=1.-smoothstep(.55,1.42,length(vUv-.5)*2.)*.78;
  gl_FragColor=vec4(col,1.);
}
`;

  global.LIQUID_CHROME_SHADER = { VERT: VERT, FRAG: FRAG };
})(window);

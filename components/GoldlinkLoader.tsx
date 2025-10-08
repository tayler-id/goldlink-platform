"use client";

import { useEffect, useRef } from "react";

interface GoldlinkLoaderProps {
  onLoadComplete?: () => void;
}

export default function GoldlinkLoader({ onLoadComplete }: GoldlinkLoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Inject the Three.js loading script
    const script = document.createElement("script");
    script.innerHTML = `
(function() {
  // --- tiny sequential loader to guarantee order ---
  function loadScript(src) {
    return new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.async = false; s.onload = resolve; s.onerror = function() { reject(new Error('Failed '+src)); };
      document.head.appendChild(s);
    });
  }

  function setStatus(text, cls) { 
    var el = document.getElementById('goldlink-status'); 
    if (el) { 
      el.textContent = text; 
      el.className = cls || ''; 
    }
  }

  // Canonical CDNs (r75 / legacy BAS stack)
  var CDN = {
    three: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r75/three.min.js',
    pnltri: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/175711/pnltri.min.js',
    bas: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/175711/bas.js',
    gsap: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/1.18.0/TweenMax.min.js',
    fontutils: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/175711/FontUtils.js',
    textgeo: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/175711/TextGeometry.js',
    typeface: '/droid_sans_bold.typeface.js'
  };

  // Load in order and start app
  Promise.resolve()
    .then(function() { setStatus('Loading Three.js…'); return loadScript(CDN.three); })
    .then(function() { 
      if (!window.THREE) throw new Error('THREE not available after load'); 
      setStatus('Loading PNLTRI…'); 
      return loadScript(CDN.pnltri); 
    })
    .then(function() {
      // hook PNLTRI into ShapeUtils AFTER THREE exists
      if (window.PNLTRI && THREE && THREE.ShapeUtils) {
        THREE.ShapeUtils.triangulateShape = (function() {
          var tri = new PNLTRI.Triangulator();
          return function(contour, holes) { return tri.triangulate_polygon([contour].concat(holes)); };
        })();
      }
      setStatus('Loading BAS…');
      return loadScript(CDN.bas);
    })
    .then(function() { setStatus('Loading GSAP…'); return loadScript(CDN.gsap); })
    .then(function() { setStatus('Loading FontUtils/TextGeometry…'); return loadScript(CDN.fontutils); })
    .then(function() { return loadScript(CDN.textgeo); })
    .then(function() { setStatus('Loading typeface…'); return loadScript(CDN.typeface); })
    .then(function() { setStatus('Initializing…'); initGoldlink(); setStatus('Ready', 'ready'); })
    .catch(function(err) { console.error(err); setStatus(err.message, 'error'); });

  function initGoldlink() {
    ////////////////////
    // UTILS
    ////////////////////
    var utils = {
      extend: function(dst, src) {
        for (var key in src) {
          dst[key] = src[key];
        }
        return dst;
      },
      fibSpherePoint: (function() {
        var v = {x: 0, y: 0, z: 0};
        var G = Math.PI * (3 - Math.sqrt(5));

        return function(i, n, radius) {
          var step = 2.0 / n;
          var r, phi;

          v.y = i * step - 1 + (step * 0.5);
          r = Math.sqrt(1 - v.y * v.y);
          phi = i * G;
          v.x = Math.cos(phi) * r;
          v.z = Math.sin(phi) * r;

          radius = radius || 1;

          v.x *= radius;
          v.y *= radius;
          v.z *= radius;

          return v;
        }
      })()
    };

    ////////////////////
    // CLASSES
    ////////////////////
    function THREERoot(params) {
      params = utils.extend({
        fov: 60,
        zNear: 10,
        zFar: 100000,
        createCameraControls: false
      }, params);

      this.renderer = new THREE.WebGLRenderer({
        antialias: params.antialias,
        alpha: true
      });
      this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      this.renderer.setClearColor(0x000000, 0);
      
      var container = document.getElementById('goldlink-three-container');
      if (container) {
        console.log('Container found, appending renderer');
        container.appendChild(this.renderer.domElement);
      } else {
        console.error('goldlink-three-container not found!');
      }

      this.camera = new THREE.PerspectiveCamera(
        params.fov,
        window.innerWidth / window.innerHeight,
        params.zNear,
        params.zFar
      );

      this.scene = new THREE.Scene();

      this.resize = this.resize.bind(this);
      this.tick = this.tick.bind(this);

      this.resize();
      this.tick();

      window.addEventListener('resize', this.resize, false);
    }
    THREERoot.prototype = {
      tick: function() {
        this.update();
        this.render();
        requestAnimationFrame(this.tick);
      },
      update: function() {},
      render: function() {
        this.renderer.render(this.scene, this.camera);
      },
      resize: function() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };

    function TextAnimation(textGeometry) {
      var bufferGeometry = new THREE.BAS.ModelBufferGeometry(textGeometry);

      var aAnimation = bufferGeometry.createAttribute('aAnimation', 2);
      var aEndPosition = bufferGeometry.createAttribute('aEndPosition', 3);
      var aAxisAngle = bufferGeometry.createAttribute('aAxisAngle', 4);

      var faceCount = bufferGeometry.faceCount;
      var i, i2, i3, i4, v;

      var maxDelay = 0.0;
      var minDuration = 1.0;
      var maxDuration = 1.0;
      var stretch = 0.05;
      var lengthFactor = 0.001;
      var maxLength = textGeometry.boundingBox.max.length();

      this.animationDuration = maxDuration + maxDelay + stretch + lengthFactor * maxLength;
      this._animationProgress = 0;

      var axis = new THREE.Vector3();
      var angle;

      for (i = 0, i2 = 0, i3 = 0, i4 = 0; i < faceCount; i++, i2 += 6, i3 += 9, i4 += 12) {
        var face = textGeometry.faces[i];
        var centroid = THREE.BAS.Utils.computeCentroid(textGeometry, face);
        var centroidN = new THREE.Vector3().copy(centroid).normalize();

        // animation
        var delay = (maxLength - centroid.length()) * lengthFactor;
        var duration = THREE.Math.randFloat(minDuration, maxDuration);

        for (v = 0; v < 6; v += 2) {
          aAnimation.array[i2 + v] = delay + stretch * Math.random();
          aAnimation.array[i2 + v + 1] = duration;
        }

        // end position
        var point = utils.fibSpherePoint(i, faceCount, 200);

        for (v = 0; v < 9; v += 3) {
          aEndPosition.array[i3 + v] = point.x;
          aEndPosition.array[i3 + v + 1] = point.y;
          aEndPosition.array[i3 + v + 2] = point.z;
        }

        // axis angle
        axis.x = centroidN.x;
        axis.y = -centroidN.y;
        axis.z = -centroidN.z;

        axis.normalize();

        angle = Math.PI * THREE.Math.randFloat(0.5, 2.0);

        for (v = 0; v < 12; v += 4) {
          aAxisAngle.array[i4 + v] = axis.x;
          aAxisAngle.array[i4 + v + 1] = axis.y;
          aAxisAngle.array[i4 + v + 2] = axis.z;
          aAxisAngle.array[i4 + v + 3] = angle;
        }
      }

      // Golden colors
      var material = new THREE.BAS.PhongAnimationMaterial({
          shading: THREE.FlatShading,
          side: THREE.DoubleSide,
          transparent: true,
          uniforms: {
            uTime: {type: 'f', value: 0}
          },
          shaderFunctions: [
            THREE.BAS.ShaderChunk['cubic_bezier'],
            THREE.BAS.ShaderChunk['ease_out_cubic'],
            THREE.BAS.ShaderChunk['quaternion_rotation']
          ],
          shaderParameters: [
            'uniform float uTime;',
            'attribute vec2 aAnimation;',
            'attribute vec3 aEndPosition;',
            'attribute vec4 aAxisAngle;'
          ],
          shaderVertexInit: [
            'float tDelay = aAnimation.x;',
            'float tDuration = aAnimation.y;',
            'float tTime = clamp(uTime - tDelay, 0.0, tDuration);',
            'float tProgress = ease(tTime, 0.0, 1.0, tDuration);'
          ],
          shaderTransformPosition: [
            'transformed = mix(transformed, aEndPosition, tProgress);',
            'float angle = aAxisAngle.w * tProgress;',
            'vec4 tQuat = quatFromAxisAngle(aAxisAngle.xyz, angle);',
            'transformed = rotateVector(tQuat, transformed);'
          ]
        },
        {
          diffuse: 0xF59E0B,    // Gold color
          specular: 0xFCD34D,   // Golden specular
          shininess: 8,
          emissive: 0x332200    // Slight golden glow
        }
      );

      THREE.Mesh.call(this, bufferGeometry, material);
      this.frustumCulled = false;
    }
    TextAnimation.prototype = Object.create(THREE.Mesh.prototype);
    TextAnimation.prototype.constructor = TextAnimation;

    Object.defineProperty(TextAnimation.prototype, 'animationProgress', {
      get: function() {
        return this._animationProgress;
      },
      set: function(v) {
        this._animationProgress = v;
        this.material.uniforms['uTime'].value = this.animationDuration * v;
      }
    });

    // Initialize _typeface_js for old font format
    window._typeface_js = {
      faces: {},
      loadFace: function(data) {
        if (THREE.FontUtils && THREE.FontUtils.faces) {
          var familyName = (data.familyName || 'Droid Sans').toLowerCase();
          THREE.FontUtils.faces[familyName + '_normal_normal'] = data;
          THREE.FontUtils.faces[familyName + '_bold_normal'] = data;
        }
        this.faces[data.familyName || 'droid sans'] = data;
      }
    };

    // Override THREE.FontUtils.getFace to handle our font
    THREE.FontUtils.getFace = function(font, weight, style) {
      var fontData = THREE.FontUtils.faces['droid sans'];
      if (fontData && fontData.bold && fontData.bold.normal) {
        return fontData.bold.normal;
      }
      return fontData;
    };

    function generateTextGeometry(text, params) {
      var geometry = new THREE.TextGeometry(text, params);

      geometry.computeBoundingBox();

      var size = geometry.boundingBox.size();
      var anchorX = size.x * -params.anchor.x;
      var anchorY = size.y * -params.anchor.y;
      var anchorZ = size.z * -params.anchor.z;
      var matrix = new THREE.Matrix4().makeTranslation(anchorX, anchorY, anchorZ);

      geometry.applyMatrix(matrix);

      return geometry;
    }

    function createTextAnimation() {
      var geometry = generateTextGeometry('GOLDLINK', {
        size: 60,
        height: 12,
        font: 'droid sans',
        weight: 'bold',
        style: 'normal',
        curveSegments: 24,
        bevelSize: 2,
        bevelThickness: 2,
        bevelEnabled: true,
        anchor: {x: 0.5, y: 0.5, z: 0.0}
      });

      THREE.BAS.Utils.tessellateRepeat(geometry, 1.0, 2);
      THREE.BAS.Utils.separateFaces(geometry);

      return new TextAnimation(geometry);
    }

    var root = new THREERoot({
      antialias: (window.devicePixelRatio === 1),
      fov: 60
    });

    root.camera.position.set(0, 0, 600);

    var textAnimation = createTextAnimation();
    textAnimation.scale.x = -1; // Flip text horizontally to fix backwards display
    root.scene.add(textAnimation);

    var light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(0, 0, 1);
    root.scene.add(light);

    var tl = new TimelineMax({});
    
    console.log('Starting GOLDLINK animation timeline');
    
    // Start with sphere (progress 0.6) and animate to word (progress 0.0)
    tl.fromTo(textAnimation, 2,
      {
        animationProgress: 0.6, // Start as sphere
        onStart: function() { console.log('Animation started - forming word from sphere'); }
      }, 
      {
        animationProgress: 0.0, // Form into word
        ease: Power1.easeInOut,
        onComplete: function() { console.log('Word formation complete'); }
      },
      0
    );
    tl.fromTo(textAnimation.rotation, 2, 
      {y: 0}, 
      {y: Math.PI * 1, ease: Power1.easeInOut}, 
      0
    );
    
    // Pause for 1.5 seconds at the word
    tl.to(textAnimation, 1.5, {}, 2); // Empty tween to create pause
    
    // Reverse back to sphere - but trigger callback partway through
    tl.to(textAnimation, 1.5,
      {
        animationProgress: 0.6, 
        ease: Power1.easeInOut,
        onUpdate: function() {
          // Trigger callback at 75% of reverse animation (1.125 seconds into the reverse)
          if (this.progress() > 0.75 && window.goldlinkLoadComplete) {
            window.goldlinkLoadComplete();
            window.goldlinkLoadComplete = null; // Prevent multiple calls
          }
        }
      },
      3.5
    );
    tl.to(textAnimation.rotation, 1.5, 
      {y: Math.PI * 2, ease: Power1.easeInOut}, 
      3.5
    );
  }
})();
    `;

    // Add the script to the document
    script.setAttribute('data-goldlink', 'true');
    document.head.appendChild(script);
    console.log('GOLDLINK script injected');

    // Set up completion callback
    (window as any).goldlinkLoadComplete = () => {
      setTimeout(() => {
        onLoadComplete?.();
      }, 200); // Small delay for smooth transition
    };

    // Add fallback timeout in case animation fails to load
    setTimeout(() => {
      if (onLoadComplete) {
        console.log('Animation fallback timeout triggered');
        onLoadComplete();
      }
    }, 8000);

    return () => {
      // Cleanup
      const existingScript = document.head.querySelector('script[data-goldlink="true"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
      delete (window as any).goldlinkLoadComplete;
    };
  }, [onLoadComplete]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      <div 
        ref={containerRef}
        id="goldlink-three-container" 
        className="w-full h-full absolute inset-0"
        style={{ 
          background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.1) 0%, rgba(0,0,0,1) 70%)'
        }}
      />
      
      <div className="absolute bottom-8 text-center z-10">
        <div 
          id="goldlink-status" 
          className="text-gold font-orbitron text-lg tracking-[0.2em] mb-4"
        >
          Loading...
        </div>
        <p className="text-gold/70 font-orbitron text-sm tracking-[0.3em]">
          ESTABLISHING SECURE CONNECTION...
        </p>
      </div>
    </div>
  );
}
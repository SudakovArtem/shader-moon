import * as THREE from 'three';
import * as dat from 'dat.gui';
import gsap from 'gsap';

export class MoonScene {
  constructor(container, options = {}) {
    this.container = container;

    this.defaultOptions = {
      gui: false,
      theme: {
        gray: 0x222222,
        background: 0x000000,
        cont: 0x444444,
        blue: 0x000FFF,
        red: 0xF00000,
        cyan: 0x00FFFF,
        white: 0xF00589
      },
      perlin: {time: 5.0, morph: 0.0, dnoise: 2.5},
      chroma: {RGBr: 4.5, RGBg: 0.0, RGBb: 3.0, RGBn: 0.3, RGBm: 1.0},
      camera: {zoom: 150, speedY: 0.6, speedX: 0.0, guide: false},
      sphere: {wireframe: false, points: false, psize: 3}
    };

    this.options = Object.assign(this.defaultOptions, options);

    this.theme = this.options.theme;

    this.ambientLights = null;
    this.backlight = null;
    this.rectAreaLight = null;
    this.frontlight = null;
    this.gridHelper = null;
    this.frame = Date.now();

    this.uniforms = {
      time: {type: 'f', value: 0.0},
      RGBr: { value: new THREE.Color(0x00ff00) },
      RGBg: { value: new THREE.Color(0x00ff00) },
      RGBb: { value: new THREE.Color(0x00ff00) },
      RGBn: { value: new THREE.Color(0x00ff00) },
      RGBm: { value: new THREE.Color(0x00ff00) },
      morph: {type: 'f', value: 0.0},
      p: { value: 2 },
      glowColor: { value: new THREE.Color(0xffffff) },
      dnoise: {type: 'f', value: 0.0},
      psize: {type: 'f', value: 3.0}
    };


    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: false});
    this.groupMoon = new THREE.Object3D();
    this.camera = null;
    this.width = null;
    this.height = null;
    this.skin = null;
    this.vertexShader = null;
    this.fragmentShader = null;
    this.mat = null;
    this.geo = null;
  }

  async loadShaders() {
    this.vertexShader = await fetch('../shaders/vertexShader.vert').then(r => r.text());
    this.fragmentShader = await fetch('../shaders/fragmentShader.frag').then(r => r.text());
  }

  createWorld() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.scene.fog = new THREE.Fog(this.theme.background, 150, 320);
    this.scene.background = new THREE.Color(this.theme.background);
    this.scene.add(this.groupMoon);
    this.camera = new THREE.PerspectiveCamera(20, this.width / this.height, 1, 1000);
    this.camera.position.set(0, 10, 120);
    this.renderer.setSize(this.width, this.height);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
  }

  onWindowResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  createLights() {
    this.ambientLights = new THREE.HemisphereLight(this.theme.cont, this.theme.white, 1);
    this.backlight = new THREE.PointLight(this.theme.white, 1);
    this.backlight.position.set(-5, -20, -20);
    this.rectAreaLight = new THREE.RectAreaLight(this.theme.white, 20, 3, 3);
    this.rectAreaLight.position.set(0, 0, 2);
    this.frontlight = new THREE.PointLight(this.theme.white, 2);
    this.frontlight.position.set(20, 10, 0);
    this.scene.add(this.backlight);
    this.scene.add(this.ambientLights);
    this.scene.add(this.rectAreaLight);
    this.scene.add(this.frontlight);
  }

  randomMoon() {
    gsap.to(this.options.chroma, {
      duration: 1, RGBr: Math.random() * 10,
      RGBg: Math.random() * 10, RGBb: Math.random() * 10,
      RGBn: Math.random() * 2, RGBm: Math.random() * 5
    });
  }

  createGUI() {
    const gui = new dat.GUI();
    const camGUI = gui.addFolder('Camera');
    camGUI.add(this.options.camera, 'zoom', 50, 250).name('Zoom').listen();
    camGUI.add(this.options.camera, 'speedY', -1, 1).name('Speed Y').listen();
    camGUI.add(this.options.camera, 'speedX', 0, 1).name('Speed X').listen();
    camGUI.add(this.options.camera, 'guide', false).name('Guide').listen();

    const timeGUI = gui.addFolder('Setup');
    timeGUI.add(this.options.perlin, 'time', 0.0, 10.0).name('Speed').listen();
    timeGUI.add(this.options.perlin, 'morph', 0.0, 20.0).name('Morph').listen();
    timeGUI.add(this.options.perlin, 'dnoise', 0.0, 100.0).name('DNoise').listen();
    timeGUI.open();

    const rgbGUI = gui.addFolder('RGB');
    rgbGUI.add(this.options.chroma, 'RGBr', 0.0, 10.0).name('Red').listen();
    rgbGUI.add(this.options.chroma, 'RGBg', 0.0, 10.0).name('Green').listen();
    rgbGUI.add(this.options.chroma, 'RGBb', 0.0, 10.0).name('Blue').listen();
    rgbGUI.add(this.options.chroma, 'RGBn', 0.0, 3.0).name('Black').listen();
    rgbGUI.add(this.options.chroma, 'RGBm', 0.0, 1.0).name('Chroma').listen();
    rgbGUI.open();

    const wirGUI = gui.addFolder('Sphere');
    wirGUI.add(this.options.sphere, 'wireframe', true).name('Wireframe').listen();
    wirGUI.add(this.options.sphere, 'points', true).name('Points').listen();
    wirGUI.add(this.options.sphere, 'psize', 1.0, 10.0).name('Point Size').step(1);
  }

  skinElement(geoFrag = 5) {
    const geoSize = 20;
    if (geoFrag >= 5) geoFrag = 5;
    this.geo = new THREE.IcosahedronGeometry(geoSize, geoFrag);
    this.mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      side: THREE.DoubleSide,
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
      wireframe: this.options.sphere.wireframe,
    });
    let point = new THREE.Points(this.geo, this.mat);
    this.groupMoon.add(point);

    let mesh = new THREE.Mesh(this.geo, this.mat);
    mesh.geometry.verticesNeedUpdate = true;
    mesh.geometry.morphTargetsNeedUpdate = true;
    mesh.reseivedShadow = true;
    mesh.castShadow = true;
    this.groupMoon.add(mesh);

    return {mesh, point};
  }

  createSkin() {
    this.skin = this.skinElement();
    this.skin.mesh.scale.set(1, 1, 1);
    this.scene.add(this.skin.mesh);
  }

  createGrid(gridY = -20) {
    this.gridHelper = new THREE.GridHelper(200, 20, this.theme.cont, this.theme.gray);
    this.gridHelper.position.y = gridY;
    this.scene.add(this.gridHelper);
  }

  animate() {
    const time = Date.now();
    this.uniforms.time.value = (this.options.perlin.time / 10000) * (time - this.frame);
    this.uniforms.morph.value = this.options.perlin.morph;
    this.uniforms.dnoise.value = this.options.perlin.dnoise;
    gsap.to(this.camera.position, {duration: 2, z: 300 - this.options.camera.zoom});
    this.skin.mesh.rotation.y += this.options.camera.speedY / 100;
    this.skin.mesh.rotation.z += this.options.camera.speedX / 100;
    this.skin.point.rotation.y = this.skin.mesh.rotation.y;
    this.skin.point.rotation.z = this.skin.mesh.rotation.z;
    this.gridHelper.rotation.y = this.skin.mesh.rotation.y;

    this.mat.uniforms['RGBr'].value = this.options.chroma.RGBr / 10;
    this.mat.uniforms['RGBg'].value = this.options.chroma.RGBg / 10;
    this.mat.uniforms['RGBb'].value = this.options.chroma.RGBb / 10;
    this.mat.uniforms['RGBn'].value = this.options.chroma.RGBn / 100;
    this.mat.uniforms['RGBm'].value = this.options.chroma.RGBm;
    this.mat.uniforms['psize'].value = this.options.sphere.psize;
    this.mat.background = new THREE.Color(this.theme.background);

    this.gridHelper.visible = this.options.camera.guide;

    this.skin.mesh.visible = !this.options.sphere.points;
    this.skin.point.visible = this.options.sphere.points;

    this.mat.wireframe = this.options.sphere.wireframe;

    this.camera.lookAt(this.scene.position);
    requestAnimationFrame(this.animate.bind(this));
    this.renderer.render(this.scene, this.camera);
  }

  async init() {
    await this.loadShaders();
    this.createWorld();
    this.createLights();
    this.createGrid();
    if (this.options.gui) {
      this.createGUI();
    }
    this.createSkin();
    this.animate();
  }
}

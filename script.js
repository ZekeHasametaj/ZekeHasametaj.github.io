let scene, camera, cameraParent, renderer;
let keys = {};
let rotationSpeed = 0.002;
let moveSpeed = 0.03;
let yaw = 0;    // Horizontal rotation (yaw)
let pitch = 0;  // Vertical rotation (pitch)
let maxPitch = Math.PI / 2.5; // Clamp for pitch
let collisionDistance = 0.2; // Distance to keep away from walls
let collisionOffset = 0.1; // Offset to avoid sticking to walls

init();
animate();

function init() {
  scene = new THREE.Scene();

  // Parent object for yaw control
  cameraParent = new THREE.Object3D();
  scene.add(cameraParent);

  // Set up the camera and attach it to the cameraParent for pitch control
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 0); // Set camera height
  cameraParent.add(camera);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 2, 2).normalize();
  scene.add(directionalLight);

  const loader = new THREE.GLTFLoader();

  // Load room and borsche models
  loader.load('models/room4.gltf', (gltf) => {
    const room = gltf.scene;
    room.traverse((node) => {
      if (node.isMesh) node.material.color.set(0xffffff);
    });
    scene.add(room);
  });

  loader.load('models/borsche.gltf', (gltf) => {
    const borsche = gltf.scene;
    borsche.scale.set(0.01, 0.01, 0.01);
    borsche.position.set(0, -0.6, 0);
    scene.add(borsche);
  });

  // Create an overlay image for WASD
  const wasdOverlay = document.createElement('img');
  wasdOverlay.src = './images/wasd.png'; // Ensure this path is correct
  wasdOverlay.style.position = 'absolute';
  wasdOverlay.style.top = '90%'; // Position it towards the bottom
  wasdOverlay.style.left = '10%'; // Adjust left position as needed
  wasdOverlay.style.transform = 'translate(-50%, -50%)'; // Center it horizontally
  wasdOverlay.style.width = '200px'; // Adjust width as needed
  wasdOverlay.style.opacity = '1'; // Fully visible
  wasdOverlay.style.transition = 'opacity 10s ease'; // Fade effect
  document.body.appendChild(wasdOverlay);

  // Fade out the overlay after 10 seconds
  setTimeout(() => {
    wasdOverlay.style.opacity = '0'; // Start fading out
    setTimeout(() => {
      wasdOverlay.style.display = 'none'; // Remove from DOM after fading
    }, 10000); // Wait for fade to finish before removing
  }, 10000);

  window.addEventListener('keydown', (event) => keys[event.key.toLowerCase()] = true);
  window.addEventListener('keyup', (event) => keys[event.key.toLowerCase()] = false);
  document.body.addEventListener('click', () => document.body.requestPointerLock());
  document.addEventListener('mousemove', onMouseMove);
  window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Separate yaw and pitch in mouse movement for FPS-style control
function onMouseMove(event) {
  if (document.pointerLockElement === document.body) {
    const deltaX = event.movementX || 0;
    const deltaY = event.movementY || 0;

    // Update yaw on the parent object (horizontal rotation)
    yaw -= deltaX * rotationSpeed;
    cameraParent.rotation.y = yaw;

    // Update pitch on the camera itself (vertical rotation)
    pitch -= deltaY * rotationSpeed;
    pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch)); // Clamp the pitch
    camera.rotation.x = pitch;
  }
}

// Function to check for collisions with walls and objects
function checkCollision(moveDirection) {
  const raycaster = new THREE.Raycaster(cameraParent.position, moveDirection.normalize(), 0, collisionDistance);
  const intersects = raycaster.intersectObjects(scene.children, true);
  return intersects.length > 0;
}

function animate() {
  requestAnimationFrame(animate);

  let moveDirection = new THREE.Vector3();
  if (keys['w']) moveDirection.z -= moveSpeed;
  if (keys['s']) moveDirection.z += moveSpeed;
  if (keys['a']) moveDirection.x -= moveSpeed;
  if (keys['d']) moveDirection.x += moveSpeed;

  // Apply yaw rotation to movement direction
  moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

  // Calculate the intended new position based on movement
  const newPosition = cameraParent.position.clone().add(moveDirection);

  // Check for collision in each axis independently for better handling
  const directionX = new THREE.Vector3(moveDirection.x, 0, 0);
  const directionZ = new THREE.Vector3(0, 0, moveDirection.z);

  if (!checkCollision(directionX)) {
    cameraParent.position.x = newPosition.x;
  }
  if (!checkCollision(directionZ)) {
    cameraParent.position.z = newPosition.z;
  }

  // Check for collision below the camera to avoid bumping into pillars
  const belowRaycaster = new THREE.Raycaster(cameraParent.position.clone().add(new THREE.Vector3(0, -collisionDistance, 0)), new THREE.Vector3(0, -1, 0), 0, collisionDistance);
  const belowIntersects = belowRaycaster.intersectObjects(scene.children, true);
  if (belowIntersects.length > 0) {
    cameraParent.position.y = Math.max(cameraParent.position.y, belowIntersects[0].point.y + collisionOffset);
  }

  renderer.render(scene, camera);
}

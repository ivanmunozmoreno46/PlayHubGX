import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Center, Bounds } from '@react-three/drei'

/**
 * <Model3D url="/models/wrench.glb" />
 *
 * Renders a GLB model inside a transparent canvas that scales to its
 * parent. Auto-rotates slowly around the Y axis. Lighting is kept flat
 * (ambient + a single directional) to match the BIOS Memory Card
 * Manager flat-shaded look.
 */

function SpinningModel({ url, speed = 0.6, tilt = [0, 0, 0] }) {
  const group = useRef(null)
  const { scene } = useGLTF(url)
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * speed
  })
  return (
    <group>
      {/* Outer group spins around Y; inner group holds the static tilt so
          the rotation still reads as pure Y-spin but from a 3/4 angle. */}
      <group ref={group}>
        <group rotation={tilt}>
          <primitive object={scene} />
        </group>
      </group>
    </group>
  )
}

export default function Model3D({ url, speed = 0.6, tilt = [0, 0, 0], cameraDistance = 3 }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, cameraDistance], fov: 35 }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false }}
    >
      {/* Bright, flat studio rig: strong ambient + hemi fill + two keys. */}
      <ambientLight intensity={1.4} />
      <hemisphereLight args={['#ffffff', '#8a8c94', 0.8]} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <directionalLight position={[-4, -2, -3]} intensity={0.7} />
      <directionalLight position={[0, -4, 2]} intensity={0.4} />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.15}>
          <Center>
            <SpinningModel url={url} speed={speed} tilt={tilt} />
          </Center>
        </Bounds>
      </Suspense>
    </Canvas>
  )
}

useGLTF.preload('/models/wrench.glb')
useGLTF.preload('/models/cd-rom.glb')

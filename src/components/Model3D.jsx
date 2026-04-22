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

function SpinningModel({ url, speed = 0.6, tiltX = 0 }) {
  const group = useRef(null)
  const { scene } = useGLTF(url)
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * speed
  })
  return (
    <group ref={group} rotation={[tiltX, 0, 0]}>
      <primitive object={scene} />
    </group>
  )
}

export default function Model3D({ url, speed = 0.6, tiltX = 0, cameraDistance = 3 }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, cameraDistance], fov: 35 }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <directionalLight position={[-4, -2, -3]} intensity={0.35} />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.15}>
          <Center>
            <SpinningModel url={url} speed={speed} tiltX={tiltX} />
          </Center>
        </Bounds>
      </Suspense>
    </Canvas>
  )
}

useGLTF.preload('/models/wrench.glb')
useGLTF.preload('/models/cd-rom.glb')

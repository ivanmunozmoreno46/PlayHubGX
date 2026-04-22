import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Center, Bounds, Environment } from '@react-three/drei'

/**
 * <Model3D url="/models/wrench.glb" />
 *
 * Renders a GLB model inside a transparent canvas that scales to its
 * parent. Auto-rotates slowly around the Y axis. Lighting is kept flat
 * (ambient + a single directional) to match the BIOS Memory Card
 * Manager flat-shaded look.
 */

function SpinningModel({ url, speed = 0.6, tilt = [0, 0, 0], paint }) {
  const group = useRef(null)
  const { scene } = useGLTF(url)

  // Clone the scene so per-instance material overrides don't mutate the
  // cached GLB shared by other consumers.
  const painted = useMemo(() => {
    const clone = scene.clone(true)
    if (!paint) return clone
    const color = paint.color ? new THREE.Color(paint.color) : null
    clone.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return
      const mat = obj.material.clone()
      if (color) mat.color = color
      if (paint.metalness != null) mat.metalness = paint.metalness
      if (paint.roughness != null) mat.roughness = paint.roughness
      if (paint.emissive != null) mat.emissive = new THREE.Color(paint.emissive)
      mat.needsUpdate = true
      obj.material = mat
    })
    return clone
  }, [scene, paint])

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * speed
  })
  return (
    <group>
      {/* Outer group spins around Y; inner group holds the static tilt so
          the rotation still reads as pure Y-spin but from a 3/4 angle. */}
      <group ref={group}>
        <group rotation={tilt}>
          <primitive object={painted} />
        </group>
      </group>
    </group>
  )
}

export default function Model3D({ url, speed = 0.6, tilt = [0, 0, 0], cameraDistance = 3, paint }) {
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
        {/* Studio HDR so metallic materials have something to reflect.
            background={false} keeps the canvas transparent. */}
        <Environment preset="studio" background={false} />
        <Bounds fit clip observe margin={1.15}>
          <Center>
            <SpinningModel url={url} speed={speed} tilt={tilt} paint={paint} />
          </Center>
        </Bounds>
      </Suspense>
    </Canvas>
  )
}

useGLTF.preload('/models/wrench.glb')
useGLTF.preload('/models/cd-rom.glb')
